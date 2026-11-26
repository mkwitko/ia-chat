import { PrefillError } from './onboarding-api';

// Copy of "Onde te encontram" and of the review screen (spec 09), pt-BR.

export const PrefillCopy = {
  sourceLabel: 'Endereço do site, do Google Maps ou texto do Instagram',
  sourceHint: 'Do Instagram, copie e cole o texto da bio: não abrimos redes sociais.',
  sourcePlaceholder: 'www.seunegocio.com.br',
  search: 'Buscar meus dados',
  searching: 'Lendo a página…',
  reviewTitle: 'Encontramos isto, confere?',
  reviewIntro:
    'Corrija o que estiver errado e desmarque o que não quiser. Nada é salvo antes do seu toque.',
  name: 'Nome do negócio',
  phone: 'Telefone',
  address: 'Endereço',
  website: 'Site',
  social: 'Rede social',
  description: 'O que você faz',
  notFound: 'Não encontrado',
  servicesHeading: 'Serviços encontrados',
  servicesNone: 'Nenhum serviço com nome claro na página. Você cadastra no passo 3.',
  priceMissing: 'Sem valor na página: preencha para salvar.',
  serviceLabel: (name: string) => `Salvar ${name}`,
  minutes: 'Minutos',
  price: 'Valor (R$)',
  packagesHeading: 'Pacotes encontrados',
  hoursHeading: 'Horário encontrado',
  hoursKeep: 'Usar este horário',
  hoursNone: 'Não achamos o horário. Você confirma no passo 4.',
  save: 'Salvar o que conferi',
  saving: 'Salvando…',
  saved: 'Dados salvos. Você pode mudar tudo depois em Mais > Perfil do negócio.',
  discard: 'Descartar',
  errors: {
    [PrefillError.pasteText]:
      'Não abrimos links de redes sociais. Copie o texto da bio e cole aqui.',
    [PrefillError.unreadable]:
      'Não conseguimos ler essa página. Confira o link ou cole o texto dela aqui.',
    [PrefillError.off]: 'A leitura automática está desligada agora. Siga preenchendo à mão.',
    [PrefillError.failed]: 'A leitura falhou. Tente de novo em instantes ou siga à mão.',
  } as Readonly<Record<string, string>>,
  genericError: 'Não deu certo agora. Tente de novo ou siga preenchendo à mão.',
} as const;
