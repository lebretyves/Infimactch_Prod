import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SORTIE = 'docs/screenshots';

const formats = [
  { nom: 'desktop', width: 1440, height: 960 },
  { nom: 'mobile', width: 390, height: 844 },
];

const ecrans = [
  { id: '01-accueil-public', url: '/' },
  { id: '02-connexion', url: '/connexion' },
  { id: '03-inscription', url: '/inscription' },
  { id: '04-inscription-identite', url: '/inscription/identite' },
  { id: '05-inscription-qualification', url: '/inscription/qualification' },
  { id: '06-inscription-mobilite', url: '/inscription/mobilite' },
  { id: '07-inscription-consentements', url: '/inscription/consentements' },
  { id: '08-inscription-confirmation', url: '/inscription/confirmation' },
  { id: '09-accueil', url: '/accueil' },
  { id: '10-missions', url: '/missions' },
  { id: '11-missions-filtrees', url: '/missions?specialite=Bloc+op%C3%A9ratoire&tri=distance' },
  { id: '12-mission-detail', url: '/missions/1842' },
  { id: '13-candidater', url: '/missions/1842/candidater' },
  { id: '14-candidatures', url: '/candidatures' },
  { id: '15-mentions-legales', url: '/mentions-legales' },
];

await rm(SORTIE, { recursive: true, force: true });

const navigateur = await chromium.launch();

for (const format of formats) {
  const dossier = `${SORTIE}/${format.nom}`;
  await mkdir(dossier, { recursive: true });

  const contexte = await navigateur.newContext({
    viewport: { width: format.width, height: format.height },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    reducedMotion: 'reduce',
  });

  const page = await contexte.newPage();

  // En capture pleine hauteur, un élément collant se fige au milieu du rendu.
  // On le repose dans le flux le temps de la photo.
  await page.addStyleTag({
    content: '[class*="nav"], [class*="action"] { position: static !important; }',
  });

  for (const ecran of ecrans) {
    await page.goto(`${BASE}${ecran.url}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({
      content: '[class*="nav"], [class*="action"] { position: static !important; }',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${dossier}/${ecran.id}.png`,
      fullPage: true,
    });
    console.log(`${format.nom.padEnd(8)} ${ecran.id}`);
  }

  await contexte.close();
}

await navigateur.close();
console.log(`\n${formats.length * ecrans.length} captures écrites dans ${SORTIE}`);
