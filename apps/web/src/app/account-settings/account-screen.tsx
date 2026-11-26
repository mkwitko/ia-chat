import { Bell, CreditCard, Gauge, Gift } from 'lucide-react';
import { Route } from '@/routes';
import { useBilling, type Billing } from '../billing/billing-api';
import { summaryOf, TopicStatus, type TopicSummary } from '../clinic/clinic-model';
import { EditorScreen } from '../screens/editor-screen';
import type { SummaryItem } from '../screens/summary-list';
import { SummaryScreen } from '../screens/summary-screen';
import { WeeklyReportToggle } from '../screens/weekly-report-toggle';
import { ThemeToggle } from '../shell/theme-toggle';
import { useUsage } from '../usage/usage-api';
import { AccountCopy as Copy } from './account-copy';

const RESTRICTED = 'restricted';

const STATIC: readonly SummaryItem[] = [
  {
    label: Copy.notifications,
    to: Route.accountNotifications,
    icon: Bell,
    summary: { value: Copy.notificationsHint },
  },
  { label: Copy.referral, to: Route.referral, icon: Gift, summary: { value: Copy.referralHint } },
];

/** A late payment is the one thing here that needs the owner. */
export function billingSummary(status: Billing['status']): TopicSummary {
  const value = Copy.billingStatus[status];
  return status === RESTRICTED ? { value, status: TopicStatus.todo } : { value };
}

/** Conta: plan and use, subscription, notices and look, in the settings summary pattern. */
export function AccountScreen() {
  const usage = useUsage();
  const billing = useBilling();
  const items: SummaryItem[] = [
    {
      label: Copy.usage,
      to: Route.usage,
      icon: Gauge,
      summary: summaryOf(usage, (data) => ({
        value: Copy.usageValue(data.plan, data.conversations, data.franchise),
      })),
    },
    {
      label: Copy.billing,
      to: Route.billing,
      icon: CreditCard,
      summary: summaryOf(billing, (data) => billingSummary(data.status)),
    },
    ...STATIC,
  ];
  return <SummaryScreen title={Copy.title} intro={Copy.intro} items={items} />;
}

/** Conta › Avisos e tema: the weekly report switch and the theme. */
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
