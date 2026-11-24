import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, memberAc, ownerAc } from 'better-auth/plugins/organization/access';

// RN-34: owner, professional, receptionist. Receptionist does not see billing
// nor change integrations. Billing is the owner's (hypothesis H-10). Assistant settings
// (autonomy, identity) speak to patients: receptionist only reads them (hypothesis H-14).

export const Role = {
  owner: 'owner',
  professional: 'professional',
  receptionist: 'receptionist',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

const Action = { read: 'read', manage: 'manage' } as const;

const statement = {
  ...defaultStatements,
  billing: [Action.read, Action.manage],
  integrations: [Action.read, Action.manage],
  assistant: [Action.read, Action.manage],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  [Role.owner]: ac.newRole({
    ...ownerAc.statements,
    billing: [Action.read, Action.manage],
    integrations: [Action.read, Action.manage],
    assistant: [Action.read, Action.manage],
  }),
  [Role.professional]: ac.newRole({
    ...memberAc.statements,
    integrations: [Action.read, Action.manage],
    assistant: [Action.read, Action.manage],
  }),
  [Role.receptionist]: ac.newRole({
    ...memberAc.statements,
    integrations: [Action.read],
    assistant: [Action.read],
  }),
};

export type PermissionRequest = Parameters<(typeof roles)[Role]['authorize']>[0];

export const Permission = {
  billingRead: { billing: [Action.read] },
  billingManage: { billing: [Action.manage] },
  integrationsRead: { integrations: [Action.read] },
  integrationsManage: { integrations: [Action.manage] },
  assistantRead: { assistant: [Action.read] },
  assistantManage: { assistant: [Action.manage] },
} as const satisfies Record<string, PermissionRequest>;

export function isRole(value: string): value is Role {
  return Object.values<string>(Role).includes(value);
}
