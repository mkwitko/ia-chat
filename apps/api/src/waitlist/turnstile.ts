import * as z from 'zod';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Server-side check of a Turnstile token. Injected so tests never call Cloudflare. */
export type TurnstileVerifier = (token: string, ip: string | undefined) => Promise<boolean>;

const responseSchema = z.object({ success: z.boolean() });

export function cloudflareVerifier(secret: string): TurnstileVerifier {
  return async (token, ip) => {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip);
    const response = await fetch(VERIFY_URL, { method: 'POST', body: form });
    if (!response.ok) throw new Error(`turnstile verify failed: ${String(response.status)}`);
    return responseSchema.parse(await response.json()).success;
  };
}
