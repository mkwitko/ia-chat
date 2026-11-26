import { ChevronDown, Plus, Share } from 'lucide-react';
import type { ReactNode } from 'react';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { BrandMark } from '../brand-mark';

// Safari on the iPhone has no install button for sites: the owner has to find "Adicionar à
// Tela de Início" in the share sheet. Three drawn steps show exactly where to tap.

export const IphoneCopy = defineMessages({
  [Locale.ptBR]: {
    other: 'Usa iPhone? Veja como',
    steps: [
      'Abra este painel no Safari e toque no botão Compartilhar, embaixo, no meio da tela.',
      'Role a lista para baixo e toque em "Adicionar à Tela de Início".',
      'Toque em "Adicionar", no canto de cima. O ícone aparece junto com os seus aplicativos.',
    ],
    addToHome: 'Adicionar à Tela de Início',
    add: 'Adicionar',
    appName: 'Consultório',
  },
  [Locale.enUS]: {},
});

const IPHONE = /iPhone|iPad|iPod/;
export const isIphone = () => IPHONE.test(navigator.userAgent);

function Frame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      aria-hidden="true"
      className="grid h-28 w-full place-items-center overflow-hidden rounded-xl border bg-muted"
    >
      {children}
    </div>
  );
}

/** Safari's bottom bar with the share button ringed. */
function ShareBar() {
  return (
    <Frame>
      <div className="flex w-40 items-center justify-between rounded-lg border bg-card px-3 py-2 text-muted-foreground">
        <span className="h-1.5 w-5 rounded-full bg-line-strong" />
        <span className="grid size-9 place-items-center rounded-full ring-2 ring-foreground">
          <Share className="size-5 text-foreground" aria-hidden="true" />
        </span>
        <span className="h-1.5 w-5 rounded-full bg-line-strong" />
      </div>
    </Frame>
  );
}

/** The share sheet row, with the "+" square. */
function SheetRow() {
  return (
    <Frame>
      <div className="grid w-60 gap-1 rounded-lg border bg-card p-1.5">
        <span className="h-2 w-24 rounded-full bg-line-strong/60" />
        <span className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold ring-2 ring-foreground">
          {IphoneCopy.addToHome}
          <Plus className="size-4 rounded-sm border border-current" aria-hidden="true" />
        </span>
        <span className="h-2 w-20 rounded-full bg-line-strong/60" />
      </div>
    </Frame>
  );
}

/** The confirm bar and the new icon on the home screen. */
function HomeIcon() {
  return (
    <Frame>
      <div className="grid justify-items-center gap-1.5">
        <span className="rounded-md px-2 py-0.5 text-xs font-semibold ring-2 ring-foreground">
          {IphoneCopy.add}
        </span>
        <BrandMark size={36} />
        <span className="text-[11px] font-medium">{IphoneCopy.appName}</span>
      </div>
    </Frame>
  );
}

const PICTURES = [ShareBar, SheetRow, HomeIcon] as const;

function Steps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {IphoneCopy.steps.map((text, index) => {
        const Picture = PICTURES[index] ?? ShareBar;
        return (
          <li key={text} className="grid content-start gap-2">
            <Picture />
            <p className="flex gap-2 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
                {index + 1}
              </span>
              <span className="text-pretty">{text}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** Open on the iPhone; elsewhere tucked under "Usa iPhone? Veja como". */
export function IphoneInstall() {
  if (isIphone()) return <Steps />;
  return (
    <details className="group grid gap-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        {IphoneCopy.other}
      </summary>
      <Steps />
    </details>
  );
}
