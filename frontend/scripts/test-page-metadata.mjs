import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/pageMetadata.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {pageMetadata,PUBLIC_PATHS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const path of ['/profil','/calendrier','/dossier','/missions','/candidatures','/favoris','/historique','/notifications','/compte']){
 const m=pageMetadata(path);assert.ok(m.title.endsWith(' — InfiMatch'));assert.ok(m.description.length>25);assert.equal(PUBLIC_PATHS.has(path),false);
}
assert.equal(new Set(['/profil','/calendrier','/dossier','/missions','/candidatures','/favoris','/historique','/notifications','/compte'].map(p=>pageMetadata(p).title)).size,9);
assert.doesNotMatch(JSON.stringify(pageMetadata('/missions/private-sensitive-id/candidater')),/private-sensitive-id/);
assert.equal(pageMetadata('/missions/private-sensitive-id/candidater').title,'Envoyer ma candidature — InfiMatch');
const privateHtml=fs.readFileSync('dist/private.html','utf8');
assert.match(privateHtml,/<meta name="robots" content="noindex,follow"/);assert.doesNotMatch(privateHtml,/<link\s+rel="canonical"/);assert.doesNotMatch(privateHtml,/L.intérim infirmier, pensé pour le soin/);
const shell=fs.readFileSync('dist/index.html','utf8');assert.match(shell,/<meta name="robots" content="index,follow"/);
for(const path of PUBLIC_PATHS){const html=fs.readFileSync(path==='/'?'dist/index.html':`dist${path}.html`,'utf8');assert.match(html,/<title>.+<\/title>/);assert.ok(html.includes(`https://infimactch-prod-backend-l5bc.vercel.app${path}`));}
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.ok(config.rewrites.some(r=>r.source.includes('profil')&&r.destination==='/private.html'));
assert.doesNotMatch(fs.readFileSync('public/sitemap.xml','utf8'),/\/(profil|dossier|calendrier|candidatures|notifications|compte)</);
console.log('PASS route titles, descriptions, private IDs absent, static private noindex/canonical removal, public canonicals and sitemap');
