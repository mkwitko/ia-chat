import { toast } from 'sonner';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { takeFailedChange } from './query';

// Every error the panel shows says what happened, what to do, and, when a change failed, offers
// to send it again (Nielsen 9).

export const NotifyCopy = defineMessages({
  [Locale.ptBR]: {
    retry: 'Tentar de novo',
    hint: 'Confira a internet e tente de novo. Se continuar, fale com a gente em Ajuda.',
    saved: 'Alterações salvas.',
  },
  [Locale.enUS]: {},
});

/** An error toast: the message, what to do, and "Tentar de novo" when a change just failed. */
export function notifyError(message: string, hint: string = NotifyCopy.hint) {
  const retry = takeFailedChange();
  return toast.error(message, {
    description: hint,
    ...(retry && {
      action: {
        label: NotifyCopy.retry,
        onClick: () => {
          retry().then(
            () => toast.success(NotifyCopy.saved),
            () => {
              notifyError(message, hint);
            },
          );
        },
      },
    }),
  });
}
