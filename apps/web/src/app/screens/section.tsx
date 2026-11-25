import type { ReactNode } from 'react';

/** Titled block of a screen; children bring their own side padding. */
export function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section>
      <h2 className="px-4 pt-6 pb-2 text-lg md:px-0">{title}</h2>
      {children}
    </section>
  );
}

/** White list with dividers, edge to edge on the phone. */
export function CardList({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className="divide-y border-y bg-card md:rounded-xl md:border">{children}</ul>;
}

/** Quiet explanatory line. */
export function Note({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="px-4 pb-2 text-sm text-muted-foreground md:px-0">{children}</p>;
}
