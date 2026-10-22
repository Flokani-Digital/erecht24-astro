import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import rechtstexte from '../dist/index.js';
import { apiKey, pluginKey, texts } from './support/mock-server.mjs';

const resolvedId = '\0virtual:flokani-erecht24-astro';

test('Dev: fehlgeschlagener Abruf wird beim nächsten Request erneut versucht', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'erecht24-hooks-'));
  const saved = { fetch: globalThis.fetch, api: process.env.ERECHT24_API_KEY, plugin: process.env.ERECHT24_PLUGIN_KEY };
  t.after(async () => {
    globalThis.fetch = saved.fetch;
    for (const [name, value] of [['ERECHT24_API_KEY', saved.api], ['ERECHT24_PLUGIN_KEY', saved.plugin]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await rm(root, { recursive: true, force: true });
  });
  delete process.env.ERECHT24_API_KEY;
  delete process.env.ERECHT24_PLUGIN_KEY;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json(texts.imprint); };

  const integration = rechtstexte({ documents: ['imprint'] });
  let plugin;
  integration.hooks['astro:config:setup']({
    config: { root: pathToFileURL(root + '/') },
    command: 'dev',
    updateConfig: ({ vite }) => { [plugin] = vite.plugins; },
    logger: { warn: () => {} },
  });

  await assert.rejects(plugin.load(resolvedId), /ERECHT24_API_KEY wird/);
  process.env.ERECHT24_API_KEY = apiKey;
  process.env.ERECHT24_PLUGIN_KEY = pluginKey;
  const code = await plugin.load(resolvedId);
  assert.ok(code.includes(JSON.stringify(texts.imprint.html_de)));
  await plugin.load(resolvedId);
  assert.equal(calls, 1, 'Erfolgreicher Abruf wird wiederverwendet');
});

test('Client-Import wird bei Auflösung und Laden zurückgewiesen; sync bleibt offline', async () => {
  let plugin;
  const integration = rechtstexte();
  integration.hooks['astro:config:setup']({
    config: { root: pathToFileURL(tmpdir() + '/') }, command: 'sync',
    updateConfig: ({ vite }) => { [plugin] = vite.plugins; }, logger: { warn: () => {} },
  });
  const client = { environment: { name: 'client' } };
  assert.throws(() => plugin.resolveId.call(client, 'virtual:flokani-erecht24-astro'), /Frontmatter/);
  await assert.rejects(plugin.load.call(client, resolvedId), /Frontmatter/);
  const code = await plugin.load.call({ environment: { name: 'prerender' } }, resolvedId);
  const { default: content } = await import('data:text/javascript,' + encodeURIComponent(code));
  assert.deepEqual(content, { languages: [], documents: {} });
  assert.ok(!code.includes('fetch('));
});
