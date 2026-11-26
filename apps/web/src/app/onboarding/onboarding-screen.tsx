import { useState } from 'react';
import { Link } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { HelpArticle, HelpLink } from '../screens/screen-help';
import { ProgressBar } from '../screens/progress-bar';
import { Step, useOnboarding, type OnboardingView } from './onboarding-api';
import { WizardCopy as Copy } from './wizard-copy';
import { Done } from './wizard-done';
import { isReady, missingOf, useAdvance, WizardFooter } from './wizard-footer';
import { PageBody } from './wizard-pages';
import { Page, PAGES, pageOfStep, resumePage } from './wizard-model';

const FRAME = 'w-full px-4 pt-5 pb-16 md:px-8 md:pt-10 xl:px-12';
const COLUMN = 'grid max-w-[35rem] grid-cols-[minmax(0,1fr)] gap-6';

/**
 * Spec 09/10, H-37 and H-39, as a wizard (owner, 26/11/2026): one question per screen, the
 * progress on top, big buttons, "Pular por agora" where it may wait, and a "Pronto" at the end.
 * Progress is saved on the server, so the owner can stop and come back.
 */
export function OnboardingScreen() {
  const onboarding = useOnboarding();
  return (
    <section className={FRAME}>
      <div className={COLUMN}>
        {onboarding.isPending && <ListSkeleton />}
        {onboarding.isError && (
          <LoadError message={Copy.loadFailed} onRetry={() => void onboarding.refetch()} />
        )}
        {onboarding.data && <Wizard view={onboarding.data} />}
      </div>
    </section>
  );
}

function Wizard({ view }: Readonly<{ view: OnboardingView }>) {
  const [page, setPage] = useState<Page | null>(() => resumePage(view));
  // Lives here, not in the page: what was typed survives "Voltar".
  const [document, setDocument] = useState('');
  if (!page) return <Done />;
  const index = PAGES.indexOf(page);
  const go = (to: number) => {
    setPage(PAGES[to] ?? null);
  };
  return (
    <WizardPage
      key={page}
      page={page}
      view={view}
      document={{ value: document, onChange: setDocument }}
      onNext={() => {
        go(index + 1);
      }}
      onBack={
        // After activation there is no going back to it: the test only moves on.
        index > 0 && page !== Page.liveTest
          ? () => {
              go(index - 1);
            }
          : null
      }
      onGoTo={(step) => {
        setPage(pageOfStep(step));
      }}
    />
  );
}

interface PageProps {
  page: Page;
  view: OnboardingView;
  document: { value: string; onChange: (value: string) => void };
  onNext: () => void;
  onBack: (() => void) | null;
  onGoTo: (step: Step) => void;
}

function WizardPage(props: Readonly<PageProps>) {
  const { page, view, document, onNext, onBack, onGoTo } = props;
  const { next, skip, finish, pending } = useAdvance({ page, view, onNext });
  const position = PAGES.indexOf(page) + 1;
  const label = Copy.progress(position, PAGES.length);
  const info = Copy.pages[page];
  return (
    <>
      <WizardHeader position={position} label={label} />
      <div className="grid gap-2">
        <h1 className="text-xl">{info.title}</h1>
        <p className="text-base">{info.text}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{Copy.whyLabel}</span> {info.why}
        </p>
      </div>
      <PageBody page={page} view={view} document={document} onDone={finish} onGoTo={onGoTo} />
      <WizardFooter
        page={page}
        view={view}
        ready={isReady(page, view, document.value)}
        missing={missingOf(page, view, document.value)}
        pending={pending}
        onBack={onBack}
        onSkip={skip}
        onNext={() => void next(document.value)}
        onConnect={() => {
          onGoTo(Step.whatsapp);
        }}
      />
    </>
  );
}

/** "Passo X de 8", the bar, help, and the way out to continue later. */
function WizardHeader({ position, label }: Readonly<{ position: number; label: string }>) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <HelpLink article={HelpArticle.setup} />
        <Link
          to={Route.home}
          className="ml-auto flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {Copy.leave}
        </Link>
      </div>
      <ProgressBar value={position} total={PAGES.length} label={label} />
    </div>
  );
}
