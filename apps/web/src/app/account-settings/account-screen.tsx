import { Bell, CreditCard, Gauge, Gift } from 'lucide-react';
import { Route } from '@/routes';
import { EditorScreen } from '../screens/editor-screen';
import type { SummaryItem } from '../screens/summary-list';
import { SummaryScreen } from '../screens/summary-screen';
import { WeeklyReportToggle } from '../screens/weekly-report-toggle';
import { ThemeToggle } from '../shell/theme-toggle';
import { AccountCopy as Copy } from './account-copy';

const ITEMS: readonly SummaryItem[] = [
  { label: Copy.usage, to: Route.usage, icon: Gauge, summary: { value: Copy.usageHint } },
  {
    label: Copy.billing,
    to: Route.billing,
    icon: CreditCard,
    summary: { value: Copy.billingHint },
  },
  {
    label: Copy.notifications,
    to: Route.accountNotifications,
    icon: Bell,
    summary: { value: Copy.notificationsHint },
  },
  { label: Copy.referral, to: Route.referral, icon: Gift, summary: { value: Copy.referralHint } },
];

/** Conta: plan and use, subscription, notices and look, in the settings summary pattern. */
export function AccountScreen() {
  return <SummaryScreen title={Copy.title} intro={Copy.intro} items={ITEMS} />;
}

/** Conta › Avisos e aparência: the weekly report switch and the theme. */
export function NotificationsScreen() {
  return (
    <EditorScreen
      title={Copy.notifications}
      intro={Copy.notificationsIntro}
      back={{ to: Route.account, label: Copy.title }}
    >
      <WeeklyReportToggle />
      <ThemeToggle />
    </EditorScreen>
  );
}
