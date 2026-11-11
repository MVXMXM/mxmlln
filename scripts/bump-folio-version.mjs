import { readFileSync, writeFileSync } from 'node:fs';

// The last number counts pushes to main. The year and the point release stay as written.
const path = new URL('../folio-version.json', import.meta.url);
const folio = JSON.parse(readFileSync(path, 'utf8'));
const parts = String(folio.version).split('.').map(Number);

if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
  throw new Error(`folio version must be YY.N.N, got ${folio.version}`);
}

const [major, minor, patch] = parts;
folio.version = `${major}.${minor}.${patch + 1}`;
writeFileSync(path, `${JSON.stringify(folio, null, 2)}\n`);
