import { TextField } from '../setup/fields';
import { AccountCopy } from './account-copy';

const MIN_PASSWORD = 8;

interface ValueProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function EmailField(props: Readonly<ValueProps>) {
  return (
    <TextField
      {...props}
      label={AccountCopy.email}
      type="email"
      autoComplete="email"
      inputMode="email"
      required
    />
  );
}

/** A new password (sign-up and reset): browsers offer to generate and save it. */
export function NewPasswordField(props: Readonly<ValueProps>) {
  return (
    <TextField
      {...props}
      label={AccountCopy.password}
      type="password"
      autoComplete="new-password"
      required
      minLength={MIN_PASSWORD}
      hint={AccountCopy.passwordHint}
    />
  );
}
