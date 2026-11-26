import { BookOpen, Gauge, MessageSquareText, PenLine, Send, UserRound } from 'lucide-react';
import { Route } from '@/routes';
import { summaryOf } from '../clinic/clinic-model';
import { useLeadFollowUp, useReviewRequest } from '../growth/growth-api';
import { useOnboarding } from '../onboarding/onboarding-api';
import type { SummaryItem } from '../screens/summary-list';
import { HelpArticle } from '../screens/screen-help';
import { SummaryScreen } from '../screens/summary-screen';
import { useKnowledge } from '../setup/setup-api';
import {
  AssistantSummaryCopy as Copy,
  autonomySummary,
  identitySummary,
  knowledgeSummary,
  messagesSummary,
  toneSummary,
} from './assistant-model';
import { useAssistantSettings } from './settings-api';

/** How it answers: autonomy, introduction and the way it writes. */
function useHowItems(): SummaryItem[] {
  const settings = useAssistantSettings();
  const onboarding = useOnboarding();
  return [
    {
      label: Copy.autonomy,
      to: Route.assistantAutonomy,
      icon: Gauge,
      summary: summaryOf(settings, (data) => autonomySummary(data.autonomy)),
    },
    {
      label: Copy.identity,
      to: Route.assistantIdentity,
      icon: UserRound,
      summary: summaryOf(settings, (data) => identitySummary(data.identityMode)),
    },
    {
      label: Copy.tone,
      to: Route.tone,
      icon: PenLine,
      summary: summaryOf(onboarding, (data) => toneSummary(data.checklist.tone)),
    },
  ];
}

/** What it knows, what it sends by itself, and the test. */
function useWhatItems(): SummaryItem[] {
  const knowledge = useKnowledge();
  const followUp = useLeadFollowUp();
  const review = useReviewRequest();
  const messages = {
    data: followUp.data && review.data ? { lead: followUp.data, ask: review.data } : undefined,
    isError: followUp.isError || review.isError,
  };
  return [
    {
      label: Copy.knowledge,
      to: Route.knowledge,
      icon: BookOpen,
      summary: summaryOf(knowledge, (data) =>
        knowledgeSummary(data.items.length, data.unanswered.length),
      ),
    },
    {
      label: Copy.messages,
      to: Route.growth,
      icon: Send,
      summary: summaryOf(messages, (data) => messagesSummary(data.lead.enabled, data.ask.enabled)),
    },
    {
      label: Copy.test,
      to: Route.simulator,
      icon: MessageSquareText,
      summary: { value: Copy.testHint },
    },
  ];
}

/** Assistente (owner, 26/11/2026): a summary, one row per topic, each opening its editor. */
export function AssistantScreen() {
  const items = [...useHowItems(), ...useWhatItems()];
  return (
    <SummaryScreen
      title={Copy.title}
      intro={Copy.intro}
      items={items}
      help={HelpArticle.assistant}
    />
  );
}
