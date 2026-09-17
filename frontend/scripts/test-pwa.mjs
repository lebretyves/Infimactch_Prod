import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('Service worker never intercepts writes, external URLs, API, admin or documents', () => {
  const handlers = {}, context = { URL, Response, self: { location: { origin: 'https://app.example' }, addEventListener: (type, fn) => handlers[type] = fn }, caches: {}, fetch: () => { throw new Error('unexpected network'); } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  for (const [method, path, mode] of [['POST', '/missions', 'cors'], ['GET', '/api/v1/me', 'navigate'], ['GET', '/admin', 'navigate'], ['GET', '/documents/file', 'navigate'], ['GET', 'https://external.example/favicon.svg', 'cors'], ['GET', '/favicon.svg?private=1', 'cors']]) {
    let intercepted = false;
    handlers.fetch({ request: { method, url: new URL(path, 'https://app.example').href, mode }, respondWith: () => intercepted = true });
    assert.equal(intercepted, false, path);
  }
});
test('Service worker only activates an update on explicit activation message', () => {
  const handlers = {}; let skipped = 0;
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self: { addEventListener: (type, fn) => handlers[type] = fn, skipWaiting: () => skipped++ } });
  assert.equal(skipped, 0); handlers.message({ data: { type: 'UNKNOWN' } }); assert.equal(skipped, 0);
  handlers.message({ data: { type: 'ACTIVATE_UPDATE' } }); assert.equal(skipped, 1);
});
test('Logout cache purge removes application caches without deleting other applications', async () => {
  const removed = [];
  const oldWindow = globalThis.window, oldCaches = globalThis.caches;
  globalThis.caches = { keys: async () => ['infimatch-static-v1', 'infimatch-old', 'other-app'], delete: async name => removed.push(name) };
  globalThis.window = { caches: globalThis.caches };
  const source = ts.transpileModule(fs.readFileSync('src/lib/pwa.ts', 'utf8').replaceAll('import.meta.env', '({})'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  try { const module = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')); await module.clearAppCaches(); assert.deepEqual(removed, ['infimatch-static-v1', 'infimatch-old']); }
  finally { globalThis.window = oldWindow; globalThis.caches = oldCaches; }
});
