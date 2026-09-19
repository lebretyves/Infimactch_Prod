import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const origin='https://infimactch-prod-backend-l5bc.vercel.app';
const publicPaths=['/','/installer','/accessibilite','/ecoconception','/mentions-legales'];
const meta=(html,key)=>html.match(new RegExp('<meta\\s+name="'+key+'"\\s+content="([^"]*)"'))?.[1];
const titles=new Set(),pages=[];
for(const path of publicPaths){const html=read('dist/'+(path==='/'?'index':path.slice(1))+'.html');const title=html.match(/<title>(.*?)<\/title>/s)?.[1];assert.ok(title);assert.ok(!titles.has(title));titles.add(title);assert.equal(meta(html,'robots'),'index,follow');assert.ok((meta(html,'description')||'').length>40);assert.ok(html.includes('rel="canonical" href="'+origin+path+'"'));assert.ok(html.includes('<noscript>'));assert.ok(!html.includes('"@type":"JobPosting"'));pages.push({path,title,indexable:true,canonical:origin+path,noJsFallback:true});}
const privateHtml=read('dist/private.html');assert.match(meta(privateHtml,'robots'),/noindex/);assert.ok(!privateHtml.includes('rel="canonical"'));assert.ok(!privateHtml.includes('property="og:url"'));
const config=JSON.parse(read('vercel.json'));const rewrite=config.rewrites.find(r=>r.destination==='/private.html');assert.ok(rewrite);
const matcher=new RegExp('^/('+rewrite.source.slice('/:path('.length,-1)+')$');
const router=read('src/router.tsx').split('element: <ProtectedRoute />')[1];assert.ok(router);
const privatePaths=[...router.matchAll(/path:\s*"([^"]+)"/g)].map(m=>m[1].replace(':id','example-id'));
for(const path of privatePaths)assert.ok(matcher.test(path),'Private route missing rewrite: '+path);
const noStoreMatchers=config.headers.filter(h=>h.source.startsWith('/:path(')&&h.headers.some(v=>v.key==='Cache-Control'&&v.value==='no-store')).map(h=>new RegExp('^/('+h.source.slice('/:path('.length,-1)+')$'));for(const path of privatePaths)assert.ok(noStoreMatchers.some(m=>m.test(path)),'Private route missing no-store: '+path);
const noindex=config.headers.find(h=>h.headers.some(v=>v.key==='X-Robots-Tag'));assert.ok(noindex);const noindexMatch=new RegExp('^/('+noindex.source.slice('/:path('.length,-1)+')$');for(const path of privatePaths)assert.ok(noindexMatch.test(path));
const sitemap=read('dist/sitemap.xml');assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).sort(),publicPaths.map(p=>origin+p).sort());
assert.ok(read('dist/robots.txt').includes('Sitemap: '+origin+'/sitemap.xml'));assert.match(read('admin.html'),/noindex/);
const report={date:new Date().toISOString(),publicPages:pages,privateRoutes:privatePaths,privateShellNoindex:true,privateRewritesCovered:true,privateCacheNoStore:true,sitemapOnlyPublic:true,jobPostingNotPublished:true,limits:['Built files and Vercel configuration only; not a live deployment or Google indexing test']};
const output=process.env.SEO_PROOF_PATH;if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));}
console.log(JSON.stringify({PASS:true,publicPages:pages.length,privateRoutes:privatePaths.length,privateShellNoindex:true,sitemapOnlyPublic:true}));

// Retired demonstration URLs redirect instead of exposing a gallery or fixtures.
for(const path of ['/catalogue','/apercu-annonces']){
 assert.ok(config.redirects.some(r=>r.source===path+'/:path*'&&r.destination==='/'&&r.permanent===true));
 assert.ok(!matcher.test(path));assert.ok(!sitemap.includes(path));
 const route=read('src/router.tsx');assert.ok(route.includes('{ path: "'+path+'", element: <Navigate to="/" replace /> }'));
}
assert.ok(!existsSync(resolve(root,'dist/catalogue')));
assert.ok(!readdirSync(resolve(root,'dist/assets')).some(name=>/ApercuAnnonces|^Catalogue-/.test(name)));
