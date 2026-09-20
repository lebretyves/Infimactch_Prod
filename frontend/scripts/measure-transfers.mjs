/** Optional, explicitly invoked anonymous local-browser sample. Never a production energy score. */
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureBuild,REPORT_PATH} from './measure-build.mjs';
const base=new URL(process.argv[2] || 'http://127.0.0.1:4188/');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('This measurement script only accepts a local preview URL.');
const dist=resolve(fileURLToPath(new URL('../dist',import.meta.url)));
const original=JSON.parse(await readFile(resolve(dist,REPORT_PATH),'utf8'));
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:false});
try {
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',locale:'fr-FR'});
 await context.route('**/api/**',r=>r.fulfill({status:401,json:{message:'Anonymous measurement fixture'}}));
 await context.route('https://accounts.google.com/**',r=>r.abort());
 const page=await context.newPage(),session=await context.newCDPSession(page);
 await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
 const served=await (await page.request.get(new URL(REPORT_PATH,base).href)).json();
 if(served.artifactSha256!==original.artifactSha256)throw Error('The served artifact is not the local build.');
 await page.goto(base.href,{waitUntil:'networkidle'});await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);
 const entries=await page.evaluate(()=>performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource')).map(e=>({url:e.name,transferBytes:e.transferSize,encodedBytes:e.encodedBodySize,decodedBytes:e.decodedBodySize})));
 const resources=entries.filter(e=>new URL(e.url).origin===base.origin&&!new URL(e.url).pathname.startsWith('/api/'));
 if(resources.some(e=>!Number.isFinite(e.transferBytes)||e.transferBytes<=0))throw Error('Incomplete resource transfer timing; do not publish an assumed value.');
 if((await measureBuild(dist)).artifactSha256!==original.artifactSha256)throw Error('Build changed during measurement.');
 const transfers={measuredAt:new Date().toISOString(),environment:'Local preview, anonymous home, Chromium, 1440 × 900, cold cache, API simulated/excluded, service worker disabled; no scroll',url:base.href,transferBytes:resources.reduce((n,e)=>n+e.transferBytes,0),resourceCount:resources.length,artifactSha256:original.artifactSha256,browser:await browser.version(),resources};
 await writeFile(resolve(dist,REPORT_PATH),JSON.stringify({...original,transfers},null,2)+'\n');
 console.log(JSON.stringify(transfers));await context.close();
}finally{await browser.close();}
