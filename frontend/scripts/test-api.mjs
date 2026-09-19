import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const folder = await mkdtemp(join(tmpdir(), 'infimatch-api-'));
const source = (
  await readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8')
).replaceAll('import.meta.env', '({})').replaceAll('./messages', './messages.mjs');
await writeFile(join(folder, 'messages.mjs'), ts.transpileModule(await readFile(new URL('../src/services/messages.ts', import.meta.url), 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
await writeFile(
  join(folder, 'api.mjs'),
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText,
);
let serial = 0;
const load = () =>
  import(pathToFileURL(join(folder, 'api.mjs')).href + '?case=' + serial++);
const response = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const original = globalThis.fetch;
globalThis.window = new EventTarget();
test.after(async () => {
  globalThis.fetch = original;
  await rm(folder, { recursive: true, force: true });
});
test('Writes use cookie credentials, CSRF and the provided idempotency key', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/auth/csrf')
      ? response(200, { csrfToken: 'csrf-test' })
      : response(200, { ok: true });
  };
  const { api } = await load();
  await api('/missions/example/applications', {
    method: 'POST',
    body: { version: 3 },
    key: 'action-test',
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'csrf-test');
  assert.equal(calls[1].options.headers['Idempotency-Key'], 'action-test');
  assert.equal(calls[1].options.headers.Authorization, undefined);
});
test('Only an explicit CSRF rejection retries a command and keeps the same key', async () => {
  const keys = [];
  let mutations = 0;
  globalThis.fetch = async (url, o) => {
    if (url.endsWith('/auth/csrf'))
      return response(200, { csrfToken: 'refreshed' });
    keys.push(o.headers['Idempotency-Key']);
    return ++mutations === 1
      ? response(403, { code: 'CSRF_INVALID' })
      : response(200, { ok: true });
  };
  const { api, acceptCsrf } = await load();
  acceptCsrf('stale');
  await api('/write', { method: 'POST', key: 'same-action' });
  assert.deepEqual(keys, ['same-action', 'same-action']);
});
test('A network failure never becomes mock success or silently repeats a mutation', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new TypeError('offline');
  };
  const { api, acceptCsrf } = await load();
  acceptCsrf('valid');
  await assert.rejects(
    api('/write', { method: 'POST', key: 'retry-later' }),
    (e) => e.code === 'NETWORK',
  );
  assert.equal(calls, 1);
});
test('A server eligibility rejection remains a failure with reasons', async () => {
  globalThis.fetch = async () =>
    response(409, { code: 'INELIGIBLE', fields: ['RPPS_NOT_CHECKED'] });
  const { api, acceptCsrf } = await load();
  acceptCsrf('valid');
  await assert.rejects(
    api('/write', { method: 'POST' }),
    (e) => e.code === 'INELIGIBLE' && e.fields[0] === 'RPPS_NOT_CHECKED',
  );
});
test('An expired session notifies the application and never restores browser-stored identity', async () => {
  let expired = 0;
  window.addEventListener('infimatch:session-expired', () => expired++, {
    once: true,
  });
  globalThis.fetch = async () => response(401, { message: 'Unauthorized' });
  const { api } = await load();
  await assert.rejects(api('/auth/me'), (e) => e.status === 401);
  assert.equal(expired, 1);
});

test('An aborted stale unauthorized response cannot expire a newer session', async () => {
  const controller = new AbortController();
  let expired = 0;
  const listener = () => expired++;
  window.addEventListener('infimatch:session-expired', listener);
  try {
    globalThis.fetch = async () => {
      controller.abort();
      return response(401, { message: 'Old response' });
    };
    const { api } = await load();
    await assert.rejects(
      api('/auth/me', { signal: controller.signal }),
      (e) => e.name === 'AbortError',
    );
    assert.equal(expired, 0);
  } finally {
    window.removeEventListener('infimatch:session-expired', listener);
  }
});
test('Failure to prepare CSRF reports a network error without submitting registration', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    throw new TypeError('offline');
  };
  const { api } = await load();
  await assert.rejects(
    api('/auth/register', { method: 'POST', body: {} }),
    (e) => e.code === 'NETWORK',
  );
  assert.deepEqual(calls, ['/api/v1/auth/csrf']);
});

test('Google failures explain the association error without expiring another session', async () => {
  let expired = 0;
  const listener = () => expired++;
  window.addEventListener('infimatch:session-expired', listener);
  try {
    for (const [code, expected] of [
      ['GOOGLE_PASSWORD_INVALID', /mot de passe InfiMatch est incorrect/],
      ['GOOGLE_TOKEN_INVALID', /invalide ou expirée/],
      ['GOOGLE_CHALLENGE_EXPIRED', /demande de connexion Google a expiré/],
    ]) {
      globalThis.fetch = async () => response(401, {code, message:'Internal diagnostic should not leak'});
      const {api, acceptCsrf} = await load();
      acceptCsrf('valid');
      await assert.rejects(api('/auth/google', {method:'POST', body:{credential:'test'}}), e => e.code===code && expected.test(e.message));
    }
    assert.equal(expired,0);
  } finally { window.removeEventListener('infimatch:session-expired',listener); }
});

test('Google missing account directs the user to registration', async () => {
  globalThis.fetch = async () => response(409, {code:'GOOGLE_ACCOUNT_REQUIRED'});
  const {api,acceptCsrf} = await load(); acceptCsrf('valid');
  await assert.rejects(api('/auth/google',{method:'POST'}),e=>e.code==='GOOGLE_ACCOUNT_REQUIRED' && /Créez un compte/.test(e.message));
});


test('Google registration expiration preserves the current authentication state', async () => {
 let expired = 0; const listener = () => expired++;
 window.addEventListener('infimatch:session-expired', listener);
 try {
  for (const path of ['/auth/google/registration', '/auth/google/register']) {
   globalThis.fetch = async () => response(401, {code:'GOOGLE_REGISTRATION_EXPIRED'});
   const {api,acceptCsrf}=await load();acceptCsrf('valid');
   await assert.rejects(api(path,path.endsWith('/register')?{method:'POST',body:{}}:{}),e=>e.code==='GOOGLE_REGISTRATION_EXPIRED'&&/brouillon/.test(e.message));
  }
  assert.equal(expired,0);
 } finally {window.removeEventListener('infimatch:session-expired',listener);}
});

test('An offline mutation is refused before CSRF or any network request', async () => {
  let calls = 0;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  globalThis.fetch = async () => { calls++; throw new Error('must not fetch'); };
  try { const { api } = await load(); await assert.rejects(api('/missions', { method: 'POST', body: {} }), e => e.code === 'OFFLINE'); assert.equal(calls, 0); }
  finally { delete navigator.onLine; globalThis.fetch = original; }
});

test('429 uses Retry-After without replaying a mutation', async () => {
  let writes = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith('/auth/csrf')) return response(200, { csrfToken: 'fixture' });
    writes++;
    return new Response('{}', { status: 429, headers: { 'Retry-After': '90', 'Content-Type': 'application/json' } });
  };
  const { api } = await load();
  await assert.rejects(api('/auth/login', { method: 'POST', body: {} }), e => e.status === 429 && /environ 2 minutes/.test(e.message));
  assert.equal(writes, 1);
});

test('Rate-limit durations handle seconds, HTTP dates and invalid headers', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-09-19T12:00:00Z'));
  const { formatRateLimitMessage: format } = await load();
  assert.match(format('1'), /1 seconde\./);
  assert.match(format('59'), /59 secondes/);
  assert.match(format('60'), /environ 1 minute\./);
  assert.match(format('Sat, 19 Sep 2026 12:01:30 GMT'), /environ 2 minutes/);
  assert.match(format('Sat, 19 Sep 2026 11:00:00 GMT'), /1 seconde\./);
  for (const value of [null, '', '  ', '-1', '1e3', '1.5', 'invalid', 'Infinity']) {
    assert.match(format(value), /quelques minutes/);
  }
});
