import { defineConfig } from 'vitest/config';

// Integration tests read DATABASE_URL; CI sets it directly.
try {
  process.loadEnvFile('.env');
} catch {
  // no local .env
}

export default defineConfig({});
