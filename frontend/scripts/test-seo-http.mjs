import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL||'https://infimactch-prod-backend-l5bc.vercel.app';
const publicPaths=['/','/installer','/accessibilite','/ecoconception','/mentions-legales'];
const privatePaths=['/profil','/dossier','/calendrier','/missions','/candidatures','/favoris','/notifications','/compte'];
const results=[];
for(const path of [...publicPaths,...privatePaths]){
 const r=await fetch(base+path);assert.equal(r.status,200,path);const html=await r.text();
 const robots=html.match(/<meta\s+name="robots"\s+content="([^"]*)"/)?.[1];
 const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1];
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];assert.ok(title,path+' title');
 if(privatePaths.includes(path)){assert.match(robots||'',/noindex/);assert.equal(canonical,undefined);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);}
 else {assert.equal(robots,'index,follow');assert.equal(canonical,base+path);assert.doesNotMatch(r.headers.get('x-robots-tag')||'',/noindex/);}
 results.push({path,status:r.status,title,robots,canonical,xRobots:r.headers.get('x-robots-tag')});
}
const sitemap=await (await fetch(base+'/sitemap.xml')).text();
for(const path of privatePaths)assert.ok(!sitemap.includes(base+path+'<'));
const robots=await (await fetch(base+'/robots.txt')).text();assert.ok(robots.includes('Sitemap: '+base+'/sitemap.xml'));assert.ok(!/^Disallow:\s*\/$/m.test(robots));
await mkdir('artifacts/seo',{recursive:true});await writeFile('artifacts/seo/http-checks.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log('PASS 5 public pages indexable, 8 private HTML pages noindex and no canonical; sitemap and robots aligned');
