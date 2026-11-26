import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { dateFormat } from '@/i18n/locale';
import { ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { notifyError } from '@/lib/notify';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen } from '../screens/editor-screen';
import { CommonCopy } from '../setup/setup-copy';
import { useConfirmDeposit, usePendingDeposits, type PendingDeposit } from './deposits-api';
import { DepositsCopy as Copy } from './deposits-copy';

const CONFLICT = 409;
const WHEN = dateFormat({
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const TIME = dateFormat({ hour: '2-digit', minute: '2-digit' });

/** H-52: where the deposit notice opens. One tap per deposit: "Recebi o Pix". */
export function DepositsScreen() {
  const deposits = usePendingDeposits();
  return (
    <EditorScreen
      title={Copy.title}
      intro={Copy.intro}
      back={{ to: Route.home, label: Copy.backHome }}
    >
      {deposits.isPending && <ListSkeleton />}
      {deposits.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void deposits.refetch()} />
      )}
      {deposits.data?.length === 0 && <p className="text-muted-foreground">{Copy.empty}</p>}
      {deposits.data && deposits.data.length > 0 && (
        <ul className="grid gap-3">
          {deposits.data.map((deposit) => (
            <li key={deposit.id}>
              <DepositCard deposit={deposit} />
            </li>
          ))}
        </ul>
      )}
    </EditorScreen>
  );
}

function DepositCard({ deposit }: Readonly<{ deposit: PendingDeposit }>) {
  const confirm = useConfirmDeposit();
  return (
    <div className="grid gap-2 rounded-lg border border-line-strong bg-card p-4">
      <p className="font-medium">{deposit.contactName ?? Copy.unnamed}</p>
      <p className="text-sm">
        {Copy.line(deposit.serviceName, WHEN.format(new Date(deposit.startsAt)))}
      </p>
      <p className="text-lg font-semibold">{formatCents(deposit.amountCents)}</p>
      <p className="text-sm text-muted-foreground">
        {Copy.until(TIME.format(new Date(deposit.expiresAt)))}
      </p>
      <Button
        className="justify-self-start"
        disabled={confirm.isPending}
        onClick={() => {
          confirm.mutate(deposit.id, {
            onSuccess: () => toast.success(Copy.confirmed),
            onError: (error) => {
              const late = error instanceof ApiError && error.status === CONFLICT;
              notifyError(late ? Copy.expired : CommonCopy.saveFailed);
            },
          });
        }}
      >
        {confirm.isPending ? Copy.confirming : Copy.confirm}
      </Button>
    </div>
  );
}
