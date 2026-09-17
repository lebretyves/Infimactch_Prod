import { fallback } from "./public-fallbacks.mjs";
// Keep share previews/canonical metadata correct before JavaScript runs.
import fs from 'node:fs';
const pages = [
  ['installer', 'Installer l’application', 'Retrouvez InfiMatch depuis votre écran d’accueil, avec le même compte et les mêmes fonctions.'],
  ['accessibilite', 'Accessibilité : état des travaux', 'Périmètre, méthode et limites des contrôles d’accessibilité du projet InfiMatch.'],
  ['ecoconception', 'Notre démarche d’écoconception', 'Actions mesurées et limites de la démarche d’écoconception InfiMatch.'],
  ['mentions-legales', 'Mentions légales et données personnelles', 'Fonctionnement du projet InfiMatch, données de compte et préférences cookies.'],
];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const shell = fs.readFileSync('dist/index.html', 'utf8').replace(/<noscript>[\s\S]*?<\/noscript>/, fallback());
fs.writeFileSync('dist/index.html', shell);
for (const [path, title, description] of pages) {
  const html = shell.replace(/<noscript>[\s\S]*?<\/noscript>/, fallback(path)).replace(/<title>.*?<\/title>/s, `<title>${escape(title)} — InfiMatch</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*/, `$1${escape(title)} — InfiMatch`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*/, `$1https://infimactch-prod-backend-l5bc.vercel.app/${path}`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*/, `$1https://infimactch-prod-backend-l5bc.vercel.app/${path}`);
  fs.writeFileSync(`dist/${path}.html`, html);
}
console.log('Static metadata generated for four useful public routes.');

// Private routes must not initially advertise the homepage canonical or indexability.
const privateShell = shell.replace(/<title>.*?<\/title>/s, '<title>Espace personnel — InfiMatch</title>')
 .replace(/(<meta\s+name="robots"\s+content=")[^"]*/, '$1noindex,follow')
 .replace(/<link\s+rel="canonical"[^>]*>/, '')
 .replace(/<meta\s+property="og:url"[^>]*>/, '')
 .replace(/(<meta\s+name="description"\s+content=")[^"]*/, '$1Connectez-vous pour accéder à votre espace InfiMatch.')
 .replace(/(<meta\s+property="og:title"\s+content=")[^"]*/, '$1Espace personnel — InfiMatch')
 .replace(/(<meta\s+property="og:description"\s+content=")[^"]*/, '$1Connectez-vous pour accéder à votre espace InfiMatch.')
 .replace(/<noscript>[\s\S]*?<\/noscript>/, '<noscript>Activez JavaScript et connectez-vous pour accéder à votre espace personnel.</noscript>');
fs.writeFileSync('dist/private.html', privateShell);
