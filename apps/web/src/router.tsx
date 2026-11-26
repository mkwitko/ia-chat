import { createBrowserRouter, Navigate } from 'react-router';
import { ForgotPasswordPage } from './app/account/forgot-password-page';
import { ResetPasswordPage } from './app/account/reset-password-page';
import { InvitePage } from './app/account/invite-page';
import { SignUpPage } from './app/account/signup-page';
import { StartPage } from './app/account/start-page';
import { AgendaScreen } from './app/agenda/agenda-screen';
import { HoursEditor } from './app/agenda/hours-editor';
import { AccountScreen, NotificationsScreen } from './app/account-settings/account-screen';
import { BusinessEditor } from './app/clinic/business-editor';
import { ClinicScreen } from './app/clinic/clinic-screen';
import { legacyRoutes } from './app/clinic/legacy-redirect';
import {
  AddressEditor,
  CalendarEditor,
  ServicesEditor,
  TeamEditor,
  WhatsappEditor,
} from './app/clinic/list-editors';
import { PaymentsEditor } from './app/clinic/payments-editor';
import { AssistantScreen } from './app/assistant/assistant-screen';
import { AutonomyEditor, IdentityEditor } from './app/assistant/assistant-editors';
import { OnboardingScreen } from './app/onboarding/onboarding-screen';
import { LoginPage } from './app/login/login-page';
import { ConversationScreen } from './app/inbox/conversation-screen';
import { InboxLayout, NoConversation } from './app/inbox/inbox-layout';
import { CustomerScreen } from './app/customers/customer-screen';
import { CustomersScreen } from './app/customers/customers-screen';
import { HomeScreen } from './app/home/home-screen';
import { ResultsScreen } from './app/results/results-screen';
import { MoreScreen } from './app/screens/more-screen';
import { KnowledgeScreen } from './app/setup/knowledge-screen';
import { ReviewScreen } from './app/whatsapp/review-screen';
import { GrowthScreen } from './app/growth/growth-screen';
import { ReferralScreen } from './app/referral/referral-screen';
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
          { path: Route.assistantAutonomy, element: <AutonomyEditor /> },
          { path: Route.assistantIdentity, element: <IdentityEditor /> },
          { path: Route.tone, element: <ToneScreen /> },
          { path: Route.knowledge, element: <KnowledgeScreen /> },
          { path: Route.simulator, element: <SimulatorScreen /> },
          { path: Route.clinic, element: <ClinicScreen /> },
          { path: Route.clinicBusiness, element: <BusinessEditor /> },
          { path: Route.clinicServices, element: <ServicesEditor /> },
          { path: Route.clinicHours, element: <HoursEditor /> },
          { path: Route.clinicAddress, element: <AddressEditor /> },
          { path: Route.clinicTeam, element: <TeamEditor /> },
          { path: Route.clinicPayments, element: <PaymentsEditor /> },
          { path: Route.clinicCalendar, element: <CalendarEditor /> },
          { path: Route.clinicWhatsapp, element: <WhatsappEditor /> },
          { path: Route.account, element: <AccountScreen /> },
          { path: Route.accountNotifications, element: <NotificationsScreen /> },
          { path: Route.importReview, element: <ReviewScreen /> },
          { path: Route.usage, element: <UsageScreen /> },
          { path: Route.billing, element: <BillingScreen /> },
          { path: Route.team, element: <TeamScreen /> },
          { path: Route.growth, element: <GrowthScreen /> },
          { path: Route.referral, element: <ReferralScreen /> },
          { path: Route.support, element: <SupportScreen /> },
        ],
      },
      ...legacyRoutes(),
      { path: Route.onboarding, element: <OnboardingScreen /> },
      { path: Route.operator, element: <OperatorScreen /> },
    ],
  },
  { path: '*', element: <Navigate to={Route.home} replace /> },
]);
