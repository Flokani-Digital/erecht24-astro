import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { credentialsFrom, fetchDocuments, plainText } from '../dist/api.js';
import { normalizeOptions } from '../dist/types.js';
import { apiKey, pluginKey, texts } from './support/mock-server.mjs';

const credentials = { apiKey, pluginKey };
const selected = normalizeOptions({ documents: ['imprint'] });
const json = (value) => Response.json(value);
const noop = () => {};

function assertSecretFree(value) {
  assert.ok(!String(value).includes(apiKey));
  assert.ok(!String(value).includes(pluginKey));
}

test('Standardauswahl, Duplikate und ungültige Konfiguration', () => {
  assert.deepEqual(normalizeOptions({}), { documents: ['imprint', 'privacyPolicy'], languages: ['de'] });
  assert.deepEqual(normalizeOptions({ documents: ['imprint', 'imprint'], languages: ['en', 'de', 'en'] }),
    { documents: ['imprint'], languages: ['en', 'de'] });
  for (const options of [null, [], { documents: [] }, { languages: [] }, { languages: ['fr'] },
    { documents: ['unknown'] }, { documents: null }, { languages: Array(1) }, { apiKey }]) {
    assert.throws(() => normalizeOptions(options), (error) => {
      assertSecretFree(error); return true;
    });
  }
});

test('Zugangsschlüssel fehlen oder enthalten ungültige Zeichen', () => {
  assert.deepEqual(credentialsFrom({ ERECHT24_API_KEY: ` ${apiKey} `, ERECHT24_PLUGIN_KEY: pluginKey }), credentials);
  for (const [values, builtIn] of [[{}, pluginKey], [{ ERECHT24_API_KEY: apiKey }, ''],
    [{ ERECHT24_API_KEY: apiKey + '\nunsafe' }, pluginKey], [{ ERECHT24_API_KEY: apiKey }, pluginKey + '\n']]) {
    assert.throws(() => credentialsFrom(values, builtIn), (error) => {
      assertSecretFree(error); return true;
    });
  }
  assert.throws(() => credentialsFrom({}, pluginKey), /ERECHT24_API_KEY wird/);
  assert.throws(() => credentialsFrom({ ERECHT24_API_KEY: apiKey }, ''), /Developer-Key/);
});

test('Eingebauter Plugin-Key, optional per Variable überschreibbar', () => {
  assert.deepEqual(credentialsFrom({ ERECHT24_API_KEY: apiKey }, pluginKey), credentials);
  assert.deepEqual(credentialsFrom({ ERECHT24_API_KEY: apiKey, ERECHT24_PLUGIN_KEY: ' ' }, pluginKey), credentials);
  assert.equal(credentialsFrom({ ERECHT24_API_KEY: apiKey, ERECHT24_PLUGIN_KEY: 'own-key' }, pluginKey).pluginKey, 'own-key');
});

test('Ein Abruf pro Dokument, beide Sprachen und unverändertes Original-HTML', async () => {
  const calls = [];
  const selection = normalizeOptions({
    documents: ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'], languages: ['de', 'en'],
  });
  const snapshot = await fetchDocuments(selection, credentials, noop, { fetch: async (url, init) => {
    calls.push(url.pathname);
    assert.equal(url.origin, 'https://api.e-recht24.de');
    assert.equal(url.search, '');
    assert.equal(init.headers['eRecht24-api-key'], apiKey);
    assert.equal(init.headers['eRecht24-plugin-key'], pluginKey);
    assert.equal(init.redirect, 'manual');
    assert.ok(init.signal instanceof AbortSignal);
    return json(texts[url.pathname.split('/').at(-1)]);
  } });
  assert.deepEqual(calls, ['/v2/imprint', '/v2/privacyPolicy', '/v2/privacyPolicySocialMedia']);
  for (const type of selection.documents) {
    for (const lang of selection.languages) assert.equal(snapshot.documents[type][lang], texts[type][`html_${lang}`]);
  }
  const defaults = [];
  await fetchDocuments(normalizeOptions({}), credentials, noop, { fetch: async (url) => {
    defaults.push(url.pathname); return json(texts.imprint);
  } });
  assert.deepEqual(defaults, ['/v2/imprint', '/v2/privacyPolicy']);
});

test('Markup ohne Inhalt, fehlende Sprachen und ungültige Antworten brechen ohne Retry ab', async () => {
  assert.equal(plainText('<p>&nbsp;&#160;\u200b</p><!-- comment --><script>ignored</script><style>ignored</style>'), '');
  for (const data of [null, [], {}, { html_de: 42 }, { html_de: '' }, { html_de: '<div> </div>' },
    { html_de: '<p>&nbsp;&#160;\u200b</p>' }, { ...texts.imprint, warnings: [] },
    { html_de: `<p>${apiKey}</p>` }]) {
    let calls = 0;
    await assert.rejects(fetchDocuments(selected, credentials, noop, { fetch: async () => {
      calls++; return json(data);
    } }), (error) => { assertSecretFree(error); return true; });
    assert.equal(calls, 1);
  }
  await assert.rejects(fetchDocuments(normalizeOptions({ languages: ['en'] }), credentials, noop,
    { fetch: async () => json({ html_de: 'Deutsch' }) }), /imprint \(en\)/);
  await assert.rejects(fetchDocuments(selected, credentials, noop,
    { fetch: async () => new Response(`invalid ${pluginKey}`) }), /kein gültiges JSON/);
});

test('Öffentlicher Plugin-Key im Rechtstext bricht den Abruf nicht ab', async () => {
  const html = `<p>Plugin ${pluginKey}</p>`;
  const result = await fetchDocuments(selected, credentials, noop, { fetch: async () => json({ html_de: html }) });
  assert.equal(result.documents.imprint.de, html);
});

test('Warnungen sind lesbar und enthalten keine Zugangsschlüssel', async () => {
  const warnings = [];
  const result = await fetchDocuments(selected, credentials, (message) => warnings.push(message), {
    fetch: async () => json({ ...texts.imprint, warnings: `<p>Bitte &amp; prüfen: ${apiKey} ${pluginKey}</p>` }),
  });
  assert.equal(result.documents.imprint.de, texts.imprint.html_de);
  assert.deepEqual(warnings, ['imprint: Bitte & prüfen: [entfernt] [entfernt]']);
});

test('Dauerhafte HTTP-Fehler und Redirects werden nicht wiederholt', async () => {
  for (const status of [301, 302, 400, 401, 403, 404, 422]) {
    let calls = 0;
    await assert.rejects(fetchDocuments(selected, credentials, noop, { fetch: async () => {
      calls++; return new Response(apiKey + pluginKey, { status });
    }, sleep: async () => assert.fail('Kein Retry erwartet') }), (error) => {
      assert.match(error.message, new RegExp(`HTTP ${status}`));
      assertSecretFree(error); assert.equal(error.cause, undefined); return true;
    });
    assert.equal(calls, 1);
  }
});

test('Vorübergehende Fehler: höchstens drei Versuche mit steigender Wartezeit', async () => {
  for (const status of [429, 500, 502, 503, 504, 'network']) {
    const delays = [];
    let calls = 0;
    await assert.rejects(fetchDocuments(selected, credentials, noop, {
      fetch: async () => { calls++; if (status === 'network') throw new Error(apiKey); return new Response('', { status }); },
      sleep: async (ms) => { delays.push(ms); },
    }), (error) => { assertSecretFree(error); return true; });
    assert.equal(calls, 3);
    assert.deepEqual(delays, [1000, 2000]);
  }
  let calls = 0;
  const snapshot = await fetchDocuments(selected, credentials, noop, {
    fetch: async () => ++calls < 3 ? new Response('', { status: 503 }) : json(texts.imprint), sleep: async () => {},
  });
  assert.equal(calls, 3);
  assert.equal(snapshot.documents.imprint.de, texts.imprint.html_de);
});

test('Retry-After akzeptiert Sekunden und HTTP-Datum und bricht bei mehr als 10 Sekunden ab', async () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  for (const [header, delay] of [['3', 3000], ['Thu, 01 Jan 2026 00:00:04 GMT', 4000], ['invalid', 1000]]) {
    let calls = 0;
    const delays = [];
    await fetchDocuments(selected, credentials, noop, {
      fetch: async () => ++calls === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': header } }) : json(texts.imprint),
      now: () => now, sleep: async (ms) => { delays.push(ms); },
    });
    assert.deepEqual(delays, [delay]);
  }
  let calls = 0;
  await assert.rejects(fetchDocuments(selected, credentials, noop, {
    fetch: async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '11' } }); },
    sleep: async () => assert.fail('Zu lange Wartezeit'),
  }), /HTTP 429/);
  assert.equal(calls, 1);
});

test('Timeout umfasst auch einen hängenden Response-Body', async (t) => {
  let calls = 0;
  const server = createServer((_request, response) => {
    calls++;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write('{');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => { server.closeAllConnections(); server.close(); });
  await assert.rejects(fetchDocuments(selected, credentials, noop, {
    fetch: (_url, init) => fetch(`http://127.0.0.1:${server.address().port}`, init),
    timeoutMs: 100, sleep: async () => {},
  }), /Timeout nach 3 Versuchen/);
  assert.equal(calls, 3);
});
