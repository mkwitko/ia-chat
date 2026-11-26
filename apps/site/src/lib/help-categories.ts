/** Help center categories (spec 09), in display order. */
export const HELP_CATEGORIES = {
  comecar: 'Começar',
  'dia-a-dia': 'No dia a dia',
  assistente: 'Assistente',
  whatsapp: 'WhatsApp e Google (em breve)',
  conta: 'Plano e cobrança',
  alertas: 'Avisos do painel',
} as const;
export type HelpCategory = keyof typeof HELP_CATEGORIES;
export const HELP_CATEGORY_IDS = Object.keys(HELP_CATEGORIES) as [HelpCategory, ...HelpCategory[]];
