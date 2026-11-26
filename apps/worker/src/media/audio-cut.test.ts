import { describe, expect, it } from 'vitest';
import { cutAudio, trimTranscript } from './audio-cut.ts';

const OPUS_RATE = 48_000;
const BODY = 10;

/** One Ogg page with a single 10-byte segment and the given granule position. */
function page(granule: bigint): Buffer {
  const header = Buffer.alloc(27 + 1);
  header.write('OggS', 0, 'latin1');
  header.writeBigUInt64LE(granule, 6);
  header.writeUInt8(1, 26); // one segment
  header.writeUInt8(BODY, 27);
  return Buffer.concat([header, Buffer.alloc(BODY, 1)]);
}

const seconds = (value: number) => BigInt(value * OPUS_RATE);

describe('audio cut at three minutes (E-10, spec 03)', () => {
  it('keeps the pages up to the limit and drops the rest', () => {
    const pages = [page(0n), page(seconds(100)), page(seconds(179)), page(seconds(200))];
    const cut = cutAudio(Buffer.concat(pages), 180);
    expect(cut.truncated).toBe(true);
    expect(cut.bytes).toHaveLength(page(0n).length * 3);
  });

  it('leaves a short audio untouched', () => {
    const whole = Buffer.concat([page(0n), page(seconds(30))]);
    expect(cutAudio(whole, 180)).toEqual({ bytes: whole, truncated: false });
  });

  it('cannot cut what is not Ogg: the transcript is trimmed in proportion instead', () => {
    const notOgg = Buffer.from('ID3 not ogg');
    expect(cutAudio(notOgg, 180)).toEqual({ bytes: notOgg, truncated: false });
    expect(trimTranscript('a'.repeat(400), 360, 180)).toBe('a'.repeat(200));
    expect(trimTranscript('curto', 60, 180)).toBe('curto');
  });
});
