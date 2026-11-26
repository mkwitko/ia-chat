import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { PaymentMethod } from './profile-api';

// Panel copy in pt-BR for the business profile (M-04, spec 11): "cliente" and "negócio".

export const ProfileCopy = defineMessages({
  [Locale.ptBR]: {
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
    paymentLegend: 'Como você recebe',
    notice: 'Até quando o paciente pode desmarcar',
    noticeHint: 'Depois disso, o assistente não desmarca nem remarca sozinho.',
    noShow: 'Depois de uma falta, perguntar quando o cliente quer remarcar',
    noShowHint: 'Quando você marca "Faltou", o assistente manda uma mensagem gentil, uma vez só.',
    policy: 'Regra de desmarcação, do seu jeito',
    policyHint: 'Ex.: consulta da manhã, avise até a noite anterior.',
    policyPlaceholder: 'Escreva como você explica a regra aos clientes',
    invalidUrl: 'Confira os links: site e avaliação começam com https://.',
    packagesHeading: 'Pacotes',
    packagesIntro: 'Várias sessões vendidas juntas, por um valor só. Opcional.',
    packageName: 'Pacote',
    packageNamePlaceholder: '4 sessões',
    packageSessions: 'Sessões',
    packageSessionsCount: (count: number) =>
      count === 1 ? '1 sessão' : `${String(count)} sessões`,
    packagePrice: 'Valor (R$)',
    packagePricePlaceholder: '800',
    addPackage: 'Adicionar pacote',
    removePackage: (name: string) => `Remover o pacote ${name}`,
    noPackages: 'Nenhum pacote. Se você vende sessões em pacote, cadastre aqui.',
    placesHeading: 'Endereços',
    placesIntro:
      'O primeiro é o endereço principal. Atende em mais de um lugar? Adicione os outros.',
    placeName: 'Nome do lugar',
    placeNamePlaceholder: 'Sala Centro',
    address: 'Endereço completo',
    arrival: 'Como chegar (opcional)',
    addPlace: 'Adicionar endereço',
    main: 'Principal',
    teamHeading: 'Quem atende',
    teamIntro:
      'Cada profissional tem os próprios horários, bloqueios e serviços. O assistente marca na agenda de quem o cliente pedir, ou oferece os horários de quem faz o serviço.',
    teamName: 'Nome',
    addProfessional: 'Adicionar profissional',
    agendaOwner: 'Usa o Google Agenda conectado',
    hours: 'Horários e serviços',
    inUse: 'Não dá para remover: há agendamentos ligados a este profissional, ou é o primeiro.',
    planLimit:
      'Seu plano inclui um profissional. Mais profissionais fazem parte do plano Clínica; fale com a gente.',
    removeConfirm: (name: string) => `Remover "${name}"?`,
    minutes: (value: number) => `${String(value)} min`,
  },
  [Locale.enUS]: {},
});

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
