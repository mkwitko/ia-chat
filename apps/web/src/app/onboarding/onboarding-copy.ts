import { Route } from '@/routes';
import { Step } from './onboarding-api';

// Panel copy in pt-BR for the guided setup (spec 09, "Cadastro e ativação sem ajuda").

export const OnboardingCopy = {
  title: 'Configuração guiada',
  intro: 'Um passo de cada vez, nesta ordem. Seu progresso fica salvo e dá para continuar depois.',
  progress: (index: number, total: number) => `Passo ${String(index)} de ${String(total)}`,
  back: 'Voltar',
  allDone: 'Configuração concluída. Toque num passo para revisar.',
  documentSaved: 'CPF ou CNPJ já informado.',
  activationNeedsWhatsapp:
    'Para ativar, conecte o WhatsApp no passo 2. Os 14 dias de teste começam quando ele conecta.',
  documentRequired: 'Informe o CPF ou CNPJ antes de seguir.',
  whatsappRequired: 'O WhatsApp ainda não está conectado. Conecte ou toque em "Conectar depois".',
  loadFailed: 'Não conseguimos carregar. Confira a conexão e tente de novo.',
  statusDone: 'Feito',
  statusSkipped: 'Pulado',
  next: 'Continuar',
  specialtyLabel: 'Qual é a sua especialidade?',
  useTemplate: 'Usar modelos de exemplo',
  templateDone: (services: number, answers: number) =>
    `Criamos ${String(services)} serviços e ${String(answers)} respostas de exemplo. Edite cada um antes de ativar.`,
  templateNothingNew: 'Os modelos já estavam aplicados. Nada foi duplicado.',
  pricesForbidden:
    'Nesta especialidade o assistente não informa valores. Os modelos vêm sem preço.',
  examplesNote: 'Os valores e textos dos modelos são exemplos fictícios. Edite antes de ativar.',
  activationText:
    'O assistente começa em "aprovar antes de enviar": toda resposta vira um rascunho e nada sai sem o seu toque. Você pode mudar isso depois em Mais > Assistente.',
  activate: 'Ativar o assistente',
  activated: 'Tudo pronto. O assistente está ativo em "aprovar antes de enviar".',
  skipWhatsapp: 'Conectar depois',
  testNote:
    'A mensagem de teste usa o simulador enquanto o WhatsApp não está conectado: nada é enviado a ninguém.',
} as const;

interface StepInfo {
  title: string;
  text: string;
  /** Existing screen that does the work; the flow links to it instead of copying it. */
  to?: string;
  openLabel?: string;
  /** Needs an external account that is not available yet: shown as "em breve" and skippable. */
  soon?: boolean;
}

export const STEP_INFO: Record<Step, StepInfo> = {
  [Step.account]: {
    title: 'CPF ou CNPJ e especialidade',
    text: 'Informe o documento e escolha sua especialidade para aplicar as regras da sua área.',
  },
  [Step.services]: {
    title: 'Serviços, valores e horários',
    text: 'Revise os serviços e defina seus horários de atendimento.',
    to: Route.services,
    openLabel: 'Abrir serviços',
  },
  [Step.location]: {
    title: 'Endereço e como chegar',
    text: 'Informe o endereço e as instruções de chegada. Fica na mesma tela dos serviços.',
    to: Route.services,
    openLabel: 'Abrir endereço',
  },
  [Step.tone]: {
    title: 'Tom de voz',
    text: 'Responda a quatro perguntas ou cole mensagens suas.',
    to: Route.tone,
    openLabel: 'Abrir tom de voz',
  },
  [Step.simulator]: {
    title: 'Simulador e mensagem de teste',
    text: 'Converse com o assistente já configurado. Nada é enviado a pacientes.',
    to: Route.simulator,
    openLabel: 'Abrir simulador',
  },
  [Step.whatsapp]: {
    title: 'Conectar o WhatsApp',
    text: 'Conecte o número do consultório pela janela da Meta e cadastre lá o seu cartão. Dá para pular e conectar depois em Mais > Conexões.',
  },
  [Step.google]: {
    title: 'Conectar o Google Agenda',
    text: 'A conexão com o Google Agenda ainda não está disponível e é opcional no plano Essencial. Toque em Continuar para seguir sem ela.',
    soon: true,
  },
  [Step.activation]: {
    title: 'Ativação',
    text: OnboardingCopy.activationText,
  },
};
