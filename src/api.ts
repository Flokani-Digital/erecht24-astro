import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import type { ContentSnapshot, DocumentType, Selection } from './types.js';

const baseUrl = 'https://api.e-recht24.de/v2/';
const retryStatuses = new Set([429, 500, 502, 503, 504]);

interface Credentials {
  apiKey: string;
  pluginKey: string;
}

/** Internal dependencies allow offline tests without a configurable production API host. */
export interface ApiDependencies {
  fetch?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
}

export function credentialsFrom(values: Record<string, string | undefined>): Credentials {
  const apiKey = values.ERECHT24_API_KEY?.trim();
  const pluginKey = values.ERECHT24_PLUGIN_KEY?.trim();
  if (!apiKey || !pluginKey) {
    throw new Error('[@flokani.digital/erecht24-astro] ERECHT24_API_KEY und ERECHT24_PLUGIN_KEY werden für den Abruf benötigt.');
  }
  // Reject control characters without reflecting credential values in the error.
  if (!/^[\x21-\x7e]+$/.test(apiKey) || !/^[\x21-\x7e]+$/.test(pluginKey)) {
    throw new Error('[@flokani.digital/erecht24-astro] Zugangsschlüssel enthalten ungültige Zeichen.');
  }
  return { apiKey, pluginKey };
}

function textOf(node: DefaultTreeAdapterMap['node']): string {
  if ('tagName' in node && ['script', 'style', 'template'].includes(node.tagName)) return '';
  if ('value' in node) return node.value;
  if ('childNodes' in node) return node.childNodes.map(textOf).join(' ');
  return '';
}

export function plainText(html: string): string {
  return textOf(parseFragment(html)).replace(/[\s\u200b-\u200d\ufeff]+/gu, ' ').trim();
}

function redact(message: string, credentials: Credentials): string {
  let safe = message;
  for (const secret of [credentials.apiKey, credentials.pluginKey].sort((a, b) => b.length - a.length)) {
    safe = safe.split(secret).join('[entfernt]');
  }
  return safe;
}

function retryDelay(response: Response, attempt: number, now: () => number): number {
  const backoff = 1000 * 2 ** attempt;
  const header = response.headers.get('retry-after');
  if (response.status !== 429 || !header) return backoff;
  const seconds = Number(header);
  const delay = Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1000 : Date.parse(header) - now();
  if (!Number.isFinite(delay)) return backoff;
  return Math.max(backoff, delay, 0);
}

async function readDocument(
  type: DocumentType, credentials: Credentials, dependencies: ApiDependencies,
): Promise<unknown> {
  const request = dependencies.fetch ?? globalThis.fetch;
  const sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = dependencies.now ?? Date.now;
  const timeoutMs = dependencies.timeoutMs ?? 10_000;
  for (let attempt = 0; attempt < 3; attempt++) {
    const signal = AbortSignal.timeout(timeoutMs);
    let response: Response;
    let body: string | undefined;
    try {
      response = await request(new URL(type, baseUrl), {
        headers: {
          Accept: 'application/json',
          'eRecht24-api-key': credentials.apiKey,
          'eRecht24-plugin-key': credentials.pluginKey,
        },
        redirect: 'manual',
        signal,
      });
      if (response.ok) body = await response.text();
      else await response.body?.cancel();
    } catch {
      if (attempt === 2) {
        throw new Error(`[@flokani.digital/erecht24-astro] ${type}: Netzwerkfehler oder Timeout nach 3 Versuchen.`);
      }
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (!response.ok) {
      const delay = retryDelay(response, attempt, now);
      if (retryStatuses.has(response.status) && attempt < 2 && delay <= 10_000) {
        await sleep(delay);
        continue;
      }
      throw new Error(`[@flokani.digital/erecht24-astro] ${type}: Abruf fehlgeschlagen (HTTP ${response.status}). ` +
        (response.status === 401 ? 'Zugangsschlüssel und eRecht24-Mitgliedschaft prüfen.' :
          response.status === 404 ? 'Das Dokument muss im eRecht24-Projekt angelegt sein.' :
            'Dokumentzugriff und API-Verfügbarkeit prüfen.'));
    }
    try {
      return JSON.parse(body!);
    } catch {
      throw new Error(`[@flokani.digital/erecht24-astro] ${type}: Die API-Antwort enthält kein gültiges JSON.`);
    }
  }
  throw new Error('[@flokani.digital/erecht24-astro] Abruf fehlgeschlagen.');
}

export async function fetchDocuments(
  selection: Selection,
  credentials: Credentials,
  warn: (message: string) => void,
  dependencies: ApiDependencies = {},
): Promise<ContentSnapshot> {
  const snapshot: ContentSnapshot = { languages: [...selection.languages], documents: {} };
  // Serial requests bound concurrency and stop immediately on a permanent error.
  for (const type of selection.documents) {
    const data = await readDocument(type, credentials, dependencies);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error(`[@flokani.digital/erecht24-astro] ${type}: Unerwartete Antwortstruktur.`);
    }
    const record = data as Record<string, unknown>;
    const translations: Partial<Record<'de' | 'en', string>> = {};
    for (const lang of selection.languages) {
      const html = record[`html_${lang}`];
      if (typeof html !== 'string' || !plainText(html)) {
        throw new Error(`[@flokani.digital/erecht24-astro] ${type} (${lang}): Rechtstext fehlt oder ist leer.`);
      }
      // Do not silently alter legal content; reject a response reflecting credentials.
      if ([credentials.apiKey, credentials.pluginKey].some((secret) => html.includes(secret))) {
        throw new Error(`[@flokani.digital/erecht24-astro] ${type}: Die API-Antwort enthält vertrauliche Zugangsdaten.`);
      }
      translations[lang] = html;
    }
    if (record.warnings != null && typeof record.warnings !== 'string') {
      throw new Error(`[@flokani.digital/erecht24-astro] ${type}: Ungültiges warnings-Feld.`);
    }
    if (typeof record.warnings === 'string') {
      const message = redact(plainText(record.warnings), credentials)
        .replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ');
      if (message) warn(`${type}: ${message}`);
    }
    snapshot.documents[type] = translations;
  }
  return snapshot;
}
