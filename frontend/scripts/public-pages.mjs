import { fallback } from "./public-fallbacks.mjs";
// Keep share previews/canonical metadata correct before JavaScript runs.
import fs from 'node:fs';
import ts from 'typescript';
const metadataSource = ts.transpileModule(fs.readFileSync('src/lib/pageMetadata.ts', 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const { pageMetadata, PUBLIC_PATHS } = await import('data:text/javascript;base64,' + Buffer.from(metadataSource).toString('base64'));
const pages = [...PUBLIC_PATHS].filter(path => path !== '/').map(path => [path.slice(1), pageMetadata(path)]);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const applyMetadata = (html, {title, description}) => html.replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`).replace(/(<meta\s+(?:name="description"|property="og:description")\s+content=")[^"]*/g, (_, prefix) => prefix + escape(description)).replace(/(<meta\s+property="og:title"\s+content=")[^"]*/, (_, prefix) => prefix + escape(title));
const shell = applyMetadata(fs.readFileSync('dist/index.html', 'utf8').replace(/<link\b[^>]*data-home-hero[^>]*>\s*/g, '').replace(/<noscript>[\s\S]*?<\/noscript>/, fallback()), pageMetadata('/'));
// Home-only image hint: never preload this photo on account or other public routes.
const media = JSON.parse(fs.readFileSync('src/assets/public-media.json', 'utf8')).accueil;
const imageHint = `<link data-home-hero rel="preload" as="image" type="image/webp" href="${escape(media.src)}" imagesrcset="${escape(media.srcSet)}" imagesizes="${escape(media.sizes)}" fetchpriority="high" />`;
fs.writeFileSync('dist/index.html', shell.replace('</head>', `${imageHint}\n</head>`));
for (const [path, metadata] of pages) {
  const html = applyMetadata(shell, metadata).replace(/<noscript>[\s\S]*?<\/noscript>/, fallback(path))
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*/, `$1https://infimactch-prod-backend-l5bc.vercel.app/${path}`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*/, `$1https://infimactch-prod-backend-l5bc.vercel.app/${path}`);
  fs.writeFileSync(`dist/${path}.html`, html);
}
console.log(`Static metadata generated for ${pages.length} public routes.`);

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

// Public assistance and authenticated tickets share this route: always noindex/no-store.
const helpShell = privateShell.replaceAll('Espace personnel — InfiMatch', 'Aide et support — InfiMatch')
 .replaceAll('Connectez-vous pour accéder à votre espace InfiMatch.', 'Consultez les guides et retrouvez vos demandes de support après connexion.')
 .replace(/<noscript>[\s\S]*?<\/noscript>/, '<noscript>Activez JavaScript pour consulter les guides. Sans accès au compte, écrivez à yleb.user@outlook.fr sans joindre de document personnel ni de mot de passe.</noscript>');
fs.writeFileSync('dist/aide.html', applyMetadata(helpShell, pageMetadata('/aide')));
