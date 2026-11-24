import { describe, expect, it } from 'vitest';
import { Provider } from './models.ts';
import { devModelResolver, MissingCredentialError } from './providers.ts';

describe('development resolver (free tier)', () => {
  it('is refused in production', () => {
    expect(() => devModelResolver({ GROQ_API_KEY: 'gsk_test' }, true)).toThrow(/development only/);
  });

  it('needs the Groq key', () => {
    expect(() => devModelResolver({}, false)).toThrow(MissingCredentialError);
  });

  it('sends Groq models to Groq without needing the Vercel key', () => {
    const resolver = devModelResolver({ GROQ_API_KEY: 'gsk_test' }, false);
    expect(
      resolver.language({ provider: Provider.groq, model: 'openai/gpt-oss-120b' }),
    ).toMatchObject({ provider: 'groq.chat', modelId: 'openai/gpt-oss-120b' });
    expect(() => resolver.language({ provider: Provider.openai, model: 'gpt-6-luna' })).toThrow(
      MissingCredentialError,
    );
  });
});
