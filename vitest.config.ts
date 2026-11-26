import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

// Integration tests read DATABASE_URL; CI sets it directly.
try {
  process.loadEnvFile('.env');
} catch {
  // no local .env
}

// Agent worktrees live under .claude/worktrees: their copies of the tests are not ours to run.
export default defineConfig({
  // The panel's `@/` imports, so its pure models can be tested from the root.
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'apps/web/src') } },
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
});
