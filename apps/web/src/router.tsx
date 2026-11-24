import { createBrowserRouter, Navigate } from 'react-router';
import { AssistantScreen } from './app/assistant/assistant-screen';
import { LoginPage } from './app/login/login-page';
import { ConversationScreen } from './app/inbox/conversation-screen';
import { ConversationsScreen } from './app/inbox/conversations-screen';
import { TodayScreen } from './app/inbox/today-screen';
import { AgendaScreen } from './app/screens/main-screens';
import { MoreScreen } from './app/screens/more-screen';
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
      { path: Route.today, element: <TodayScreen /> },
      { path: Route.more, element: <MoreScreen /> },
      { path: Route.assistant, element: <AssistantScreen /> },
    ],
  },
  { path: '*', element: <Navigate to={Route.conversations} replace /> },
]);
