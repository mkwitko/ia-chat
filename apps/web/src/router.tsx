import { createBrowserRouter, Navigate } from 'react-router';
import { AgendaScreen } from './app/agenda/agenda-screen';
import { AvailabilityScreen } from './app/agenda/availability-screen';
import { AssistantScreen } from './app/assistant/assistant-screen';
import { LoginPage } from './app/login/login-page';
import { ConversationScreen } from './app/inbox/conversation-screen';
import { ConversationsScreen } from './app/inbox/conversations-screen';
import { TodayScreen } from './app/inbox/today-screen';
import { MoreScreen } from './app/screens/more-screen';
import { KnowledgeScreen } from './app/setup/knowledge-screen';
import { ServicesScreen } from './app/setup/services-screen';
import { ToneScreen } from './app/setup/tone-screen';
import { AppShell } from './app/shell/app-shell';
import { Route } from './routes';

export const router = createBrowserRouter([
  { path: Route.login, element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={Route.conversations} replace /> },
      { path: Route.conversations, element: <ConversationsScreen /> },
      { path: Route.conversation, element: <ConversationScreen /> },
      { path: Route.agenda, element: <AgendaScreen /> },
      { path: Route.agendaAvailability, element: <AvailabilityScreen /> },
      { path: Route.today, element: <TodayScreen /> },
      { path: Route.more, element: <MoreScreen /> },
      { path: Route.assistant, element: <AssistantScreen /> },
      { path: Route.tone, element: <ToneScreen /> },
      { path: Route.knowledge, element: <KnowledgeScreen /> },
      { path: Route.services, element: <ServicesScreen /> },
    ],
  },
  { path: '*', element: <Navigate to={Route.conversations} replace /> },
]);
