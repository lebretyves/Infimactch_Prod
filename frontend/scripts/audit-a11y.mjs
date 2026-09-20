import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

const routes = [
  '/',
  '/connexion',
  '/inscription',
  '/mentions-legales',
  '/accessibilite',
  '/ecoconception',
  '/installer',
  '/inscription/identite',
  '/inscription/qualification',
  '/inscription/mobilite',
  '/inscription/consentements',
  '/inscription/confirmation',
  '/accueil',
  '/missions',
  '/missions/1842',
  '/missions/1842/candidater',
  '/candidatures',
];

const largeurs = [320, 768, 1440];

function controler() {
  const interactifs = 'a[href], button, input:not([type=hidden]), select, textarea';

  return {
    debordement: document.documentElement.scrollWidth > window.innerWidth + 1,
    titres: document.querySelectorAll('h1').length,
    champsSansLabel: [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
      .filter((el) => !el.labels?.length && !el.getAttribute('aria-label') && !el.closest('label'))
      .length,
    imagesSansAlt: [...document.querySelectorAll('img')].filter((el) => !el.hasAttribute('alt'))
      .length,
    commandesSansNom: [...document.querySelectorAll(interactifs)].filter(
      (el) =>
        !el.textContent.trim() &&
        !el.getAttribute('aria-label') &&
        !el.getAttribute('aria-labelledby') &&
        !el.labels?.length,
    ).length,
    langue: document.documentElement.lang,
    lienEvitement: Boolean(document.querySelector('a[href^="#"]')),
  };
}

const navigateur = await chromium.launch();
const echecs = [];

for (const largeur of largeurs) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 } });
  const page = await contexte.newPage();

  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    const bilan = await page.evaluate(controler);

    const problemes = [];
    if (bilan.debordement) problemes.push('débordement horizontal');
    if (bilan.titres !== 1) problemes.push(`${bilan.titres} h1 (attendu : 1)`);
    if (bilan.champsSansLabel) problemes.push(`${bilan.champsSansLabel} champ(s) sans libellé`);
    if (bilan.imagesSansAlt) problemes.push(`${bilan.imagesSansAlt} image(s) sans alternative`);
    if (bilan.commandesSansNom) problemes.push(`${bilan.commandesSansNom} commande(s) sans nom`);
    if (bilan.langue !== 'fr') problemes.push('langue du document absente');
    if (!bilan.lienEvitement) problemes.push("lien d'évitement absent");

    if (problemes.length) echecs.push(`${String(largeur).padStart(4)}px ${route} — ${problemes.join(', ')}`);
  }

  await contexte.close();
}

await navigateur.close();

const total = routes.length * largeurs.length;

if (echecs.length === 0) {
  console.log(`${total} contrôles passés sur ${routes.length} routes et ${largeurs.length} largeurs.`);
} else {
  console.log(echecs.join('\n'));
  console.log(`\n${echecs.length} échec(s) sur ${total} contrôles.`);
  process.exitCode = 1;
}
