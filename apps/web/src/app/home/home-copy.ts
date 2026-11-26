// Início (RN-56): second person, "assistente" never "bot", plain words.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many.replace('#', String(count));

export const HomeCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Início',
    hint: 'Aqui fica o resumo do seu dia: o que precisa de você, quem vem hoje e se o atendimento está funcionando.',
    loadFailed: 'Não conseguimos carregar o início.',
    loadFailedHint: 'Confira a internet e tente de novo.',
    empty: {
      title: 'Seu consultório começa aqui',
      body: 'Quando os pacientes mandarem mensagem no seu WhatsApp, você vê aqui o que precisa de você e quem vem hoje. Enquanto isso, converse com o assistente como se fosse um paciente.',
    },
    status: {
      label: 'Situação do atendimento',
      setupTitle: (step: string) => `Próximo passo: ${step}`,
      setupProgress: (done: number, total: number) =>
        `${String(done)} de ${String(total)} passos feitos`,
      setupAction: 'Continuar configuração',
      tipTitle: 'Sugestão para melhorar o atendimento',
      okTitle: 'Tudo funcionando',
    },
    attentionHeading: 'Precisa de você',
    allClear: 'Nada esperando por você agora.',
    drafts: (count: number) =>
      plural(count, '1 resposta esperando sua aprovação', '# respostas esperando sua aprovação'),
    unanswered: (count: number) =>
      plural(
        count,
        '1 pergunta que o assistente não soube responder',
        '# perguntas que o assistente não soube responder',
      ),
    toConfirm: (count: number) =>
      plural(
        count,
        '1 atendimento nos próximos 2 dias ainda sem confirmação',
        '# atendimentos nos próximos 2 dias ainda sem confirmação',
      ),
    notBooked: (count: number) =>
      plural(count, '1 pessoa conversou e não agendou', '# pessoas conversaram e não agendaram'),
    toMarkHeading: 'Veio ou faltou?',
    ending: (count: number) =>
      plural(count, '1 cliente com o pacote no fim', '# clientes com o pacote no fim'),
    todayHeading: 'Hoje',
    todayEmpty: 'Ninguém marcado para hoje.',
    todayDone: 'Mais ninguém para hoje.',
    seeAgenda: 'Ver a agenda',
    noPatient: 'Paciente sem nome',
    seeResults: 'Ver como foi o mês',
  },
  [Locale.enUS]: {},
});
