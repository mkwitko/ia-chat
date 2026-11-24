import { QUEUES } from '../src/queue/definitions.ts';
import { installQueues } from '../src/queue/install.ts';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL is required');
await installQueues(url, QUEUES);
console.log(`pg-boss ready; ${String(QUEUES.length)} queue(s) ensured`);
