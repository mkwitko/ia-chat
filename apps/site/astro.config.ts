import { defineConfig } from 'astro/config';

// Static output for Cloudflare Pages. Public variables (PUBLIC_*) come from the repo-root .env.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_ORIGIN ?? 'http://localhost:4321',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: { envDir: '../..' },
});
