import { confirmRemove } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import { Link } from 'react-router';
import { notifyError } from '@/lib/notify';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { PROFESSIONAL_PARAM } from '../agenda/professional-api';
import { feedback } from '../setup/feedback';
import { AddButton } from '../setup/add-button';
import { FormActions, RowActions, TextField } from '../setup/fields';
import { NEW_ITEM, useEditing } from '../setup/use-editing';
import {
  PLAN_LIMIT,
  useAddProfessional,
  useProfessionals,
  useRemoveProfessional,
  useRenameProfessional,
  type Professional,
} from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';
import { removeFeedback } from './places-section';

const addFeedback = (done: { onSuccess: () => void }) => ({
  onSuccess: done.onSuccess,
  onError: (error: Error) => {
    if (error instanceof ApiError && error.code === PLAN_LIMIT) notifyError(Copy.planLimit);
    else feedback.onError(error);
  },
});

/** M-04: who serves; each professional has an agenda (spec 05, "Agenda por profissional"). */
export function TeamSection() {
  const team = useProfessionals();
  const edit = useEditing();
  const add = useAddProfessional();
  if (!team.data) return null;
  return (
    <div className="grid gap-3">
      {team.data.professionals.map((member, index) => (
        <MemberRow key={member.id} member={member} first={index === 0} edit={edit} />
      ))}
      {edit.editing === NEW_ITEM ? (
        <NameForm
          pending={add.isPending}
          onCancel={edit.close}
          onSubmit={(name) => {
            add.mutate(name, addFeedback(edit.done));
          }}
        />
      ) : (
        <AddButton
          label={Copy.addProfessional}
          onClick={() => {
            edit.open(NEW_ITEM);
          }}
        />
      )}
    </div>
  );
}

interface RowProps {
  member: Professional;
  first: boolean;
  edit: ReturnType<typeof useEditing>;
}

function MemberRow({ member, first, edit }: Readonly<RowProps>) {
  const rename = useRenameProfessional();
  const remove = useRemoveProfessional();
  if (edit.editing === member.id)
    return (
      <NameForm
        initial={member.name}
        pending={rename.isPending}
        onCancel={edit.close}
        onSubmit={(name) => {
          rename.mutate({ id: member.id, name }, edit.done);
        }}
      />
    );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-4">
      <p className="grid min-w-48 flex-1 font-semibold">
        {member.name}
        {first && (
          <span className="text-sm font-normal text-muted-foreground">{Copy.agendaOwner}</span>
        )}
      </p>
      <Link
        to={`${Route.clinicHours}?${PROFESSIONAL_PARAM}=${member.id}`}
        className="flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
      >
        {Copy.hours}
      </Link>
      <RowActions
        onEdit={() => {
          edit.open(member.id);
        }}
        onRemove={() => {
          confirmRemove(Copy.removeConfirm(member.name), remove.mutate, member.id, removeFeedback);
        }}
      />
    </div>
  );
}

interface NameFormProps {
  initial?: string;
  pending: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function NameForm({ initial = '', pending, onSubmit, onCancel }: Readonly<NameFormProps>) {
  const [name, setName] = useState(initial);
  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <TextField
        id="member-name"
        label={Copy.teamName}
        value={name}
        onChange={setName}
        required
        maxLength={120}
      />
      <FormActions pending={pending} onCancel={onCancel} />
    </form>
  );
}
