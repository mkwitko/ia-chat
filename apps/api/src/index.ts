import { parseEnv } from '@app/core';

const env = parseEnv(process.env);
console.log(`api starting (${env.NODE_ENV})`);
