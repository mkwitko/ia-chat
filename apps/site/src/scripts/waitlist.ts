// Waitlist form: checks the e-mail before sending, posts to the API with the Turnstile token the
// widget put in the form, and never clears what the visitor typed unless the request went through.

declare global {
  interface Window {
    turnstile?: { reset(): void };
  }
}

const BOX = '[data-waitlist-box]';
const TOKEN_FIELD = 'cf-turnstile-response';
const EMAIL_FIELD = 'email';
const STATE_SENDING = 'sending';
const STATE_IDLE = 'idle';
const DONE = 'done';
const HttpStatus = { created: 201, tooMany: 429 } as const;
// M-11: the link a business shares is /?ref=CODE. The code rides along in this tab until the form
// is sent; the API keeps it only if some business really has it. Nothing is sent to anyone else.
const REF_PARAM = 'ref';
const REF_STORAGE_KEY = 'referral-code';
const MAX_REF = 16;

const MESSAGES = {
  sending: 'Enviando...',
  emailMissing: 'Escreva o seu e-mail para receber o convite.',
  emailInvalid: 'Esse e-mail parece incompleto. Confira o @ e o final, como nome@gmail.com.',
  check:
    'Falta a verificação de segurança logo acima do botão. Espere ela carregar e envie de novo.',
  invalid: 'Não conseguimos validar o envio. Confira o e-mail e envie de novo.',
  tooMany: 'Muitas tentativas seguidas. Espere um minuto e envie de novo.',
  failed: 'Sem conexão com o nosso servidor agora. Confira a internet e envie de novo.',
} as const;

type SendResult = typeof DONE | keyof Pick<typeof MESSAGES, 'invalid' | 'tooMany' | 'failed'>;

interface Parts {
  box: HTMLElement;
  form: HTMLFormElement;
  email: HTMLInputElement;
  emailError: HTMLElement;
  submit: HTMLButtonElement;
  sendError: HTMLElement;
  sendMessage: HTMLElement;
  status: HTMLElement;
  done: HTMLElement;
}

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

function emailProblem(email: HTMLInputElement): string | undefined {
  if (email.validity.valueMissing || !email.value.trim()) return MESSAGES.emailMissing;
  if (email.validity.typeMismatch) return MESSAGES.emailInvalid;
  return undefined;
}

function showFieldError(parts: Parts, message: string | undefined): void {
  const text = parts.emailError.querySelector('span');
  if (text) text.textContent = message ?? '';
  parts.emailError.hidden = !message;
  parts.email.setAttribute('aria-invalid', String(Boolean(message)));
}

function showSendError(parts: Parts, message: string | undefined): void {
  parts.sendMessage.textContent = message ?? '';
  parts.sendError.hidden = !message;
}

function setSending(parts: Parts, sending: boolean): void {
  parts.form.dataset.state = sending ? STATE_SENDING : STATE_IDLE;
  parts.form.setAttribute('aria-busy', String(sending));
  parts.submit.disabled = sending;
  parts.submit.textContent = sending ? MESSAGES.sending : (parts.submit.dataset.label ?? '');
  parts.status.textContent = sending ? MESSAGES.sending : '';
}

async function post(form: HTMLFormElement, data: FormData, token: string): Promise<SendResult> {
  try {
    const response = await fetch(`${form.dataset.api ?? ''}/api/waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: field(data, EMAIL_FIELD),
        name: field(data, 'name'),
        specialty: field(data, 'specialty'),
        ref: referralCode(),
        token,
      }),
    });
    if (response.status === HttpStatus.created) return DONE;
    return response.status === HttpStatus.tooMany ? 'tooMany' : 'invalid';
  } catch {
    return 'failed';
  }
}

function finish(parts: Parts, email: string): void {
  const target = parts.done.querySelector('[data-done-email]');
  if (target) target.textContent = email;
  parts.form.reset();
  parts.form.hidden = true;
  parts.done.hidden = false;
  parts.done.querySelector<HTMLElement>('[data-done-title]')?.focus();
}

async function submit(parts: Parts): Promise<void> {
  showSendError(parts, undefined);
  const problem = emailProblem(parts.email);
  showFieldError(parts, problem);
  if (problem) {
    parts.email.focus();
    return;
  }
  const data = new FormData(parts.form);
  const token = field(data, TOKEN_FIELD);
  if (!token) {
    showSendError(parts, MESSAGES.check);
    return;
  }
  setSending(parts, true);
  const result = await post(parts.form, data, token);
  setSending(parts, false);
  // A Turnstile token works once: ask the widget for a fresh one.
  window.turnstile?.reset();
  if (result === DONE) finish(parts, parts.email.value.trim());
  else showSendError(parts, MESSAGES[result]);
}

function again(parts: Parts): void {
  parts.done.hidden = true;
  parts.form.hidden = false;
  parts.email.focus();
}

function need<T extends Element>(box: ParentNode, selector: string, kind: new () => T): T {
  const found = box.querySelector(selector);
  if (!(found instanceof kind)) throw new Error(`Waitlist markup is missing ${selector}`);
  return found;
}

function partsOf(box: HTMLElement): Parts {
  return {
    box,
    form: need(box, 'form', HTMLFormElement),
    email: need(box, `input[name="${EMAIL_FIELD}"]`, HTMLInputElement),
    emailError: need(box, '[data-error-for]', HTMLElement),
    submit: need(box, '[data-submit]', HTMLButtonElement),
    sendError: need(box, '[data-send-error]', HTMLElement),
    sendMessage: need(box, '[data-send-message]', HTMLElement),
    status: need(box, '[data-status]', HTMLElement),
    done: need(box, '[data-done]', HTMLElement),
  };
}

for (const box of document.querySelectorAll<HTMLElement>(BOX)) {
  const parts = partsOf(box);
  parts.submit.dataset.label = parts.submit.textContent;
  parts.form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submit(parts);
  });
  parts.email.addEventListener('input', () => {
    if (!parts.emailError.hidden) showFieldError(parts, emailProblem(parts.email));
  });
  box.querySelector('[data-again]')?.addEventListener('click', () => {
    again(parts);
  });
}

export {};
