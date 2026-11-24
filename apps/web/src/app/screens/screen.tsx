import type { ReactNode } from 'react';

/** Screen frame: title bar and content, 720 px wide at most on the computer (DESIGN.md). */
export function Screen({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="mx-auto w-full max-w-3xl md:px-8 md:py-6">
      <h1 className="bg-card px-4 pt-4 pb-3 text-xl md:bg-transparent md:px-0">{title}</h1>
      {children}
    </section>
  );
}
