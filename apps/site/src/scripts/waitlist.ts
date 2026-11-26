// Waitlist form: posts to the API with the Turnstile token the widget put in the form.

declare global {
  interface Window {
    turnstile?: { reset(): void };
  }
}

const FORM = '[data-waitlist]';
const STATUS = '[data-status]';
const TOKEN_FIELD = 'cf-turnstile-response';
const OK_STATUS = 201;
// M-11: the link a business shares is /?ref=CODE. The code rides along in this tab until the form
// is sent; the API keeps it only if some business really has it. Nothing is sent to anyone else.
const REF_PARAM = 'ref';
const REF_STORAGE_KEY = 'referral-code';
const MAX_REF = 16;

const MESSAGES = {
  sending: 'Enviando...',
  done: 'Pronto! Enviamos uma confirmação para o seu e-mail. Confira também a caixa de spam.',
  invalid: 'Não conseguimos validar o envio. Confira o e-mail e a verificação e tente de novo.',
  failed: 'Não conseguimos enviar agora. Tente de novo em alguns minutos.',
} as const;

function referralCode(): string | undefined {
  const fromUrl = new URLSearchParams(window.location.search).get(REF_PARAM)?.trim();
  try {
    if (fromUrl) sessionStorage.setItem(REF_STORAGE_KEY, fromUrl.slice(0, MAX_REF));
    return sessionStorage.getItem(REF_STORAGE_KEY) ?? undefined;
  } catch {
    return fromUrl?.slice(0, MAX_REF);
  }
}

function field(data: FormData, name: string): string | undefined {
  const value = data.get(name);
  if (value === null || value instanceof File) return undefined;
  return value.trim() || undefined;
}

async function submit(form: HTMLFormElement, status: HTMLElement): Promise<void> {
  const data = new FormData(form);
  const token = field(data, TOKEN_FIELD);
  if (!token) {
    status.textContent = MESSAGES.invalid;
    return;
  }
  status.textContent = MESSAGES.sending;
  try {
    const response = await fetch(`${form.dataset.api ?? ''}/api/waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: field(data, 'email'),
        name: field(data, 'name'),
        specialty: field(data, 'specialty'),
        ref: referralCode(),
        token,
      }),
    });
    const ok = response.status === OK_STATUS;
    status.textContent = ok ? MESSAGES.done : MESSAGES.invalid;
    if (ok) form.reset();
  } catch {
    status.textContent = MESSAGES.failed;
  }
  // A Turnstile token works once: ask the widget for a fresh one.
  window.turnstile?.reset();
}

for (const form of document.querySelectorAll<HTMLFormElement>(FORM)) {
  const status = form.querySelector<HTMLElement>(STATUS);
  if (!status) continue;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submit(form, status);
  });
}

export {};
