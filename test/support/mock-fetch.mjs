// Loaded explicitly by test/demo commands. Never included in the published package.
import { apiKey, pluginKey } from './mock-server.mjs';

if (process.env.RECHTSTEXTE_TEST_CREDENTIALS === '1') {
  process.env.ERECHT24_API_KEY = apiKey;
  process.env.ERECHT24_PLUGIN_KEY = pluginKey;
}

const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin !== 'https://api.e-recht24.de') return originalFetch(input, init);
  const origin = process.env.RECHTSTEXTE_TEST_ORIGIN;
  if (!origin || new URL(origin).hostname !== '127.0.0.1') {
    throw new Error('Echte eRecht24-Anfragen sind in diesem Testprozess gesperrt.');
  }
  return originalFetch(new URL(url.pathname, origin), init);
};
