import { REFERRAL_CODE_PATTERN } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import type { EmailSender } from '../email/outbox.ts';
import { waitlistEmail } from '../email/templates.ts';
import type { AppDeps } from '../app.ts';
import { devEmailSender } from '../email/dev-sender.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { createRateLimiter } from './rate-limit.ts';
import { cloudflareVerifier, type TurnstileVerifier } from './turnstile.ts';

const PATH = '/api/waitlist';
const MAX_TEXT = 120;
const MAX_EMAIL = 254; // RFC 5321 address limit
const MAX_TOKEN = 2048;
const ALLOW_ORIGIN = 'access-control-allow-origin';
const NO_CONTENT = 204;
const TOO_MANY = 429;
const TOO_MANY_CODE = 'too_many_requests';

const bodySchema = z.object({
  email: z
    .email()
    .max(MAX_EMAIL)
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().max(MAX_TEXT).optional(),
  specialty: z.string().trim().max(MAX_TEXT).optional(),
  /** M-11: the code of the business whose link brought the person; a bad one is ignored. */
  ref: z.string().trim().toUpperCase().regex(REFERRAL_CODE_PATTERN).optional().catch(undefined),
  token: z.string().min(1).max(MAX_TOKEN),
});

export interface WaitlistDeps {
  /** The only origin allowed to call this route (the public site). */
  siteOrigin: string;
  verify: TurnstileVerifier;
  email: EmailSender;
}

/** Turns the route on only when the site origin and the Turnstile secret are configured. */
export function registerWaitlistIfConfigured(app: FastifyInstance, deps: AppDeps): void {
  const { SITE_ORIGIN: siteOrigin, TURNSTILE_SECRET_KEY: secret } = deps.env;
  if (!siteOrigin || !secret) return;
  registerWaitlistRoutes(app, {
    siteOrigin: new URL(siteOrigin).origin,
    verify: deps.verifyTurnstile ?? cloudflareVerifier(secret),
    email: deps.email ?? devEmailSender(app.log),
  });
}

/** S-01: public signup for early access. Idempotent by email; confirmation sent only once. */
export function registerWaitlistRoutes(app: FastifyInstance, deps: WaitlistDeps): void {
  const allowed = createRateLimiter();
  const cors = (request: FastifyRequest, reply: FastifyReply) => {
    if (request.headers.origin === deps.siteOrigin) {
      void reply.header(ALLOW_ORIGIN, deps.siteOrigin).header('vary', 'origin');
    }
  };
  app.options(PATH, (request, reply) => {
    cors(request, reply);
    return reply
      .header('access-control-allow-methods', 'POST')
      .header('access-control-allow-headers', 'content-type')
      .code(NO_CONTENT)
      .send();
  });
  app.post(PATH, async (request, reply) => {
    cors(request, reply);
    if (!allowed(request.ip)) return reply.code(TOO_MANY).send({ error: TOO_MANY_CODE });
    return signUp({ app, deps }, request, reply);
  });
}

interface Context {
  app: FastifyInstance;
  deps: WaitlistDeps;
}

async function signUp({ app, deps }: Context, request: FastifyRequest, reply: FastifyReply) {
  const body = bodySchema.safeParse(request.body);
  if (!body.success)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  const { token, ref, ...data } = body.data;
  if (!(await deps.verify(token, request.ip))) {
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  }
  const { count } = await app.db.client.waitlistEntry.createMany({
    data: {
      ...data,
      name: data.name ?? null,
      specialty: data.specialty ?? null,
      referralCode: await knownReferral(app, ref),
    },
    skipDuplicates: true,
  });
  if (count > 0) await confirm(app, deps, data.email);
  return reply.code(HttpStatus.created).send({ ok: true });
}

/** Only a code some business really has is stored; the answer never says which are valid. */
async function knownReferral(app: FastifyInstance, ref: string | undefined) {
  if (!ref) return null;
  const owner = await app.db.client.tenant.findUnique({
    where: { referralCode: ref },
    select: { id: true },
  });
  return owner ? ref : null;
}

/** A signup whose confirmation cannot be sent is removed, so trying again works. */
async function confirm(app: FastifyInstance, deps: WaitlistDeps, email: string): Promise<void> {
  try {
    await deps.email.send(waitlistEmail(email));
  } catch (error) {
    await app.db.client.waitlistEntry.delete({ where: { email } });
    throw error;
  }
}
