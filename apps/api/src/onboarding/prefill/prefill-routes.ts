import { pageInput, PREFILL_INSTRUCTIONS, prefillSchema, Task, type AiGateway } from '@app/ai';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../../auth/access.ts';
import { requireTenant } from '../../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../../http.ts';
import { parsed } from '../../setup/guarded.ts';
import { createTurnLimiter } from '../../simulator/turn-limiter.ts';
import { MAX_PAGE_TEXT, pageText } from './page-text.ts';
import { PageFetchError, type PageFetcher } from './safe-fetch.ts';
import { suggestionOf } from './suggestion.ts';

// Spec 09, "Onde te encontram": one link (site, Google Maps) or pasted text (Instagram bio)
// becomes a suggestion for the review screen. Nothing is saved here; the owner approves first.

export const PREFILL_PATH = '/api/onboarding/prefill';
const MAX_SOURCE = 4_000;
const MIN_TEXT = 30;
const SCHEME = /^https?:\/\//i;
const LOOKS_LIKE_LINK = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i;
const HTTPS = 'https://';
const UNKNOWN = 'unknown';
// Social networks forbid scraping in their terms: the owner pastes the bio text instead.
const SOCIAL_HOSTS = /(^|\.)(instagram\.com|facebook\.com|tiktok\.com)$/i;

const bodySchema = z.object({ source: z.string().trim().min(1).max(MAX_SOURCE) }).strict();

export interface PrefillDeps {
  gateway: AiGateway | undefined;
  fetchPage: PageFetcher;
}

export function registerPrefillRoutes(app: FastifyInstance, deps: PrefillDeps): void {
  const limiter = createTurnLimiter();
  app.post(
    PREFILL_PATH,
    { preHandler: requireTenant(Permission.assistantManage) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = parsed(request, reply, bodySchema);
      if (!input) return reply;
      if (!deps.gateway)
        return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.prefillOff });
      if (!limiter.take(input.tenant.tenantId))
        return reply.code(HttpStatus.tooManyRequests).send({ error: ErrorCode.rateLimited });
      const text = await readSource(input.body.source, deps.fetchPage, request);
      if (!text.ok) return reply.code(HttpStatus.unprocessable).send({ error: text.error });
      try {
        const extracted = await deps.gateway.extract({
          tenantId: input.tenant.tenantId,
          task: Task.prefill,
          instructions: PREFILL_INSTRUCTIONS,
          input: pageInput(text.value),
          schema: prefillSchema,
        });
        return { suggestion: suggestionOf(extracted, text.value) };
      } catch (error) {
        // The error name only: provider errors may carry the generated text.
        const errorName = error instanceof Error ? error.name : UNKNOWN;
        request.log.warn({ prefillError: errorName }, 'prefill extraction failed');
        return reply.code(HttpStatus.badGateway).send({ error: ErrorCode.prefillFailed });
      }
    },
  );
}

type Read = { ok: true; value: string } | { ok: false; error: ErrorCode };

async function readSource(
  source: string,
  fetchPage: PageFetcher,
  request: FastifyRequest,
): Promise<Read> {
  if (!LOOKS_LIKE_LINK.test(source)) return enough(source.slice(0, MAX_PAGE_TEXT));
  const url = SCHEME.test(source) ? source : HTTPS + source;
  if (SOCIAL_HOSTS.test(hostOf(url))) return { ok: false, error: ErrorCode.pasteText };
  try {
    return enough(pageText(await fetchPage(url)));
  } catch (error) {
    // The code only: never the URL's content.
    const code = error instanceof PageFetchError ? error.code : UNKNOWN;
    request.log.info({ prefillFetch: code }, 'prefill page not read');
    return { ok: false, error: ErrorCode.pageUnreadable };
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function enough(value: string): Read {
  return value.trim().length >= MIN_TEXT
    ? { ok: true, value }
    : { ok: false, error: ErrorCode.pageUnreadable };
}
