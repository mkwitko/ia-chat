import { Step } from './onboarding-api';

// Panel copy in pt-BR for the guided setup (spec 09 and docs/research/09): "cliente", "negócio".

export const OnboardingCopy = {
  title: 'Configuração guiada',
  intro: 'Seis passos, uns 10 minutos. Fica tudo salvo: dá para parar e continuar depois.',
  progress: (index: number, total: number) => `Passo ${String(index)} de ${String(total)}`,
  back: 'Voltar',
  allDone: 'Configuração concluída. Toque num passo para revisar.',
  documentSaved: 'CPF ou CNPJ já informado.',
  activationNeedsWhatsapp:
    'Para ativar, conecte o WhatsApp no passo 2. Os 14 dias de teste começam quando ele conecta.',
  documentRequired: 'Informe o CPF ou CNPJ antes de seguir.',
  whatsappRequired: 'O WhatsApp ainda não está conectado. Conecte ou toque em "Conectar depois".',
  hoursRequired: 'Confirme pelo menos uma faixa de horário antes de seguir.',
  loadFailed: 'Não conseguimos carregar. Confira a conexão e tente de novo.',
  statusDone: 'Feito',
  statusSkipped: 'Pulado',
  next: 'Continuar',
  specialtyLabel: 'Qual é a sua área?',
  useTemplate: 'Usar exemplos da sua área',
  templateDone: (services: number, answers: number) =>
    `Criamos ${String(services)} serviços e ${String(answers)} respostas de exemplo. Edite os valores antes de ativar.`,
  templateNothingNew: 'Os exemplos já estavam aplicados. Nada foi duplicado.',
  pricesForbidden: 'Na sua área o assistente não informa valores. Os exemplos vêm sem preço.',
  examplesNote: 'Os valores dos exemplos são fictícios. Troque pelos seus.',
  activate: 'Ativar o assistente',
  skipWhatsapp: 'Conectar depois',
  phoneHint:
    'A conexão pede o celular com o app WhatsApp Business por perto. Começou no computador? Dá para terminar este passo no celular.',
  saveHours: 'Confirmar horários e continuar',
  defaultHoursNote:
    'Sugestão inicial: segunda a sexta, das 9h às 18h. Ajuste para o seu horário real antes de confirmar.',
  seeExample: 'Ver uma conversa de exemplo',
  hideExample: 'Fechar a conversa de exemplo',
} as const;

interface StepInfo {
  title: string;
  text: string;
}

export const STEP_INFO: Record<Step, StepInfo> = {
  [Step.account]: {
    title: 'Onde seus clientes acham você',
    text: 'Cole o link do seu site ou do Google Maps, ou o texto da bio do Instagram. A gente lê e você confere.',
  },
  [Step.whatsapp]: {
    title: 'Conectar o WhatsApp',
    text: 'Use o mesmo número do app WhatsApp Business. Os 14 dias de teste começam quando ele conecta.',
  },
  [Step.services]: {
    title: 'Serviços e preços',
    text: 'O assistente só informa o que estiver aqui, com o valor exato.',
  },
  [Step.hours]: {
    title: 'Horários',
    text: 'Os dias e horários em que você atende. O assistente só oferece horário livre dentro desta grade.',
  },
  [Step.simulator]: {
    title: 'Teste com seus dados',
    text: 'Faça uma pergunta como se fosse um cliente. Nada é enviado a ninguém.',
  },
  [Step.activation]: {
    title: 'Ativar',
    text: 'O assistente começa em "aprovar antes de enviar": cada resposta vira um rascunho e só sai com o seu toque.',
  },
};
