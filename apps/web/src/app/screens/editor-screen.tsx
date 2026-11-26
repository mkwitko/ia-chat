import { ChevronDown, ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { CommonCopy } from '../setup/setup-copy';
import { EditorCopy } from '../clinic/clinic-copy';

interface EditorScreenProps {
  title: string;
  /** One short line: what this is for. */
  intro?: string;
  back: { to: string; label: string };
  children: ReactNode;
}

/**
 * A focused editor (owner, 26/11/2026): one topic, one readable column, a way back on top. Opens
 * from a settings summary and returns to it after saving.
 */
export function EditorScreen({ title, intro, back, children }: Readonly<EditorScreenProps>) {
  return (
    <section className="w-full px-4 pt-3 pb-16 md:px-8 md:pt-6 xl:px-12">
      <div className="grid max-w-[35rem] grid-cols-[minmax(0,1fr)] gap-6">
        <div className="grid gap-1">
          <Link
            to={back.to}
            className="-ml-1 flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {back.label}
          </Link>
          <h1 className="text-xl">{title}</h1>
          {intro && <p className="text-base text-muted-foreground">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Progressive disclosure: the optional fields stay folded until asked for. */
export function MoreOptions({
  children,
  label = EditorCopy.moreOptions,
}: Readonly<{ children: ReactNode; label?: string }>) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-5 border-t px-4 pt-4 pb-5">{children}</div>
    </details>
  );
}

interface ActionsProps {
  pending: boolean;
  disabled?: boolean;
  backTo: string;
}

/** The one "Salvar" of an editor, with "Voltar" beside it; full width on the phone. */
export function EditorActions({ pending, disabled = false, backTo }: Readonly<ActionsProps>) {
  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
      <Button type="submit" size="lg" disabled={pending || disabled} className="sm:min-w-40">
        {pending ? CommonCopy.saving : CommonCopy.save}
      </Button>
      <Button asChild variant="ghost" size="lg">
        <Link to={backTo}>{EditorCopy.back}</Link>
      </Button>
    </div>
  );
}
