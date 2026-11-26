import { notifyError } from '@/lib/notify';
import { usePushState, usePushSubscribe } from '@/lib/push';
import { PushCopy } from '../inbox/inbox-copy';
import type { ServiceAlert } from './alert-bar';

/**
 * Without notifications the professional is not told when a patient needs them, which stops
 * the service in practice (spec 10, "Faixa de alerta"). Shown until this browser subscribes.
 */
export function usePushAlert(): ServiceAlert | null {
  const state = usePushState();
  const subscribe = usePushSubscribe();
  if (!state.data?.available || state.data.subscribed) return null;
  return {
    message: state.data.blocked ? PushCopy.denied : PushCopy.alert,
    action: PushCopy.enable,
    onAction: () => {
      subscribe().then(
        (granted) => {
          if (!granted) notifyError(PushCopy.denied);
        },
        () => notifyError(PushCopy.failed),
      );
    },
  };
}
