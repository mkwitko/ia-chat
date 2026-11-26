// Panel copy in pt-BR for importing the WhatsApp Business app's history (E-24b, spec 03).

export const HistoryCopy = {
  title: 'Trazer o histórico do seu WhatsApp?',
  intro:
    'Você usa o WhatsApp Business no celular. Se quiser, trazemos seus contatos e as conversas recentes para cá, só para você consultar.',
  deadline: (when: string) => `Você pode decidir até ${when}. Depois disso a Meta não deixa pedir.`,
  imports: 'O que trazemos',
  importsList: [
    'Nome e número dos seus contatos, para você escolher quem vira cliente.',
    'As mensagens de texto dos últimos 90 dias, só das conversas que você escolher trazer.',
  ],
  discards: 'O que não trazemos e o que não fazemos',
  discardsList: [
    'Áudios, imagens e documentos: não são baixados.',
    'Mensagens com mais de 90 dias: descartadas.',
    'O assistente não lê nem responde essas mensagens antigas.',
    'Mensagens sobre sintomas ou saúde nunca vão para a IA.',
  ],
  phoneStep:
    'O celular vai perguntar se você permite compartilhar o histórico. Deixe o app WhatsApp Business aberto até terminar.',
  authorize: 'Autorizar e trazer',
  later: 'Agora não',
  working: 'Pedindo à Meta…',
  failed: 'A Meta não aceitou o pedido agora. Tente de novo em instantes.',
  closed: 'O prazo de 24 horas para trazer o histórico já passou.',
  requested: (percent: number | null) =>
    percent === null
      ? 'Trazendo o histórico. Pode levar alguns minutos; deixe o app WhatsApp Business aberto.'
      : `Trazendo o histórico: ${String(percent)}%. Deixe o app WhatsApp Business aberto.`,
  done: 'Histórico recebido. Só entra em Clientes e em Conversas o que você escolher; o resto é apagado.',
  unavailable:
    'O histórico não foi liberado no app do celular, então não veio nada. Para tentar de novo, seria preciso refazer a conexão.',
  suggestTitle: 'Perguntas frequentes a partir do histórico',
  suggestWhy:
    'A IA lê só as perguntas sem informação de saúde e sugere as mais comuns. Nada é publicado: você responde e aprova em Assistente.',
  suggest: 'Sugerir com IA',
  suggesting: 'Procurando…',
  suggestedNone: 'Nenhuma pergunta nova para sugerir.',
  suggested: (count: number) =>
    count === 1
      ? '1 pergunta nova foi para a lista do assistente.'
      : `${String(count)} perguntas novas foram para a lista do assistente.`,
  suggestOff: 'A sugestão com IA não está disponível agora.',
} as const;
