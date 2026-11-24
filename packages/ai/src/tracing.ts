import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerTelemetry } from 'ai';
import type { AiEnv } from './env.ts';
import { genAiMaskingProcessor, traceMasker } from './trace-masking.ts';

export interface Tracing {
  /** Flushes pending spans; call before the process exits. */
  shutdown(): Promise<void>;
}

/**
 * Sends every AI call to Langfuse with names and phones masked (spec 04). Call once at
 * startup, before any model call. Returns null (tracing off) when the keys are empty.
 */
export function startTracing(env: AiEnv, environment: string): Tracing | null {
  const { LANGFUSE_PUBLIC_KEY: publicKey, LANGFUSE_SECRET_KEY: secretKey } = env;
  if (!publicKey || !secretKey) return null;
  const processor = new LangfuseSpanProcessor({
    publicKey,
    secretKey,
    ...(env.LANGFUSE_BASE_URL ? { baseUrl: env.LANGFUSE_BASE_URL } : {}),
    environment,
    mask: (params) => traceMasker.mask(params),
  });
  const provider = new NodeTracerProvider({
    // Order matters: mask the gen_ai.* attributes before Langfuse exports the span.
    spanProcessors: [genAiMaskingProcessor(traceMasker), processor],
  });
  provider.register();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
  return { shutdown: () => provider.shutdown() };
}
