// Isolated UI contract test. These fixtures never reach a production service.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('dist-admin');
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + (req.url === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) throw Error('path');
    const data = await readFile(path); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream'); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let fresh=false;let issues=0;let executes=0;let status='REQUESTED';let blocked=false;let privacyWrite=true;
  const at='2026-09-17T10:00:00Z';const secret='https://app.example.invalid/reinitialiser-mot-de-passe#token=fictional-secret';
  const user={id:'admin-1',email:'admin@example.invalid',role:'OWNER',permissions:['overview','accounts','accounts:recover','privacy:write']};
  const request=()=>({id:'closure-1',account_id:'client-1',email:'client@example.invalid',status,requested_at:at,approved_at:status==='APPROVED'?at:null,last_error:status==='PROCESSING'?'Nettoyage à reprendre':null});
  await page.route('**/api/v1/admin/**',async route=>{
    const path=new URL(route.request().url()).pathname.replace('/api/v1/admin','');let body={};let responseStatus=200;
    if(path==='/me')body={...user,permissions:privacyWrite?user.permissions:user.permissions.filter(x=>x!=='privacy:write')};
    else if(path==='/csrf')body={csrfToken:'fixture-csrf'};
    else if(path==='/recovery-requests')body={items:[{id:'recovery-1',account_id:'client-1',email:'client@example.invalid',status:'REQUESTED',requested_at:at}],total:1};
    else if(path==='/recovery-requests/recovery-1/issue'){const payload=route.request().postDataJSON();assert.equal(payload.identityVerified,true);assert.ok(payload.reason.length>=8);if(!fresh){responseStatus=403;body={code:'ADMIN_REAUTH_REQUIRED'};}else{issues++;body={id:'recovery-1',status:'ISSUED',resetUrl:secret,expiresAt:at};}}
    else if(path==='/reauth'){assert.deepEqual(route.request().postDataJSON(),{password:'fixture-password'});fresh=true;}
    else if(path==='/privacy-requests')body={items:[request()],total:1};
    else if(path==='/privacy-requests/closure-1')body={request:request(),blockers:blocked?[{code:'OPEN_MISSIONS',label:'Une mission active empêche la clôture.'}]:[],canExecute:!blocked&&['APPROVED','PROCESSING'].includes(status)};
    else if(path==='/privacy-requests/closure-1/approve'){status='APPROVED';body={ok:true};}
    else if(path==='/privacy-requests/closure-1/execute'){assert.equal(blocked,false);executes++;status='PROCESSING';body={ok:true,status:'PROCESSING',last_error:'Nettoyage à reprendre'};}
    else throw Error('Unexpected fixture endpoint '+path);
    await route.fulfill({status:responseStatus,json:body});
  });
  const origin=`http://127.0.0.1:${server.address().port}`;
  async function visit(path){await page.goto(origin+'/#'+path);await page.reload();}
  async function reason(){await page.getByLabel('Justification (journalisée)').fill('Contrôle administratif strictement fictif');}
  await visit('/recovery-requests?accountId=client-1');await page.getByRole('button',{name:'Créer le lien',exact:true}).click();await reason();await page.getByRole('button',{name:'Confirmer l’opération'}).click();assert.equal(issues,0);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirmer l’opération'}).click();await page.getByLabel('Confirmer votre mot de passe').fill('fixture-password');await page.getByRole('button',{name:'Confirmer mon mot de passe'}).click();assert.equal(issues,0);await page.getByRole('button',{name:'Confirmer l’opération'}).click();await page.getByLabel('Lien de récupération confidentiel').waitFor();assert.equal(issues,1);assert.equal(await page.getByLabel('Lien de récupération confidentiel').inputValue(),secret);assert.equal(page.url().includes('fictional-secret'),false);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('fictional-secret')),false);
  await page.getByRole('button',{name:'Fermer et masquer le lien'}).click();assert.equal(await page.getByLabel('Lien de récupération confidentiel').count(),0);
  await visit('/privacy-requests');await page.getByRole('link',{name:'Examiner la demande →'}).click();await page.getByRole('button',{name:'Approuver',exact:true}).click();await reason();await page.getByRole('button',{name:'Confirmer l’opération'}).click();await page.getByRole('button',{name:'Exécuter la clôture',exact:true}).waitFor();assert.equal(executes,0,'Approval is not execution');
  blocked=true;await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.getByText('Une mission active empêche la clôture.').waitFor();assert.equal(await page.getByRole('button',{name:'Exécuter la clôture',exact:true}).isDisabled(),true);
  blocked=false;await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.getByRole('button',{name:'Exécuter la clôture',exact:true}).click();await reason();await page.getByRole('button',{name:'Confirmer l’opération'}).click();await page.getByRole('button',{name:'Reprendre le traitement',exact:true}).waitFor();assert.equal(executes,1);await page.getByText(/La clôture n’est pas annoncée comme terminée/).waitFor();
  privacyWrite=false;await page.reload();await page.getByRole('button',{name:'Reprendre le traitement',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Reprendre le traitement',exact:true}).isDisabled(),true);
  for(const width of [1440,375]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  assert.deepEqual(errors,[]);console.log('PASS fictional admin recovery/privacy: identity checkbox, fresh password, ephemeral link, approval separate, blockers, incomplete cleanup, readonly role, responsive.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
