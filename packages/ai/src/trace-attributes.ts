import type { PropagateAttributesParams } from '@langfuse/tracing';

interface TraceScope {
  tenantId: string;
  conversationId?: string | undefined;
  turnId?: string | undefined;
}

/**
 * Trace-level attributes for Langfuse: one trace per task call, grouped by conversation
 * (session). Only ids here: propagated metadata is not masked.
 */
export function traceAttributes(
  name: string,
  { tenantId, conversationId, turnId }: TraceScope,
): PropagateAttributesParams {
  return {
    traceName: name,
    tags: [name],
    ...(conversationId ? { sessionId: conversationId } : {}),
    metadata: { tenantId, ...(turnId ? { turnId } : {}) },
  };
}
