import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const openTag = '<script type="module">';
const start = html.indexOf(openTag);
const end = html.lastIndexOf('</script>');

if (!html.includes('href="./manifest.webmanifest"')) {
  console.error('index.html must reference ./manifest.webmanifest');
  process.exit(1);
}

const serviceWorkerModule = readFileSync(new URL('../src/pwa/serviceWorker.js', import.meta.url), 'utf8');

if (!(html.includes("register('./sw.js'") || serviceWorkerModule.includes("register('./sw.js'"))) {
  console.error('service worker registration must keep the relative path ./sw.js');
  process.exit(1);
}

if (manifest.start_url !== './' || manifest.scope !== './') {
  console.error('manifest.webmanifest must keep start_url and scope relative (./)');
  process.exit(1);
}

if (start === -1 || end === -1 || end <= start) {
  console.error('Failed to locate inline module script in index.html');
  process.exit(1);
}

const moduleSource = html.slice(start + openTag.length, end);
const tempFile = join(tmpdir(), `gait-inline-${process.pid}.mjs`);

writeFileSync(tempFile, moduleSource, 'utf8');

const result = spawnSync(process.execPath, ['--check', tempFile], {
  stdio: 'inherit'
});

try {
  unlinkSync(tempFile);
} catch (_) {
  // ignore cleanup errors
}

process.exit(result.status ?? 1);
