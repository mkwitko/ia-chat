import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { CommonCopy } from './setup-copy';

const FORBIDDEN = 403;

export const notifySaved = () => toast.success(CommonCopy.saved);

export function notifySaveError(error: Error) {
  const forbidden = error instanceof ApiError && error.status === FORBIDDEN;
  toast.error(forbidden ? CommonCopy.forbidden : CommonCopy.saveFailed);
}

export const feedback = { onSuccess: notifySaved, onError: notifySaveError } as const;
