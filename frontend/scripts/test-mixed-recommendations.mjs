import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const internal = { id: 'm_11111111-1111-4111-8111-111111111111', title: 'Mission fictive — service de médecine', qualification: 'IDE', service: 'MEDICINE', address: 'Paris, établissement fictif', start_at: '2030-09-20T06:00:00Z', end_at: '2030-09-20T18:00:00Z', hourly_salary: 28, matching_score: 87, match_explanation_id: 'explanation-fixture', publicationDate: '2030-09-17T10:00:00Z', importedAt: null };
const external = { id: 'e_22222222-2222-4222-8222-222222222222', title: 'Annonce fictive — infirmier de jour', qualification: 'IDE', location_label: 'Lyon', source: 'FRANCE_TRAVAIL', url: 'https://example.com/fictional-offer', publicationDate: null, importedAt: '2030-09-18T10:00:00Z', sourceUpdatedAt: '2030-09-18T09:00:00Z', profileCorrespondence: { knownMismatches: ['qualification'] }, provenance: { contract: 'INTERIM_CONTEXT_CONFIRMED' } };
const mixed = () => ({ mode: 'MIXED', generatedAt: '2030-09-18T11:00:00Z', internal: { status: 'READY', rppsStatus: 'FOUND', items: [internal] }, external: { status: 'READY', personalization: 'PARTIAL', items: [external], sources: [{ provider: 'FRANCE_TRAVAIL', status: 'SUCCESS', created_at: '2030-09-18T10:00:00Z' }] } });
try {
  const context = await browser.newContext(); let state = mixed(), fail = false, saved = [], writes = [];
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname; let json = [];
    if (path.endsWith('/auth/me')) json = { id: 'fictional-nurse', email: 'fixture@example.invalid', family: 'NURSE', organizations: [] };
    else if (path.endsWith('/profile')) json = { display_name: 'Camille', qualifications: ['IDE'], available: [], details: {} };
    else if (path.endsWith('/dashboards')) json = { family: 'NURSE', counts: {} };
    else if (path.endsWith('/me/recommendations')) return route.fulfill({ status: fail ? 503 : 200, json: fail ? { message: 'Fixture unavailable' } : state });
    else if (path.endsWith('/auth/csrf')) json = { csrfToken: 'fixture' };
    else if (path.endsWith('/me/notification-preferences')) json = { enabled: false };
    else if (path.endsWith('/me/favorites')) {
      if (route.request().method() === 'POST') { const body = route.request().postDataJSON(); writes.push(body); saved.push({ kind: body.kind, target_id: body.targetId, title: external.title }); json = {}; }
      else json = saved;
    }
    return route.fulfill({ status: 200, json });
  });
  const page = await context.newPage(); await page.goto(base + '/accueil'); await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  await page.getByRole('heading', { name: 'Missions compatibles', exact: true }).waitFor(); await page.getByRole('heading', { name: 'Offres externes à explorer', exact: true }).waitFor();
  assert.ok((await page.getByRole('link', { name: 'Voir la mission et sa compatibilité' }).getAttribute('href')).endsWith('?correspondance=explanation-fixture'));
  assert.equal(await page.getByRole('link', { name: 'Voir l’offre externe', exact: true }).getAttribute('href'), '/missions/' + external.id);
  await page.getByText('Date de publication non renseignée', { exact: false }).waitFor(); await page.getByText('Rémunération non renseignée — voir la source').waitFor();
  await page.getByRole('button', { name: 'Ajouter ' + external.title + ' aux favoris', exact: true }).click(); await page.getByRole('button', { name: 'Retirer ' + external.title + ' des favoris', exact: true }).waitFor(); assert.deepEqual(writes, [{ kind: 'EXTERNAL', targetId: external.id.slice(2) }]);
  await page.getByText('Intérim', { exact: true }).waitFor();
  await page.getByText('Critères en écart', { exact: false }).waitFor();
  await page.getByText('Mise à jour par la source le', { exact: false }).waitFor();
  assert.equal(await page.getByText('INTERIM_CONTEXT_CONFIRMED', { exact: true }).count(), 0);
  assert.notEqual(await page.getByRole('button', { name: 'Retirer ' + external.title + ' des favoris', exact: true }).evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
  fs.mkdirSync('../InfiMatch/docs/quality', { recursive: true });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `overflow ${width}`);
    await page.screenshot({ path: `../InfiMatch/docs/quality/mixed-${width}.png`, fullPage: true });
  }
  state = mixed(); state.internal.items = []; await page.reload(); await page.getByText('Aucune mission compatible pour le moment.', { exact: false }).waitFor(); await page.getByRole('link', { name: 'Voir l’offre externe', exact: true }).waitFor();
  state.external.personalization = 'GENERAL_PROFILE_INCOMPLETE'; await page.reload(); await page.getByText('ces offres générales ne sont pas', { exact: false }).waitFor();
  state.internal.status = 'UNAVAILABLE'; state.external.sources[0].status = 'FAILED'; await page.reload(); await page.getByText('La recherche de missions compatibles est temporairement indisponible.').waitFor(); await page.getByText('La dernière actualisation', { exact: false }).waitFor(); await page.getByRole('heading', { name: 'Votre prochaine mission' }).waitFor(); await page.getByRole('link', { name: 'Voir l’offre externe', exact: true }).waitFor();
  fail = true; await page.reload(); await page.getByRole('button', { name: 'Réessayer les suggestions' }).waitFor(); await page.getByRole('heading', { name: 'Votre prochaine mission' }).waitFor();
  fail = false; state = mixed(); await page.getByRole('button', { name: 'Réessayer les suggestions' }).click(); await page.getByRole('link', { name: 'Voir la mission et sa compatibilité' }).waitFor();
  console.log('PASS mixed groups, empty/internal retained external, incomplete/general, partial/source failure, complete retry isolated from dashboard, missing dates/salary, detail links, external favorites, 375/768/1440 no overflow.');
} finally { await browser.close(); }
