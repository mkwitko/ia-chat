import { MediaState } from '@app/core';
import { MessageAuthor, MessageDirection, MessageStatus, MessageType } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTenant,
  newConversation,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-10: the panel opens patient media through a short-lived signed R2 URL, tenant by tenant.

const R2 = {
  R2_ACCOUNT_ID: 'acct',
  R2_ACCESS_KEY_ID: 'key-id',
  R2_SECRET_ACCESS_KEY: 'key-secret',
  R2_MEDIA_BUCKET: 'media',
  R2_ENDPOINT: 'https://acct.r2.example.test',
};

let ctx: TestContext;
let cookie: string;
let otherCookie: string;
let tenantId: string;
let conversationId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { env: R2 });
  cookie = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, cookie);
  conversationId = await newConversation(ctx, tenantId);
  otherCookie = await signUpVerified(ctx);
  await createTenant(ctx, otherCookie);
});
afterAll(() => ctx.app.close());

async function mediaMessage(media: object): Promise<string> {
  return ctx.db.withTenant(tenantId, async (tx) => {
    const { channelId } = await tx.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    const message = await tx.message.create({
      data: {
        tenantId,
        channelId,
        conversationId,
        direction: MessageDirection.inbound,
        author: MessageAuthor.patient,
        type: MessageType.image,
        status: MessageStatus.received,
        media,
      },
    });
    return message.id;
  });
}

const open = (messageId: string, session = cookie) =>
  ctx.app.inject({
    method: 'GET',
    url: `/api/conversations/${conversationId}/messages/${messageId}/media`,
    headers: { cookie: session },
  });

const stored = (key: string) => ({
  mediaId: 'm',
  mime: 'image/jpeg',
  state: MediaState.stored,
  attempts: 0,
  key,
});

describe('media route (E-10)', () => {
  it('redirects to a signed URL of the stored object and exposes the state in the thread', async () => {
    const key = `tenants/${tenantId}/media/x.jpg`;
    const id = await mediaMessage(stored(key));
    const response = await open(id);
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain(`acct.r2.example.test/media/${key}?`);
    expect(response.headers.location).toContain('X-Amz-Expires=300');
    const detail = await ctx.app.inject({
      method: 'GET',
      url: `/api/conversations/${conversationId}`,
      headers: { cookie },
    });
    const thread = detail.json<{ messages: { id: string; media: unknown }[] }>();
    expect(thread.messages.find((m) => m.id === id)?.media).toEqual({
      state: MediaState.stored,
      mime: 'image/jpeg',
      url: `/api/conversations/${conversationId}/messages/${id}/media`,
    });
  });

  it('has no URL for media that is not stored, nor for another tenant', async () => {
    const lost = await mediaMessage({
      mediaId: 'm',
      mime: 'image/jpeg',
      state: MediaState.unavailable,
      attempts: 3,
    });
    expect((await open(lost)).statusCode).toBe(404);
    const other = await mediaMessage(stored('k'));
    expect((await open(other, otherCookie)).statusCode).toBe(404);
  });
});
