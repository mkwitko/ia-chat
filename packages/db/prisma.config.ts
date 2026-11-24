import { defineConfig, env } from 'prisma/config';

// Prisma does not load .env by itself.
try {
  process.loadEnvFile('../../.env');
} catch {
  // CI and production set variables directly.
}

export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  // Migrations run as the owner role (RN-02).
  datasource: { url: env('MIGRATION_DATABASE_URL') },
});
