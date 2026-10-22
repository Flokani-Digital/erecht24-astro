import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { loadEnv, type Plugin } from 'vite';
import { credentialsFrom, fetchDocuments } from './api.js';
import { normalizeOptions, type ContentSnapshot, type RechtstexteOptions } from './types.js';

export type { RechtstexteOptions, DocumentType, Language, ContentSnapshot } from './types.js';

const moduleId = 'virtual:flokani-erecht24-astro';
const resolvedId = '\0' + moduleId;
const clientError = '[@flokani.digital/erecht24-astro] Rechtstexte dürfen nur im Astro-Frontmatter importiert werden.';

export default function rechtstexte(options: RechtstexteOptions = {}): AstroIntegration {
  const selection = normalizeOptions(options);
  let read: (() => Promise<ContentSnapshot>) | undefined;

  return {
    name: '@flokani.digital/erecht24-astro',
    hooks: {
      'astro:config:setup': ({ config, command, updateConfig, logger }) => {
        let snapshot: ContentSnapshot | undefined;
        let pending: Promise<ContentSnapshot> | undefined;
        let mode = command === 'dev' ? 'development' : 'production';
        let envDir: string | false = fileURLToPath(config.root);
        read = () => {
          pending ??= (async () => {
            const env = envDir === false ? {} : loadEnv(mode, envDir, 'ERECHT24_');
            const credentials = credentialsFrom({
              ERECHT24_API_KEY: process.env.ERECHT24_API_KEY ?? env.ERECHT24_API_KEY,
              ERECHT24_PLUGIN_KEY: process.env.ERECHT24_PLUGIN_KEY ?? env.ERECHT24_PLUGIN_KEY,
            });
            snapshot = await fetchDocuments(selection, credentials, (message) => logger.warn(message));
            return snapshot;
          })().catch((error: unknown) => {
            pending = undefined;
            throw error;
          });
          return pending;
        };

        const plugin: Plugin = {
          name: 'flokani-erecht24-astro-content',
          enforce: 'pre',
          configResolved(viteConfig) {
            mode = viteConfig.mode;
            envDir = viteConfig.envDir;
          },
          resolveId(id) {
            if (id !== moduleId) return;
            if (this.environment?.name === 'client') throw new Error(clientError);
            return resolvedId;
          },
          async load(id) {
            if (id !== resolvedId) return;
            if (this.environment?.name === 'client') throw new Error(clientError);
            // In dev the first render fetches; build fetches earlier in astro:build:start.
            if (command === 'dev') await read!();
            if (!snapshot && command !== 'sync') {
              throw new Error('[@flokani.digital/erecht24-astro] Inhalte sind vor dem Rendern noch nicht geladen.');
            }
            return `export default ${JSON.stringify(snapshot ?? { languages: [], documents: {} })};`;
          },
        };
        updateConfig({ vite: { plugins: [plugin] } });
      },
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({
          filename: 'erecht24-astro.d.ts',
          content: `declare module '${moduleId}' {
  const content: import('@flokani.digital/erecht24-astro').ContentSnapshot;
  export default content;
}`,
        });
      },
      'astro:build:start': async () => { await read!(); },
    },
  };
}
