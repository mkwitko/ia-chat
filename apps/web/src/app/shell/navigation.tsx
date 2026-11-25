import { NavLink } from 'react-router';
import { NavCopy, PRODUCT_NAME } from '@/copy';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import { BrandMark } from '../brand-mark';
import { NAV_ITEMS, type NavItem } from './nav-items';

/** Bottom bar on the phone, side rail from md up (spec 10, "Navegação"). */
export function Navigation({ pending }: Readonly<{ pending: number }>) {
  return (
    <nav
      aria-label={NavCopy.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:flex md:w-60 md:flex-col md:gap-6 md:border-t-0 md:border-r md:px-3 md:py-5"
    >
      <div className="hidden items-center gap-2 px-3 md:flex">
        <BrandMark size={28} />
        <span className="font-semibold">{PRODUCT_NAME}</span>
      </div>
      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Item item={item} badge={item.to === Route.conversations ? pending : 0} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Item({ item, badge }: Readonly<{ item: NavItem; badge: number }>) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors',
          'md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-base',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isActive && 'font-semibold text-primary md:bg-brand-soft',
        )
      }
    >
      <Icon className="size-6 md:size-5" aria-hidden="true" />
      <span>{item.label}</span>
      {badge > 0 && (
        <span className="absolute top-1.5 left-[calc(50%+6px)] rounded-full bg-attention px-1.5 text-[11px] leading-[18px] font-bold text-card tabular-nums md:static md:ml-auto">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
