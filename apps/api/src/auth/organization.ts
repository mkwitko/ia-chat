import { organization } from 'better-auth/plugins';
import type { EmailSender } from '../email/outbox.ts';
import { invitationEmail } from '../email/templates.ts';
import type { ApiEnv } from '../env.ts';
import { Role, ac, roles } from './access.ts';

// Team invitation; /convite/:token is the onboarding invite (H-37).
const INVITATION_PATH = '/convite-equipe';

// Better Auth's organization is our tenant: map its models and fields onto our tables.
const TENANT_SCHEMA = {
  organization: { modelName: 'tenant' },
  member: { modelName: 'membership', fields: { organizationId: 'tenantId' } },
  invitation: { fields: { organizationId: 'tenantId' } },
  session: { fields: { activeOrganizationId: 'activeTenantId' } },
};

export interface TenantPluginDeps {
  env: ApiEnv;
  email: EmailSender;
}

export function tenantPlugin({ env, email }: TenantPluginDeps) {
  return organization({
    ac,
    roles,
    creatorRole: Role.owner,
    // Invite-only (H-37): a consultório is opened only by an onboarding invite, never by a user.
    allowUserToCreateOrganization: false,
    schema: TENANT_SCHEMA,
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
