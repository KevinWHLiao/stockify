import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expoCli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');
const env = { ...process.env, BROWSER: 'none', EXPO_NO_TELEMETRY: '1' };

const proxy = spawn(process.execPath, [path.join(root, 'scripts', 'quote-proxy.mjs')], {
  cwd: root,
  stdio: 'inherit',
  env,
});
const expo = spawn(process.execPath, [expoCli, 'start', '--web', '--port', '8081'], {
  cwd: root,
  stdio: 'inherit',
  env,
});

function shutdown() {
  proxy.kill();
  expo.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
expo.on('exit', (code) => {
  proxy.kill();
  process.exit(code ?? 0);
});
