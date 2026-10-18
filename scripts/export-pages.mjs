import { copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

process.env.GITHUB_PAGES = '1';
const exportRun = spawnSync('npx', ['expo', 'export', '-p', 'web'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
if (exportRun.status !== 0) process.exit(exportRun.status ?? 1);
copyFileSync('dist/index.html', 'dist/404.html');
