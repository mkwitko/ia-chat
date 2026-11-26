import { useState } from 'react';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { AreaField, FormActions, TextField } from '../setup/fields';
import {
  useRequestAccess,
  useTenantConversations,
  type ClientRow,
  type TenantConversations,
} from './operator-api';
import { OperatorCopy as Copy } from './operator-copy';

const DEFAULT_HOURS = '4';

/** RN-35: reason and deadline first; the per-conversation data only loads under an active grant. */
export function AccessPanel({ client }: Readonly<{ client: ClientRow }>) {
  const [granted, setGranted] = useState(false);
  const detail = useTenantConversations(client.id, granted);
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4">
      <h2 className="text-lg">{Copy.access.heading(client.name)}</h2>
      <AccessForm
        tenantId={client.id}
        onGranted={() => {
          setGranted(true);
        }}
      />
      {detail.isError && <p role="status">{Copy.detail.expired}</p>}
      {detail.data && <Detail data={detail.data} />}
    </section>
  );
}

function AccessForm({
  tenantId,
  onGranted,
}: Readonly<{ tenantId: string; onGranted: () => void }>) {
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const request = useRequestAccess();
  const callbacks = {
    onSuccess: () => {
      onGranted();
      toast.success(Copy.access.granted);
    },
    onError: () => notifyError(Copy.access.failed),
  };
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        request.mutate({ tenantId, reason, hours: Number(hours) }, callbacks);
      }}
    >
      <AreaField
        id="operator-reason"
        label={Copy.access.reason}
        hint={Copy.access.reasonHint}
        value={reason}
        onChange={setReason}
      />
      <TextField
        id="operator-hours"
        label={Copy.access.hours}
        value={hours}
        onChange={setHours}
        inputMode="numeric"
      />
      <FormActions pending={request.isPending} saveLabel={Copy.access.submit} />
    </form>
  );
}

function Detail({ data }: Readonly<{ data: TenantConversations }>) {
  return (
    <div className="grid gap-4 text-sm tabular-nums">
      <List
        title={Copy.detail.costs}
        lines={data.costs.map((c) => Copy.detail.costLine(c.conversationId, c.costCents))}
      />
      <List
        title={Copy.detail.issues}
        lines={data.issues.map((i) => Copy.detail.issueLine(i.conversationId, i.state, i.turns))}
      />
      <List
        title={Copy.detail.handoffs}
        lines={data.handoffs.map((h) => Copy.detail.handoffLine(h.conversationId, h.reason))}
      />
    </div>
  );
}

function List({ title, lines }: Readonly<{ title: string; lines: string[] }>) {
  return (
    <div className="grid gap-1">
      <h3 className="font-semibold">{title}</h3>
      {lines.length === 0 ? (
        <p className="text-muted-foreground">{Copy.detail.none}</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
