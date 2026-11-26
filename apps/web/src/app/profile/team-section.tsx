import { useState } from 'react';
import { AddButton } from '../setup/add-button';
import { FormActions, RowActions, TextField } from '../setup/fields';
import { NEW_ITEM, useEditing } from '../setup/use-editing';
import {
  useAddProfessional,
  useProfessionals,
  useRemoveProfessional,
  useRenameProfessional,
  type Professional,
} from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';
import { removeFeedback } from './places-section';

/** M-04: who serves. The first one owns the agenda the assistant books. */
export function TeamSection() {
  const team = useProfessionals();
  const edit = useEditing();
  const add = useAddProfessional();
  if (!team.data) return null;
  return (
    <section className="grid gap-3" aria-labelledby="team-heading">
      <h2 id="team-heading" className="text-lg">
        {Copy.teamHeading}
      </h2>
      <p className="text-sm text-muted-foreground">{Copy.teamIntro}</p>
      {team.data.professionals.map((member, index) => (
        <MemberRow key={member.id} member={member} first={index === 0} edit={edit} />
      ))}
      {edit.editing === NEW_ITEM ? (
        <NameForm
          pending={add.isPending}
          onCancel={edit.close}
          onSubmit={(name) => {
            add.mutate(name, edit.done);
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
    </section>
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
      <p className="min-w-0 flex-1 font-semibold">
        {member.name}
        {first && (
          <span className="ml-2 text-xs font-medium text-jade-ink">{Copy.agendaOwner}</span>
        )}
      </p>
      <RowActions
        onEdit={() => {
          edit.open(member.id);
        }}
        onRemove={() => {
          if (window.confirm(Copy.removeConfirm(member.name)))
            remove.mutate(member.id, removeFeedback);
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
