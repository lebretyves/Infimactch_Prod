import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const context = await browser.newContext();
  const challenges = [], verifications = [];
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let json = [];
    if (path.endsWith('/auth/me')) json = { id: 'fixture-nurse', email: 'fixture@example.invalid', family: 'NURSE', organizations: [] };
    else if (path.endsWith('/profile')) json = { display_name: 'Camille', qualifications: ['IDE'], details: {} };
    else if (path.endsWith('/auth/csrf')) json = { csrfToken: 'fixture-token' };
    else if (path.endsWith('/me/notifications-settings')) json = { configured: true, link: null, destinations: [], catalog: {}, organizationKinds: [], preferences: [] };
    else if (path.endsWith('/discord/challenge')) { challenges.push(route.request().postDataJSON()); json = {}; }
    else if (path.endsWith('/discord/verify')) { verifications.push(route.request().postDataJSON()); json = {}; }
    return route.fulfill({ status: 200, json });
  });
  const page = await context.newPage();
  await page.goto(base + '/notifications');
  await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  const field = page.getByLabel('Votre identifiant utilisateur Discord');
  await field.waitFor();
  assert.equal(challenges.length, 0, 'Opening page must not send a Discord message');
  const invite=page.getByRole('link', { name: 'Rejoindre le serveur InfiMatch', exact: true });
  assert.match(await invite.getAttribute('href'), /^https:\/\/discord\.gg\/[A-Za-z0-9]+$/);
  assert.equal(await invite.getAttribute('target'), '_blank');
  assert.ok((await invite.getAttribute('rel')).includes('noopener'));
  assert.equal(await page.getByRole('list', { name: 'Associer Discord en trois étapes' }).locator('li').count(), 3);
  assert.equal(await page.locator('a[href="/aide/discord/retrouver-identifiant-discord.pdf"]').count(), 2);
  for(const width of [375,1440]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.ok(await invite.evaluate((e)=>Boolean(e.compareDocumentPosition(document.querySelector('input[inputmode="numeric"]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  }

  assert.equal(await field.getAttribute('inputmode'), 'numeric');
  for (const value of ['camille.test', '1234', '15498759541580 14534']) {
    await field.fill(value);
    await page.getByRole('button', { name: 'Recevoir mon code privé', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '17 à 20 chiffres' }).waitFor();
    assert.equal(challenges.length, 0, 'Malformed ID must not call challenge endpoint');
    assert.equal(await field.getAttribute('aria-invalid'), 'true');
  }
  const id = '1549875954158014534'; // Fictional fixture: never sent outside interception.
  // Insert as pasted text: the input event follows the same controlled-input path.
  await field.fill(''); await field.focus(); await page.keyboard.insertText('  ' + id + '  ');
  assert.equal(await field.inputValue(), id, 'Outer pasted whitespace is removed');
  await page.getByRole('button', { name: 'Recevoir mon code privé', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Code envoyé en message privé Discord' }).waitFor();
  assert.deepEqual(challenges, [{ discordUserId: id }]);
  assert.equal(typeof challenges[0].discordUserId, 'string', 'Snowflake must not lose numeric precision');
  assert.deepEqual(verifications, [], 'Association still requires the separately supplied ownership code');
  await page.getByLabel('Code reçu sur Discord').waitFor();
  console.log('PASS: no automatic messages, numeric keyboard hint, names/short/internal-space IDs rejected without request, pasted outer whitespace trimmed, exact string ID preserved, code verification remains separate. All APIs intercepted; no actual Discord delivery.');
} finally { await browser.close(); }
