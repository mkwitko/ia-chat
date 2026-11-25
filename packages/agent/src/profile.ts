import type { AgentProfile } from '@app/ai';
import { parsePolicy, Sensitivity, type SpecialtyPolicy } from '@app/core';
import type { Plan, Tx } from '@app/db';
import { cancellationText, hoursLines } from './hours.ts';
import { HEALTH_URGENCY_TERMS } from './prefilter.ts';

/** The tenant-wide part of the agent context: the same for a real chat and the simulator. */
export interface TenantContext {
  tenantId: string;
  autonomy: string;
  plan: Plan;
  timezone: string;
  profile: AgentProfile;
  urgencyTerms: string[];
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
    urgencyTerms: urgencyTermsOf(policy),
    forbiddenTerms: policy.forbiddenTerms,
    personalNames: [profile.professionalName],
  };
}

function urgencyTermsOf(policy: SpecialtyPolicy): string[] {
  return policy.sensitivity === Sensitivity.health
    ? [...HEALTH_URGENCY_TERMS, ...policy.urgencyTerms]
    : policy.urgencyTerms;
}

interface ProfileSources {
  tenant: {
    name: string;
    assistantName: string;
    identityMode: AgentProfile['identity'];
    cancelNoticeMinutes: number;
  };
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
  // The professional's weekly rules; without any, the assistant has no hours to state.
  const rules = professional
    ? await tx.availabilityRule.findMany({ where: { professionalId: professional.id } })
    : [];
  return {
    identity: tenant.identityMode,
    assistantName: tenant.assistantName,
    professionalName: professional?.name ?? tenant.name,
    specialty,
    sensitivity: policy.sensitivity,
    vocabulary: policy.vocabulary,
    tone: professional?.toneOfVoice ?? undefined,
    examples: professional?.messageExamples ?? [],
    services: services.map(serviceOf),
    pricesForbidden: policy.pricesForbidden,
    hours: hoursLines(rules),
    cancellationRule: cancellationText(tenant.cancelNoticeMinutes),
    address: location?.address,
    arrival: location?.arrivalInstructions ?? undefined,
    knowledge: knowledge.map((item) => ({ question: item.question, answer: item.answer ?? '' })),
  };
}

function serviceOf(service: {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}): AgentProfile['services'][number] {
  return {
    id: service.id,
    name: service.name,
    minutes: service.durationMinutes,
    priceCents: service.priceCents,
  };
}
