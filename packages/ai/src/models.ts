/** Model creators as named by the Vercel AI Gateway catalog. */
export const Provider = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  /** Development only (free tier): never routed in production. */
  groq: 'groq',
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

/** Gateway model id "provider/model", also the key of the price table and ai_usage. */
export function modelKey({ provider, model }: ModelRef): string {
  return `${provider}/${model}`;
}
