import { randomUUID } from 'node:crypto';
import {
  ContentType,
  InboundKind,
  type InboundEvent,
  type MediaDownloadFor,
  type MessageContent,
} from '@app/channels';
import { MAX_MEDIA_ATTEMPTS, MediaState, readMediaInfo } from '@app/core';
import { createDb } from '@app/db';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { applyInboundEvents } from '../inbound/apply.ts';
import type { TurnRequest } from '../conversation/schedule.ts';
import { DeliveryMode, runTurn, TurnOutcome, type TurnDeps } from '../conversation/turn.ts';
import { processMedia, type MediaDeps } from './media-job.ts';

// E-10 with the Graph API, R2 and the transcription model faked: nothing here is paid.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const OPUS_RATE = 48_000;

function only<T>(list: readonly T[]): T {
  const [item] = list;
  if (item === undefined) throw new Error('expected one item');
  return item;
}

/** An Ogg page with a 1-byte segment and the given granule position. */
function oggPage(seconds: number): Buffer {
  const header = Buffer.alloc(28);
  header.write('OggS', 0, 'latin1');
  header.writeBigUInt64LE(BigInt(seconds * OPUS_RATE), 6);
  header.writeUInt8(1, 26);
  header.writeUInt8(1, 27);
  return Buffer.concat([header, Buffer.from([1])]);
}

async function setup() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Mídia (fictício)', slug: `media-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  const channel = await db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
  );
  const contact = { bsuid: `BR.${randomUUID()}` };
  let clock = Date.parse('2027-01-04T12:00:00Z');
  const receive = async (content: MessageContent) => {
    clock += 1000;
    const { media, turns } = await db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, {
        tenantId,
        channelId: channel.id,
        events: [
          {
            kind: InboundKind.message,
            providerMessageId: `wamid.${randomUUID()}`,
            contact,
            at: new Date(clock),
            content,
          } satisfies InboundEvent,
        ],
      }),
    );
    return { messageId: only(media), turns };
  };
  const message = (id: string) =>
    db.withTenant(tenantId, (tx) => tx.message.findUniqueOrThrow({ where: { id } }));
  return { tenantId, receive, message };
}

function fakes(overrides: Partial<MediaDeps> = {}) {
  const puts: { key: string; mime: string }[] = [];
  const turns: TurnRequest[] = [];
  const downloadFor: MediaDownloadFor = () =>
    Promise.resolve(() => Promise.resolve({ bytes: oggPage(5), mime: 'audio/ogg; codecs=opus' }));
  const deps = {
    db,
    downloadFor,
    store: {
      put: (key: string, body: { mime: string }) => {
        puts.push({ key, mime: body.mime });
        return Promise.resolve();
      },
    },
    transcribe: vi.fn(() => Promise.resolve({ text: 'quero marcar uma avaliação', seconds: 5 })),
    scheduleTurn: (_tenantId: string, request: TurnRequest) => {
      turns.push(request);
      return Promise.resolve();
    },
    log: () => undefined,
    ...overrides,
  } satisfies MediaDeps;
  return { deps, puts, turns };
}

const audio = { type: ContentType.audio, mediaId: 'media-1', mime: 'audio/ogg' } as const;
const image = { type: ContentType.image, mediaId: 'media-2', mime: 'image/jpeg' } as const;

describe('media job (E-10, RF-24)', () => {
  it('stores audio under the tenant prefix and puts the transcript in the message text', async () => {
    const scope = await setup();
    const fake = fakes();
    const { messageId } = await scope.receive(audio);
    await processMedia(fake.deps, { tenantId: scope.tenantId, messageId: messageId });
    const row = await scope.message(messageId);
    expect(row.text).toBe('quero marcar uma avaliação');
    expect(fake.puts).toEqual([
      { key: `tenants/${scope.tenantId}/media/${messageId}.ogg`, mime: 'audio/ogg; codecs=opus' },
    ]);
    expect(readMediaInfo(row.media)).toMatchObject({
      state: MediaState.stored,
      key: `tenants/${scope.tenantId}/media/${messageId}.ogg`,
    });
    expect(fake.turns).toHaveLength(1);
  });

  it('stores an image and never sends it to a model (RN-22)', async () => {
    const scope = await setup();
    const fake = fakes({
      downloadFor: () =>
        Promise.resolve(() => Promise.resolve({ bytes: Buffer.from('img'), mime: 'image/jpeg' })),
    });
    const { messageId } = await scope.receive(image);
    await processMedia(fake.deps, { tenantId: scope.tenantId, messageId: messageId });
    expect(readMediaInfo((await scope.message(messageId)).media)?.state).toBe(MediaState.stored);
    expect(fake.deps.transcribe).not.toHaveBeenCalled();
  });

  it('transcribes only the first three minutes and flags the audio as truncated', async () => {
    const scope = await setup();
    const seen: number[] = [];
    const fake = fakes({
      downloadFor: () =>
        Promise.resolve(() =>
          Promise.resolve({
            bytes: Buffer.concat([oggPage(0), oggPage(100), oggPage(170), oggPage(240)]),
            mime: 'audio/ogg',
          }),
        ),
      transcribe: ({ audio: bytes }) => {
        seen.push(bytes.length);
        return Promise.resolve({ text: 'áudio longo', seconds: 170 });
      },
    });
    const { messageId } = await scope.receive(audio);
    await processMedia(fake.deps, { tenantId: scope.tenantId, messageId: messageId });
    expect(seen).toEqual([oggPage(0).length * 3]);
    expect(readMediaInfo((await scope.message(messageId)).media)?.truncated).toBe(true);
  });

  it('retries, then marks the media unavailable and asks for the turn after the third failure', async () => {
    const scope = await setup();
    const fake = fakes({ downloadFor: () => Promise.reject(new Error('Graph down')) });
    const { messageId } = await scope.receive(audio);
    const run = () => processMedia(fake.deps, { tenantId: scope.tenantId, messageId: messageId });
    for (let attempt = 1; attempt < MAX_MEDIA_ATTEMPTS; attempt += 1)
      await expect(run()).rejects.toThrow('Graph down');
    expect(fake.turns).toHaveLength(0);
    await run();
    const info = readMediaInfo((await scope.message(messageId)).media);
    expect(info).toMatchObject({ state: MediaState.unavailable, attempts: MAX_MEDIA_ATTEMPTS });
    expect(fake.turns).toHaveLength(1);
  });

  it('does nothing when the media was already handled', async () => {
    const scope = await setup();
    const fake = fakes();
    const { messageId } = await scope.receive(audio);
    const data = { tenantId: scope.tenantId, messageId: messageId };
    await processMedia(fake.deps, data);
    await processMedia(fake.deps, data);
    expect(fake.puts).toHaveLength(1);
    expect(fake.deps.transcribe).toHaveBeenCalledTimes(1);
  });

  it('holds the turn until the transcript is in, then the model sees it as text', async () => {
    const scope = await setup();
    const fake = fakes();
    const seen: (string | null)[][] = [];
    const turnDeps: TurnDeps = {
      respond: ({ messages }) => {
        seen.push(messages.map((message) => message.text));
        return Promise.resolve({
          text: 'ok',
          model: 'fake',
          costMicroUsd: 0n,
          mode: DeliveryMode.send,
          handoff: false,
        });
      },
      send: () => Promise.resolve({ providerMessageId: `wamid.out.${randomUUID()}` }),
    };
    const { messageId, turns } = await scope.receive(audio);
    const first = only(turns);
    const job = (request: TurnRequest) => ({ tenantId: scope.tenantId, ...request });
    expect(await runTurn(db, job(first), turnDeps)).toBe(TurnOutcome.stale);
    await processMedia(fake.deps, { tenantId: scope.tenantId, messageId: messageId });
    expect(await runTurn(db, job(only(fake.turns)), turnDeps)).toBe(TurnOutcome.sent);
    expect(seen).toEqual([['quero marcar uma avaliação']]);
  });
});
