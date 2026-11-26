import { Step, type OnboardingView } from './onboarding-api';

/**
 * The setup as a wizard, one question per screen (owner, 26/11/2026). The server's first step
 * ("account") becomes three screens: the area, where clients find you (optional), the CPF/CNPJ.
 */
export const Page = {
  area: 'area',
  find: 'find',
  document: 'document',
  whatsapp: 'whatsapp',
  services: 'services',
  hours: 'hours',
  simulator: 'simulator',
  activation: 'activation',
} as const;
export type Page = (typeof Page)[keyof typeof Page];

export const PAGES: readonly Page[] = Object.values(Page);

const ACCOUNT_PAGES: readonly Page[] = [Page.area, Page.find, Page.document];

/** The server step a screen belongs to. */
const STEP_OF: Record<Page, Step> = {
  [Page.area]: Step.account,
  [Page.find]: Step.account,
  [Page.document]: Step.account,
  [Page.whatsapp]: Step.whatsapp,
  [Page.services]: Step.services,
  [Page.hours]: Step.hours,
  [Page.simulator]: Step.simulator,
  [Page.activation]: Step.activation,
};

export const stepOf = (page: Page): Step => STEP_OF[page];

/** The first screen of a server step. */
const firstPageOf = (step: Step): Page => (step === Step.account ? Page.area : step);

/** Where to resume: null once every step is settled (the "Pronto" screen). */
export function resumePage(
  view: Pick<OnboardingView, 'current' | 'specialty' | 'documentSet'>,
): Page | null {
  if (!view.current) return null;
  if (view.current !== Step.account) return firstPageOf(view.current);
  return view.specialty ? Page.document : Page.area;
}

/** Screens that may be left for later: one optional, one needing an outside account. */
export const SKIPPABLE: ReadonlySet<Page> = new Set([Page.find, Page.whatsapp]);

/** The screen whose "Continuar" settles the server step (the others just move on). */
export const settlesStep = (page: Page) => !ACCOUNT_PAGES.includes(page) || page === Page.document;

/** The screen that opens a server step ("Ajustar" in the test chat). */
export const pageOfStep = firstPageOf;
