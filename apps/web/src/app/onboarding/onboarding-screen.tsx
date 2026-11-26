import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { ProgressBar } from '../screens/progress-bar';
import { Step, useOnboarding, type OnboardingView } from './onboarding-api';
import { PAGE_INFO, WizardCopy as Copy } from './wizard-copy';
import { isReady, useAdvance, WizardFooter } from './wizard-footer';
import { PageBody } from './wizard-pages';
import { PAGES, pageOfStep, resumePage, type Page } from './wizard-model';

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
        index > 0
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
  return (
    <>
      <div className="grid gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <ProgressBar value={position} total={PAGES.length} label={label} />
      </div>
      <div className="grid gap-2">
        <h1 className="text-xl">{PAGE_INFO[page].title}</h1>
        <p className="text-base text-muted-foreground">{PAGE_INFO[page].text}</p>
      </div>
      <PageBody page={page} view={view} document={document} onDone={finish} onGoTo={onGoTo} />
      <WizardFooter
        page={page}
        view={view}
        ready={isReady(page, view, document.value)}
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

/** The end: what happens now, and the one place to go next. */
function Done() {
  return (
    <div className="grid justify-items-start gap-5 pt-4">
      <span className="grid size-14 place-items-center rounded-full bg-jade-soft text-jade-ink">
        <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <h1 className="text-2xl">{Copy.doneTitle}</h1>
      <p className="text-base text-muted-foreground">{Copy.doneText}</p>
      <div className="grid w-full gap-2 sm:flex">
        <Button asChild size="lg">
          <Link to={Route.conversations}>{Copy.doneAction}</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link to={Route.clinic}>{Copy.doneSecondary}</Link>
        </Button>
      </div>
    </div>
  );
}
