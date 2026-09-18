const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const esbuild = require(require.resolve('esbuild', { paths: [backend] }));
const parent = path.join(backend, '.test-build');
fs.mkdirSync(parent, { recursive: true });
const temporary = fs.mkdtempSync(path.join(parent, 'pdf-font-regression-'));
try {
  const source = "const {createConfirmationPdf}=require('./dist/automation/confirmation-pdf');createConfirmationPdf({assignmentId:'test',missionVersion:1,title:'Mission fictive',qualification:'IDE',address:'Adresse de test',start:'2026-10-12T06:00:00Z',end:'2026-10-12T14:00:00Z',hourlySalary:25}).then(b=>{if(b.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF');console.log('PDF_OK '+b.length)}).catch(e=>{console.error(e);process.exitCode=1});";
  const output = path.join(temporary, 'confirmation.cjs');
  esbuild.buildSync({ stdin: { contents: source, resolveDir: backend }, bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent' });
  fs.writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({ name: 'without-font-imports' }));
  const before = spawnSync(process.execPath, [output], { encoding: 'utf8' });
  assert.notEqual(before.status, 0);
  assert.match(before.stderr, /standard-fonts/);
  const manifest = JSON.parse(fs.readFileSync(path.join(backend, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({ imports: manifest.imports }));
  const after = spawnSync(process.execPath, [output], { encoding: 'utf8' });
  assert.equal(after.status, 0, after.stderr);
  assert.match(after.stdout, /PDF_OK \d+/);
  console.log('PASS: bundled PDF reproduces missing-font error without imports and generates a PDF with production imports.');
} finally {
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), path.resolve(parent));
  assert.ok(path.basename(resolved).startsWith('pdf-font-regression-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
