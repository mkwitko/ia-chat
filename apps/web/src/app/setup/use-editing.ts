import { useState } from 'react';
import { feedback } from './feedback';

export const NEW_ITEM = 'new';

/** Which row of a list is open for editing ("new" for the add form), closed after a save. */
export function useEditing() {
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => {
    setEditing(null);
  };
  const done = {
    onSuccess: () => {
      close();
      feedback.onSuccess();
    },
    onError: feedback.onError,
  };
  return { editing, open: setEditing, close, done };
}
