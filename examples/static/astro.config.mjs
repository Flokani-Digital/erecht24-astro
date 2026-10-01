import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import rechtstexte from '@flokani/astro-rechtstexte';

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  site: 'https://example.invalid',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [rechtstexte({
    documents: ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'],
    languages: ['de', 'en'],
  })],
});
