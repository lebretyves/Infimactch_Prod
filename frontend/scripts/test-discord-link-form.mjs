import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const context = await browser.newContext();
  const challenges = [], verifications = [];
  let linked=false;
  const failure="Impossible d’envoyer le code. Rejoignez le serveur du bot et autorisez ses messages privés, puis vérifiez votre identifiant Discord.";
  const rateLimit="Trois codes maximum par heure. Réessayez plus tard.";
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let json = [];
    if (path.endsWith('/auth/me')) json = { id: 'fixture-nurse', email: 'fixture@example.invalid', family: 'NURSE', organizations: [] };
    else if (path.endsWith('/profile')) json = { display_name: 'Camille', qualifications: ['IDE'], details: {} };
    else if (path.endsWith('/auth/csrf')) json = { csrfToken: 'fixture-token' };
    else if (path.endsWith('/me/notifications-settings')) json = { configured: true, link: linked ? { discord_user_id: '1549875954158014534' } : null, destinations: [], catalog: {}, organizationKinds: [], preferences: [] };
    else if (path.endsWith('/discord/challenge')) { challenges.push(route.request().postDataJSON());
      if(challenges.length<=2) return route.fulfill({status:400,json:{statusCode:400,message:challenges.length===1?failure:rateLimit,error:'Bad Request'}});
      if(challenges.length===3) return route.abort('failed');
      await new Promise(resolve=>setTimeout(resolve,600)); json = {}; }
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
  const localForm=field.locator('xpath=ancestor::form');
  for(const expected of [failure,rateLimit,'Serveur indisponible.']) {
    await localForm.getByRole('alert').filter({hasText:expected}).waitFor();
    assert.equal(await page.getByRole('status').filter({hasText:'Code envoyé'}).count(),0);
    assert.equal(await localForm.getByRole('link').getAttribute('href'),'https://discord.gg/Ed73jG3pRd');
    for(const width of [375,1440]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
    await page.getByRole('button', {name:'Recevoir mon code privé',exact:true}).click();
  }
  assert.equal(await page.getByRole('button',{name:'Envoi du code en cours…',exact:true}).isDisabled(),true);
  await localForm.evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await page.getByRole('status').filter({ hasText: 'Code envoyé en message privé Discord' }).waitFor();
  assert.equal(await localForm.getByRole('alert').count(),0);

  assert.deepEqual(challenges, Array.from({length:4},()=>({discordUserId:id})));
  assert.equal(typeof challenges[0].discordUserId, 'string', 'Snowflake must not lose numeric precision');
  assert.deepEqual(verifications, [], 'Association still requires the separately supplied ownership code');
  await page.getByLabel('Code reçu sur Discord').waitFor();
  linked=true; await page.reload();
  await page.getByText('Compte Discord associé :', {exact:false}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Rejoindre le serveur InfiMatch',exact:true}).getAttribute('href'),'https://discord.gg/Ed73jG3pRd');
  console.log('PASS scoped actual HTTP400 send/rate errors, network failure, no false success, sending disabled/repeat guard, retry success, linked-account join, 375/1440.');
  console.log('PASS: no automatic messages, numeric keyboard hint, names/short/internal-space IDs rejected without request, pasted outer whitespace trimmed, exact string ID preserved, code verification remains separate. All APIs intercepted; no actual Discord delivery.');
} finally { await browser.close(); }
