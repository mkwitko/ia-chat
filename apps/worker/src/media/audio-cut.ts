// WhatsApp voice notes are Ogg/Opus. Cutting at a page boundary needs no decoder: each page
// header carries the granule position (samples at 48 kHz). ponytail: other containers are
// sent whole and the transcript is trimmed in proportion; add a real cutter if they matter.

const CAPTURE = 'OggS';
const OPUS_RATE = 48_000;
const GRANULE_OFFSET = 6;
const SEGMENTS_OFFSET = 26;
const HEADER_BYTES = 27;
const NO_GRANULE = 0xffff_ffff_ffff_ffffn;

export interface Cut {
  bytes: Uint8Array;
  truncated: boolean;
}

/** The audio up to `maxSeconds`, cut at the last whole page before the limit. */
export function cutAudio(audio: Buffer, maxSeconds: number): Cut {
  const limit = BigInt(maxSeconds * OPUS_RATE);
  let position = 0;
  while (audio.toString('latin1', position, position + CAPTURE.length) === CAPTURE) {
    const granule = audio.readBigUInt64LE(position + GRANULE_OFFSET);
    if (granule !== NO_GRANULE && granule > limit)
      return { bytes: audio.subarray(0, position), truncated: true };
    position += pageLength(audio, position);
  }
  return { bytes: audio, truncated: false };
}

function pageLength(audio: Buffer, position: number): number {
  const segments = audio.readUInt8(position + SEGMENTS_OFFSET);
  const table = audio.subarray(position + HEADER_BYTES, position + HEADER_BYTES + segments);
  return HEADER_BYTES + segments + table.reduce((sum, size) => sum + size, 0);
}

/** For audio we could not cut: keep the share of the text that fits in `maxSeconds`. */
export function trimTranscript(text: string, seconds: number, maxSeconds: number): string {
  if (seconds <= maxSeconds) return text;
  return text.slice(0, Math.floor((text.length * maxSeconds) / seconds));
}
