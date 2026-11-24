import { NodeEnv } from '@app/core';
import { createDb } from '@app/db';
import { buildApp } from './app.ts';
import { parseApiEnv } from './env.ts';

const LISTEN_HOST = '0.0.0.0';
const NO_EMAIL_PROVIDER = 'No email provider configured for production (E-00f).';

const env = parseApiEnv(process.env);
if (env.NODE_ENV === NodeEnv.production) throw new Error(NO_EMAIL_PROVIDER);

const app = buildApp({ env, db: createDb(env.DATABASE_URL) });
await app.listen({ port: env.PORT, host: LISTEN_HOST });
