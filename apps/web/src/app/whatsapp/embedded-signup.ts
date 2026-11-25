import type { SignupResult } from './whatsapp-api';

// Meta Embedded Signup in the browser (docs read 25/11/2026): the Facebook SDK opens Meta's
// popup; the code comes in the login callback, the WABA and number in a `message` event.
// Coexistence is offered: the professional may keep using the WhatsApp Business app.

const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
const GRAPH_VERSION = 'v27.0';
const META_HOST = 'facebook.com';
const SIGNUP_TYPE = 'WA_EMBEDDED_SIGNUP';
const SignupEvent = {
  finish: 'FINISH',
  finishCoexistence: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
} as const;
const COEXISTENCE_FEATURE = 'whatsapp_business_app_onboarding';
const SESSION_INFO_VERSION = '3';
const RESPONSE_TYPE = 'code';
const SDK_FAILED = 'facebook sdk did not load';
/** The session message may arrive just after the login callback. */
const SESSION_WAIT_MS = 5_000;

interface FacebookSdk {
  init: (options: object) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } | null }) => void,
    options: object,
  ) => void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let loading: Promise<FacebookSdk> | null = null;

function loadSdk(appId: string): Promise<FacebookSdk> {
  loading ??= new Promise<FacebookSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error(SDK_FAILED));
        return;
      }
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: GRAPH_VERSION });
      resolve(window.FB);
    };
    const script = document.createElement('script');
    Object.assign(script, { src: SDK_URL, async: true, defer: true, crossOrigin: 'anonymous' });
    script.onerror = () => {
      loading = null;
      reject(new Error(SDK_FAILED));
    };
    document.body.append(script);
  });
  return loading;
}

type Session = Pick<SignupResult, 'wabaId' | 'phoneNumberId' | 'coexistence'>;

function fromMeta(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === META_HOST || host.endsWith(`.${META_HOST}`);
  } catch {
    return false;
  }
}

/** The WABA (and number) of a finished signup; null for anything else. */
function sessionOf(event: MessageEvent<unknown>): Session | null {
  if (!fromMeta(event.origin) || !(event.data instanceof Object || isText(event.data))) return null;
  try {
    const info = (isText(event.data) ? JSON.parse(event.data) : event.data) as {
      type?: string;
      event?: string;
      data?: { waba_id?: string; phone_number_id?: string };
    };
    const wabaId = info.data?.waba_id;
    if (info.type !== SIGNUP_TYPE || !wabaId) return null;
    if (info.event === SignupEvent.finishCoexistence) return { wabaId, coexistence: true };
    if (info.event !== SignupEvent.finish) return null;
    const phoneNumberId = info.data?.phone_number_id;
    return { wabaId, coexistence: false, ...(phoneNumberId ? { phoneNumberId } : {}) };
  } catch {
    return null;
  }
}

// eslint-disable-next-line no-restricted-syntax -- typeof needs its literal to narrow
const isText = (value: unknown): value is string => typeof value === 'string';

/** Opens Meta's popup; null when the professional closes it without finishing. */
export async function runEmbeddedSignup(ids: {
  appId: string;
  configId: string;
}): Promise<SignupResult | null> {
  const sdk = await loadSdk(ids.appId);
  return new Promise((resolve) => {
    let session: Session | null = null;
    let code: string | null = null;
    const done = (result: SignupResult | null) => {
      window.removeEventListener('message', onMessage);
      resolve(result);
    };
    const settle = () => {
      if (code && session) done({ code, ...session });
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!fromMeta(event.origin)) return;
      session = sessionOf(event) ?? session;
      settle();
    };
    window.addEventListener('message', onMessage);
    sdk.login((response) => {
      code = response.authResponse?.code ?? null;
      if (!code) {
        done(null);
        return;
      }
      settle();
      setTimeout(() => {
        done(null);
      }, SESSION_WAIT_MS);
    }, loginOptions(ids.configId));
  });
}

/** Embedded Signup v4 with the coexistence option (the Business app keeps working). */
const loginOptions = (configId: string) => ({
  config_id: configId,
  response_type: RESPONSE_TYPE,
  override_default_response_type: true,
  extras: {
    setup: {},
    featureType: COEXISTENCE_FEATURE,
    sessionInfoVersion: SESSION_INFO_VERSION,
  },
});
