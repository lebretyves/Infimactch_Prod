// Isolated UI contract test. These fixtures never reach a production service.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('dist-admin');
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + (req.url === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) throw Error('path');
    const data = await readFile(path); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream'); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let activations = 0; let authenticated = false; let fresh = false; let mutations = 0;
  const user = { id: 'fixture-admin', email: 'admin@example.invalid', role: 'SUPPORT', permissions: ['overview', 'accounts', 'accounts:write', 'organizations', 'missions', 'quality'], confirmedAt: new Date().toISOString() };
  await page.route('**/api/v1/admin/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1/admin', ''); let status = 200; let body = {};
    if (path === '/me') { status = authenticated ? 200 : 401; body = authenticated ? user : {}; }
    else if (path === '/csrf') body = { csrfToken: 'isolated-fixture-csrf' };
    else if (path === '/activate') { activations++; const payload = route.request().postDataJSON(); assert.equal(payload.invitation, 'fixture-private-invitation'); assert.equal(payload.password, 'fixture-password-123'); assert.equal('passwordConfirmation' in payload, false); authenticated=true; body = {status:'AUTHENTICATED',csrfToken:'isolated-fixture-csrf'}; }
    else if (path === '/login') { authenticated=true;body = { status: 'AUTHENTICATED', csrfToken: 'isolated-fixture-csrf' }; }
    else if (path === '/overview') body = { observedAt: new Date().toISOString(), counts: { accounts: 1, organizations: 0, applications: 0, pendingEvents: 0, failedEvents: 0, documents: 0, missions: { OPEN: 0 } }, alerts: [{kind: 'backup', message: 'Fixture backup status', href: '/backups'}] };
    else if (path === '/executions') body = {items: [{id: 'fixture-run', state: 'completed', checked_at: '2026-09-17T10:00:00Z', execution_id: 'fixture-execution', workflow_id: 'fixture/unsafe?fragment', action: 'confirmation', duration_ms: 125}], total: 1, limit: 20, offset: 0};
    else if(path.endsWith('/notifications'))body={connection:{state:'NOT_ASSOCIATED'},personal:{state:'NOT_ASSOCIATED'},internal:{total:0,unread:0},deliveries:{counts:{},recent:[]},organizations:[],catalog:{}};
    else if (path === '/accounts') body = { items: [{ id: 'fixture-account', email: 'client@example.invalid', family: 'NURSE', active: true }], total: 1, limit: 20, offset: 0 };
    else if (path === '/accounts/fixture-account/verification') body = {directory: {status:'FOUND'}, professionalIdentity:null, reviews:[]};
    else if (path === '/accounts/fixture-account') body = { account: { id: 'fixture-account', email: 'client@example.invalid', active: true, family:'NURSE' }, organizations: [{name: 'Organisation fictive', kind: 'ESTABLISHMENT', active: true}], profile: {display_name: 'Profil fictif', qualifications: ['IDE', 'IADE'], rpps_status: 'FOUND', rpps_checked_at: '2026-09-17T10:00:00Z'}, documents: [], audit: [{event: 'FIXTURE_AUDIT', created_at: '2026-09-17T10:00:00Z'}] };
    else if (path === '/accounts/fixture-account/state') { assert.equal(route.request().headers()['x-csrf-token'], 'isolated-fixture-csrf'); if (!fresh) { status = 403; body = { code: 'ADMIN_REAUTH_REQUIRED' }; } else { mutations++; body = { ok: true }; } }
    else if (path === '/reauth') {assert.deepEqual(route.request().postDataJSON(), {password:'test-only-password'});fresh = true;}
    else if (path === '/logout') authenticated = false;
    else throw new Error(`Unexpected fixture endpoint: ${path}`);
    await route.fulfill({ status, json: body });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole('button', {name:'Activer mon accès administrateur',exact:true}).click();
  await page.getByLabel('Adresse e-mail',{exact:true}).fill('admin@example.invalid');
  await page.getByLabel('Nouveau mot de passe (12 caractères minimum)',{exact:true}).fill('fixture-password-123');
  await page.getByLabel('Confirmer le nouveau mot de passe',{exact:true}).fill('fixture-mismatch-123');
  await page.getByLabel('Code d’invitation administrateur',{exact:true}).fill('fixture-private-invitation');
  await page.getByRole('button',{name:'Activer mon accès',exact:true}).click();
  await page.getByText('Les deux mots de passe doivent être identiques.').waitFor();
  assert.equal(activations,0,'Mismatched confirmation never calls activation');
  await page.getByLabel('Confirmer le nouveau mot de passe',{exact:true}).fill('fixture-password-123');
  await page.getByRole('button',{name:'Activer mon accès',exact:true}).click();
  await page.getByRole('heading',{name:'Vue d’ensemble',exact:true}).waitFor();
  assert.equal(activations,1);
  assert.equal(page.url().includes('fixture-private-invitation'),false);
  assert.equal(page.url().includes('fixture-password'),false);
  await page.getByRole('heading',{name:'Vue d’ensemble',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Lien de configuration',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Se déconnecter'}).click();
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('admin@example.invalid');
  await page.getByLabel('Mot de passe', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Vue d’ensemble', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Accès administrateurs' }).count(), 0);
  assert.equal(await page.locator('a[href*="jobs"],a[href*="backups"]').count(), 0, 'Overview destinations obey SUPPORT permissions');
  await page.getByRole('link', { name: 'Comptes et dossiers', exact: true }).click();
  await page.getByRole('link', { name: 'Consulter →', exact: true }).click();
  await page.getByText('IDE, IADE', { exact: true }).waitFor();
  await page.getByRole('columnheader', { name: 'Rattachement actif' }).waitFor();
  assert.equal(await page.getByText('?v?nement', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Suspendre', exact: true }).click();
  assert.equal(await page.getByLabel('Justification (journalisée)').getAttribute('maxlength'), '500');
  await page.getByLabel('Justification (journalisée)').fill('Test isolé de confirmation motivée');
  await page.getByRole('button', { name: 'Confirmer l’opération' }).click();
  await page.getByLabel('Confirmer votre mot de passe').fill('test-only-password');
  await page.getByRole('button', { name: 'Confirmer mon mot de passe' }).click();
  assert.equal(mutations, 0, 'No automatic mutation after reauthentication');
  await page.getByRole('button', { name: 'Confirmer l’opération' }).click();
  await page.getByText('Opération enregistrée. Les données ont été actualisées.').waitFor();
  assert.equal(mutations, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No mobile page overflow');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.getByRole('heading', { name: 'Connexion sécurisée' }).waitFor();
  authenticated = true; user.role = 'OPS'; user.permissions = ['overview', 'jobs'];
  await page.reload();
  await page.getByRole('link', { name: 'Exécutions', exact: true }).click();
  await page.getByText('fixture-execution', {exact: true}).waitFor();
  assert.equal(await page.getByRole('link', {name: 'Voir le workflow n8n (nouvel onglet)'}).getAttribute('href'), 'https://infimatch.app.n8n.cloud/workflow/fixture%2Funsafe%3Ffragment');
  assert.deepEqual(errors, []);
  console.log('PASS isolated admin UI: password-only activation/login, role navigation, reason, CSRF, explicit reauth retry, mobile, logout. Backend authentication not tested by this fixture.');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
