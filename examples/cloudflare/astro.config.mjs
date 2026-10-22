import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import rechtstexte from '@flokani.digital/erecht24-astro';

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  srcDir: fileURLToPath(new URL('../static/src/', import.meta.url)),
  site: 'https://example.invalid',
  trailingSlash: 'always',
  output: 'server',
  // Use the adapter's default workerd prerender environment.
  adapter: cloudflare(),
  integrations: [rechtstexte({
    documents: ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'],
    languages: ['de', 'en'],
  })],
});
