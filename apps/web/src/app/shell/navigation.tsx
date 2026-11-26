import { NavLink, useLocation } from 'react-router';
import { LogOut } from 'lucide-react';
import { MoreCopy, NavCopy, PRODUCT_NAME } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import { BrandMark } from '../brand-mark';
import { NAV_ITEMS, type NavItem } from './nav-items';
import { ServiceStatus } from './service-status';
import { SettingsGroup } from './settings-group';
import { SetupProgressCard } from './setup-progress';
import { ShortcutsSheet } from './shortcuts-sheet';
import { ThemeToggle } from './theme-toggle';
import { useSignOut } from './use-sign-out';

/** Bottom bar on the phone, sidebar from md up (spec 10, "Navegação"). */
export function Navigation({ pending }: Readonly<{ pending: number }>) {
  const onHome = useLocation().pathname === Route.home;
  return (
    <nav
      aria-label={NavCopy.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:flex md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:gap-5 md:border-t-0 md:border-r md:px-3 md:py-4"
    >
      <TenantHeader />
      <div className="hidden md:block">
        <SetupProgressCard />
      </div>
      <div className="md:grid md:gap-0.5">
        <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-0.5">
          {NAV_ITEMS.map((item) => (
            // From md "Mais" gives way to the "Configurações" group below.
            <li key={item.to} className={cn(item.to === Route.more && 'md:hidden')}>
              <Item item={item} badge={item.to === Route.conversations ? pending : 0} />
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <SettingsGroup />
        </div>
      </div>
      <div className="mt-auto hidden gap-4 border-t px-1 pt-4 md:grid">
        {!onHome && <ServiceStatus />}
        <ThemeToggle />
        <ShortcutsSheet />
        <SignOutButton />
      </div>
    </nav>
  );
}

function TenantHeader() {
  const tenant = authClient.useActiveOrganization().data;
  return (
    <div className="hidden items-center gap-2.5 px-2 md:flex">
      <BrandMark size={28} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{tenant?.name ?? PRODUCT_NAME}</p>
        {tenant && <p className="truncate text-xs text-muted-foreground">{PRODUCT_NAME}</p>}
      </div>
    </div>
  );
}

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground',
    'md:min-h-10 md:flex-row md:justify-start md:gap-3 md:rounded-md md:px-3 md:text-sm md:hover:bg-muted',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    // The jade mark: top edge on the phone, left edge in the sidebar.
    "before:absolute before:rounded-full before:bg-jade before:opacity-0 before:content-['']",
    'before:top-0 before:left-1/2 before:h-0.5 before:w-6 before:-translate-x-1/2',
    'md:before:top-1/2 md:before:left-0 md:before:h-4 md:before:w-0.5 md:before:translate-x-0 md:before:-translate-y-1/2',
    isActive && 'font-medium text-foreground before:opacity-100 md:bg-muted',
  );

function Item({ item, badge }: Readonly<{ item: NavItem; badge: number }>) {
  const Icon = item.icon;
  // "Configuração" has no tab of its own: it belongs to "Mais".
  const { pathname } = useLocation();
  const inSetup = item.to === Route.more && pathname.startsWith(Route.onboarding);
  return (
    <NavLink to={item.to} className={(state) => itemClass({ isActive: state.isActive || inSetup })}>
      <Icon className="size-6 md:size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      <span>{item.label}</span>
      {badge > 0 && (
        <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-5 rounded-full bg-attention px-1.5 text-center text-xs leading-5 font-semibold text-card md:static md:ml-auto">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

/** Sair, at the foot of the sidebar: quiet until hovered, then the danger tone. */
function SignOutButton() {
  const signOut = useSignOut();
  return (
    <button
      type="button"
      onClick={signOut}
      className="flex min-h-10 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      {MoreCopy.signOut}
    </button>
  );
}
