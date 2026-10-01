import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { apiKey, pluginKey, texts, createMockServer } from '../support/mock-server.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const preload = join(root, 'test/support/mock-fetch.mjs');
const allTypes = Object.keys(texts).sort();
const cleanEnv = {
  ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1',
  // Keep CLI servers in the managed process even in Astro versions with agent auto-backgrounding.
  ASTRO_DEV_BACKGROUND: '1', ASTRO_PREVIEW_BACKGROUND: '1',
  // Inherit the network guard if an Astro command ever spawns a Node child process.
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${JSON.stringify(preload)}`,
};
delete cleanEnv.ERECHT24_API_KEY;
delete cleanEnv.ERECHT24_PLUGIN_KEY;
delete cleanEnv.RECHTSTEXTE_TEST_CREDENTIALS;
delete cleanEnv.RECHTSTEXTE_TEST_ORIGIN;

function command(binary, args, cwd, env = cleanEnv) {
  const child = spawn(binary, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  const timer = setTimeout(() => child.kill('SIGTERM'), 90_000);
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
  return { child, done, output: () => output };
}

function secretFree(value) {
  for (const secret of [apiKey, pluginKey]) assert.ok(!String(value).includes(secret), 'Zugangsschlüssel in Ausgabe');
}

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(location));
    else files.push(location);
  }
  return files;
}

async function assertBuild(directory) {
  const paths = await filesBelow(directory);
  for (const location of paths) secretFree(await readFile(location, 'utf8'));
  const checks = [
    ['impressum/index.html', texts.imprint.html_de, 'de'],
    ['datenschutz/index.html', texts.privacyPolicy.html_de, 'de'],
    ['datenschutz-social-media/index.html', texts.privacyPolicySocialMedia.html_de, 'de'],
    ['en/privacy-policy/index.html', texts.privacyPolicy.html_en, 'en'],
  ];
  for (const [filename, html, lang] of checks) {
    const contents = await readFile(join(directory, filename), 'utf8');
    assert.ok(contents.includes(html), `Original-HTML fehlt in ${filename}`);
    assert.ok(contents.includes(`<html lang="${lang}">`));
    assert.ok(contents.includes(`class="legal-text" lang="${lang}"`));
    assert.ok(!contents.includes('<script'), 'Statische Rechtstexte benötigen kein Browser-JavaScript');
  }
  const slashCheck = await command('bash', [join(root, 'scripts/check-trailing-slash.sh'), directory], root).done;
  assert.equal(slashCheck.code, 0, slashCheck.output);
}

async function waitForPage(server, url) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (server.child.exitCode !== null) assert.fail(server.output());
    try {
      const response = await fetch(url);
      if (response.status === 200) return await response.text();
      assert.fail(`HTTP ${response.status}: ${await response.text()}`);
    } catch (error) {
      if (error.name === 'AssertionError') throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.fail(`Server nicht erreichbar: ${server.output()}`);
}

test('Gepacktes Paket in eigenständigen Astro-Projekten', { timeout: 300_000 }, async (t) => {
  const mock = await createMockServer();
  t.after(() => mock.close());
  const env = { ...cleanEnv, RECHTSTEXTE_TEST_ORIGIN: mock.origin, RECHTSTEXTE_TEST_CREDENTIALS: '1' };
  await mkdir(join(root, '.test-work'), { recursive: true });
  const work = await mkdtemp(join(root, '.test-work/integration-'));
  t.diagnostic(`Testartefakte: ${work}`);
  const packed = await command('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', work], root).done;
  assert.equal(packed.code, 0, packed.output);
  const [pack] = JSON.parse(packed.output);
  assert.ok(pack.files.some((entry) => entry.path === 'components/LegalText.astro'));
  assert.ok(pack.files.some((entry) => entry.path === 'dist/index.d.ts'));
  assert.ok(pack.files.every((entry) => /^(dist\/|components\/|README.md$|package.json$)/.test(entry.path)));
  for (const entry of pack.files) secretFree(await readFile(join(root, entry.path), 'utf8'));

  const dirs = {};
  for (const kind of ['static', 'ssr']) {
    const directory = join(work, kind);
    dirs[kind] = directory;
    await mkdir(directory);
    await cp(join(root, 'examples', kind, 'astro.config.mjs'), join(directory, 'astro.config.mjs'));
    await cp(join(root, 'examples', kind, 'tsconfig.json'), join(directory, 'tsconfig.json'));
    if (kind === 'static') await cp(join(root, 'examples/static/src'), join(directory, 'src'), { recursive: true });
    const dependencies = { '@flokani/astro-rechtstexte': `file:${join(work, pack.filename)}` };
    for (const name of ['astro', '@astrojs/node', '@astrojs/check', 'typescript']) {
      dependencies[name] = JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
    }
    if (process.env.RECHTSTEXTE_TEST_ASTRO_VERSION) dependencies.astro = process.env.RECHTSTEXTE_TEST_ASTRO_VERSION;
    if (process.env.RECHTSTEXTE_TEST_ADAPTER_VERSION) dependencies['@astrojs/node'] = process.env.RECHTSTEXTE_TEST_ADAPTER_VERSION;
    await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }));
    const cacheMode = process.env.RECHTSTEXTE_TEST_ASTRO_VERSION ? '--prefer-offline' : '--offline';
    const installed = await command('npm', ['install', cacheMode, '--ignore-scripts', '--no-audit', '--no-fund'], directory).done;
    assert.equal(installed.code, 0, installed.output);
  }
  function astro(kind, args, variables = env) {
    return command(process.execPath, ['--import', preload, join(dirs[kind], 'node_modules/astro/bin/astro.mjs'), ...args], dirs[kind], variables);
  }
  const successfulBuild = async (kind, variables = env, args = []) => {
    mock.reset();
    const result = await astro(kind, ['build', ...args], variables).done;
    secretFree(result.output);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(mock.calls.map((call) => call.type).sort(), allTypes);
    for (const call of mock.calls) {
      assert.equal(call.headers['erecht24-api-key'], apiKey);
      assert.equal(call.headers['erecht24-plugin-key'], pluginKey);
    }
    await assertBuild(join(dirs[kind], kind === 'ssr' ? 'dist/client' : 'dist'));
    if (kind === 'ssr') for (const location of await filesBelow(join(dirs.ssr, 'dist'))) secretFree(await readFile(location, 'utf8'));
  };

  await t.test('sync und check ohne Zugangsdaten oder API-Abruf', async () => {
    mock.reset();
    for (const kind of ['static', 'ssr']) {
      for (const cmd of ['sync', 'check']) {
        const result = await astro(kind, [cmd], cleanEnv).done;
        assert.equal(result.code, 0, result.output);
      }
    }
    assert.equal(mock.calls.length, 0);
  });
  await t.test('Statischer Build mit DE, EN und Social Media', () => successfulBuild('static'));
  await t.test('SSR-Build mit vorgerenderten Rechtstexten', () => successfulBuild('ssr'));

  await t.test('Preview liefert den vorhandenen Build ohne Schlüssel und erneuten Abruf', async () => {
    mock.reset();
    const preview = astro('static', ['preview', '--host', '127.0.0.1', '--port', '14337', '--ignore-lock'], cleanEnv);
    try {
      const html = await waitForPage(preview, 'http://127.0.0.1:14337/en/privacy-policy/');
      assert.ok(html.includes(texts.privacyPolicy.html_en));
      assert.equal(mock.calls.length, 0);
    } finally { preview.child.kill(); await preview.done; }
  });
  await t.test('Dev: gemeinsamer Abruf, Wiederverwendung und frischer Abruf nach Neustart', async () => {
    for (let start = 0; start < 2; start++) {
      mock.reset();
      const dev = astro('static', ['dev', '--host', '127.0.0.1', '--port', '14338', '--ignore-lock']);
      try {
        await waitForPage(dev, 'http://127.0.0.1:14338/');
        assert.equal(mock.calls.length, 0);
        const results = await Promise.all(['/impressum/', '/datenschutz/', '/en/privacy-policy/', '/datenschutz-social-media/'].map(async (pathname) => {
          const response = await fetch('http://127.0.0.1:14338' + pathname);
          assert.equal(response.status, 200, `${pathname}\n${dev.output()}`); return await response.text();
        }));
        assert.ok(results[0].includes(texts.imprint.html_de));
        assert.ok(results[2].includes(texts.privacyPolicy.html_en));
        await fetch('http://127.0.0.1:14338/impressum/');
        assert.deepEqual(mock.calls.map((call) => call.type).sort(), allTypes);
        secretFree(dev.output());
      } finally { dev.child.kill(); await dev.done; }
    }
  });

  await t.test('Fehlende Schlüssel, 401, fehlendes Englisch und leere Texte brechen den Build ab', async () => {
    for (const [scenario, variables, message] of [
      ['success', cleanEnv, /ERECHT24_API_KEY/], ['unauthorized', env, /HTTP 401/],
      ['missing-en', env, /imprint \(en\)/], ['empty', env, /imprint \(de\)/],
    ]) {
      mock.reset(scenario);
      const result = await astro('static', ['build'], variables).done;
      assert.notEqual(result.code, 0);
      assert.match(result.output, message);
      secretFree(result.output);
      assert.equal(mock.calls.length, variables === cleanEnv ? 0 : 1);
    }
  });
  await t.test('Warnungen sind sichtbar, redigiert und verhindern keinen Build', async () => {
    mock.reset('warning');
    const result = await astro('static', ['build']).done;
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Bitte prüfen: \[entfernt\] \[entfernt\]/);
    secretFree(result.output);
  });
  await t.test('Eigener envDir, mode und Vorrang gesetzter Umgebungsvariablen', async () => {
    const configFile = join(dirs.static, 'astro.config.mjs');
    const config = await readFile(configFile, 'utf8');
    await writeFile(configFile, config.replace("trailingSlash: 'always',", "trailingSlash: 'always', vite: { envDir: './settings' },"));
    await mkdir(join(dirs.static, 'settings'));
    await writeFile(join(dirs.static, 'settings/.env.staging'), `ERECHT24_API_KEY=${apiKey}\nERECHT24_PLUGIN_KEY=${pluginKey}\n`);
    await successfulBuild('static', { ...cleanEnv, RECHTSTEXTE_TEST_ORIGIN: mock.origin }, ['--mode', 'staging']);
    await writeFile(join(dirs.static, 'settings/.env.staging'), 'ERECHT24_API_KEY=wrong-from-file\nERECHT24_PLUGIN_KEY=wrong-from-file\n');
    await successfulBuild('static', env, ['--mode', 'staging']);
    await writeFile(configFile, config);
  });
});
