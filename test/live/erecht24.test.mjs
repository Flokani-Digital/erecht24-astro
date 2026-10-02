// Opt-in: contacts the real eRecht24 API with the public demo keys from its OpenAPI description.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchDocuments } from '../../dist/api.js';
import { normalizeOptions } from '../../dist/types.js';

const credentials = {
  apiKey: 'e81cbf18a5239377aa4972773d34cc2b81ebc672879581bce29a0a4c414bf117',
  pluginKey: '3jh4uhn8u69i97kj9timk466748996ikhkjhlk67plli08lhkijgh8z4363gr53v',
};

test('Echte eRecht24-API liefert alle Dokumente auf Deutsch und Englisch', { timeout: 120_000 }, async () => {
  const selection = normalizeOptions({
    documents: ['imprint', 'privacyPolicy', 'privacyPolicySocialMedia'], languages: ['de', 'en'],
  });
  const warnings = [];
  const snapshot = await fetchDocuments(selection, credentials, (message) => warnings.push(message));
  for (const lang of selection.languages) {
    // Imprint and privacy policy bring their own <h1>; the social media text is a section starting at <h3>.
    assert.match(snapshot.documents.imprint[lang], /<h1>/);
    assert.match(snapshot.documents.privacyPolicy[lang], /<h1>/);
    assert.doesNotMatch(snapshot.documents.privacyPolicySocialMedia[lang], /<h1>/);
  }
  if (warnings.length) console.log(warnings.join('\n'));
});
