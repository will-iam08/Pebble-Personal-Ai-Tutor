import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distExtDir = path.join(rootDir, 'dist-extension');
const releaseDir = path.join(rootDir, 'release');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const manifestPath = path.join(distExtDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail('dist-extension/manifest.json not found. Run `npm run build:extension` first.');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!manifest.name || typeof manifest.name !== 'string') {
  fail('manifest.name is required.');
}
if (manifest.name.length > 75) {
  fail(`manifest.name is ${manifest.name.length} chars (Chrome Web Store limit is 75).`);
}

if (!manifest.description || typeof manifest.description !== 'string') {
  fail('manifest.description is required.');
}
if (manifest.description.length > 132) {
  fail(
    `manifest.description is ${manifest.description.length} chars (Chrome Web Store limit is 132).`
  );
}

if (!manifest.version || typeof manifest.version !== 'string') {
  fail('manifest.version is required.');
}

const requiredCoreFiles = ['sidepanel.html', 'background.js', 'content.js'];
for (const file of requiredCoreFiles) {
  if (!fs.existsSync(path.join(distExtDir, file))) {
    fail(`Missing required extension file in dist-extension/: ${file}`);
  }
}

const iconPaths = new Set();
if (manifest.icons && typeof manifest.icons === 'object') {
  for (const val of Object.values(manifest.icons)) {
    if (typeof val === 'string') iconPaths.add(val);
  }
}
if (manifest.action?.default_icon && typeof manifest.action.default_icon === 'object') {
  for (const val of Object.values(manifest.action.default_icon)) {
    if (typeof val === 'string') iconPaths.add(val);
  }
}

if (iconPaths.size === 0) {
  fail('manifest.json must declare icons before packaging for the Chrome Web Store.');
}

for (const relPath of iconPaths) {
  const fullPath = path.join(distExtDir, relPath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing icon referenced by manifest.json: dist-extension/${relPath}`);
  }
}

fs.mkdirSync(releaseDir, { recursive: true });
const outZipName = `pebble-chrome-extension-v${manifest.version}.zip`;
const outZipPath = path.join(releaseDir, outZipName);
if (fs.existsSync(outZipPath)) {
  fs.unlinkSync(outZipPath);
}

execFileSync(
  'zip',
  ['-r', '-X', outZipPath, '.', '-x', '*.DS_Store', '*/.DS_Store', '__MACOSX/*'],
  { cwd: distExtDir, stdio: 'inherit' }
);

const stat = fs.statSync(outZipPath);
const sizeKb = (stat.size / 1024).toFixed(1);
console.log(
  `Packaged Chrome Web Store zip: release/${outZipName} (${sizeKb} KB, description ${manifest.description.length}/132 chars)`
);
