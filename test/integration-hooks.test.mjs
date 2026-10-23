import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
    logger: { warn: () => {}, info: () => {} },
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
    updateConfig: ({ vite }) => { [plugin] = vite.plugins; }, logger: { warn: () => {}, info: () => {} },
  });
  const client = { environment: { name: 'client' } };
  assert.throws(() => plugin.resolveId.call(client, 'virtual:flokani-erecht24-astro'), /Frontmatter/);
  await assert.rejects(plugin.load.call(client, resolvedId), /Frontmatter/);
  const code = await plugin.load.call({ environment: { name: 'prerender' } }, resolvedId);
  const { default: content } = await import('data:text/javascript,' + encodeURIComponent(code));
  assert.deepEqual(content, { languages: [], documents: {} });
  assert.ok(!code.includes('fetch('));
});

async function buildProject(t, options, command = 'build') {
  const root = await mkdtemp(join(tmpdir(), 'erecht24-fallback-'));
  const saved = { fetch: globalThis.fetch, api: process.env.ERECHT24_API_KEY, plugin: process.env.ERECHT24_PLUGIN_KEY };
  t.after(async () => {
    globalThis.fetch = saved.fetch;
    for (const [name, value] of [['ERECHT24_API_KEY', saved.api], ['ERECHT24_PLUGIN_KEY', saved.plugin]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await rm(root, { recursive: true, force: true });
  });
  process.env.ERECHT24_API_KEY = apiKey;
  process.env.ERECHT24_PLUGIN_KEY = pluginKey;
  const warnings = [];
  const infos = [];
  // Every run is a fresh integration instance, like a new `astro build` process.
  const run = async (status) => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return status === 200 ? Response.json(texts.imprint) : new Response('', { status }); };
    const integration = rechtstexte({ documents: ['imprint'], ...options });
    let plugin;
    integration.hooks['astro:config:setup']({
      config: { root: pathToFileURL(root + '/'), cacheDir: pathToFileURL(join(root, 'cache') + '/') },
      command, updateConfig: ({ vite }) => { [plugin] = vite.plugins; },
      logger: { warn: (message) => warnings.push(message), info: (message) => infos.push(message) },
    });
    if (command === 'build') await integration.hooks['astro:build:start']();
    return { calls, load: () => plugin.load.call({ environment: { name: 'prerender' } }, resolvedId) };
  };
  return { root, warnings, infos, run };
}

test('Build mit fallbackToCache: Erfolg schreibt Cache, 503 nutzt ihn mit Warnung', { timeout: 20_000 }, async (t) => {
  const { root, warnings, run } = await buildProject(t, { fallbackToCache: { maxAgeDays: 7 } });
  const fresh = await run(200);
  assert.deepEqual(warnings, []);
  const stored = await readFile(join(root, 'cache/erecht24-astro/snapshot.json'), 'utf8');
  assert.ok(!stored.includes(apiKey) && !stored.includes(pluginKey));

  const fallback = await run(503);
  assert.ok(fallback.calls >= 3, 'Wiederholungen laufen vor dem Fallback');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /nicht erreichbar.*aus dem Cache verwendet.*HTTP 503/);
  assert.ok(!warnings[0].includes(apiKey) && !warnings[0].includes(pluginKey));
  assert.equal(await fallback.load(), await fresh.load(), 'Identisches Modul wie beim frischen Abruf');
});

test('Build ohne Option, bei 401 oder ohne Cache bricht ab; dev fällt nie zurück', { timeout: 40_000 }, async (t) => {
  const strict = await buildProject(t, {});
  await strict.run(200);
  await assert.rejects(strict.run(503), /HTTP 503/);

  const configured = await buildProject(t, { fallbackToCache: true });
  await assert.rejects(configured.run(503), /HTTP 503[\s\S]*Kein nutzbarer Cache/);
  await configured.run(200);
  await assert.rejects(configured.run(401), (error) => /HTTP 401/.test(error.message) && !/Cache/.test(error.message));

  const dev = await buildProject(t, { fallbackToCache: true }, 'dev');
  const live = await dev.run(200);
  await live.load();
  const failing = await dev.run(503);
  await assert.rejects(failing.load(), /HTTP 503/);
  await assert.rejects(readFile(join(dev.root, 'cache/erecht24-astro/snapshot.json')), /ENOENT/, 'dev schreibt keinen Cache');
});

test('Abruf meldet Start und Erfolg; Cache-Fallback meldet keinen Erfolg', { timeout: 20_000 }, async (t) => {
  const { infos, run } = await buildProject(t, { fallbackToCache: { maxAgeDays: 7 } });
  await run(200);
  assert.deepEqual(infos, [
    'API-Abruf gestartet: imprint',
    'API-Abruf erfolgreich: 1 Dokument, Sprache de',
  ]);
  infos.length = 0;
  await run(503);
  assert.deepEqual(infos, ['API-Abruf gestartet: imprint']);
});
