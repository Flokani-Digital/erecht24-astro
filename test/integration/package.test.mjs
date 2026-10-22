import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { apiKey, pluginKey, texts, createMockServer } from '../support/mock-server.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const preload = join(root, 'test/support/mock-fetch.mjs');
const targets = ['static', 'ssr', 'cloudflare'];
const allTypes = Object.keys(texts).sort();
const legalPages = [
  ['/impressum/', texts.imprint.html_de, 'de'],
  ['/datenschutz/', texts.privacyPolicy.html_de, 'de'],
  ['/datenschutz-social-media/', texts.privacyPolicySocialMedia.html_de, 'de'],
  ['/en/privacy-policy/', texts.privacyPolicy.html_en, 'en'],
];
const docs = ['abruf-und-fehler', 'fehlerbehebung', 'konfiguration', 'seiten-und-komponente', 'styling', 'zugangsdaten'];
const cleanEnv = {
  ...process.env, ASTRO_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1', CI: '1',
  ASTRO_DEV_BACKGROUND: '1', ASTRO_PREVIEW_BACKGROUND: '1',
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${JSON.stringify(preload)}`,
};
for (const key of ['ERECHT24_API_KEY', 'ERECHT24_PLUGIN_KEY', 'RECHTSTEXTE_TEST_CREDENTIALS', 'RECHTSTEXTE_TEST_ORIGIN']) delete cleanEnv[key];
const requests = new Set();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function command(binary, args, cwd, env = cleanEnv) {
  const grouped = process.platform !== 'win32';
  const child = spawn(binary, args, { cwd, env, detached: grouped, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let exited = false;
  let killTimer;
  const kill = (signal) => {
    try {
      if (grouped && child.pid) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const stop = () => {
    if (exited) return;
    kill('SIGTERM');
    killTimer ??= setTimeout(() => kill('SIGKILL'), 3_000);
  };
  const timer = setTimeout(stop, 240_000);
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  const done = new Promise((resolve, reject) => {
    const cleanup = () => { exited = true; clearTimeout(timer); clearTimeout(killTimer); };
    child.once('error', (error) => { cleanup(); reject(error); });
    child.once('close', (code) => { cleanup(); resolve({ code, output }); });
  });
  return { child, done, stop: async () => { stop(); await done; }, output: () => output, exited: () => exited };
}

// Include the body in the deadline: streamed errors can send headers and then hang.
async function request(url, timeout = 180_000) {
  const controller = new AbortController();
  requests.add(controller);
  const timer = setTimeout(() => controller.abort(new Error(`HTTP-Deadline: ${url}`)), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    secretFree(body);
    return { status: response.status, body };
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally { clearTimeout(timer); requests.delete(controller); }
}

async function deadline(promise, timeout, description) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(description)), timeout);
    })]);
  } finally { clearTimeout(timer); }
}

async function until(check, timeout, description) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check(deadline - Date.now())) return;
    await pause(100);
  }
  assert.fail(description);
}

async function waitForPage(server, url, marker) {
  let body;
  await until(async (remaining) => {
    assert.ok(!server.exited(), server.output());
    try {
      const result = await request(url, Math.min(5_000, remaining));
      body = result.body;
      return result.status === 200 && (!marker || body.includes(marker));
    } catch (error) {
      if (error.name === 'AssertionError') throw error;
      return false;
    }
  }, 60_000, `Server/Marker nicht erreichbar: ${url}\n${server.output()}`);
  return body;
}

async function port() {
  const socket = createServer();
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
  const value = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return value;
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

async function productionFree(directory) {
  for (const location of await filesBelow(directory)) {
    const value = await readFile(location, 'utf8');
    secretFree(value);
  }
}

async function assertBuild(directory) {
  for (const [pathname, html, lang] of legalPages) {
    const filename = join(directory, pathname.slice(1), 'index.html');
    const contents = await readFile(filename, 'utf8');
    assert.ok(contents.includes(html), `Original-HTML fehlt in ${filename}`);
    assert.ok(contents.includes(`<html lang="${lang}">`));
    assert.ok(contents.includes(`class="legal-text" lang="${lang}"`));
    assert.ok(!contents.includes('<script'), 'Statische Rechtstexte benötigen kein Browser-JavaScript');
  }
  const slashCheck = await command('bash', [join(root, 'scripts/check-trailing-slash.sh'), directory], root).done;
  assert.equal(slashCheck.code, 0, slashCheck.output);
}

async function installedLinks(packageRoot) {
  const confinedRoot = await realpath(packageRoot);
  for (const filename of ['README.md', ...docs.map((name) => `docs/${name}.md`)]) {
    const contents = await readFile(join(packageRoot, filename), 'utf8');
    for (const match of contents.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1].replace(/^<|>$/g, '');
      if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('//')) continue;
      const url = new URL(href, pathToFileURL(join(packageRoot, filename)));
      url.search = ''; url.hash = '';
      const destination = await realpath(fileURLToPath(url));
      const rel = relative(confinedRoot, destination);
      assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep), `Paketlink verlässt Paket: ${filename} → ${href}`);
    }
  }
}

async function expectRenderError(server, url, message, status = 500) {
  let result;
  let error;
  const logOffset = server.output().length;
  try { result = await request(url); } catch (caught) { error = caught; }
  // A timeout cannot prove the expected application error.
  if (error) {
    if (error.name === 'AssertionError') throw error;
    assert.doesNotMatch(String(error), /HTTP-Deadline/);
    assert.match(String(error), /terminated|aborted|fetch failed|socket/i);
  } else if (status === 'stream' && result.status === 200) {
    assert.ok(!result.body.includes('</html>'), 'Fehlerrequest lieferte ein vollständiges HTML-Dokument');
    assert.ok(!result.body.includes(texts.imprint.html_de), 'Fehlerrequest lieferte den Rechtstext');
  } else if (status) assert.equal(result.status, status === 'stream' ? 500 : status, result.body);
  else assert.ok(result.status >= 400, `Unerwartete erfolgreiche Runtime-Antwort: ${result.status}`);
  await until(() => message.test(server.output().slice(logOffset)), 5_000, `Frische Paketfehlermeldung fehlt:\n${server.output()}`);
  return result?.body ?? '';
}

test('Gepacktes Paket in unabhängigen Astro- und workerd-Projekten', { timeout: 1_200_000 }, async (t) => {
  let failed = false;
  const runCase = (name, run) => t.test(name, async () => {
    try { await run(); } catch (error) { failed = true; throw error; }
  });
  const mock = await createMockServer();
  t.after(async () => { for (const controller of requests) controller.abort(); await mock.close(); });
  const env = { ...cleanEnv, RECHTSTEXTE_TEST_ORIGIN: mock.origin, RECHTSTEXTE_TEST_CREDENTIALS: '1' };
  const keyless = { ...cleanEnv, RECHTSTEXTE_TEST_ORIGIN: mock.origin };
  await mkdir(join(root, '.test-work'), { recursive: true });
  const work = await mkdtemp(join(root, '.test-work/integration-'));
  t.diagnostic(`Testartefakte: ${work}`);
  const packed = await command('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', work], root).done;
  assert.equal(packed.code, 0, packed.output);
  const [pack] = JSON.parse(packed.output);
  for (const path of ['components/LegalText.astro', 'dist/index.d.ts', ...docs.map((name) => `docs/${name}.md`)]) assert.ok(pack.files.some((entry) => entry.path === path), `Fehlt im Archiv: ${path}`);
  assert.ok(pack.files.every((entry) => /^(dist\/|components\/|docs\/[^/]+\.md$|README.md$|package.json$)/.test(entry.path)));
  for (const entry of pack.files) secretFree(await readFile(join(root, entry.path), 'utf8'));

  const dirs = {};
  const overrides = {
    astro: 'RECHTSTEXTE_TEST_ASTRO_VERSION', '@astrojs/node': 'RECHTSTEXTE_TEST_ADAPTER_VERSION',
    '@astrojs/cloudflare': 'RECHTSTEXTE_TEST_CLOUDFLARE_VERSION', wrangler: 'RECHTSTEXTE_TEST_WRANGLER_VERSION', vite: 'RECHTSTEXTE_TEST_VITE_VERSION',
  };
  const hasOverrides = Object.values(overrides).some((name) => process.env[name]);
  for (const kind of targets) {
    const directory = dirs[kind] = join(work, kind);
    await mkdir(directory);
    let config = await readFile(join(root, 'examples', kind, 'astro.config.mjs'), 'utf8');
    config = config.replace("../static/src/", './src/').replace("trailingSlash: 'always',", "trailingSlash: 'always', vite: { server: { hmr: false } },");
    await writeFile(join(directory, 'astro.config.mjs'), config);
    await cp(join(root, 'examples', kind, 'tsconfig.json'), join(directory, 'tsconfig.json'));
    if (kind === 'cloudflare') await cp(join(root, 'examples/cloudflare/wrangler.jsonc'), join(directory, 'wrangler.jsonc'));
    // Every project owns its pages: SSR/Cloudflare never mutate the static source.
    await cp(join(root, 'examples/static/src'), join(directory, 'src'), { recursive: true });
    const dependencies = { '@flokani.digital/erecht24-astro': `file:${join(work, pack.filename)}` };
    const names = ['astro', '@astrojs/check', 'typescript', 'vite', ...(kind === 'ssr' ? ['@astrojs/node'] : kind === 'cloudflare' ? ['@astrojs/cloudflare', 'wrangler'] : [])];
    for (const name of names) dependencies[name] = process.env[overrides[name]] || JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
    const project = { name: `erecht24-test-${kind}`, private: true, type: 'module', dependencies };
    await writeFile(join(directory, 'package.json'), JSON.stringify(project));
    if (!hasOverrides) {
      // Preserve the root's installed transitive versions instead of resolving
      // newer versions from cached registry metadata that have no cached tarball.
      const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
      lock.name = project.name;
      delete lock.version;
      lock.packages[''] = { name: project.name, dependencies };
      await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    }
    const cacheMode = hasOverrides ? '--prefer-offline' : '--offline';
    const installed = await command('npm', ['install', cacheMode, '--ignore-scripts', '--no-audit', '--no-fund'], directory).done;
    assert.equal(installed.code, 0, installed.output);
    await installedLinks(join(directory, 'node_modules/@flokani.digital/erecht24-astro'));
  }
  function astro(kind, args, variables = env) {
    return command(process.execPath, ['--import', preload, join(dirs[kind], 'node_modules/astro/bin/astro.mjs'), ...args], dirs[kind], variables);
  }
  const outputDir = (kind) => join(dirs[kind], kind === 'static' ? 'dist' : 'dist/client');
  const assertCalls = () => {
    assert.deepEqual(mock.calls.map((call) => call.type).sort(), allTypes);
    for (const call of mock.calls) {
      assert.equal(call.headers['erecht24-api-key'], apiKey);
      assert.equal(call.headers['erecht24-plugin-key'], pluginKey);
    }
  };
  const successfulBuild = async (kind, variables = env, args = []) => {
    mock.reset();
    const result = await astro(kind, ['build', ...args], variables).done;
    secretFree(result.output);
    assert.equal(result.code, 0, result.output);
    assertCalls();
    await assertBuild(outputDir(kind));
    await productionFree(join(dirs[kind], 'dist'));
  };

  await runCase('sync und check ohne Zugangsdaten und API für alle Targets', async () => {
    mock.reset();
    for (const kind of targets) for (const cmd of ['sync', 'check']) {
      const result = await astro(kind, [cmd], keyless).done;
      assert.equal(result.code, 0, result.output);
      secretFree(result.output);
    }
    assert.equal(mock.calls.length, 0);
  });
  for (const kind of targets) await runCase(`${kind}: DE/EN/Social-Media-Build und schlüsselfreie Produktion`, async () => {
    await successfulBuild(kind);
    mock.reset();
    const number = await port();
    const preview = kind === 'ssr'
      ? command(process.execPath, ['dist/server/entry.mjs'], dirs[kind], { ...keyless, HOST: '127.0.0.1', PORT: String(number) })
      : astro(kind, ['preview', '--host', '127.0.0.1', '--port', String(number), '--ignore-lock'], keyless);
    try {
      await waitForPage(preview, `http://127.0.0.1:${number}/`);
      for (const [pathname, html] of legalPages) {
        const result = await request(`http://127.0.0.1:${number}${pathname}`);
        assert.equal(result.status, 200, `${pathname}\n${preview.output()}`);
        assert.ok(result.body.includes(html));
      }
      assert.equal(mock.calls.length, 0);
      secretFree(preview.output());
    } finally { await preview.stop(); }
  });

  for (const kind of targets) {
    // workerd must execute dev modules, never serve an earlier prerendered build.
    await rm(join(dirs[kind], 'dist'), { recursive: true, force: true });
    await runCase(`${kind}: Fehler 401 im Dev wird mit Paketmeldung gemeldet`, async () => {
      mock.reset('unauthorized');
      const number = await port();
      const dev = astro(kind, ['dev', '--host', '127.0.0.1', '--port', String(number), '--ignore-lock']);
      const url = `http://127.0.0.1:${number}`;
      try {
        await waitForPage(dev, url + '/', 'Rechtstexte im Astro-Projekt');
        assert.equal(mock.calls.length, 0);
        try {
          await expectRenderError(dev, url + '/impressum/', /\[@flokani\.digital\/erecht24-astro\].*HTTP 401/, 'stream');
        } catch (error) {
          error.message += `\nMock-Dokumentabrufe: ${JSON.stringify(mock.calls.map((call) => call.type))}`;
          throw error;
        }
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].type, 'imprint');
        secretFree(dev.output());
      } finally { await dev.stop(); }
    });
    await runCase(`${kind}: gleichzeitige Seiten, Snapshot, Änderung und frischer Neustart`, async () => {
      for (let start = 0; start < 2; start++) {
        mock.reset();
        const number = await port();
        const dev = astro(kind, ['dev', '--host', '127.0.0.1', '--port', String(number), '--ignore-lock']);
        const url = `http://127.0.0.1:${number}`;
        let gate;
        let pendingPages = [];
        let stage = 'readiness';
        try {
          await waitForPage(dev, url + '/', 'Rechtstexte im Astro-Projekt');
          assert.equal(mock.calls.length, 0);
          stage = 'parallele Seiten mit Mock-Gate';
          gate = mock.holdSuccess();
          let settled = 0;
          pendingPages = legalPages.map(async ([pathname, html]) => {
            const result = await request(url + pathname);
            settled++;
            assert.equal(result.status, 200, `${pathname}\n${dev.output()}`);
            assert.ok(result.body.includes(html));
          });
          // Attach a handler immediately so a failing peer never becomes unhandled.
          const allPages = Promise.all(pendingPages);
          allPages.catch(() => {});
          await deadline(gate.entered, 60_000, `Mock-Gate nicht erreicht: ${kind}`);
          await pause(500);
          assert.equal(settled, 0);
          assert.deepEqual(mock.calls.map((call) => call.type), ['imprint']);
          gate.release(); gate = undefined;
          await allPages;
          stage = 'Cache-Abruf';
          await request(url + '/impressum/');
          assertCalls();
          if (start === 0) {
            stage = 'Seitenänderung';
            const filename = join(dirs[kind], 'src/pages/impressum.astro');
            const original = await readFile(filename, 'utf8');
            const marker = `fixture-page-updated-${kind}`;
            try {
              await writeFile(filename, original + `\n<p>${marker}</p>\n`);
              await waitForPage(dev, url + '/impressum/', marker);
              assertCalls();
            } finally { await writeFile(filename, original); }
          }
          secretFree(dev.output());
        } catch (error) {
          error.message += `\nStart ${start + 1}, Phase: ${stage}\n${dev.output()}\nMock-Dokumentabrufe: ${JSON.stringify(mock.calls.map((call) => call.type))}`;
          throw error;
        } finally {
          gate?.release();
          for (const controller of requests) controller.abort();
          await Promise.allSettled(pendingPages);
          await dev.stop();
        }
      }
    });
  }

  await runCase('Node-SSR ohne prerender: Build erfolgreich, Runtime sperrt Rechtstext', async () => {
    const directory = dirs.dynamic = join(work, 'dynamic-ssr');
    await mkdir(join(directory, 'src/pages'), { recursive: true });
    await cp(join(dirs.ssr, 'astro.config.mjs'), join(directory, 'astro.config.mjs'));
    await symlink(join(dirs.ssr, 'node_modules'), join(directory, 'node_modules'), 'dir');
    await writeFile(join(directory, 'package.json'), '{"private":true,"type":"module"}');
    await writeFile(join(directory, 'src/pages/impressum.astro'), `---\nimport LegalText from '@flokani.digital/erecht24-astro/LegalText.astro';\n---\n<LegalText type="imprint" />\n`);
    mock.reset();
    const build = await astro('dynamic', ['build']).done;
    assert.equal(build.code, 0, build.output);
    secretFree(build.output);
    await productionFree(join(directory, 'dist'));
    mock.reset();
    const number = await port();
    const server = command(process.execPath, ['dist/server/entry.mjs'], directory, { ...keyless, HOST: '127.0.0.1', PORT: String(number) });
    try {
      // This fixture intentionally has no non-legal readiness page.
      await until(() => /listening|Local|localhost|127\.0\.0\.1/i.test(server.output()) || (server.exited() && assert.fail(server.output())), 30_000, server.output());
      const body = await expectRenderError(server, `http://127.0.0.1:${number}/impressum/`, /prerender\s*=\s*true/, null);
      assert.ok(!body.includes(texts.imprint.html_de));
      assert.equal(mock.calls.length, 0);
      secretFree(server.output());
    } finally { await server.stop(); }
  });

  await runCase('Buildfehler und redigierte Warnungen', async () => {
    for (const [scenario, variables, message] of [
      ['success', keyless, /ERECHT24_API_KEY/], ['unauthorized', env, /HTTP 401/],
      ['missing-en', env, /imprint \(en\)/], ['empty', env, /imprint \(de\)/],
    ]) {
      mock.reset(scenario);
      const result = await astro('static', ['build'], variables).done;
      assert.notEqual(result.code, 0);
      assert.match(result.output, message);
      secretFree(result.output);
      assert.equal(mock.calls.length, variables === keyless ? 0 : 1);
    }
    mock.reset('warning');
    const result = await astro('static', ['build']).done;
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /Bitte prüfen: \[entfernt\] \[entfernt\]/);
    secretFree(result.output);
  });
  await runCase('envDir, mode und Vorrang gesetzter Umgebungsvariablen', async () => {
    const configFile = join(dirs.static, 'astro.config.mjs');
    const config = await readFile(configFile, 'utf8');
    await writeFile(configFile, config.replace("server: { hmr: false }", "server: { hmr: false }, envDir: './settings'"));
    await mkdir(join(dirs.static, 'settings'));
    try {
      await writeFile(join(dirs.static, 'settings/.env.staging'), `ERECHT24_API_KEY=${apiKey}\nERECHT24_PLUGIN_KEY=${pluginKey}\n`);
      await successfulBuild('static', keyless, ['--mode', 'staging']);
      await writeFile(join(dirs.static, 'settings/.env.staging'), 'ERECHT24_API_KEY=wrong-from-file\nERECHT24_PLUGIN_KEY=wrong-from-file\n');
      await successfulBuild('static', env, ['--mode', 'staging']);
    } finally { await writeFile(configFile, config); }
  });
  if (!failed) await rm(work, { recursive: true, force: true });
});
