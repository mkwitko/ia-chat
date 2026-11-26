import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Page } from './wizard-model';

// Panel copy in pt-BR for the setup wizard: written for someone who never used software like this.

const ACTIVATE = 'Ligar o assistente';

interface PageInfo {
  title: string;
  text: string;
}

/** One question per screen (owner, 26/11/2026): the title asks, the line says why. */
export const PAGE_INFO: Record<Page, PageInfo> = {
  [Page.area]: {
    title: 'Qual é a sua área?',
    text: 'Assim o assistente já começa com exemplos da sua profissão. Toque numa opção.',
  },
  [Page.find]: {
    title: 'Onde seus pacientes acham você?',
    text: 'Cole o endereço do seu site ou do Google Maps, ou o texto do seu Instagram. A gente lê e você confere. Não tem? Toque em "Pular por agora".',
  },
  [Page.document]: {
    title: 'Qual é o seu CPF ou CNPJ?',
    text: 'Usamos só para a cobrança da assinatura. Os 14 dias de teste são grátis.',
  },
  [Page.whatsapp]: {
    title: 'Vamos ligar o seu WhatsApp',
    text: 'Use o mesmo número em que os pacientes já falam com você. O app no seu celular continua funcionando.',
  },
  [Page.services]: {
    title: 'O que você atende e quanto custa?',
    text: 'O assistente só informa o que estiver aqui, com o valor exato. Troque os exemplos pelos seus.',
  },
  [Page.hours]: {
    title: 'Em que dias e horários você atende?',
    text: 'O assistente só marca dentro destes horários.',
  },
  [Page.simulator]: {
    title: 'Vamos testar?',
    text: 'Escreva como se fosse um paciente. Nada é enviado a ninguém.',
  },
  [Page.activation]: {
    title: ACTIVATE,
    text: 'No começo, cada resposta espera a sua aprovação: você toca em Enviar e ela sai.',
  },
};

export const WizardCopy = defineMessages({
  [Locale.ptBR]: {
    leave: 'Sair e continuar depois',
    needArea: 'Escolha a sua área acima para continuar.',
    needDocument: 'Escreva o seu CPF ou CNPJ para continuar.',
    needWhatsapp: 'Conecte o WhatsApp para continuar, ou toque em "Pular por agora".',
    progress: (index: number, total: number) => `Passo ${String(index)} de ${String(total)}`,
    skip: 'Pular por agora',
    back: 'Voltar',
    next: 'Continuar',
    activate: ACTIVATE,
    connectWhatsapp: 'Conectar o WhatsApp primeiro',
    documentSaved: 'CPF ou CNPJ já informado.',
    doneTitle: 'Pronto!',
    doneText:
      'O assistente já está atendendo. Cada resposta espera a sua aprovação antes de sair, e você recebe um aviso no celular.',
    doneAction: 'Ver as conversas',
    doneSecondary: 'Mudar alguma coisa',
    loadFailed: 'Não conseguimos carregar. Confira a internet e tente de novo.',
  },
  [Locale.enUS]: {},
});
