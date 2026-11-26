// Panel copy in pt-BR for "Revisar importação" (E-24b, spec 03).

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const ReviewCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Revisar importação',
    back: 'WhatsApp',
    intro:
      'Escolha quem vira cliente. As mensagens são opcionais: marque "Trazer as mensagens" só nas conversas que você quer consultar. O que você não escolher é apagado.',
    searchLabel: 'Buscar por nome ou telefone',
    selectAll: 'Selecionar todos',
    selectNone: 'Limpar seleção',
    noName: 'Sem nome',
    clientLabel: (name: string) => `Adicionar ${name} como cliente`,
    bringMessages: 'Trazer as mensagens',
    messageCount: (count: number) => (count === 1 ? '1 mensagem' : `${String(count)} mensagens`),
    noMessages: 'Só o contato, sem conversa',
    lastMessage: (day: string) => `última em ${day}`,
    showMessages: 'Ver mensagens',
    hideMessages: 'Esconder mensagens',
    previewHeading: 'Últimas mensagens',
    previewMe: 'Você',
    previewThem: 'Cliente',
    previewMedia: 'Áudio, imagem ou documento (não é baixado)',
    previewFailed: 'Não deu para carregar as mensagens.',
    summary: (clients: number, total: number, messages: number) =>
      `${String(clients)} de ${String(total)} viram clientes · ${String(messages)} com mensagens`,
    confirm: (clients: number) =>
      clients === 1 ? 'Importar 1 cliente' : `Importar ${String(clients)} clientes`,
    confirming: 'Importando…',
    discard: 'Descartar tudo',
    discardAsk: 'Apagar tudo que veio do histórico sem importar ninguém?',
    discardYes: 'Sim, descartar',
    discardNo: 'Voltar',
    imported: (clients: number, messages: number) =>
      [
        `${String(clients)} em Clientes`,
        messages > 0 ? `${String(messages)} mensagens nas conversas` : null,
        'o restante foi apagado',
      ]
        .filter(Boolean)
        .join(', ') + '.',
    discarded: 'Tudo que veio do histórico foi apagado.',
    failed: 'Não deu certo agora. Tente de novo em instantes.',
    loadFailed: 'Não deu para carregar a lista de contatos.',
    empty: 'Não há nada para revisar agora.',
    emptyFilter: 'Ninguém com esse nome ou telefone.',
    open: (count: number) => `Revisar importação (${String(count)} contatos)`,
    checklist: (count: number) => `Escolher quem importar do WhatsApp (${String(count)} contatos)`,
    openHint: 'Os contatos chegaram. Nada entra em Clientes até você escolher.',
  },
  [Locale.enUS]: {},
});
