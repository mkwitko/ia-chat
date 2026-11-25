import { randomUUID } from 'node:crypto';
import {
  createAiGateway,
  DEFAULT_ROUTES,
  PRICE_TABLE,
  Provider,
  Task,
  type AiGateway,
} from '@app/ai';
import { MockLanguageModelV3 } from 'ai/test';

// Test-only: a real gateway over a scripted model. No provider is called, nothing is billed.

const OPEN_CAPS = { turn: 1_000_000n, conversation: 1_000_000n, tenantMonth: 1_000_000n };
const USAGE = {
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
};
const finish = (unified: 'stop' | 'tool-calls') => ({ unified, raw: unified });

export type Step = { text: string } | { tool: string; input: object };

type Store = Parameters<typeof createAiGateway>[0]['store'];

function scriptedModel(steps: Step[], prompts: unknown[]) {
  return new MockLanguageModelV3({
    doGenerate: (options) => {
      prompts.push(options.prompt);
      const step = steps.shift() ?? { text: 'ok' };
      const content =
        'tool' in step
          ? [
              {
                type: 'tool-call' as const,
                toolCallId: randomUUID(),
                toolName: step.tool,
                input: JSON.stringify(step.input),
              },
            ]
          : [{ type: 'text' as const, text: step.text }];
      return Promise.resolve({
        finishReason: finish('tool' in step ? 'tool-calls' : 'stop'),
        usage: USAGE,
        warnings: [],
        content,
      });
    },
  });
}

export function fakeGateway(steps: Step[], store: Store) {
  const prompts: unknown[] = [];
  const model = scriptedModel(steps, prompts);
  const gateway: AiGateway = createAiGateway({
    routes: {
      ...DEFAULT_ROUTES,
      [Task.conversation]: { primary: { provider: Provider.openai, model: 'gpt-6-luna' } },
    },
    resolver: {
      language: () => model,
      transcription: () => {
        throw new Error('not used');
      },
    },
    prices: PRICE_TABLE,
    caps: OPEN_CAPS,
    store,
    // Jev is off: the checks fall back to the rules only.
    judgeProvider: { ask: () => Promise.reject(new Error('Jev down')) },
  });
  return { gateway, prompts };
}
