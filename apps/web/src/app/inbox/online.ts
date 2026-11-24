import { toast } from 'sonner';
import { ConversationCopy } from './inbox-copy';

/**
 * Spec 10, "Tempo real": an action done offline is refused with a clear message, never queued.
 * A late answer to a patient is worse than one not sent.
 */
export function ensureOnline(): boolean {
  if (navigator.onLine) return true;
  toast.error(ConversationCopy.offline);
  return false;
}
