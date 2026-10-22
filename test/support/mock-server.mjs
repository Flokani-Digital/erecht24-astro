import { createServer } from 'node:http';

export const apiKey = 'fixture-api-key-never-publish-81732';
export const pluginKey = 'fixture-plugin-key-never-publish-52849';

export const texts = {
  imprint: {
    html_de: '<h1>Impressum</h1><p>Beispiel GmbH · Musterstraße 1 · 12345 Musterstadt</p><p>Dies ist ein künstlicher Testtext.</p>',
    html_en: '<h1>Legal notice</h1><p>Example Ltd · Sample Street 1</p><p>This is a fictional test document.</p>',
  },
  privacyPolicy: {
    html_de: '<h1>Datenschutzerklärung</h1><h2>Verantwortlicher</h2><p>Beispiel GmbH</p><p>Dieser Testtext ersetzt keine Datenschutzerklärung.</p>',
    html_en: '<h1>Privacy policy</h1><h2>Controller</h2><p>Example Ltd</p><p>This fixture is not a privacy policy.</p>',
  },
  privacyPolicySocialMedia: {
    html_de: '<h3>Unsere Social-Media-Auftritte</h3><p>Künstliches Beispiel für unsere Social-Media-Präsenzen.</p>',
    html_en: '<h3>Our social media profiles</h3><p>Fictional example for our social media profiles.</p>',
  },
};

export async function createMockServer() {
  const calls = [];
  let scenario = 'success';
  let gate;
  const sockets = new Set();
  const server = createServer((request, response) => {
    const type = request.url?.split('/').at(-1);
    calls.push({ type, headers: request.headers });
    response.setHeader('Content-Type', 'application/json');
    if (scenario === 'unauthorized') {
      response.writeHead(401).end(JSON.stringify({ error: apiKey + pluginKey }));
      return;
    }
    if (!Object.hasOwn(texts, type)) {
      response.writeHead(404).end('{}');
      return;
    }
    const data = { ...texts[type], warnings: '', created: '2026-01-01', modified: '2026-01-02' };
    if (scenario === 'missing-en') data.html_en = '';
    if (scenario === 'empty') data.html_de = '<p>&nbsp;&#160;\u200b</p>';
    if (scenario === 'warning') data.warnings = `<p>Bitte prüfen: ${apiKey} ${pluginKey}</p>`;
    const send = () => { if (!response.destroyed) response.end(JSON.stringify(data)); };
    if (gate) {
      gate.reached();
      gate.promise.then(send);
    } else send();
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    calls,
    // Change a response without erasing the evidence from an earlier request.
    setScenario(next) { scenario = next; },
    holdSuccess() {
      if (gate) throw new Error('Ein Mock-Gate ist bereits aktiv.');
      let release;
      let reached;
      const promise = new Promise((resolve) => { release = resolve; });
      const entered = new Promise((resolve) => { reached = resolve; });
      gate = { promise, reached, release };
      return { entered, release() { gate = undefined; release(); } };
    },
    reset(next = 'success') {
      if (gate) throw new Error('Mock-Gate vor reset freigeben.');
      calls.length = 0; scenario = next;
    },
    close() {
      // Also bound cleanup when a failed assertion leaves a response gated.
      gate?.release();
      gate = undefined;
      for (const socket of sockets) socket.destroy();
      server.closeAllConnections();
      return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
