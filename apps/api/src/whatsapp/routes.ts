import type { AiGateway } from '@app/ai';
import { createBusinessClient, exchangeSignupCode } from '@app/channels';
import {
  Provider,
  decryptToken,
  translateProviderError,
  type WhatsappSignupConfig,
} from '@app/core';
import { ChannelStatus } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';
import { errorCodeOf, isReady, runSetup } from './steps.ts';
import { registerHistoryRoutes } from './history-routes.ts';
import { channelView, saveChannel, signupChannel } from './store.ts';

// E-24, spec 03 "Onboarding do canal": the panel runs Meta's Embedded Signup and posts the result
// here; we exchange the code, store the client's token and finish the setup at Meta.

const PATH = '/api/whatsapp';
const CONNECT_FAILED = 'whatsapp embedded signup failed';
const NO_NUMBER = 'no_number';
const MAX_CODE_LENGTH = 4096;

/** Graph ids are digits: nothing else may reach a Graph URL path. */
const metaId = z.string().regex(/^\d{1,32}$/);
const connectBody = z.object({
  code: z.string().min(1).max(MAX_CODE_LENGTH),
  wabaId: metaId,
  phoneNumberId: metaId.optional(),
  coexistence: z.boolean(),
});

export interface WhatsappSignupDeps {
  config: WhatsappSignupConfig | undefined;
  /** Test seam: the `fetch` used for the Graph API. */
  fetch?: typeof fetch | undefined;
  /** Model gateway for "IA sugere" over the imported history; off without it. */
  gateway?: AiGateway | undefined;
}
type Ready = WhatsappSignupDeps & { config: WhatsappSignupConfig };

export function registerWhatsappSignupRoutes(app: FastifyInstance, deps: WhatsappSignupDeps) {
  const { config } = deps;
  const manage = { preHandler: requireTenant(Permission.whatsappManage) };
  const off = (reply: FastifyReply) =>
    reply.code(HttpStatus.unavailable).send({ error: ErrorCode.whatsappOff });
  app.get(PATH, { preHandler: requireTenant(Permission.integrationsRead) }, async (request) => ({
    available: config !== undefined,
    ...(config ? { appId: config.appId, configId: config.configId } : {}),
    channel: channelView(await tenantOf(request).withTenant(signupChannel)),
  }));
  app.post(`${PATH}/connect`, manage, (request, reply) =>
    config ? connect(request, reply, { ...deps, config }) : off(reply),
  );
  app.post(`${PATH}/retry`, manage, (request, reply) =>
    config ? retry(request, reply, { ...deps, config }) : off(reply),
  );
  registerHistoryRoutes(app, deps);
}

function failed(reply: FastifyReply, code: string) {
  const friendly = translateProviderError({ provider: Provider.meta, code: Number(code) });
  return reply.code(HttpStatus.badGateway).send({ error: ErrorCode.whatsappFailed, ...friendly });
}

async function connect(request: FastifyRequest, reply: FastifyReply, deps: Ready) {
  const input = parsed(request, reply, connectBody);
  if (!input) return reply;
  const { tenant, body } = input;
  const signup = await exchange(request, body, deps);
  if ('error' in signup) return failed(reply, signup.error);
  const { db } = request.server;
  const route = await db.client.channelRoute.findUnique({ where: { accountId: signup.id } });
  if (route && route.tenantId !== tenant.tenantId)
    return reply.code(HttpStatus.conflict).send({ error: ErrorCode.whatsappTaken });
  const channel = await tenant.withTenant((tx) =>
    saveChannel(tx, {
      ...body,
      tenantId: tenant.tenantId,
      tokenKey: deps.config.tokenKey,
      token: signup.token,
      phoneNumberId: signup.id,
      displayPhone: signup.displayPhone,
    }),
  );
  // Routes are never rewritten (app_runtime has no UPDATE): the same number keeps its channel.
  if (!route)
    await db.client.channelRoute.create({
      data: { accountId: signup.id, tenantId: tenant.tenantId, channelId: channel.id },
    });
  return finish(request, channel.id, deps);
}

type Exchanged =
  { token: string; id: string; displayPhone: string | undefined } | { error: string };

/** Code for token, then the number: coexistence only reports the WABA, so we ask Meta. */
async function exchange(
  request: FastifyRequest,
  body: z.infer<typeof connectBody>,
  deps: Ready,
): Promise<Exchanged> {
  const { appId, appSecret } = deps.config;
  try {
    const token = await exchangeSignupCode({
      appId,
      appSecret,
      code: body.code,
      fetch: deps.fetch,
    });
    const numbers = await createBusinessClient({
      accessToken: token,
      fetch: deps.fetch,
    }).phoneNumbers(body.wabaId);
    const number = body.phoneNumberId
      ? numbers.find((one) => one.id === body.phoneNumberId)
      : numbers[0];
    if (!number) return { error: NO_NUMBER };
    return { token, id: number.id, displayPhone: number.display_phone_number };
  } catch (error) {
    request.log.warn(
      { tenantId: tenantOf(request).tenantId, error: String(error) },
      CONNECT_FAILED,
    );
    return { error: errorCodeOf(error) };
  }
}

async function retry(request: FastifyRequest, reply: FastifyReply, deps: Ready) {
  const row = await tenantOf(request).withTenant(signupChannel);
  if (!row) return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  return finish(request, row.id, deps);
}

/** Runs the steps not done yet and records where it stopped. */
async function finish(request: FastifyRequest, channelId: string, deps: Ready) {
  const tenant = tenantOf(request);
  const { tenantId } = tenant;
  const row = await tenant.withTenant((tx) =>
    tx.channel.findUniqueOrThrow({ where: { id: channelId } }),
  );
  const key = deps.config.tokenKey;
  const token = decryptToken(row.accessTokenEnc ?? '', key);
  const result = await runSetup(
    {
      client: createBusinessClient({ accessToken: token, fetch: deps.fetch }),
      wabaId: row.wabaId ?? '',
      phoneNumberId: row.phoneNumberId ?? '',
      coexistence: row.coexistence,
      pin: decryptToken(row.registerPinEnc ?? '', key),
    },
    row.setupDone,
  );
  if (result.error) request.log.warn({ tenantId, code: result.error }, CONNECT_FAILED);
  const saved = await tenant.withTenant((tx) =>
    tx.channel.update({
      where: { id: channelId },
      data: {
        setupDone: result.done,
        setupError: result.error,
        status: isReady(result.done) ? ChannelStatus.connected : ChannelStatus.pending,
      },
    }),
  );
  return { channel: channelView(saved) };
}
