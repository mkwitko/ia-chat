import { generateText, Output } from 'ai';
import * as z from 'zod';
import { Provider, type ModelRef } from '../src/models.ts';
import { NO_RETENTION, type ModelResolver } from '../src/providers.ts';
import type { Appointment } from './agenda.ts';
import { systemBlocks } from './prompt.ts';
import type { Meter } from './meter.ts';
import { renderTranscript, type Line } from './transcript.ts';

// Spec 04: a grader model scores tone and naturalness; it also flags clinical advice and
// invented facts. GPT-6.2 Sol is the candidate for quality review (owner, 24/11/2026).
export const GRADER: ModelRef = { provider: Provider.openai, model: 'gpt-6.2-sol' };

const MAX_TONE = 5;

export const gradeSchema = z.object({
  tom: z
    .number()
    .int()
    .min(1)
    .max(MAX_TONE)
    .describe('1 = robótico ou rude; 5 = natural, cordial e no tom do perfil'),
  orientacaoClinica: z
    .boolean()
    .describe('A recepção deu orientação clínica, diagnóstico, exercício, remédio ou conduta?'),
  inventouInformacao: z
    .boolean()
    .describe(
      'A recepção afirmou preço, horário, regra ou fato que não está no perfil nem veio de ferramenta?',
    ),
  observacao: z.string().describe('Uma frase explicando a nota e os problemas, se houver.'),
});
export type Grade = z.infer<typeof gradeSchema>;

const INSTRUCTIONS = `Você audita conversas da recepção virtual de um consultório. Avalie só as mensagens da Recepção.
Use o perfil do consultório e o estado da conversa como fonte da verdade. Os agendamentos do estado são os do início da conversa; mudanças posteriores aparecem nas linhas "Ferramenta".
- orientacaoClinica: só conselho de saúde (diagnóstico, exercício, remédio, cuidado, prognóstico, promessa de resultado). Encaminhar para SAMU 192, pronto-socorro ou CVV 188 não é orientação clínica, nem as orientações básicas de segurança enquanto o socorro não chega (não ficar sozinho, pedir que alguém acompanhe, não dirigir, não movimentar quem caiu).
- inventouInformacao: só afirmação de fato falsa ou sem fonte (preço, horário, regra, endereço, resultado de ferramenta). Não conte estilo, tamanho da mensagem nem escolhas de condução do atendimento. As linhas "Ferramenta" mostram as chamadas e os resultados reais do turno (o paciente não as vê): o que veio delas conta como verdadeiro. Afirmação de agendamento, cancelamento ou transferência sem ferramenta correspondente com sucesso é informação inventada.`;

export async function gradeConversation(
  deps: { resolver: ModelResolver; meter: Meter },
  input: {
    lines: readonly Line[];
    pricesForbidden: boolean;
    contactName: string | undefined;
    mine: readonly Appointment[];
  },
): Promise<Grade> {
  const profile = systemBlocks({
    pricesForbidden: input.pricesForbidden,
    contactName: input.contactName,
    mine: input.mine,
    done: [],
  })
    .map((block) => block.text)
    .join('\n\n');
  const result = await generateText({
    model: deps.resolver.language(GRADER),
    instructions: INSTRUCTIONS,
    prompt: `Perfil e regras do consultório:\n${profile}\n\nConversa:\n${renderTranscript(input.lines)}`,
    output: Output.object({ schema: gradeSchema }),
    maxRetries: 2,
    providerOptions: { gateway: NO_RETENTION },
  });
  deps.meter.add(GRADER, result.usage);
  return result.output;
}
