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

const MESSAGES = {
  sending: 'Enviando...',
  done: 'Pronto! Enviamos uma confirmação para o seu e-mail. Confira também a caixa de spam.',
  invalid: 'Não conseguimos validar o envio. Confira o e-mail e a verificação e tente de novo.',
  failed: 'Não conseguimos enviar agora. Tente de novo em alguns minutos.',
} as const;

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
