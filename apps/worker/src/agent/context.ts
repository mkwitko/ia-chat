import type { AgentProfile, AgentState } from '@app/ai';
import { MessageAuthor, MessageType, type Tx } from '@app/db';
import type { ModelMessage } from 'ai';
import * as z from 'zod';

// Spec 04, "Contexto do prompt": everything the agent knows comes from here, read inside
// the tenant transaction. Recent history: the last 20 messages; older ones are summarized.
export const HISTORY_LIMIT = 20;

const policySchema = z.object({
  pricesForbidden: z.boolean().default(false),
  urgencyTerms: z.array(z.string()).default([]),
});

const PLACEHOLDER: Partial<Record<MessageType, string>> = {
  [MessageType.audio]: '[áudio ainda sem transcrição]',
  [MessageType.image]: '[imagem]',
  [MessageType.document]: '[documento]',
  [MessageType.sticker]: '[figurinha]',
  [MessageType.location]: '[localização]',
  [MessageType.unsupported]: '[mensagem que não deu para abrir]',
};
const PROFESSIONAL_PREFIX = '[o profissional respondeu] ';
const DATE_TIME: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};
const LOCALE = 'pt-BR';

export interface AgentInput {
  tenantId: string;
  autonomy: string;
  profile: AgentProfile;
  state: AgentState;
  history: ModelMessage[];
  specialtyTerms: string[];
  personalNames: string[];
  contactId: string;
}

export async function loadAgentInput(
  tx: Tx,
  conversationId: string,
  now: Date,
): Promise<AgentInput> {
  const conversation = await tx.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { contact: true },
  });
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: conversation.tenantId },
    include: { specialtyPolicy: true },
  });
  const policy = policySchema.parse(tenant.specialtyPolicy?.rules ?? {});
  const profile = await loadProfile(tx, {
    tenant,
    policy,
    specialty: tenant.specialtyPolicy?.specialty,
  });
  const { history, firstMessage } = await loadHistory(tx, conversationId);
  const contactName = conversation.contact.name ?? undefined;
  return {
    tenantId: tenant.id,
    autonomy: tenant.autonomy,
    profile,
    state: buildState({
      now,
      timezone: tenant.timezone,
      contactName,
      firstMessage,
      summary: conversation.summary,
    }),
    history,
    specialtyTerms: policy.urgencyTerms,
    personalNames: [contactName, profile.professionalName].filter((name): name is string =>
      Boolean(name),
    ),
    contactId: conversation.contactId,
  };
}

interface StateSources {
  now: Date;
  timezone: string;
  contactName: string | undefined;
  firstMessage: boolean;
  summary: string | null;
}

function buildState({
  now,
  timezone,
  contactName,
  firstMessage,
  summary,
}: StateSources): AgentState {
  return {
    now: now.toLocaleString(LOCALE, { ...DATE_TIME, timeZone: timezone }),
    contactName,
    appointments: [], // ponytail: the Essencial plan has no agenda; E-19 fills this from appointments
    done: [],
    firstMessage,
    summary: summary ?? undefined,
  };
}

async function loadHistory(
  tx: Tx,
  conversationId: string,
): Promise<{ history: ModelMessage[]; firstMessage: boolean }> {
  const recent = await tx.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  const answered = await tx.message.count({
    where: { conversationId, author: { in: [MessageAuthor.ai, MessageAuthor.human] } },
  });
  const history = recent
    .toReversed()
    .map(toModelMessage)
    .filter((message) => message !== null);
  return { history, firstMessage: answered === 0 };
}

interface ProfileSources {
  tenant: { id: string; name: string; assistantName: string };
  policy: z.infer<typeof policySchema>;
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

function toModelMessage(message: {
  author: MessageAuthor;
  type: MessageType;
  text: string | null;
}): ModelMessage | null {
  const text = message.text ?? PLACEHOLDER[message.type] ?? '';
  if (message.author === MessageAuthor.system || !text) return null;
  if (message.author === MessageAuthor.patient) return { role: 'user', content: text };
  return {
    role: 'assistant',
    content: message.author === MessageAuthor.human ? PROFESSIONAL_PREFIX + text : text,
  };
}
