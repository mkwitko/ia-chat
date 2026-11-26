import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Page } from './wizard-model';

// Panel copy in pt-BR for the setup wizard: written for someone who never used software like this.
// Each screen: the question (title), what to do (text) and, apart, why we ask (owner, 26/11/2026).

const ACTIVATE = 'Ligar o assistente';

export const WizardCopy = defineMessages({
  [Locale.ptBR]: {
    pages: {
      [Page.area]: {
        title: 'Qual é a sua área?',
        text: 'Toque numa opção.',
        why: 'O assistente já começa com serviços e respostas de exemplo da sua profissão.',
      },
      [Page.find]: {
        title: 'Onde seus pacientes acham você?',
        text: 'Cole o endereço do seu site ou do Google Maps, ou o texto do seu Instagram. A gente lê e você confere. Não tem? Toque em "Pular por agora".',
        why: 'Assim você não precisa digitar endereço, serviços e horários do zero.',
      },
      [Page.document]: {
        title: 'Qual é o seu CPF ou CNPJ?',
        text: 'Só os números.',
        why: 'Só para a cobrança da assinatura. Os 14 dias de teste são grátis.',
      },
      [Page.whatsapp]: {
        title: 'Vamos ligar o seu WhatsApp',
        text: 'Use o mesmo número em que os pacientes já falam com você. O app no seu celular continua funcionando.',
        why: 'É por esse número que o assistente responde os seus pacientes.',
      },
      [Page.services]: {
        title: 'O que você atende e quanto custa?',
        text: 'Já deixamos exemplos da sua área. Troque pelos seus nomes e valores.',
        why: 'O assistente só informa o que estiver aqui, com o valor exato. Ele nunca inventa preço.',
      },
      [Page.hours]: {
        title: 'Em que dias e horários você atende?',
        text: 'Confira os dias e horários, mude o que for diferente e toque em Salvar.',
        why: 'O assistente só marca dentro destes horários.',
      },
      [Page.simulator]: {
        title: 'Vamos testar?',
        text: 'Escreva como se fosse um paciente. Nada é enviado a ninguém.',
        why: 'Para você ver como o assistente responde antes de ligar.',
      },
      [Page.activation]: {
        title: ACTIVATE,
        text: 'No começo, cada resposta espera a sua aprovação: você toca em Enviar e ela sai.',
        why: 'Você continua no controle: nada sai sem você ver.',
      },
      [Page.liveTest]: {
        title: 'Teste agora: mande um alô',
        text: 'Pegue outro celular e mande "alô" para o seu número no WhatsApp. A mensagem aparece aqui assim que chegar.',
        why: 'Para você ver, com os próprios olhos, o assistente recebendo uma mensagem de verdade.',
      },
    },
    whyLabel: 'Por que perguntamos isso:',
    leave: 'Sair e continuar depois',
    needArea: 'Escolha a sua área acima para continuar.',
    needDocument: 'Escreva o seu CPF ou CNPJ para continuar.',
    needWhatsapp: 'Conecte o WhatsApp para continuar, ou toque em "Pular por agora".',
    progress: (index: number, total: number) => `Passo ${String(index)} de ${String(total)}`,
    skip: 'Pular por agora',
    back: 'Voltar',
    next: 'Continuar',
    seeSummary: 'Ver o resumo',
    activate: ACTIVATE,
    connectWhatsapp: 'Conectar o WhatsApp primeiro',
    documentSaved: 'CPF ou CNPJ já informado.',
    doneTitle: 'Pronto! Veja como ficou',
    doneText:
      'O assistente já está atendendo. Cada resposta espera a sua aprovação antes de sair, e você recebe um aviso no celular. Toque numa linha para mudar.',
    doneArea: 'Área',
    doneAction: 'Ver as conversas',
    loadFailed: 'Não conseguimos carregar. Confira a internet e tente de novo.',
  },
  [Locale.enUS]: {},
});
