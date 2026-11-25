import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3100';

export default defineConfig({
  // VITE_ variables come from the repo-root .env, like the site's PUBLIC_ ones.
  envDir: '../..',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // The API serves Better Auth under /api; same origin in dev keeps cookies first-party.
  server: { proxy: { '/api': API_ORIGIN } },
});
