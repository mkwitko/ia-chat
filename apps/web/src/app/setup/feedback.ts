import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { ApiError } from '@/lib/api';
import { CommonCopy } from './setup-copy';

const FORBIDDEN = 403;

export const notifySaved = () => toast.success(CommonCopy.saved);

export function notifySaveError(error: Error) {
  const forbidden = error instanceof ApiError && error.status === FORBIDDEN;
  notifyError(forbidden ? CommonCopy.forbidden : CommonCopy.saveFailed);
}

export const feedback = { onSuccess: notifySaved, onError: notifySaveError } as const;
