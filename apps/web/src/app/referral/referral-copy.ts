export const ReferralCopy = {
  title: 'Indique e ganhe',
  intro:
    'Conhece outro profissional que perde cliente por mensagem sem resposta? Mande o seu link para ele, pelo WhatsApp ou como preferir.',
  linkHeading: 'Seu link',
  linkLabel: 'Link para compartilhar',
  codeLabel: 'Seu código',
  copy: 'Copiar link',
  copied: 'Link copiado.',
  copyFailed: 'Não conseguimos copiar. Selecione o link e copie.',
  countHeading: 'Quem chegou pelo seu link',
  signups: (count: number) => {
    if (count === 0) return 'Ninguém se cadastrou com o seu link ainda.';
    return count === 1
      ? '1 pessoa pediu convite com o seu link.'
      : `${String(count)} pessoas pediram convite com o seu link.`;
  },
  noMessages:
    'Nós nunca escrevemos para quem você indica: só quem preenche o formulário do site recebe a confirmação do próprio pedido.',
  reward:
    'A recompensa ainda não foi definida. Avisamos você antes de qualquer desconto; nada está prometido por enquanto.',
  loadFailed: 'Não conseguimos carregar. Tente de novo.',
} as const;
