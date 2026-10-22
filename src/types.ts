export const documentTypes = ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'] as const;
export const languages = ['de', 'en'] as const;

export type DocumentType = (typeof documentTypes)[number];
export type Language = (typeof languages)[number];

export interface RechtstexteOptions {
  documents?: readonly DocumentType[];
  languages?: readonly Language[];
  /** Build only: reuse the last successful fetch when eRecht24 is temporarily unavailable. */
  fallbackToCache?: true | { maxAgeDays?: number };
}

export const defaultMaxAgeDays = 7;

export interface ContentSnapshot {
  languages: Language[];
  documents: Partial<Record<DocumentType, Partial<Record<Language, string>>>>;
}

export interface Selection {
  documents: DocumentType[];
  languages: Language[];
  fallbackToCache?: { maxAgeDays: number };
}

export function normalizeOptions(options: RechtstexteOptions): Selection {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('[@flokani.digital/erecht24-astro] Die Konfiguration muss ein Objekt sein.');
  }
  for (const key of Object.keys(options)) {
    if (key !== 'documents' && key !== 'languages' && key !== 'fallbackToCache') {
      throw new Error('[@flokani.digital/erecht24-astro] Unbekannte Option. Erlaubt sind documents, languages und fallbackToCache.');
    }
  }
  const documents: readonly DocumentType[] = options.documents === undefined ? ['imprint', 'privacyPolicy'] : options.documents;
  const selectedLanguages: readonly Language[] = options.languages === undefined ? ['de'] : options.languages;
  if (!Array.isArray(documents) || documents.length === 0 ||
    Array.from(documents).some((value) => !documentTypes.includes(value))) {
    throw new Error('[@flokani.digital/erecht24-astro] documents muss bekannte Dokumenttypen enthalten.');
  }
  if (!Array.isArray(selectedLanguages) || selectedLanguages.length === 0 ||
    Array.from(selectedLanguages).some((value) => !languages.includes(value))) {
    throw new Error('[@flokani.digital/erecht24-astro] languages muss de und/oder en enthalten.');
  }
  const selection: Selection = { documents: [...new Set(documents)], languages: [...new Set(selectedLanguages)] };
  const fallback = options.fallbackToCache;
  if (fallback !== undefined) {
    const maxAgeDays = fallback === true ? defaultMaxAgeDays :
      fallback && typeof fallback === 'object' && !Array.isArray(fallback) &&
        Object.keys(fallback).every((key) => key === 'maxAgeDays')
        ? fallback.maxAgeDays ?? defaultMaxAgeDays : NaN;
    if (!Number.isInteger(maxAgeDays) || maxAgeDays < 1 || maxAgeDays > 30) {
      throw new Error('[@flokani.digital/erecht24-astro] fallbackToCache muss true oder { maxAgeDays } mit einer ganzen Zahl von 1 bis 30 sein.');
    }
    selection.fallbackToCache = { maxAgeDays };
  }
  return selection;
}
