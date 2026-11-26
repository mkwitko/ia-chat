import { ChevronDown, Settings } from 'lucide-react';
import { useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { NavCopy } from '@/copy';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import type { MoreRow } from '../screens/more-item-link';
import { MoreRowCopy } from '../screens/more-item-link';
import { useSettingsRows } from '../screens/settings-rows';

const ROW =
  'relative flex min-h-9 items-center gap-2 rounded-md pr-3 pl-[2.625rem] text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
// The jade mark on the left edge, as on the main items (DESIGN.md, "Navegação").
const ACTIVE =
  "font-medium text-foreground bg-muted before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-jade before:content-['']";

const isSettingsPath = (pathname: string) =>
  pathname.startsWith(Route.more) || pathname.startsWith(Route.operator);

/** Opens by itself when a settings page becomes active; the owner can still fold it. */
function useOpen(active: boolean) {
  const [open, setOpen] = useState(active);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setOpen(true);
  }
  return [open, setOpen] as const;
}

/** Sidebar "Configurações": the settings pages, folded under the main items (owner, 26/11/2026). */
export function SettingsGroup() {
  const active = isSettingsPath(useLocation().pathname);
  const [open, setOpen] = useOpen(active);
  const listId = useId();
  const rows = useSettingsRows();
  return (
    <div className="grid gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen(!open);
        }}
        className={cn(
          'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          active && 'font-medium text-foreground',
        )}
      >
        <Settings className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        <span className="flex-1 text-left">{NavCopy.settings}</span>
        <ChevronDown
          className={cn(
            'size-4 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <ul id={listId} hidden={!open} className="grid gap-0.5">
        {rows.map((row) => (
          <li key={row.label}>
            <SettingsLink row={row} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsLink({ row }: Readonly<{ row: MoreRow }>) {
  if (!row.to) return null;
  return (
    <NavLink to={row.to} className={({ isActive }) => cn(ROW, isActive && ACTIVE)}>
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      {row.badge ? (
        <span className="rounded-full bg-attention-soft px-1.5 text-xs leading-5 font-semibold text-foreground">
          <span className="sr-only">{MoreRowCopy.waiting} </span>
          {row.badge}
        </span>
      ) : null}
    </NavLink>
  );
}
