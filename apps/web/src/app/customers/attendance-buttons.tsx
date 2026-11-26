import { labelOf } from '@/i18n/messages';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { useAttendance } from './customers-api';
import { CustomerCopy as Copy } from './customers-copy';
import { Outcome } from './customers-types';

const OUTCOMES = [
  { outcome: Outcome.attended, label: Copy.attended },
  { outcome: Outcome.noShow, label: Copy.noShow },
] as const;

function failure(error: Error): string {
  const known =
    error instanceof ApiError && error.code ? labelOf(Copy.attendanceErrors, error.code) : null;
  return known ?? Copy.attendanceFailed;
}

/** "Compareceu" / "Faltou" for one appointment; `current` shows the mark being corrected. */
export function AttendanceButtons({
  appointmentId,
  current,
}: Readonly<{ appointmentId: string; current?: Outcome | undefined }>) {
  const attendance = useAttendance();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={Copy.attendanceAsk}>
      {OUTCOMES.map(({ outcome, label }) => (
        <Button
          key={outcome}
          variant={current === outcome ? 'default' : 'outline'}
          aria-pressed={current === undefined ? undefined : current === outcome}
          disabled={attendance.isPending}
          onClick={() => {
            attendance.mutate(
              { id: appointmentId, outcome },
              {
                onSuccess: () => toast.success(Copy.attendanceSaved),
                onError: (error) => notifyError(failure(error)),
              },
            );
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
