import { notifyError } from '@/lib/notify';
import { ConversationCopy } from './inbox-copy';

/**
 * Spec 10, "Tempo real": an action done offline is refused with a clear message, never queued.
 * A late answer to a patient is worse than one not sent.
 */
export function ensureOnline(): boolean {
  if (navigator.onLine) return true;
  notifyError(ConversationCopy.offline);
  return false;
}
