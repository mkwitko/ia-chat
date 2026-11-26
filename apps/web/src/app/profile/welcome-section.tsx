import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { feedback } from '../setup/feedback';
import { AreaField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { useProfilePatch } from './profile-api';

export const WelcomeCopy = {
  label: 'Cole sua mensagem de boas-vindas atual (opcional)',
  hint: 'A Meta não traz a saudação do app Business. Colando aqui, o assistente segue o seu jeito e faz as mesmas primeiras perguntas.',
  placeholder: 'Olá! Aqui é do consultório… Qual é o seu nome?',
} as const;

const MAX_WELCOME = 1_000;

/** Spec 09: the greeting of the WhatsApp Business app is not imported; the owner pastes it. */
export function WelcomeSection() {
  const { profile, patch, pending } = useProfilePatch();
  if (!profile.data) return null;
  return (
    <WelcomeForm
      initial={profile.data.profile.welcomeMessage ?? ''}
      patch={patch}
      pending={pending}
    />
  );
}

interface FormProps {
  initial: string;
  patch: ReturnType<typeof useProfilePatch>['patch'];
  pending: boolean;
}

function WelcomeForm({ initial, patch, pending }: Readonly<FormProps>) {
  const [text, setText] = useState(initial);
  const changed = text.trim() !== initial.trim();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const welcomeMessage = text.trim();
        patch(welcomeMessage ? { welcomeMessage } : { welcomeMessage: undefined }, feedback);
      }}
    >
      <AreaField
        id="welcome-message"
        label={WelcomeCopy.label}
        hint={WelcomeCopy.hint}
        placeholder={WelcomeCopy.placeholder}
        value={text}
        onChange={setText}
        maxLength={MAX_WELCOME}
      />
      <Button
        type="submit"
        variant="outline"
        className="justify-self-start"
        disabled={pending || !changed}
      >
        {pending ? CommonCopy.saving : CommonCopy.save}
      </Button>
    </form>
  );
}
