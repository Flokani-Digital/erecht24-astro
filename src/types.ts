export const documentTypes = ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'] as const;
export const languages = ['de', 'en'] as const;

export type DocumentType = (typeof documentTypes)[number];
export type Language = (typeof languages)[number];

export interface RechtstexteOptions {
  documents?: readonly DocumentType[];
  languages?: readonly Language[];
}

export interface ContentSnapshot {
  languages: Language[];
  documents: Partial<Record<DocumentType, Partial<Record<Language, string>>>>;
}

export interface Selection {
  documents: DocumentType[];
  languages: Language[];
}

export function normalizeOptions(options: RechtstexteOptions): Selection {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('[rechtstexte] Die Konfiguration muss ein Objekt sein.');
  }
  for (const key of Object.keys(options)) {
    if (key !== 'documents' && key !== 'languages') {
      throw new Error('[rechtstexte] Unbekannte Option. Erlaubt sind documents und languages.');
    }
  }
  const documents: readonly DocumentType[] = options.documents === undefined ? ['imprint', 'privacyPolicy'] : options.documents;
  const selectedLanguages: readonly Language[] = options.languages === undefined ? ['de'] : options.languages;
  if (!Array.isArray(documents) || documents.length === 0 ||
    Array.from(documents).some((value) => !documentTypes.includes(value))) {
    throw new Error('[rechtstexte] documents muss bekannte Dokumenttypen enthalten.');
  }
  if (!Array.isArray(selectedLanguages) || selectedLanguages.length === 0 ||
    Array.from(selectedLanguages).some((value) => !languages.includes(value))) {
    throw new Error('[rechtstexte] languages muss de und/oder en enthalten.');
  }
  return { documents: [...new Set(documents)], languages: [...new Set(selectedLanguages)] };
}
