// Replace the build-time placeholders for browser-exposed keys with the values
// from the container environment. An unset key becomes `void 0`, matching an
// upstream build without that key.
import fs from 'node:fs';
import path from 'node:path';

const KEYS = ['GOOGLE_MAPS_API_KEY', 'CESIUM_ION_TOKEN'];
const root = process.argv[2];

const replacements = KEYS.map((name) => {
  const value = String(process.env[name] ?? '').trim();
  return {
    name,
    placeholder: JSON.stringify(`__GEV_RUNTIME_${name}__`),
    literal: value ? JSON.stringify(value) : 'void 0',
  };
});

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(js|mjs|html)$/.test(entry.name)) yield full;
  }
}

const found = new Set();
for (const file of files(root)) {
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const { name, placeholder, literal } of replacements) {
    if (!text.includes(placeholder)) continue;
    text = text.replaceAll(placeholder, literal);
    found.add(name);
    changed = true;
  }
  if (changed) fs.writeFileSync(file, text);
}

for (const { name, literal } of replacements) {
  const state = literal === 'void 0' ? 'not set' : 'set';
  const where = found.has(name) ? '' : ' (placeholder not found in bundle!)';
  console.log(`[umbrel] ${name}: ${state}${where}`);
}
