import type { AgentProfile } from '@app/ai';
import { parsePolicy, type SpecialtyPolicy } from '@app/core';
import type { Plan, Tx } from '@app/db';

/** The tenant-wide part of the agent context: the same for a real chat and the simulator. */
export interface TenantContext {
  tenantId: string;
  autonomy: string;
  plan: Plan;
  timezone: string;
  profile: AgentProfile;
  specialtyTerms: string[];
  forbiddenTerms: string[];
  /** Names that stay out of traces: the professional's; a conversation adds the contact's. */
  personalNames: string[];
}

export async function loadTenantContext(tx: Tx, tenantId: string): Promise<TenantContext> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: { specialtyPolicy: true },
  });
  const policy = parsePolicy(tenant.specialtyPolicy?.rules);
  const specialty = tenant.specialtyPolicy?.specialty;
  const profile = await loadProfile(tx, { tenant, policy, specialty });
  return {
    tenantId: tenant.id,
    autonomy: tenant.autonomy,
    plan: tenant.plan,
    timezone: tenant.timezone,
    profile,
    specialtyTerms: policy.urgencyTerms,
    forbiddenTerms: policy.forbiddenTerms,
    personalNames: [profile.professionalName],
  };
}

interface ProfileSources {
  tenant: { name: string; assistantName: string; identityMode: AgentProfile['identity'] };
  policy: SpecialtyPolicy;
  specialty: string | undefined;
}

async function loadProfile(
  tx: Tx,
  { tenant, policy, specialty }: ProfileSources,
): Promise<AgentProfile> {
  const professional = await tx.professional.findFirst({ orderBy: { createdAt: 'asc' } });
  const services = await tx.service.findMany({
    where: { active: true, visibleToPatient: true },
    orderBy: { name: 'asc' },
  });
  const location = await tx.location.findFirst({ orderBy: { createdAt: 'asc' } });
  const knowledge = await tx.knowledgeItem.findMany({
    where: { active: true, answer: { not: null } },
    orderBy: { createdAt: 'asc' },
  });
  return {
    identity: tenant.identityMode,
    assistantName: tenant.assistantName,
    professionalName: professional?.name ?? tenant.name,
    specialty,
    tone: professional?.toneOfVoice ?? undefined,
    examples: professional?.messageExamples ?? [],
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      minutes: service.durationMinutes,
      priceCents: service.priceCents,
    })),
    pricesForbidden: policy.pricesForbidden,
    hours: [], // ponytail: availability rules are shown by the agenda tools (E-19)
    cancellationRule: undefined,
    address: location?.address,
    arrival: location?.arrivalInstructions ?? undefined,
    knowledge: knowledge.map((item) => ({ question: item.question, answer: item.answer ?? '' })),
  };
}
