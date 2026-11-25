import { CalendarDays, House, Menu, MessageSquare, Users, type LucideIcon } from 'lucide-react';
import { NavCopy } from '@/copy';
import { Route } from '@/routes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Lean MVP: Início, Conversas, Agenda, Clientes and "Mais".
export const NAV_ITEMS: readonly NavItem[] = [
  { to: Route.home, label: NavCopy.home, icon: House },
  { to: Route.conversations, label: NavCopy.conversations, icon: MessageSquare },
  { to: Route.agenda, label: NavCopy.agenda, icon: CalendarDays },
  { to: Route.customers, label: NavCopy.customers, icon: Users },
  { to: Route.more, label: NavCopy.more, icon: Menu },
];
