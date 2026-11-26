import { MoreCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { useOnboarding } from '../onboarding/onboarding-api';
import { OperatorCopy } from '../operator/operator-copy';
import { useIsOperator } from '../operator/operator-api';
import { TeamRole } from '../team/team-copy';
import type { MoreRow } from './more-item-link';

/**
 * The settings pages, shared by "Mais" on the phone and "Configurações" in the sidebar. Equipe is
 * the owner's: the others do not see the row; the operator also gets the operator area.
 */
export function useSettingsRows(): MoreRow[] {
  const operator = useIsOperator();
  const unanswered = useOnboarding().data?.checklist.unanswered;
  const role = authClient.useActiveMember().data?.role;
  const rows: MoreRow[] = (MoreCopy.items as readonly MoreRow[])
    .filter((row) => row.to !== Route.team || role === TeamRole.owner)
    .map((row) => (row.to === Route.assistant ? { ...row, badge: unanswered } : row));
  if (operator) rows.push({ label: OperatorCopy.title, hint: '', to: Route.operator });
  return rows;
}
