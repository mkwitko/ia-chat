// M-04: the business profile block of the prompt. Package prices come from the owner's
// profile (whole cents) and are allowed in the answer like service prices (validate.ts).

export interface AgentPackage {
  name: string;
  priceCents: number;
}

export interface AgentPlace {
  name: string;
  address: string;
  arrival?: string;
}

export interface AgentBusiness {
  description?: string | undefined;
  phone?: string | undefined;
  website?: string | undefined;
  social?: string | undefined;
  /** Labels in pt-BR ("Pix", "cartão de crédito"). */
  paymentMethods: readonly string[];
  cancellationPolicy?: string | undefined;
  /** The owner's current welcome message: a reference for tone and first questions. */
  welcomeMessage?: string | undefined;
  packages: readonly AgentPackage[];
  /** Every professional of the business, the scheduling one first. */
  team: readonly string[];
  /** Places besides the main address. */
  otherPlaces: readonly AgentPlace[];
}

const LIST_JOIN = ', ';

export function businessLines(
  business: AgentBusiness,
  { formatPrice }: { formatPrice: ((cents: number) => string) | null },
): string[] {
  const packages = business.packages.map(
    (item) => `- ${item.name}${formatPrice ? ': ' + formatPrice(item.priceCents) : ''}`,
  );
  const places = business.otherPlaces.map((place) =>
    `- ${place.name}: ${place.address}. ${place.arrival ?? ''}`.trim(),
  );
  return [
    business.description ? `Sobre o negócio: ${business.description}` : '',
    business.team.length > 1 ? teamLine(business.team) : '',
    places.length ? `Outros endereços de atendimento:\n${places.join('\n')}` : '',
    packages.length
      ? `Pacotes (valor exato, não agendáveis como serviço; para usar, agende a sessão):\n${packages.join('\n')}`
      : '',
    business.paymentMethods.length
      ? `Formas de pagamento aceitas: ${business.paymentMethods.join(LIST_JOIN)}.`
      : '',
    business.cancellationPolicy ? `Política de cancelamento: ${business.cancellationPolicy}` : '',
    contactLine(business),
    business.welcomeMessage
      ? `Mensagem de boas-vindas que o negócio usa hoje (referência de tom e das primeiras perguntas, não copie preço nem horário dela):\n${business.welcomeMessage}`
      : '',
  ].filter(Boolean);
}

// ponytail: booking stays on the first professional's agenda; routing per professional is
// feature #16 of docs/research/09 (plano Clínica). Until then the others are handed off.
function teamLine(team: readonly string[]): string {
  return `Profissionais: ${team.join(LIST_JOIN)}. A agenda que você consulta e marca é a de ${team[0] ?? ''}; pedido de horário com outro profissional, passe a conversa para a equipe.`;
}

function contactLine(business: AgentBusiness): string {
  const parts = [
    business.phone ? `telefone ${business.phone}` : '',
    business.website ? `site ${business.website}` : '',
    business.social ? `rede social ${business.social}` : '',
  ].filter(Boolean);
  return parts.length ? `Contatos públicos do negócio: ${parts.join(LIST_JOIN)}.` : '';
}
