import { tool } from 'ai';
import * as z from 'zod';

// Tools the conversation agent and the simulator share. The tenant comes from the caller's
// context, never from the model. The handoff only marks the intent (RF-35).

export const ToolName = {
  handoff: 'transferir_para_humano',
  unanswered: 'registrar_duvida_sem_resposta',
  rename: 'atualizar_nome_do_contato',
  packages: 'consultar_saldo_de_pacotes',
} as const;

export const AgendaToolName = {
  availability: 'consultar_horarios',
  book: 'agendar',
  reschedule: 'remarcar',
  cancel: 'cancelar',
  confirm: 'confirmar_presenca',
  list: 'listar_agendamentos_do_paciente',
} as const;

export const OK = { ok: true } as const;

/** Free text the model writes is capped before it is stored (M-03). */
export const MAX_QUESTION_LENGTH = 300;

export interface ToolEffects {
  handoff: boolean;
}

export function handoffTool(effects: ToolEffects) {
  return tool({
    description:
      'Passa a conversa para o profissional: pedido do paciente, reclamação, urgência ou assunto que você não resolve.',
    inputSchema: z.object({ motivo: z.string() }),
    execute: () => {
      effects.handoff = true;
      return Promise.resolve(OK);
    },
  });
}

/** `record` stores the question (the worker) or does nothing (the simulator). */
export function unansweredTool(record: (question: string) => Promise<unknown>) {
  return tool({
    description:
      'Registra uma pergunta sobre o consultório que o perfil não responde, para o profissional completar a base.',
    inputSchema: z.object({ pergunta: z.string().min(1).max(MAX_QUESTION_LENGTH) }),
    execute: async ({ pergunta }) => {
      await record(pergunta);
      return OK;
    },
  });
}
