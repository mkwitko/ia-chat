import { createBrowserRouter, Navigate } from 'react-router';
import { ForgotPasswordPage } from './app/account/forgot-password-page';
import { ResetPasswordPage } from './app/account/reset-password-page';
import { InvitePage } from './app/account/invite-page';
import { SignUpPage } from './app/account/signup-page';
import { StartPage } from './app/account/start-page';
import { AgendaScreen } from './app/agenda/agenda-screen';
import { AvailabilityScreen } from './app/agenda/availability-screen';
import { AssistantScreen } from './app/assistant/assistant-screen';
import { OnboardingScreen } from './app/onboarding/onboarding-screen';
import { LoginPage } from './app/login/login-page';
import { ConversationScreen } from './app/inbox/conversation-screen';
import { InboxLayout, NoConversation } from './app/inbox/inbox-layout';
import { CustomerScreen } from './app/customers/customer-screen';
import { CustomersScreen } from './app/customers/customers-screen';
import { HomeScreen } from './app/home/home-screen';
import { ResultsScreen } from './app/results/results-screen';
import { MoreScreen } from './app/screens/more-screen';
import { ConnectionsScreen } from './app/whatsapp/connections-screen';
import { KnowledgeScreen } from './app/setup/knowledge-screen';
import { GrowthScreen } from './app/growth/growth-screen';
import { ProfileScreen } from './app/profile/profile-screen';
import { ServicesScreen } from './app/setup/services-screen';
import { ToneScreen } from './app/setup/tone-screen';
import { SimulatorScreen } from './app/simulator/simulator-screen';
import { OperatorScreen } from './app/operator/operator-screen';
import { UsageScreen } from './app/usage/usage-screen';
import { TeamInvitePage } from './app/team/team-invite-page';
import { SupportScreen } from './app/support/support-screen';
import { TeamScreen } from './app/team/team-screen';
import { BillingScreen } from './app/billing/billing-screen';
import { AppShell } from './app/shell/app-shell';
import { Route } from './routes';

export const router = createBrowserRouter([
  { path: Route.login, element: <LoginPage /> },
  { path: Route.signUp, element: <SignUpPage /> },
  { path: Route.invite, element: <InvitePage /> },
  { path: Route.teamInvite, element: <TeamInvitePage /> },
  { path: Route.forgotPassword, element: <ForgotPasswordPage /> },
  { path: Route.resetPassword, element: <ResetPasswordPage /> },
  { path: Route.start, element: <StartPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={Route.home} replace /> },
      {
        path: Route.conversations,
        element: <InboxLayout />,
        children: [
          { index: true, element: <NoConversation /> },
          { path: Route.conversation, element: <ConversationScreen /> },
        ],
      },
      { path: Route.agenda, element: <AgendaScreen /> },
      { path: Route.agendaAvailability, element: <AvailabilityScreen /> },
      { path: Route.home, element: <HomeScreen /> },
      { path: Route.legacyToday, element: <Navigate to={Route.home} replace /> },
      { path: Route.customers, element: <CustomersScreen /> },
      { path: Route.customer, element: <CustomerScreen /> },
      { path: Route.results, element: <ResultsScreen /> },
      {
        path: Route.more,
        children: [
          { index: true, element: <MoreScreen /> },
          { path: Route.assistant, element: <AssistantScreen /> },
          { path: Route.tone, element: <ToneScreen /> },
          { path: Route.knowledge, element: <KnowledgeScreen /> },
          { path: Route.simulator, element: <SimulatorScreen /> },
          { path: Route.services, element: <ServicesScreen /> },
          { path: Route.profile, element: <ProfileScreen /> },
          { path: Route.connections, element: <ConnectionsScreen /> },
          { path: Route.usage, element: <UsageScreen /> },
          { path: Route.billing, element: <BillingScreen /> },
          { path: Route.team, element: <TeamScreen /> },
          { path: Route.growth, element: <GrowthScreen /> },
          { path: Route.support, element: <SupportScreen /> },
        ],
      },
      { path: Route.onboarding, element: <OnboardingScreen /> },
      { path: Route.operator, element: <OperatorScreen /> },
    ],
  },
  { path: '*', element: <Navigate to={Route.home} replace /> },
]);
