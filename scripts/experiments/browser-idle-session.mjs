import {spawnSync} from 'node:child_process';import fs from 'node:fs';import assert from 'node:assert/strict';
const run=(...args)=>{const r=spawnSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js','--offline','agent-browser','--session','v1-idle',...args],{encoding:'utf8',timeout:45000});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;};
const route=(p,b)=>{run('network','unroute','**/api/v1'+p);run('network','route','**/api/v1'+p,'--body',JSON.stringify(b));};
run('--executable-path','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','--ignore-https-errors','open','https://localhost:8443');

let initial=run('snapshot');const cookies=initial.match(/button "Tout refuser" \[[^\]]*ref=([^\]]+)/);if(cookies)run('click','@'+cookies[1]);
route('/profile',{display_name:'Test',qualifications:['IDE'],details:{},available:[],unavailable:[]});
route('/auth/csrf',{csrfToken:'ui-only'});route('/auth/logout',{});
for(const p of ['/me/favorites*','/me/notifications*','/me/history*','/me/applications*'])route(p,[]);
route('/dashboards',{family:'NURSE',counts:{}});route('/me/matches*',{items:[],total:0});route('/me/notification-preferences',{enabled:true});
route('/auth/activity',{idleExpiresAt:Date.now()+900000});
route('/auth/me',{id:'idle-ui',email:'ui@example.invalid',family:'NURSE',organizations:[],session:{idleExpiresAt:Date.now()+60000}});
run('open','https://localhost:8443/accueil');run('wait','--text','Rester connecté');
run('screenshot','docs/proofs/parser-v4/idle-warning.png');
let s=run('snapshot');const stay=s.match(/button "Rester connecté" \[[^\]]*ref=([^\]]+)/);assert.ok(stay);run('click','@'+stay[1]);run('wait','1000');assert.ok(!run('snapshot').includes('Rester connecté'));
run('eval','window.originalNow=Date.now;Date.now=()=>window.originalNow()+14*60*1000');run('wait','1500');assert.ok(run('snapshot').includes('Rester connecté'));
run('eval','Date.now=()=>window.originalNow()+16*60*1000');run('wait','--url','**/connexion');assert.ok(run('snapshot').includes('Votre session a expiré'));run('screenshot','docs/proofs/parser-v4/idle-expired.png');
fs.writeFileSync('docs/proofs/parser-v4/idle-browser.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'Mock browser identity and timing; accelerated frontend clock; server expiry separately covered by isolated integration test',checks:['warning one minute before','explicit activity renews','warning at minute 14','logout and login message at minute 15']},null,2));run('close');console.log('Idle browser PASS');
