import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const ScreenWidth = { full: 'full', form: 'form' } as const;
export type ScreenWidth = (typeof ScreenWidth)[keyof typeof ScreenWidth];

interface ScreenProps {
  title: string;
  children: ReactNode;
  /** Full width by default; forms and long text keep a reading measure (DESIGN.md). */
  width?: ScreenWidth;
  className?: string;
}

/** Settings pages from xl: independent blocks side by side, so the page uses the width. */
export const SETTINGS_COLUMNS = 'grid gap-12 xl:grid-cols-2 xl:items-start xl:gap-x-16';

/** Screen frame: title and content across the whole work area, fluid side padding. */
export function Screen(props: Readonly<ScreenProps>) {
  const { title, children, width = ScreenWidth.full, className } = props;
  return (
    <section
      className={cn(
        'w-full pb-10 md:px-8 md:pt-8 xl:px-12',
        width === ScreenWidth.form && 'md:max-w-3xl',
        className,
      )}
    >
      <h1 className="px-4 pt-5 pb-4 text-xl md:px-0 md:pt-0 md:pb-6">{title}</h1>
      {children}
    </section>
  );
}
