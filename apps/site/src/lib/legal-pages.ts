// Legal pages published from docs/legal (single source). Slugs are public URLs: keep them stable
// (the Meta app publishing form links to /privacidade).

export interface LegalPage {
  /** File name in docs/legal, also the content collection id (without .md). */
  id: string;
  slug: string;
  title: string;
  description: string;
}

const OPERATOR_CONTRACT = 'contrato-de-operador';
const QR_TERM = 'termo-conexao-qr';

export const LEGAL_PAGES = [
  {
    id: 'termos-de-uso',
    slug: 'termos',
    title: 'Termos de Uso',
    description:
      'Contrato de uso do Consultório Aberto: planos, cobrança, uso aceitável e limites.',
  },
  {
    id: 'politica-de-privacidade',
    slug: 'privacidade',
    title: 'Política de Privacidade',
    description: 'Como tratamos os dados dos nossos clientes e dos visitantes do site.',
  },
  {
    id: OPERATOR_CONTRACT,
    slug: OPERATOR_CONTRACT,
    title: 'Contrato de Operador',
    description: 'Tratamento de dados pessoais dos pacientes: controlador e operador (LGPD).',
  },
  {
    id: 'suboperadores',
    slug: 'suboperadores',
    title: 'Suboperadores',
    description:
      'Lista pública dos prestadores que tratam dados em nosso nome, com local e finalidade.',
  },
  {
    id: 'aviso-privacidade-paciente',
    slug: 'aviso-ao-paciente',
    title: 'Aviso de Privacidade ao Paciente',
    description: 'Modelo de aviso que o profissional mostra ao paciente atendido pelo assistente.',
  },
  {
    id: QR_TERM,
    slug: QR_TERM,
    title: 'Termo de Ciência da Conexão por QR code',
    description: 'Termo aceito no painel antes de conectar o WhatsApp por QR code.',
  },
] as const satisfies readonly LegalPage[];

/** Pages linked in the footer of every page (the QR term is reached from the Terms). */
export const FOOTER_LEGAL_PAGES = LEGAL_PAGES.filter((page) => page.id !== QR_TERM);

const MD_LINK = /^([a-z0-9-]+)\.md$/;

/** Rewrites a relative link to a docs/legal file into its site path; other links are kept. */
export function legalHref(href: string): string {
  const id = MD_LINK.exec(href)?.[1];
  const page = LEGAL_PAGES.find((p) => p.id === id);
  return page ? `/${page.slug}` : href;
}
