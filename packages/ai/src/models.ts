export const Provider = {
  anthropic: 'anthropic',
  openai: 'openai',
  groq: 'groq',
  /** Cloudflare Workers AI: development only, never patient traffic. */
  workersAi: 'workers-ai',
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];

export interface ModelRef {
  provider: Provider;
  model: string;
}

export interface Route {
  primary: ModelRef;
  fallback?: ModelRef;
}

/** Key used by the price table and ai_usage: "provider/model". */
export function modelKey({ provider, model }: ModelRef): string {
  return `${provider}/${model}`;
}
