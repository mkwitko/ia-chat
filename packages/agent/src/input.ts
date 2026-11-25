import type { AgentProfile, AgentState } from '@app/ai';
import type { Plan } from '@app/db';
import type { ModelMessage } from 'ai';

/** What one agent turn knows (spec 04, "Contexto do prompt"), with or without a conversation. */
export interface AgentInput {
  tenantId: string;
  autonomy: string;
  plan: Plan;
  timezone: string;
  profile: AgentProfile;
  state: AgentState;
  history: ModelMessage[];
  urgencyTerms: string[];
  forbiddenTerms: string[];
  personalNames: string[];
}
