import { Navigate, useLocation } from 'react-router';
import { LegacyRoute } from '@/routes';
import { redirectTarget } from './legacy-routes';

function LegacyRedirect({ from }: Readonly<{ from: LegacyRoute }>) {
  const { search } = useLocation();
  return <Navigate to={redirectTarget(from, search)} replace />;
}

/** Router entries that keep every old settings address working. */
export const legacyRoutes = () =>
  Object.values(LegacyRoute).map((from) => ({
    path: from,
    element: <LegacyRedirect from={from} />,
  }));
