import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cacheFile, readCache, writeCache } from '../dist/cache.js';
import { normalizeOptions } from '../dist/types.js';
import { apiKey, pluginKey, texts } from './support/mock-server.mjs';

const day = 86_400_000;
const now = Date.parse('2026-01-10T12:00:00Z');
const selection = normalizeOptions({ documents: ['imprint'], languages: ['de', 'en'] });
const snapshot = {
  languages: ['de', 'en'],
  documents: { imprint: { de: texts.imprint.html_de, en: texts.imprint.html_en } },
};

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'erecht24-cache-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, file: cacheFile(dir) };
}

test('Roundtrip: Schreiben und Lesen liefert denselben Stand, ohne Zugangsschlüssel', async (t) => {
  const { dir, file } = await fixture(t);
  await writeCache(file, snapshot, apiKey, () => now - day);
  const stored = await readFile(file, 'utf8');
  assert.ok(!stored.includes(apiKey) && !stored.includes(pluginKey));
  assert.match(JSON.parse(stored).projectFingerprint, /^[a-f0-9]{64}$/);
  const result = await readCache(file, selection, 7, apiKey, () => now);
  assert.deepEqual(result.snapshot, snapshot);
  assert.equal(result.fetchedAt.toISOString(), new Date(now - day).toISOString());
  assert.deepEqual(await readdir(join(dir, 'erecht24-astro')), ['snapshot.json'], 'Keine temporären Dateien');
});

test('Projektwechsel: Cache von Projekt A wird für Projekt B abgelehnt, ohne Schlüssel oder Hash im Fehler', async (t) => {
  const { file } = await fixture(t);
  await writeCache(file, snapshot, apiKey, () => now);
  const otherApiKey = 'fixture-other-project-api-key-never-publish-91243';
  await assert.rejects(readCache(file, selection, 7, otherApiKey, () => now), (error) => {
    assert.match(error.message, /Kein nutzbarer Cache.*Projektzuordnung/);
    for (const key of [apiKey, otherApiKey, pluginKey]) assert.ok(!error.message.includes(key));
    assert.doesNotMatch(error.message, /[a-f0-9]{64}/);
    return true;
  });
});

test('Alter Cache ohne Projektfingerabdruck wird abgelehnt', async (t) => {
  const { dir, file } = await fixture(t);
  await mkdir(join(dir, 'erecht24-astro'), { recursive: true });
  await writeFile(file, JSON.stringify({ fetchedAt: new Date(now).toISOString(), snapshot }));
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /Kein nutzbarer Cache.*Projektzuordnung/);
});

test('Zu alter, fehlender oder beschädigter Cache wird mit Grund abgelehnt', async (t) => {
  const { file } = await fixture(t);
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /Kein nutzbarer Cache.*kein gültiger Stand/);
  await writeCache(file, snapshot, apiKey, () => now - 8 * day);
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /älter als 7 Tage/);
  await assert.doesNotReject(readCache(file, selection, 8, apiKey, () => now));
  await writeCache(file, snapshot, apiKey, () => now + 5 * day);
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /älter als 7 Tage/, 'Zeitstempel in der Zukunft');
  for (const content of ['{', 'null', '{"fetchedAt":1,"snapshot":{}}', '{"fetchedAt":"x","snapshot":{"documents":{}}}']) {
    await writeFile(file, content);
    await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /Kein nutzbarer Cache/);
  }
});

test('Cache muss Dokumente und Sprachen der aktuellen Auswahl abdecken und nichtleer sein', async (t) => {
  const { file } = await fixture(t);
  await writeCache(file, { languages: ['de'], documents: { imprint: { de: texts.imprint.html_de } } }, apiKey, () => now);
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /imprint \(en\)/);
  await writeCache(file, snapshot, apiKey, () => now);
  await assert.rejects(readCache(file, normalizeOptions({ documents: ['privacyPolicy'] }), 7, apiKey, () => now), /privacyPolicy \(de\)/);
  await writeCache(file, { ...snapshot, documents: { imprint: { de: '<p>&nbsp;</p>', en: 'x' } } }, apiKey, () => now);
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /imprint \(de\)/);
  await writeCache(file, { ...snapshot, documents: { __proto__: null, imprint: { de: 'x' } } }, apiKey, () => now);
  await assert.rejects(readCache(file, selection, 7, apiKey, () => now), /imprint \(en\)/);
  // Eine kleinere Auswahl darf aus einem größeren Cache bedient werden.
  await writeCache(file, snapshot, apiKey, () => now);
  const smaller = await readCache(file, normalizeOptions({ documents: ['imprint'], languages: ['en'] }), 7, apiKey, () => now);
  assert.deepEqual(smaller.snapshot.documents, { imprint: { en: texts.imprint.html_en } });
});

test('Schreibfehler werfen und hinterlassen keine temporäre Datei', async (t) => {
  const { dir } = await fixture(t);
  // Ein Verzeichnis an der Zieldatei lässt rename fehlschlagen.
  const file = cacheFile(dir);
  await mkdir(file, { recursive: true });
  await assert.rejects(writeCache(file, snapshot, apiKey, () => now));
  assert.deepEqual(await readdir(join(dir, 'erecht24-astro')), ['snapshot.json']);
});
