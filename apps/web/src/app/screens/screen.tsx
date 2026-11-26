import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useOnboarding } from '../onboarding/onboarding-api';
import { FirstVisitHint, HelpLink, type HelpArticle } from './screen-help';

export const ScreenWidth = { full: 'full', form: 'form' } as const;
export type ScreenWidth = (typeof ScreenWidth)[keyof typeof ScreenWidth];

interface ScreenProps {
  title: string;
  children: ReactNode;
  /** Full width by default; forms and long text keep a reading measure (DESIGN.md). */
  width?: ScreenWidth;
  className?: string;
  /** The help article behind the "?" next to the title. */
  help?: HelpArticle;
  /** Shown once, on the first visit to this screen after the setup is done. */
  hint?: string;
  /** The screen's one main action, at the right of the title. */
  action?: ReactNode;
}

/** Screen frame: title, help, and content across the whole work area, fluid side padding. */
export function Screen(props: Readonly<ScreenProps>) {
  const { title, children, width = ScreenWidth.full, className, help, hint, action } = props;
  // During setup the first screen already holds the next step: the tips wait until it is done.
  const setupDone = useOnboarding().data?.current === null;
  return (
    <section
      className={cn(
        'w-full pb-10 md:px-8 md:pt-8 xl:px-12',
        width === ScreenWidth.form && 'md:max-w-3xl',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 px-4 pt-5 pb-4 md:px-0 md:pt-0 md:pb-6">
        <h1 className="text-xl">{title}</h1>
        {help && <HelpLink article={help} />}
        {action && (
          <div className="basis-full sm:ml-auto sm:basis-auto [&>*]:w-full sm:[&>*]:w-auto">
            {action}
          </div>
        )}
      </div>
      {hint && help && setupDone && <FirstVisitHint id={help} text={hint} />}
      {children}
    </section>
  );
}
