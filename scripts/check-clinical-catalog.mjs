import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run in the unified repository; pass the separate frontend directory for local work.
const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = process.argv[2] ? resolve(process.argv[2]) : resolve(root, 'frontend');
const backend = JSON.parse(readFileSync(resolve(root, 'backend/src/reference-data/clinical-skills.json'), 'utf8'));
const client = JSON.parse(readFileSync(resolve(frontend, 'src/data/clinical-skills.json'), 'utf8'));
assert.deepEqual(client, backend, 'Frontend and API clinical catalogues have drifted');
assert.equal(new Set(backend.skills.map(skill => skill.code)).size, backend.skills.length);
console.log(`PASS: API and frontend share clinical catalogue ${backend.version} (${backend.skills.length} skills).`);
