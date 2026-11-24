import { CalendarDays, Menu, MessageSquare, Sun, type LucideIcon } from 'lucide-react';
import { NavCopy } from '@/copy';
import { Route } from '@/routes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Spec 10: everything the professional needs in the day fits in three screens, plus "Mais".
export const NAV_ITEMS: readonly NavItem[] = [
  { to: Route.conversations, label: NavCopy.conversations, icon: MessageSquare },
  { to: Route.agenda, label: NavCopy.agenda, icon: CalendarDays },
  { to: Route.today, label: NavCopy.today, icon: Sun },
  { to: Route.more, label: NavCopy.more, icon: Menu },
];
