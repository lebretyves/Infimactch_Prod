import { chromium } from 'playwright';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: process.env.E2E_HEADLESS === '1',
  executablePath:
    process.env.E2E_BROWSER_EXECUTABLE ||
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const password = 'Fictional-only-password-123';
const email = 'signup-regression-' + randomUUID() + '@example.invalid';
const checks = [];
async function step(page, path) {
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => u.pathname === path);
}
async function candidate(page, address, { navigation = false } = {}) {
  await page.goto(base + '/inscription');
  await page.locator('input[name=email]').fill(address);
  await page.locator('input[name=password]').fill(password);
  await page.locator('input[name=password-confirmation]').fill(password);
  await step(page, '/inscription/identite');
  if (navigation) {
    await page.locator('button[type=submit]').click();
    assert.equal(new URL(page.url()).pathname, '/inscription/identite');
    assert.ok(await page.locator('input:invalid').count());
    checks.push('required_fields_block_empty_steps');
  }
  await page.getByLabel(/^Prénom/).fill('Test');
  await page.getByLabel(/^Nom/).fill('Inscription');
  await page.getByLabel(/^Date de naissance/).fill('1990-01-01');
  await page.getByLabel(/^Téléphone/).fill('0600000000');
  if (navigation) {
    await page.getByRole('link', { name: 'Retour', exact: true }).click();
    await page.waitForURL('**/inscription');
    assert.equal(await page.locator('input[name=email]').inputValue(), address);
    assert.equal(
      await page.locator('input[name=password]').inputValue(),
      password,
    );
    await step(page, '/inscription/identite');
    assert.equal(await page.getByLabel(/^Prénom/).inputValue(), 'Test');
    checks.push('back_to_first_step_preserves_draft');
  }
  await step(page, '/inscription/localisation');
  assert.equal(await page.getByLabel(/^Adresse/).getAttribute('required'), null);
  assert.equal(await page.getByLabel(/^Code postal/).getAttribute('required'), null);
  assert.equal(await page.getByLabel(/^Ville/).getAttribute('required'), null);
  checks.push('signup_without_residence_address_or_gps');
  await step(page, '/inscription/qualification');
  await page.getByRole('checkbox', {name:/^IDE —/}).check();
  await page.getByLabel(/^Année d’obtention du diplôme IDE/).fill('2015');
  await page.getByLabel(/^Numéro RPPS/).fill('10000000001');
  await step(page, '/inscription/mobilite');
  await step(page, '/inscription/disponibilites');
  await step(page, '/inscription/consentements');
  if (navigation) {
    await page.getByRole('link', { name: 'Retour', exact: true }).click();
    await page.waitForURL('**/inscription/disponibilites');
    await step(page, '/inscription/consentements');
    checks.push('consent_back_returns_to_availability');
  }
}
async function consent(page) {
  await page.getByRole('checkbox').first().waitFor();
  assert.equal(await page.getByRole('checkbox').count(), 1);
  for (const checkbox of await page.getByRole('checkbox').all())
    await checkbox.check();
  assert.equal(await page.locator('input[type=checkbox]:checked').count(), 1);
}
async function login(page, address) {
  await page.goto(base + '/connexion');
  await page.locator('input[name=email]').fill(address);
  await page.locator('input[name=password]').fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/accueil');
  await page.getByRole('heading', { name: 'Mon activité' }).waitFor();
}
async function scenario(name, fn, init) {
  const context = await browser.newContext();
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await fn(page, context);
    assert.deepEqual(errors, []);
    console.log('PASS ' + name);
  } catch (e) {
    console.error('FAIL ' + name + ' ' + new URL(page.url()).pathname);
    console.error('Alerts:', await page.getByRole('alert').allTextContents());
    throw e;
  } finally {
    await context.close();
  }
}
try {
  await scenario('Candidate signup, navigation and reload', async (page) => {
    await candidate(page, email, { navigation: true });
    await page
      .getByRole('link', { name: 'conditions générales d’utilisation' })
      .click();
    await page.waitForURL('**/mentions-legales');
    await page.getByRole('link', { name: 'Revenir à mon inscription' }).click();
    await page.waitForURL('**/inscription/consentements');
    assert.equal(await page.locator('input[name=password]').count(), 0);
    checks.push('terms_round_trip_preserves_credentials_in_memory');
    await page.reload();
    await page.getByLabel(/^Mot de passe de votre compte/).waitFor();
    const draft = await page.evaluate(() =>
      JSON.parse(
        sessionStorage.getItem('infimatch:inscription-draft-v1') || '{}',
      ),
    );
    assert.equal(draft.version, 2);
    assert.equal(draft.data.email, email);
    assert.equal(draft.data.prenom, 'Test');
    for (const key of ['motDePasse', 'iban', 'bic', 'titulaireCompte'])
      assert.equal(key in draft.data, false);
    assert.equal(await page.locator('input[name=password]').inputValue(), '');
    await page.locator('input[name=password]').fill(password);
    await consent(page);
    await step(page, '/inscription/confirmation');
    await page
      .getByRole('heading', { name: /^(Votre compte est créé|Compte créé)$/ })
      .waitFor();
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem('infimatch:inscription-draft-v1'),
      ),
      null,
    );
    await page.reload();
    await page
      .getByRole('heading', { name: /^(Votre compte est créé|Compte créé)$/ })
      .waitFor();
    checks.push(
      'reload_preserves_draft_without_password',
      'real_candidate_created_and_session_survives_reload',
      'draft_cleared_after_success',
    );
  });
  await scenario(
    'Network failure and duplicate account preserve the form',
    async (page) => {
      await candidate(page, email);
      await consent(page);
      await page.route('**/api/v1/auth/register', (route) =>
        route.abort('failed'),
      );
      await page
        .getByRole('button', { name: 'Créer mon compte', exact: true })
        .click();
      await page.getByRole('alert').waitFor();
      assert.equal(new URL(page.url()).pathname, '/inscription/consentements');
      assert.match(await page.getByRole('alert').innerText(), /indisponible/i);
      assert.equal(
        await page
          .getByRole('button', { name: 'Créer mon compte', exact: true })
          .isEnabled(),
        true,
      );
      await page.unroute('**/api/v1/auth/register');
      const response = page.waitForResponse((r) =>
        r.url().endsWith('/auth/register'),
      );
      await page
        .getByRole('button', { name: 'Créer mon compte', exact: true })
        .click();
      assert.equal((await response).status(), 400);
      await page
        .getByText(/Inscription impossible avec ces informations/)
        .waitFor();
      assert.equal(new URL(page.url()).pathname, '/inscription/consentements');
      checks.push(
        'network_failure_preserves_form',
        'duplicate_account_error_preserves_form',
      );
    },
  );
  await scenario(
    'Created account survives a failed session lookup',
    async (page) => {
      const address = 'signup-session-' + randomUUID() + '@example.invalid';
      let submitted = false,
        count = 0;
      await page.route('**/api/v1/auth/register', (route) => {
        submitted = true;
        count++;
        return route.continue();
      });
      await page.route('**/api/v1/auth/me', (route) =>
        submitted
          ? route.fulfill({
              status: 503,
              contentType: 'application/json',
              body: JSON.stringify({
                message: 'Session temporarily unavailable',
              }),
            })
          : route.continue(),
      );
      await candidate(page, address);
      await consent(page);
      await page
        .getByRole('button', { name: 'Créer mon compte', exact: true })
        .click();
      await page
        .getByRole('heading', { name: /^(Votre compte est créé|Compte créé)$/ })
        .waitFor();
      assert.match(await page.getByRole('alert').innerText(), /session/);
      assert.equal(count, 1);
      assert.equal(
        await page
          .getByRole('button', { name: 'Créer mon compte', exact: true })
          .count(),
        0,
      );
      await page.unroute('**/api/v1/auth/me');
      await login(page, address);
      checks.push(
        'created_account_is_not_registered_twice_after_session_failure',
      );
    },
  );
  await scenario(
    'A late initial session response cannot undo a successful login',
    async (page) => {
      let release, ready, done;
      const gate = new Promise((r) => (release = r)),
        started = new Promise((r) => (ready = r)),
        finished = new Promise((r) => (done = r));
      let held = false;
      await page.route('**/api/v1/auth/me', async (route) => {
        if (!held) {
          held = true;
          ready();
          await gate;
          await route
            .fulfill({
              status: 401,
              contentType: 'application/json',
              body: '{}',
            })
            .catch(() => {});
          done();
        } else await route.continue();
      });
      await page.goto(base + '/connexion');
      await started;
      await page.locator('input[name=email]').fill(email);
      await page.locator('input[name=password]').fill(password);
      await page.locator('button[type=submit]').click();
      await page.waitForURL('**/accueil');
      release();
      await finished;
      await page.getByRole('heading', { name: 'Mon activité' }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/accueil');
      checks.push('late_unauthenticated_response_cannot_replace_new_session');
    },
  );
  await scenario(
    'Unavailable storage does not crash the form',
    async (page) => {
      await candidate(page, email);
      await consent(page);
      await page.route('**/api/v1/auth/register', (route) =>
        route.abort('failed'),
      );
      await page
        .getByRole('button', { name: 'Créer mon compte', exact: true })
        .click();
      await page.getByRole('alert').waitFor();
      assert.equal(new URL(page.url()).pathname, '/inscription/consentements');
      checks.push('unavailable_browser_storage_keeps_registration_usable');
    },
    () => {
      for (const method of ['getItem', 'setItem', 'removeItem'])
        Storage.prototype[method] = () => {
          throw new DOMException('Storage blocked', 'SecurityError');
        };
    },
  );
  await scenario(
    'Missing confirmation session is explained without a redirect',
    async (page) => {
      await page.goto(base + '/inscription/confirmation');
      await page.getByRole('alert').waitFor();
      assert.equal(new URL(page.url()).pathname, '/inscription/confirmation');
      await page
        .getByRole('link', { name: 'Me connecter', exact: true })
        .waitFor();
      checks.push('missing_confirmation_session_never_silently_redirects');
    },
  );
  await mkdir('docs/proofs', { recursive: true });
  await writeFile(
    'docs/proofs/signup-regression.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        scope:
          'Local API; fictional candidate accounts. Deliberate browser request failures cover recovery. No external email or RPPS verification.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
