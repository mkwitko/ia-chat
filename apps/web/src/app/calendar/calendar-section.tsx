import { useState } from 'react';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { confirmThen, questionOf } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import {
  CalendarState,
  useCalendarStatus,
  useChooseCalendar,
  useConnectGoogle,
  useDisconnectGoogle,
  useOwnedCalendars,
  type CalendarStatus,
  type OwnedCalendar,
} from './calendar-api';
import { CalendarCopy as Copy } from './calendar-copy';

const RETURN_PARAM = 'google';
const RETURN_OK = 'ok';

/** Spec 05 / 10: connect Google Agenda, pick the calendar, see the status, disconnect. */
export function CalendarSection() {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg">{Copy.heading}</h2>
      <p className="text-sm text-muted-foreground">{Copy.intro}</p>
      <CalendarConnect />
    </section>
  );
}

/** Connect, choose and disconnect, without the heading (Meu consultório › Google Agenda). */
export function CalendarConnect() {
  const status = useCalendarStatus();
  return (
    <div className="grid gap-3">
      <ReturnNotice />
      {status.isError && <p role="alert">{Copy.loadFailed}</p>}
      {status.data && <Body status={status.data} />}
    </div>
  );
}

/** Google sends the user back with ?google=ok|erro. */
function ReturnNotice() {
  const result = new URLSearchParams(window.location.search).get(RETURN_PARAM);
  if (!result) return null;
  return <p role="status">{result === RETURN_OK ? Copy.returnedOk : Copy.returnedFailed}</p>;
}

function Body({ status }: Readonly<{ status: CalendarStatus }>) {
  if (status.state === CalendarState.off) return <p>{Copy.off}</p>;
  if (status.state === CalendarState.notConnected) return <ConnectButton label={Copy.connect} />;
  const reconnect = status.state === CalendarState.needsReconnect;
  return (
    <div className="grid gap-3">
      {reconnect && (
        <>
          <p role="alert">{Copy.needsReconnect}</p>
          <ConnectButton label={Copy.reconnect} />
        </>
      )}
      {status.state === CalendarState.connected && (
        <p>{Copy.connectedTo(status.calendarName ?? '')}</p>
      )}
      {status.state === CalendarState.chooseCalendar && <p>{Copy.waiting}</p>}
      {!reconnect && <CalendarPicker status={status} />}
      <DisconnectButton />
    </div>
  );
}

function ConnectButton({ label }: Readonly<{ label: string }>) {
  const connect = useConnectGoogle();
  return (
    <Button
      className="justify-self-start"
      disabled={connect.isPending}
      onClick={() => {
        connect.mutate(undefined, { onError: () => notifyError(Copy.connectFailed) });
      }}
    >
      {connect.isPending ? Copy.connecting : label}
    </Button>
  );
}

function CalendarPicker({ status }: Readonly<{ status: CalendarStatus }>) {
  const owned = useOwnedCalendars(true);
  const choose = useChooseCalendar();
  const [picked, setPicked] = useState<string | null>(null);
  const list = owned.data?.calendars ?? [];
  if (owned.isPending) return null;
  if (list.length === 0) return <p>{Copy.noCalendars}</p>;
  const current = picked ?? list.find((one) => one.name === status.calendarName)?.id ?? '';
  return (
    <div className="grid gap-2">
      <Label htmlFor="calendar-pick">{Copy.chooseHeading}</Label>
      <CalendarSelect calendars={list} value={current} onChange={setPicked} />
      <p className="text-sm text-muted-foreground">{Copy.chooseHint}</p>
      <Button
        className="justify-self-start"
        disabled={!current || choose.isPending}
        onClick={() => {
          choose.mutate(current, { onError: () => notifyError(Copy.saveFailed) });
        }}
      >
        {Copy.save}
      </Button>
    </div>
  );
}

function CalendarSelect({
  calendars,
  value,
  onChange,
}: Readonly<{ calendars: OwnedCalendar[]; value: string; onChange: (id: string) => void }>) {
  return (
    <select
      id="calendar-pick"
      className="h-11 rounded-md border bg-background px-3"
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      <option value="" disabled>
        {Copy.chooseHeading}
      </option>
      {calendars.map((one) => (
        <option key={one.id} value={one.id}>
          {one.name}
        </option>
      ))}
    </select>
  );
}

function DisconnectButton() {
  const disconnect = useDisconnectGoogle();
  return (
    <Button
      variant="outline"
      className="justify-self-start"
      disabled={disconnect.isPending}
      onClick={() => {
        confirmThen(
          {
            ...questionOf(Copy.disconnectConfirm),
            confirm: Copy.disconnectAction,
            destructive: true,
          },
          () => {
            disconnect.mutate(undefined, { onSuccess: () => toast.success(Copy.disconnected) });
          },
        );
      }}
    >
      {Copy.disconnect}
    </Button>
  );
}
