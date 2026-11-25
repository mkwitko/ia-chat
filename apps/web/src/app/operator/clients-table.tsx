import { Button } from '@/components/ui/button';
import type { ClientRow } from './operator-api';
import { OperatorCopy as Copy } from './operator-copy';

interface Props {
  rows: ClientRow[];
  onRequest: (row: ClientRow) => void;
}

/** Clients with plan, channel, month usage, real AI cost and margin (spec 07). */
export function ClientsTable({ rows, onRequest }: Readonly<Props>) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="border-b text-muted-foreground">
          <tr>
            {Copy.columns.map((header) => (
              <th key={header} scope="col" className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <ClientLine key={row.id} row={row} onRequest={onRequest} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientLine({
  row,
  onRequest,
}: Readonly<{ row: ClientRow; onRequest: Props['onRequest'] }>) {
  return (
    <tr>
      <th scope="row" className="px-3 py-2 font-medium">
        {row.name}
        <span className="block text-xs font-normal text-muted-foreground">{row.status}</span>
      </th>
      <td className="px-3 py-2">{row.plan}</td>
      <td className="px-3 py-2">{row.channelConnected ? Copy.connected : Copy.notConnected}</td>
      <td className="px-3 py-2">{Copy.usageLine(row.conversations, row.franchise)}</td>
      <td className="px-3 py-2">{Copy.money(row.revenueCents)}</td>
      <td className="px-3 py-2">{Copy.money(row.costCents)}</td>
      <td className={row.marginCents < 0 ? 'px-3 py-2 text-destructive' : 'px-3 py-2'}>
        {Copy.money(row.marginCents)}
      </td>
      <td className="px-3 py-2">
        {Copy.problemsLine(row.failedTurns, row.discardedTurns, row.handoffs)}
      </td>
      <td className="px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onRequest(row);
          }}
        >
          {Copy.request}
        </Button>
      </td>
    </tr>
  );
}
