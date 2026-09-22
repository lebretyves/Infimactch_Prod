import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 900}});
    const errors = [], searches = [];
    await context.addInitScript(() => localStorage.setItem('infimatch:cookie-preferences', JSON.stringify({version: 1, savedAt: new Date().toISOString(), google: false})));
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname.replace(/^\/api\/v1/, '');
      let json = [];
      if (path === '/auth/me') json = {id: 'search-fixture', email: 'search@example.invalid', family: 'NURSE', organizations: []};
      else if (path === '/auth/csrf') json = {csrfToken: 'search-fixture-token'};
      else if (path === '/profile') json = {display_name: 'Profil fictif', qualifications: ['IDE','IADE'], details: {}, available: []};
      else if (path === '/reference-data') json = {ideServices: ['URGENCES'], blockSpecialties: []};
      else if (path === '/matching/rules') json = {weights: {C: .45, Z: .25, D: .2, E: .1}};
      else if (path === '/auth/activity') json = {idleExpiresAt: Date.now() + 900000};
      else if (path === '/listings/search') {
        assert.equal(route.request().method(), 'POST');
        const params = route.request().postDataJSON(); searches.push(params);
        const offset = Number(params.offset || 0), total = params.q === 'introuvable' ? 0 : 41;
        json = {total, offset, limit: 20, items: Array.from({length: Math.max(0, Math.min(20, total - offset))}, (_, index) => ({id: 'm_10000000-0000-4000-8000-' + String(offset + index + 1).padStart(12, '0'), title: 'Mission fictive ' + (offset + index + 1), qualification: 'IDE', service: 'URGENCES', address: 'Paris', start_at: '2030-09-20T06:00:00Z', end_at: '2030-09-20T14:00:00Z', hourly_salary: 28, matching_score: 80, match_explanation_id: 'fixture'}))};
      }
      return route.fulfill({json});
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/missions?zone=1&origine=partenaires');
    await page.getByRole('heading', {name: '41 offres disponibles', exact: true}).waitFor();
    const pagination = page.getByRole('navigation', {name: 'Pagination des offres'});
    assert.equal(await pagination.getByRole('button', {name: 'Précédent'}).isDisabled(), true);
    await pagination.getByRole('button', {name: 'Suivant'}).click();
    await page.waitForURL(url => url.searchParams.get('page') === '2');
    await page.getByText('21–40 sur 41 · Page 2 sur 3', {exact: true}).waitFor();
    assert.equal(searches.at(-1).offset, 20);
    assert.equal(await pagination.getByRole('button', {name: 'Page 2', exact: true}).getAttribute('aria-current'), 'page');
    await page.goBack();
    await page.getByText('1–20 sur 41 · Page 1 sur 3', {exact: true}).waitFor();
    const search = page.getByRole('search', {name: 'Rechercher une offre'});
    await search.getByLabel('Quel poste ?', {exact: true}).fill('introuvable');
    await search.getByRole('button', {name: 'Rechercher', exact: true}).click();
    await page.getByRole('heading', {name: 'Aucune offre pour ces critères'}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('q'), 'introuvable');
    assert.equal(new URL(page.url()).searchParams.get('origine'), 'partenaires');
    assert.equal(await pagination.count(), 0);
    assert.equal(searches.at(-1).offset, 0);
    await page.getByRole('button', {name: 'Effacer les filtres', exact: true}).click();
    await page.getByRole('heading', {name: '41 offres disponibles', exact: true}).waitFor();
    assert.equal(await search.getByLabel('Quel poste ?', {exact: true}).inputValue(), '');
    await page.goto(base + '/missions?zone=1&origine=partenaires&page=500');
    await page.waitForURL(url => url.searchParams.get('page') === '3');
    await page.getByText('41–41 sur 41 · Page 3 sur 3', {exact: true}).waitFor();
    assert.equal(await pagination.getByRole('button', {name: 'Suivant'}).isDisabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('PASS search filters, numbered pagination, browser back, empty/reset and out-of-range correction', width);
    await context.close();
  }
} finally { await browser.close(); }
