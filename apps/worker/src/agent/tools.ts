import { handoffTool, OK, ToolName, unansweredTool, type ToolEffects } from '@app/agent';
import { KnowledgeSource, Plan, type Db } from '@app/db';
import { tool, type ToolSet } from 'ai';
import * as z from 'zod';
import { agendaTools } from './agenda-tools.ts';

// Essencial plan tools (spec 04, "Ferramentas"). tenant_id comes from the context, never
// from the model. The handoff only marks the intent: the turn applies it under the send
// lock, after the notice reaches the patient (RF-35).

export { ToolName, type ToolEffects };

const MAX_NAME_LENGTH = 80;

export interface ToolContext {
  db: Db;
  tenantId: string;
  contactId: string;
  conversationId: string;
  /** Idempotency scope of the write tools: one per turn. */
  turnId: string;
  /** Start of this turn: offers made from here on do not count as confirmed yet. */
  now: Date;
  timezone: string;
  effects: ToolEffects;
}

/** Spec 04: the tools of the tenant's plan. Agenda tools only where the plan includes Agenda. */
export function conversationTools(context: ToolContext, plan: Plan): ToolSet {
  return plan === Plan.essencial
    ? essentialTools(context)
    : { ...essentialTools(context), ...agendaTools(context) };
}

export function essentialTools(context: ToolContext): ToolSet {
  return {
    [ToolName.handoff]: handoffTool(context.effects),
    [ToolName.unanswered]: unansweredTool(recordUnanswered(context)),
    [ToolName.rename]: renameTool(context),
  };
}

function recordUnanswered({ db, tenantId }: ToolContext) {
  return (pergunta: string) =>
    db.withTenant(tenantId, (tx) =>
      tx.knowledgeItem.create({
        data: { tenantId, question: pergunta, source: KnowledgeSource.unanswered, active: false },
      }),
    );
}

function renameTool({ db, tenantId, contactId }: ToolContext) {
  return tool({
    description: 'Atualiza o nome do contato quando o paciente disser como se chama.',
    inputSchema: z.object({ nome: z.string().min(1).max(MAX_NAME_LENGTH) }),
    execute: async ({ nome }) => {
      await db.withTenant(tenantId, (tx) =>
        tx.contact.update({ where: { id: contactId }, data: { name: nome } }),
      );
      return OK;
    },
  });
}
