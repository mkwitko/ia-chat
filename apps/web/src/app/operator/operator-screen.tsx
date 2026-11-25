import { useState } from 'react';
import { Navigate } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { AccessPanel } from './access-panel';
import { ClientsTable } from './clients-table';
import { FunnelPanel } from './funnel-panel';
import { ProblemsPanel } from './problems-panel';
import { useClients, type ClientRow } from './operator-api';
import { OperatorCopy as Copy } from './operator-copy';

/** Platform operator area (E-27): the API guard answers 403 to anyone else, who leaves here. */
export function OperatorScreen() {
  const clients = useClients();
  const [selected, setSelected] = useState<ClientRow | null>(null);
  if (clients.isError) return <Navigate to={Route.more} replace />;
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.more} label={Copy.more} />
      {clients.isPending && <ListSkeleton />}
      {clients.data?.length === 0 && <p className="px-4 md:px-0">{Copy.empty}</p>}
      <div className="grid gap-6 px-4 pb-10 md:px-0">
        <ProblemsPanel />
        <FunnelPanel />
        {clients.data && <ClientsTable rows={clients.data} onRequest={setSelected} />}
        {selected && <AccessPanel key={selected.id} client={selected} />}
      </div>
    </Screen>
  );
}
