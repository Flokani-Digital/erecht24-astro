import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createMockServer } from '../test/support/mock-server.mjs';

const root = new URL('../', import.meta.url);
const mock = await createMockServer();
console.log('Demo mit künstlichen Rechtstexten. Es wird keine eRecht24-Verbindung aufgebaut.');
const child = spawn(process.execPath, [
  fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)),
  'dev', '--root', 'examples/static', '--host', '127.0.0.1', '--port', '4337', '--ignore-lock',
], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    ASTRO_DEV_BACKGROUND: '1',
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${JSON.stringify(fileURLToPath(new URL('../test/support/mock-fetch.mjs', import.meta.url)))}`,
    RECHTSTEXTE_TEST_ORIGIN: mock.origin,
    RECHTSTEXTE_TEST_CREDENTIALS: '1',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', async (code) => { await mock.close(); process.exitCode = code ?? 0; });
