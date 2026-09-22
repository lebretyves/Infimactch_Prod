import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {});
const password = 'Fixture-only-123';
async function setup({google = false, width = 1280} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}});
  const state = {writes: [], errors: [], account: null, releaseFiness: null};
  await context.addInitScript(() => localStorage.setItem('infimatch:cookie-preferences', JSON.stringify({version: 1, savedAt: new Date().toISOString(), google: false})));
  await context.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api\/v1/, '');
    if (path === '/auth/me') return route.fulfill(state.account ? {json: state.account} : {status: 401, json: {message: 'Unauthorized'}});
    if (path === '/auth/csrf') return route.fulfill({json: {csrfToken: 'fixture-token'}});
    if (path === '/auth/google/registration') return route.fulfill({json: {email: 'google@example.invalid', firstName: 'Camille', lastName: 'Exemple'}});
    if (path.startsWith('/reference-data/finess/')) {
      const finess = path.split('/').at(-1);
      if (finess === '010000024') await new Promise(resolve => {state.releaseFiness = resolve;});
      return route.fulfill({json: {status: 'FOUND_IN_SNAPSHOT', grantsOrganizationAccess: false, generated_at: '2026-09-01', imported_at: '2026-09-01', establishment: {finess, name: 'Structure du répertoire', address: '1 rue fictive', postal_code: '75001', city: 'Paris', latitude: 48.85, longitude: 2.35}}});
    }
    if (path === '/auth/register' || path === '/auth/google/register') {
      const body = request.postDataJSON(); state.writes.push({path, body});
      state.account = {id: 'fixture', email: google ? 'google@example.invalid' : body.email, family: 'ENTERPRISE', organizations: [{kind: body.organizationType, name: body.name, address: body.address, finess: body.finess, siret: body.siret}]};
      return route.fulfill({status: 201, json: {user: {id: 'fixture'}}});
    }
    if (path === '/auth/activity') return route.fulfill({json: {idleExpiresAt: Date.now() + 900000}});
    if (path === '/me/notifications-settings') return route.fulfill({json: {configured: false, link: null, destinations: [], catalog: {}, organizationKinds: [], preferences: []}});
    return route.fulfill({json: []});
  });
  const page = await context.newPage();
  page.on('pageerror', error => state.errors.push(error.message));
  return {context, page, state};
}
async function credentials(page) {
  await page.locator('input[name=email]').fill('fixture@example.invalid');
  await page.locator('input[name=password]').fill(password);
  await page.locator('input[name=password-confirmation]').fill(password);
}
async function referent(page) {
  for (const [name, value] of Object.entries({referentPrenom: 'Camille', referentNom: 'Exemple', referentFonction: 'RH', referentTelephone: '0100000000'})) await page.locator(`input[name=${name}]`).fill(value);
}
try {
  for (const google of [false, true]) {
    const {context, page, state} = await setup({google, width: 390});
    await page.goto(base + '/inscription' + (google ? '?google=1' : ''));
    const submit = page.getByRole('button', {name: 'Continuer mon inscription'});
    await submit.waitFor();
    if (google) {
      await page.getByText('Votre adresse Google est vérifiée', {exact: true}).waitFor();
      assert.equal(await page.locator('input[name=password]').count(), 0);
    } else {
      await submit.click();
      await page.getByRole('alert').filter({hasText: 'Indiquez une adresse e-mail valide.'}).waitFor();
      assert.equal(new URL(page.url()).pathname, '/inscription');
      await credentials(page);
    }
    await submit.click();
    await page.waitForURL('**/inscription/identite');
    await page.getByRole('link', {name: 'Retour', exact: true}).click();
    await page.waitForURL(url => url.pathname === '/inscription');
    await page.getByRole('button', {name: 'Continuer mon inscription'}).waitFor();
    assert.equal(await page.locator('input[name=email]').inputValue(), google ? 'google@example.invalid' : 'fixture@example.invalid');
    assert.equal(state.writes.length, 0);
    assert.deepEqual(state.errors, []);
    console.log('PASS candidate sections and back navigation', {google});
    await context.close();
  }
  for (const google of [false, true]) {
    const {context, page, state} = await setup({google});
    await page.goto(base + '/inscription?espace=agence' + (google ? '&google=1' : ''));
    await page.getByRole('button', {name: 'Créer le compte agence'}).waitFor();
    if (google) await page.getByText('Votre adresse Google est vérifiée', {exact: true}).waitFor();
    else await credentials(page);
    await page.locator('input[name=nomEtablissement]').fill('Agence fictive');
    await page.locator('input[name=adresse]').fill('1 rue fictive');
    await page.locator('input[name=codePostal]').fill('75001');
    await page.locator('input[name=villeEtablissement]').fill('Paris');
    await referent(page);
    await page.getByRole('button', {name: 'Créer le compte agence'}).click();
    await page.getByRole('alert').filter({hasText: "Vous devez accepter les conditions d'utilisation."}).waitFor();
    assert.equal(state.writes.length, 0);
    await page.locator('input[name=cgu]').check();
    await page.getByRole('button', {name: 'Créer le compte agence'}).click();
    await page.waitForURL('**/inscription/confirmation-etablissement');
    assert.equal(state.writes.length, 1);
    const {path, body} = state.writes[0];
    assert.equal(path, google ? '/auth/google/register' : '/auth/register');
    assert.equal(body.organizationType, 'AGENCY');
    assert.equal(body.address, '1 rue fictive 75001 Paris');
    assert.equal(body.referent, 'Camille Exemple RH 0100000000');
    assert.equal('finess' in body, false);
    assert.equal('siret' in body, false);
    assert.equal('password' in body, !google);
    assert.deepEqual(state.errors, []);
    console.log('PASS agency sections, consent and payload', {google});
    await context.close();
  }
  const {context, page, state} = await setup();
  await page.goto(base + '/inscription?espace=etablissement');
  await credentials(page);
  const lookupRequest = page.waitForRequest(request => request.url().endsWith('/reference-data/finess/010000024'));
  await page.locator('input[name=finess]').fill('010000024');
  await page.getByText('Recherche dans le répertoire FINESS…').waitFor();
  await lookupRequest;
  await page.locator('input[name=nomEtablissement]').fill('Nom corrigé manuellement');
  state.releaseFiness();
  await page.getByText('Établissement trouvé', {exact: true}).waitFor();
  assert.equal(await page.locator('input[name=nomEtablissement]').inputValue(), 'Nom corrigé manuellement');
  assert.equal(await page.locator('input[name=adresse]').inputValue(), '1 rue fictive');
  await referent(page);
  await page.locator('input[name=cgu]').check();
  await page.getByRole('button', {name: 'Créer le compte établissement'}).click();
  await page.waitForURL('**/inscription/confirmation-etablissement');
  assert.equal(state.writes[0].body.name, 'Nom corrigé manuellement');
  assert.equal(state.writes[0].body.finess, '010000024');
  assert.deepEqual(state.errors, []);
  console.log('PASS establishment sections retain manual edits during FINESS lookup');
  await context.close();
} finally { await browser.close(); }
