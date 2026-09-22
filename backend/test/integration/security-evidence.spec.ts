import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {createApp} from '../../src/app';
import {Database} from '../../src/database/database';
import {MatchingService} from '../../src/matching/matching.module';
let app:Awaited<ReturnType<typeof createApp>>,db:Database,client:any;
const password='Audit-fictional-password-123',email=randomUUID()+'@example.invalid';
const origin='http://127.0.0.1:4197',previousOrigin=process.env.APP_ORIGIN;
before(async()=>{
 const u=new URL(process.env.DATABASE_URL!);if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Isolated test database required');
 process.env.APP_ORIGIN=origin;app=await createApp();await app.listen(0,'127.0.0.1');db=app.get(Database);
 const agent=request.agent(app.getHttpServer()),csrf=await agent.get('/api/v1/auth/csrf');
 const registered=await agent.post('/api/v1/auth/register').set('Origin',origin).set('X-CSRF-Token',csrf.body.csrfToken).set('Idempotency-Key',randomUUID()).send({email,password,family:'NURSE',termsVersion:'2026-09-14',profile:{displayName:'Audit Fictif',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],latitude:null,longitude:null,radiusKm:30,acceptedShifts:[],preferredShifts:[],visible:true}}).expect(201);
 client={agent,id:registered.body.user.id,csrf:registered.body.csrfToken};
});
after(async()=>{await app?.close();process.env.APP_ORIGIN=previousOrigin;});
function post(body:any){return client.agent.post('/api/v1/listings/search').set('Origin',origin).set('X-CSRF-Token',client.csrf).set('Idempotency-Key',randomUUID()).send(body);}
test('SEC09 malformed SQL and Mongo operators are rejected without arbitrary query execution',async()=>{
 for(const body of [{qualifications:{$ne:null}},{qualifications:['IDE'],q:{$where:'return true'}},{qualifications:['IDE'],sort:'start; DROP TABLE account;--'},{qualifications:['IDE'],limit:{$gt:0}},{qualifications:['IDE'],latitude:{$ne:null},longitude:2}])await post(body).expect(400);
 const [{count:beforeCount}]=await db.query('SELECT count(*)::int AS count FROM account');
 await post({qualifications:['IDE'],q:"'; DROP TABLE account;--"}).expect(201);
 assert.equal((await db.query('SELECT count(*)::int AS count FROM account'))[0].count,beforeCount);
 for(const id of ['{"$ne":null}','{"$where":"return true"}',"' OR 1=1 --"]){await client.agent.get('/api/v1/matches/'+encodeURIComponent(id)+'/explanation').expect(404);}
 // A real stored Mongo document cannot be retrieved by another nurse or operator-shaped input.
 const service=app.get(MatchingService);await (service as any).ready();
 const run=await (service as any).runs.create({ownerId:randomUUID(),missionId:randomUUID(),rulesVersion:'audit',profileVersion:'audit',missionVersion:1,missionStatus:'OPEN',result:{marker:'private-fictional'},expiresAt:new Date(Date.now()+60000)});
 try{await client.agent.get('/api/v1/matches/'+run.id+'/explanation').expect(404);assert.ok(await (service as any).runs.exists({_id:run.id}));}finally{await (service as any).runs.deleteOne({_id:run.id});}
});
test('SEC08 and SEC18 real API: stored text stays inert, logout revokes cookie and back navigation exposes no private profile',async()=>{
 const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
 const {chromium}=require(path.resolve(process.cwd(),'../frontend/node_modules/playwright'));
 const root=path.resolve(process.cwd(),'../frontend/dist'),config=JSON.parse(await fs.readFile(path.resolve(process.cwd(),'../frontend/vercel.json'),'utf8'));
 const headers=Object.fromEntries(config.headers.find((x:any)=>x.source==='/:path*').headers.map((h:any)=>[h.key,h.value]));
 const payload='<img src=x onerror=window.__auditXss=1>';
 await db.query('UPDATE profile SET experience=$2::jsonb WHERE user_id=$1',[client.id,JSON.stringify([{establishment:payload,service:'URGENCES',start:'2020-01-01T00:00:00Z',end:'2021-01-01T00:00:00Z'}])]);
 const apiPort=(app.getHttpServer().address() as {port:number}).port;
 const server=http.createServer(async(req:any,res:any)=>{
  if(req.url.startsWith('/api/')){const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:req.headers},(response:any)=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);return;}
  try{const pathname=new URL(req.url,origin).pathname,file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)&&file!==root)throw Error('Path outside build');let target=file;try{if((await fs.stat(file)).isDirectory())target=path.join(root,'index.html');}catch{target=path.join(root,'private.html');}const data=await fs.readFile(target);res.writeHead(200,{...headers,'Cache-Control':'no-store','Content-Type':target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':target.endsWith('.woff2')?'font/woff2':'text/html'});res.end(data);}catch{res.writeHead(404);res.end();}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(4197,'127.0.0.1',resolve);});let browser:any;
 try{
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
  const page=await context.newPage();await page.goto(origin+'/connexion');await page.getByLabel('Adresse e-mail',{exact:true}).fill(email);await page.getByLabel('Mot de passe',{exact:true}).fill(password);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.waitForURL('**/accueil');
  const cookies=await context.cookies();const cookie=cookies.map((c:any)=>c.name+'='+c.value).join('; ');
  await page.goto(origin+'/profil');await page.getByText(payload,{exact:true}).waitFor();assert.equal(await page.locator('img[src=x]').count(),0);assert.equal(await page.evaluate(()=>Boolean((window as any).__auditXss)),false);
  const authenticated=await context.request.get(origin+'/api/v1/profile');assert.equal(authenticated.status(),200);assert.match(authenticated.headers()['cache-control'],/no-store/);
  await page.getByRole('button',{name:'Déconnexion',exact:true}).click();await page.waitForURL('**/connexion');
  const denied=await context.request.get(origin+'/api/v1/profile');assert.equal(denied.status(),401);assert.match(denied.headers()['cache-control'],/no-store/);
  await request(app.getHttpServer()).get('/api/v1/profile').set('Cookie',cookie).expect(401);
  await page.goBack();await page.waitForURL('**/connexion');assert.equal((await page.locator('body').innerText()).includes(payload),false);
  await page.goto(origin+'/profil');await page.waitForURL('**/connexion');assert.equal((await page.locator('body').innerText()).includes(payload),false);
  const cached=await page.evaluate(async()=>{const urls:string[]=[];for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys())urls.push(req.url);return urls;});assert.ok(!cached.some((url:string)=>/\/api\/|\/profil(?:$|\?)/.test(url)));
 }finally{await browser?.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});


test('SEC18 delayed session persistence cannot resurrect a logged-out client or admin',async()=>{
 const {Pool}=await import('pg');const {default:session}=await import('express-session');
 const {default:connectPgSimple}=await import('connect-pg-simple');const {protectSessionRevocation}=await import('../../src/security/session-revocation');
 const pool=new Pool({connectionString:process.env.DATABASE_URL});const Store=connectPgSimple(session);
 try {for(const table of ['session','admin_session'] as const){
 const store=protectSessionRevocation(new Store({pool,tableName:table,pruneSessionInterval:false}),pool,table),sid='audit-'+randomUUID();
 const stale={cookie:Object.assign(new session.Cookie(),{expires:new Date(Date.now()+8*3600000)}),userId:client.id,sessionVersion:1} as any;
 const save=()=>new Promise<void>((ok,fail)=>store.set(sid,stale,e=>e?fail(e):ok()));
 await save();await new Promise<void>((ok,fail)=>store.destroy(sid,e=>e?fail(e):ok()));
 await save();await new Promise<void>((ok,fail)=>store.touch!(sid,stale,(e?:Error)=>e?fail(e):ok()));
 const value=await new Promise((ok,fail)=>store.get(sid,(e,v)=>e?fail(e):ok(v)));assert.equal(value,null);
 const rows=await db.query(`SELECT sess FROM ${table} WHERE sid=$1`,[sid]);assert.deepEqual(rows[0].sess,{revoked:true});
 }}finally{await pool.end();}
});
