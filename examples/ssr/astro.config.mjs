import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import node from '@astrojs/node';
import rechtstexte from '@flokani/astro-rechtstexte';

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  srcDir: fileURLToPath(new URL('../static/src/', import.meta.url)),
  site: 'https://example.invalid',
  trailingSlash: 'always',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [rechtstexte({
    documents: ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'],
    languages: ['de', 'en'],
  })],
});
