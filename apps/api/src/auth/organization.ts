import type { Db } from '@app/db';
import { organization } from 'better-auth/plugins';
import type { EmailSender } from '../email/outbox.ts';
import { invitationEmail } from '../email/templates.ts';
import type { ApiEnv } from '../env.ts';
import { Role, ac, roles } from './access.ts';

const INVITATION_PATH = '/convite';

// Better Auth's organization is our tenant: map its models and fields onto our tables.
const TENANT_SCHEMA = {
  organization: { modelName: 'tenant' },
  member: { modelName: 'membership', fields: { organizationId: 'tenantId' } },
  invitation: { fields: { organizationId: 'tenantId' } },
  session: { fields: { activeOrganizationId: 'activeTenantId' } },
};

export interface TenantPluginDeps {
  env: ApiEnv;
  db: Db;
  email: EmailSender;
}

export function tenantPlugin({ env, db, email }: TenantPluginDeps) {
  return organization({
    ac,
    roles,
    creatorRole: Role.owner,
    schema: TENANT_SCHEMA,
    organizationHooks: {
      // Agenda, tone and the agent all speak for the first professional: create it with the
      // tenant, named after the owner (editable in "Tom de voz").
      afterCreateOrganization: async ({ organization: tenant, user }) => {
        await db.withTenant(tenant.id, (tx) =>
          tx.professional.create({ data: { tenantId: tenant.id, name: user.name } }),
        );
      },
    },
    sendInvitationEmail: (data) =>
      email.send(
        invitationEmail({
          to: data.email,
          url: `${env.WEB_ORIGIN}${INVITATION_PATH}/${data.id}`,
          tenantName: data.organization.name,
          inviterName: data.inviter.user.name,
        }),
      ),
  });
}
