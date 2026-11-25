import * as z from 'zod';

// Spec 04, "Tom de voz": four questions plus 5 to 15 real messages become a style block.

export const Formality = { formal: 'formal', informal: 'informal' } as const;
export const EmojiUse = { never: 'never', sometimes: 'sometimes', often: 'often' } as const;

const MAX_SHORT = 120;
const MAX_EXAMPLE = 500;
const MAX_EXAMPLES = 15;
const MAX_NAME = 80;

export const toneAnswersSchema = z
  .object({
    formality: z.enum(Formality),
    emoji: z.enum(EmojiUse),
    greeting: z.string().trim().max(MAX_SHORT),
    farewell: z.string().trim().max(MAX_SHORT),
  })
  .strict();
export type ToneAnswers = z.infer<typeof toneAnswersSchema>;

export const toneBodySchema = z
  .object({
    professionalName: z.string().trim().min(1).max(MAX_NAME),
    answers: toneAnswersSchema,
    examples: z.array(z.string().trim().min(1).max(MAX_EXAMPLE)).max(MAX_EXAMPLES),
  })
  .strict();

export const DEFAULT_ANSWERS: ToneAnswers = {
  formality: Formality.formal,
  emoji: EmojiUse.never,
  greeting: '',
  farewell: '',
};

const FORMALITY_TEXT = {
  [Formality.formal]:
    'Escreve de forma educada e formal, tratando o paciente por "você" sem gírias.',
  [Formality.informal]: 'Escreve de forma leve e próxima, como numa conversa de WhatsApp.',
} as const;
const EMOJI_TEXT = {
  [EmojiUse.never]: 'Não usa emoji.',
  [EmojiUse.sometimes]: 'Usa emoji de vez em quando, no máximo um por mensagem.',
  [EmojiUse.often]: 'Usa emoji com frequência.',
} as const;

/** The text the prompt receives as the professional's tone (professionals.tone_of_voice). */
export function toneText(answers: ToneAnswers): string {
  return [
    FORMALITY_TEXT[answers.formality],
    EMOJI_TEXT[answers.emoji],
    answers.greeting && `Cumprimenta assim: "${answers.greeting}".`,
    answers.farewell && `Despede-se assim: "${answers.farewell}".`,
  ]
    .filter(Boolean)
    .join(' ');
}
