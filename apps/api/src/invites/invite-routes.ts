import { InviteState, NodeEnv } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { AUTH_BASE_PATH } from '../auth/auth.ts';
import type { EmailSender } from '../email/outbox.ts';
import { onboardingInviteEmail } from '../email/templates.ts';
import type { ApiEnv } from '../env.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { requireOperator } from '../operator/operator-guard.ts';
import {
  cancelInvite,
  createInvite,
  listInvites,
  publicInvite,
  resendInvite,
  type InviteChange,
  type InviteView,
} from './invite-store.ts';
import { INVITE_COOKIE } from './signup-gate.ts';

// H-37: the operator creates, lists, resends and cancels onboarding invites; the invite page reads one.

const OPERATOR_PATH = '/api/operator/invites';
const PUBLIC_PATH = '/api/invites/:token';
const INVITE_PATH = '/convite';
const GUARD_MISSING = 'operator guard missing';
const MAX_NAME = 80;
const MAX_TOKEN = 64;
const MS_PER_SECOND = 1000;
const SET_COOKIE = 'set-cookie';
const LogEvent = {
  created: 'invite.created',
  resent: 'invite.resent',
  cancelled: 'invite.cancelled',
  emailFailed: 'invite.email_failed',
} as const;

const createBody = z
  .object({
    practiceName: z.string().trim().min(1).max(MAX_NAME),
    email: z.email().toLowerCase().nullish(),
  })
  .strict();
const idParams = z.object({ id: z.uuid() });
const tokenParams = z.object({ token: z.string().min(1).max(MAX_TOKEN) });

export interface InviteRouteConfig {
  /** Panel origin: the link is `${webOrigin}/convite/${token}`. */
  webOrigin: string;
  secureCookie: boolean;
  email: EmailSender;
}

declare module 'fastify' {
  interface FastifyInstance {
    invites: InviteRouteConfig;
  }
}

export function registerInviteRoutes(
  app: FastifyInstance,
  env: Pick<ApiEnv, 'WEB_ORIGIN' | 'NODE_ENV'>,
  email: EmailSender,
): void {
  const secureCookie = env.NODE_ENV === NodeEnv.production;
  app.decorate('invites', { webOrigin: env.WEB_ORIGIN, secureCookie, email });
  const preHandler = requireOperator;
  app.get(OPERATOR_PATH, { preHandler }, (request) => listInvites(request.server.db, new Date()));
  app.post(OPERATOR_PATH, { preHandler }, create);
  app.post(`${OPERATOR_PATH}/:id/resend`, { preHandler }, (request, reply) =>
    change(request, reply, LogEvent.resent),
  );
  app.post(`${OPERATOR_PATH}/:id/cancel`, { preHandler }, (request, reply) =>
    change(request, reply, LogEvent.cancelled),
  );
  app.get(PUBLIC_PATH, readPublic);
}

function operatorId(request: FastifyRequest): string {
  if (!request.operator) throw new Error(GUARD_MISSING);
  return request.operator.userId;
}

const linkFor = (request: FastifyRequest, token: string) =>
  `${request.server.invites.webOrigin}${INVITE_PATH}/${token}`;

async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = createBody.safeParse(request.body);
  if (!body.success)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  const { token, invite } = await createInvite(request.server.db, {
    practiceName: body.data.practiceName,
    email: body.data.email ?? null,
    operatorId: operatorId(request),
    now: new Date(),
  });
  request.log.info({ inviteId: invite.id, operatorId: operatorId(request) }, LogEvent.created);
  const link = linkFor(request, token);
  const emailed = await emailLink(request, invite, link);
  return reply.code(HttpStatus.created).send({ invite, link, emailed });
}

/** Sends the link to the invite's address, when it has one. A failure leaves "Copiar link". */
async function emailLink(request: FastifyRequest, invite: InviteView, url: string) {
  if (!invite.email) return false;
  const message = onboardingInviteEmail({
    to: invite.email,
    url,
    practiceName: invite.practiceName,
  });
  try {
    await request.server.invites.email.send(message);
    return true;
  } catch (error) {
    request.log.warn({ inviteId: invite.id, err: error }, LogEvent.emailFailed);
    return false;
  }
}

async function change(request: FastifyRequest, reply: FastifyReply, event: string) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  const input: InviteChange = {
    id: params.data.id,
    operatorId: operatorId(request),
    now: new Date(),
  };
  const { db } = request.server;
  const result =
    event === LogEvent.resent
      ? await resendInvite(db, input)
      : await cancelInvite(db, input).then((invite) => invite && { invite, token: null });
  // Unknown, used or cancelled: only a pending invite can be resent or cancelled.
  if (!result) return reply.code(HttpStatus.conflict).send({ error: ErrorCode.inviteClosed });
  request.log.info({ inviteId: input.id, operatorId: input.operatorId }, event);
  const link = result.token ? linkFor(request, result.token) : null;
  const emailed = link ? await emailLink(request, result.invite, link) : false;
  return { invite: result.invite, link, emailed };
}

/** The invite page: state and practice name; a pending link also arms the sign-up cookie. */
async function readPublic(request: FastifyRequest, reply: FastifyReply) {
  const params = tokenParams.safeParse(request.params);
  const now = new Date();
  const invite = params.success
    ? await publicInvite(request.server.db, params.data.token, now)
    : null;
  if (!params.success || !invite)
    return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  if (invite.state === InviteState.pending) {
    const seconds = Math.floor((invite.expiresAt.getTime() - now.getTime()) / MS_PER_SECOND);
    reply.header(
      SET_COOKIE,
      inviteCookie(params.data.token, seconds, request.server.invites.secureCookie),
    );
  }
  return { state: invite.state, practiceName: invite.practiceName, email: invite.email };
}

/** Sent only to Better Auth (sign-up, Google callback); unreadable by scripts. */
function inviteCookie(token: string, maxAge: number, secure: boolean): string {
  const parts = [
    `${INVITE_COOKIE}=${token}`,
    `Path=${AUTH_BASE_PATH}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${String(maxAge)}`,
  ];
  return (secure ? [...parts, 'Secure'] : parts).join('; ');
}
