import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { plainText } from './api.js';
import type { ContentSnapshot, Selection } from './types.js';

const dayMs = 86_400_000;

export function cacheFile(cacheDir: string): string {
  return join(cacheDir, 'erecht24-astro', 'snapshot.json');
}

/** Written only after every selected document was fetched and validated. */
export async function writeCache(
  file: string, snapshot: ContentSnapshot, now: () => number = Date.now,
): Promise<void> {
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(temporary, JSON.stringify({ fetchedAt: new Date(now()).toISOString(), snapshot }));
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export interface CachedSnapshot {
  snapshot: ContentSnapshot;
  fetchedAt: Date;
}

/** Throws with a German reason when the cache must not be used. */
export async function readCache(
  file: string, selection: Selection, maxAgeDays: number, now: () => number = Date.now,
): Promise<CachedSnapshot> {
  const prefix = '[@flokani.digital/erecht24-astro] Kein nutzbarer Cache';
  let stored: unknown;
  try {
    stored = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error(`${prefix}: Es liegt kein gültiger Stand vom letzten erfolgreichen Abruf vor.`);
  }
  const record = stored as { fetchedAt?: unknown; snapshot?: Partial<ContentSnapshot> } | null;
  const fetchedAt = typeof record?.fetchedAt === 'string' ? new Date(record.fetchedAt) : undefined;
  const documents = record?.snapshot?.documents;
  if (!fetchedAt || Number.isNaN(fetchedAt.getTime()) || !documents || typeof documents !== 'object') {
    throw new Error(`${prefix}: Die Cache-Datei ist beschädigt.`);
  }
  if (now() - fetchedAt.getTime() > maxAgeDays * dayMs || fetchedAt.getTime() > now() + dayMs) {
    throw new Error(`${prefix}: Der Stand vom ${fetchedAt.toISOString().slice(0, 10)} ist älter als ${maxAgeDays} Tage.`);
  }
  const snapshot: ContentSnapshot = { languages: [...selection.languages], documents: {} };
  for (const type of selection.documents) {
    const stored = Object.hasOwn(documents, type) ? documents[type] : undefined;
    const translations: Partial<Record<'de' | 'en', string>> = {};
    for (const lang of selection.languages) {
      const html = stored && Object.hasOwn(stored, lang) ? stored[lang] : undefined;
      if (typeof html !== 'string' || !plainText(html)) {
        throw new Error(`${prefix}: ${type} (${lang}) fehlt oder passt nicht zur aktuellen Konfiguration.`);
      }
      translations[lang] = html;
    }
    snapshot.documents[type] = translations;
  }
  return { snapshot, fetchedAt };
}
