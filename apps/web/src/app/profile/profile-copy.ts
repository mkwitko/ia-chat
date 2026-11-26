import { PaymentMethod } from './profile-api';

// Panel copy in pt-BR for the business profile (M-04, spec 11): "cliente" and "negócio".

export const ProfileCopy = {
  title: 'Perfil do negócio',
  intro:
    'O que o assistente conta aos seus clientes. Preço e horário saem só daqui e da agenda, nunca de invenção.',
  businessHeading: 'Seu negócio',
  name: 'Nome do negócio',
  description: 'O que você faz',
  descriptionHint: 'Uma ou duas frases. O assistente usa para se apresentar.',
  phone: 'Telefone público',
  website: 'Site',
  websiteHint: 'Começa com https://',
  social: 'Instagram ou outra rede',
  reviewLink: 'Link de avaliação no Google',
  reviewLinkHint: 'Para pedir avaliação depois do atendimento. Opcional.',
  paymentHeading: 'Pagamento e cancelamento',
  paymentLegend: 'Formas de pagamento aceitas',
  notice: 'Prazo para desmarcar',
  noticeHint: 'O assistente só desmarca ou remarca dentro deste prazo.',
  noShow: 'Depois de uma falta, perguntar quando o cliente quer remarcar',
  noShowHint:
    'Quando você marca "Faltou", o assistente manda uma mensagem gentil uma vez. Só na primeira falta do cliente e só se a conversa estiver aberta; senão, você recebe um aviso.',
  policy: 'Regra de cancelamento, em palavras',
  policyHint: 'Ex.: consulta da manhã, avise até a noite anterior.',
  policyPlaceholder: 'Escreva como você explica a regra aos clientes',
  invalidUrl: 'Confira os links: site e avaliação começam com https://.',
  packagesHeading: 'Pacotes',
  packagesIntro:
    'O assistente informa o valor exato do pacote. Pacote não é agendável: o cliente agenda cada sessão. Com o número de sessões, você registra o pacote na ficha do cliente e o saldo é contado a cada "Compareceu".',
  packageName: 'Pacote',
  packageNamePlaceholder: '4 sessões',
  packageSessions: 'Sessões',
  packageSessionsCount: (count: number) => (count === 1 ? '1 sessão' : `${String(count)} sessões`),
  packagePrice: 'Valor (R$)',
  packagePricePlaceholder: '800',
  addPackage: 'Adicionar pacote',
  removePackage: (name: string) => `Remover o pacote ${name}`,
  noPackages: 'Nenhum pacote. Se você vende sessões em pacote, cadastre aqui.',
  placesHeading: 'Endereços',
  placesIntro: 'O primeiro é o endereço principal. Atende em mais de um lugar? Adicione os outros.',
  placeName: 'Nome do lugar',
  placeNamePlaceholder: 'Sala Centro',
  address: 'Endereço completo',
  arrival: 'Como chegar (opcional)',
  addPlace: 'Adicionar endereço',
  main: 'Principal',
  teamHeading: 'Quem atende',
  teamIntro:
    'O assistente apresenta todos. Por enquanto ele agenda só na agenda de quem está em primeiro; pedidos para os outros passam para você.',
  teamName: 'Nome',
  addProfessional: 'Adicionar profissional',
  agendaOwner: 'Agenda do assistente',
  inUse: 'Não dá para remover: há agendamentos ou horários ligados a ele.',
  removeConfirm: (name: string) => `Remover "${name}"?`,
  minutes: (value: number) => `${String(value)} min`,
} as const;

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.pix]: 'Pix',
  [PaymentMethod.credit]: 'Cartão de crédito',
  [PaymentMethod.debit]: 'Cartão de débito',
  [PaymentMethod.cash]: 'Dinheiro',
  [PaymentMethod.transfer]: 'Transferência',
};

const MINUTES_PER_HOUR = 60;
const NoticeHours = { none: 0, two: 2, four: 4, half: 12, day: 24, twoDays: 48 } as const;
/** The cancellation notice choices, in minutes (conservative default stays 24 h). */
export const NOTICE_OPTIONS = Object.values(NoticeHours).map((hours) => ({
  minutes: hours * MINUTES_PER_HOUR,
  label: hours === 0 ? 'Sem prazo' : `${String(hours)} horas antes`,
}));
