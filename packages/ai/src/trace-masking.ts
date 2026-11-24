import type { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { maskPersonalData } from './mask.ts';

// Long enough for the batched exporter to send the spans that carry a name.
const NAME_TTL_MS = 600_000;
// Name parts this short are particles ("da", "de"), not names.
const MIN_NAME_PART = 3;
const WHITESPACE = /\s+/;
// AI SDK 7 writes prompts and completions to OpenTelemetry GenAI attributes, which the
// Langfuse JS mask does not cover (it masks only langfuse.* input, output and metadata).
const GEN_AI_PREFIX = 'gen_ai.';
const STRING_TYPE = 'string';
const OBJECT_TYPE = 'object';

/**
 * Masks names and phones in everything exported to Langfuse (spec 04, RN-38). The model
 * needs the real name, so the gateway registers the names of each call here and the span
 * processor masks them at export time.
 */
export function createTraceMasker(now: () => number = Date.now) {
  // ponytail: one process-wide list, so a name also masks other tenants' traces (only
  // over-masking); per-trace lists if this grows beyond a few hundred names.
  const expiry = new Map<string, number>();
  return {
    remember(names: readonly string[]): void {
      const until = now() + NAME_TTL_MS;
      for (const name of names.flatMap(withParts)) expiry.set(name, until);
    },
    mask({ data }: { data: unknown }): unknown {
      const current = now();
      for (const [name, until] of expiry) if (until < current) expiry.delete(name);
      return maskValue(data, [...expiry.keys()]);
    },
  };
}

export type TraceMasker = ReturnType<typeof createTraceMasker>;

export const traceMasker = createTraceMasker();

/** Runs before the Langfuse processor and masks the gen_ai.* attributes in place. */
export function genAiMaskingProcessor(masker: TraceMasker): SpanProcessor {
  return {
    onStart: () => undefined,
    onEnd(span: ReadableSpan) {
      // Same in-place change the Langfuse processor does for its own attributes.
      const attributes = span.attributes as Record<string, unknown>;
      for (const [key, value] of Object.entries(attributes)) {
        if (key.startsWith(GEN_AI_PREFIX)) attributes[key] = masker.mask({ data: value });
      }
    },
    forceFlush: () => Promise.resolve(),
    shutdown: () => Promise.resolve(),
  };
}

function withParts(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(WHITESPACE).filter((part) => part.length >= MIN_NAME_PART);
  return [trimmed, ...parts];
}

function maskValue(value: unknown, names: readonly string[]): unknown {
  if (isString(value)) return maskPersonalData(value, names);
  if (Array.isArray(value)) return value.map((item: unknown) => maskValue(item, names));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, maskValue(item, names)]),
    );
  }
  return value;
}

// Named type guards: typeof against a const does not narrow.
function isString(value: unknown): value is string {
  return typeof value === STRING_TYPE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === OBJECT_TYPE;
}
