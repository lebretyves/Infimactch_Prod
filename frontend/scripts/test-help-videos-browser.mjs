import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4189';
const out=new URL('../../audits/help-videos-current/',import.meta.url);
const ids=['inscription-diplomes','profil-cv','recherche-matching','candidature-agenda','confirmation-pdf','annulation-emails'];
const browser=await chromium.launch({channel:'msedge'}),results=[];
try{
 const context=await browser.newContext({locale:'fr-FR',serviceWorkers:'block'});
 await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
 await context.route('**/api/**',route=>route.fulfill({status:401,json:{message:'Session absente'}}));
 const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});requests.length=0;
  await page.goto(base+'/aide',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Tutoriels vidéo',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Voir le tutoriel/}).count(),6);
  assert.equal(requests.filter(u=>u.includes('.webm')).length,0,'No media download before choice');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  for(const id of ids){
   const card=page.locator('article').filter({has:page.locator('#video-'+id)});
   await card.getByRole('button',{name:/Voir le tutoriel/}).click();
   const video=card.locator('video');await video.scrollIntoViewIfNeeded();
   await video.evaluate(async v=>{v.muted=false;await v.play();});
   await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.currentTime>.5&&v.webkitAudioDecodedByteCount>0;});
   const info=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,audioDecodedBytes:v.webkitAudioDecodedByteCount,muted:v.muted,preload:v.preload,captions:v.querySelector('track').src,src:v.currentSrc}));
   assert.equal(info.width,1280);assert.equal(info.preload,'none');assert.equal(info.muted,false);assert.ok(info.audioDecodedBytes>0);
   assert.ok(info.src.includes('2026-09-21-voix-r2'));
   const vtt=await (await context.request.get(info.captions)).text();assert.match(vtt,/^WEBVTT/);
   const cues=[...vtt.matchAll(/(\d{2}):(\d{2}):(\d{2}\.\d{3}) --> (\d{2}):(\d{2}):(\d{2}\.\d{3})/g)].map(m=>({start:Number(m[1])*3600+Number(m[2])*60+Number(m[3]),end:Number(m[4])*3600+Number(m[5])*60+Number(m[6])}));
   assert.ok(cues.length>=5);for(let i=0;i<cues.length;i++){assert.ok(cues[i].end>cues[i].start);assert.ok(cues[i].end<=info.duration+.3);if(i)assert.ok(cues[i].start>=cues[i-1].end);}
   await video.evaluate(v=>{v.textTracks[0].mode='hidden';});
   await page.waitForFunction(()=>document.querySelector('video')?.textTracks[0]?.cues?.length>0);
   assert.equal(await video.evaluate(v=>v.textTracks[0].cues.length),cues.length);
   assert.ok((await video.boundingBox()).width<=width);
   await video.evaluate(v=>v.pause());await card.getByRole('button',{name:/Fermer la vidéo/}).click();
   results.push({viewport:width,id,...info,captions:cues.length});
  }
 }
 assert.deepEqual(errors,[]);await mkdir(out,{recursive:true});await writeFile(new URL('browser-audio-results.json',out),JSON.stringify({base,passed:true,results,errors},null,2));
 console.log('PASS six videos with decoded French audio and synchronized captions at 1440, 390 and 320px; no prefetch or overflow');
}finally{await browser.close();}
