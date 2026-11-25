import { configDefaults, defineConfig } from 'vitest/config';

// Integration tests read DATABASE_URL; CI sets it directly.
try {
  process.loadEnvFile('.env');
} catch {
  // no local .env
}

// Agent worktrees live under .claude/worktrees: their copies of the tests are not ours to run.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
});
