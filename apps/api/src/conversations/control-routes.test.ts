import { randomUUID } from 'node:crypto';
import { ConversationControl } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// E-12: panel "Assumir" / "Devolver ao assistente", audited, tenant-scoped.

let ctx: TestContext;
let cookie: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  cookie = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, cookie);
});
afterAll(() => ctx.app.close());

async function newConversation(owner: string): Promise<string> {
  return ctx.db.withTenant(owner, async (tx) => {
    const channel = await tx.channel.create({ data: { tenantId: owner, kind: 'cloud_api' } });
    const contact = await tx.contact.create({
      data: { tenantId: owner, bsuid: `BR.${randomUUID()}` },
    });
    const conversation = await tx.conversation.create({
      data: { tenantId: owner, channelId: channel.id, contactId: contact.id },
    });
    return conversation.id;
  });
}

const control = (id: string, to: string, session = cookie) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/conversations/${id}/control`,
    payload: { to },
    headers: { cookie: session },
  });

describe('conversation control from the panel', () => {
  it('takes over and hands back, writing the audit log', async () => {
    const id = await newConversation(tenantId);
    expect((await control(id, ConversationControl.human)).json()).toEqual({
      control: 'human',
      changed: true,
    });
    expect((await control(id, ConversationControl.ai)).json()).toEqual({
      control: 'ai',
      changed: true,
    });
    const audit = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entityId: id } }),
    );
    expect(audit.map((entry) => entry.after)).toEqual([
      { control: 'human', reason: 'dashboard' },
      { control: 'ai', reason: 'dashboard' },
    ]);
  });

  it('does not find another tenant conversation', async () => {
    const otherCookie = await signUpVerified(ctx);
    const otherTenant = await createTenant(ctx, otherCookie);
    const foreign = await newConversation(otherTenant);
    expect((await control(foreign, ConversationControl.human)).statusCode).toBe(404);
  });

  it('refuses an invalid target and a missing session', async () => {
    const id = await newConversation(tenantId);
    expect((await control(id, 'robot')).statusCode).toBe(400);
    expect((await control(id, ConversationControl.human, '')).statusCode).toBe(401);
  });
});
