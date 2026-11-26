import { useState } from 'react';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { NoShowToggle, NoticeSelect, PaymentPills } from '../profile/payment-section';
import type { ProfileView } from '../profile/profile-api';
import { ProfileCopy } from '../profile/profile-copy';
import { EditorActions, EditorScreen, MoreOptions } from '../screens/editor-screen';
import { AreaField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { ClinicCopy, EditorCopy } from './clinic-copy';
import { useProfileEditor } from './use-profile-editor';

const BACK = { to: Route.clinic, label: ClinicCopy.back };
const EMPTY = '';

/** Meu consultório › Pagamento e desmarcação: how you are paid and how far ahead one cancels. */
export function PaymentsEditor() {
  const { profile, submit, pending } = useProfileEditor();
  return (
    <EditorScreen title={ClinicCopy.payments} intro={EditorCopy.paymentsIntro} back={BACK}>
      {profile.isPending && <ListSkeleton />}
      {profile.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void profile.refetch()} />
      )}
      {profile.data && <PaymentsForm initial={profile.data} pending={pending} onSave={submit} />}
    </EditorScreen>
  );
}

interface FormProps {
  initial: ProfileView;
  pending: boolean;
  onSave: (view: ProfileView) => void;
}

function PaymentsForm({ initial, pending, onSave }: Readonly<FormProps>) {
  const [view, setView] = useState(initial);
  const profile = view.profile;
  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(view);
      }}
    >
      <PaymentPills
        chosen={profile.paymentMethods}
        onChange={(paymentMethods) => {
          setView({ ...view, profile: { ...profile, paymentMethods } });
        }}
      />
      <NoticeSelect
        value={view.cancelNoticeMinutes}
        onChange={(cancelNoticeMinutes) => {
          setView({ ...view, cancelNoticeMinutes });
        }}
      />
      <PaymentsMore view={view} onChange={setView} />
      <EditorActions pending={pending} backTo={Route.clinic} />
    </form>
  );
}

function PaymentsMore({
  view,
  onChange,
}: Readonly<{ view: ProfileView; onChange: (view: ProfileView) => void }>) {
  const profile = view.profile;
  return (
    <MoreOptions>
      <AreaField
        id="payments-policy"
        label={ProfileCopy.policy}
        placeholder={ProfileCopy.policyPlaceholder}
        value={profile.cancellationPolicy ?? EMPTY}
        onChange={(cancellationPolicy) => {
          onChange({ ...view, profile: { ...profile, cancellationPolicy } });
        }}
        maxLength={600}
      />
      <NoShowToggle
        checked={view.noShowFollowUp}
        onChange={(noShowFollowUp) => {
          onChange({ ...view, noShowFollowUp });
        }}
      />
    </MoreOptions>
  );
}
