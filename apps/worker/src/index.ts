import { parseEnv } from '@app/core';

const env = parseEnv(process.env);
console.log(`worker starting (${env.NODE_ENV})`);
