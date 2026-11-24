import { parseEnv } from '@app/core';
import { createDb } from '../src/index.ts';
import { seedTenant } from '../src/seed.ts';

const env = parseEnv(process.env);
const db = createDb(env.DATABASE_URL);
const tenantId = await seedTenant(db);
console.log(`Seeded fictitious tenant ${tenantId}`);
await db.client.$disconnect();
