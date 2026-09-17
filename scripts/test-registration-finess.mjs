import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {nurseWorkspaceFixture} from './nurse-workspace-fixture.mjs';
const require=createRequire(import.meta.url),request=require('supertest');
const f=await nurseWorkspaceFixture();const created=[];
try{
 const lookup=await request(f.app.getHttpServer()).get('/api/v1/reference-data/finess/010000024').expect(200);
 const e=lookup.body.establishment;
 assert.equal(lookup.body.status,'FOUND_IN_SNAPSHOT');assert.equal(lookup.body.grantsOrganizationAccess,false);
 assert.equal(e.finess,'010000024');assert.equal(e.postal_code,'01440');assert.ok(e.name&&e.address&&e.city);assert.equal(typeof e.latitude,'number');
 f.ok('Public FINESS lookup returns imported address, postal code with leading zero, city and coordinates');
 const absent=await request(f.app.getHttpServer()).get('/api/v1/reference-data/finess/999999999').expect(200);assert.equal(absent.body.status,'NOT_IN_SNAPSHOT');assert.equal(absent.body.establishment,null);f.ok('Unknown FINESS is explicitly absent');
 await request(f.app.getHttpServer()).get('/api/v1/reference-data/finess/invalid').expect(400);f.ok('Malformed FINESS rejected');
 for(let round=1;round<=3;round++){
  const agent=request.agent(f.app.getHttpServer());const csrf=await agent.get('/api/v1/auth/csrf').expect(200);
  const name=e.name+(round===3?' - correction':'');const address=[e.address,e.postal_code,e.city].join(' ');
  const result=await agent.post('/api/v1/auth/register').set('Origin',process.env.APP_ORIGIN).set('X-CSRF-Token',csrf.body.csrfToken).send({email:randomUUID()+'@example.invalid',password:'Fixture-'+randomUUID(),family:'ENTERPRISE',termsVersion:'2026-09-14',organizationType:'ESTABLISHMENT',name,address,referent:'Camille Exemple RH 0100000000',finess:e.finess}).expect(201);
  created.push(result.body.user.id);const me=await agent.get('/api/v1/auth/me').expect(200);assert.equal(me.body.organizations[0].finess,e.finess);assert.equal(me.body.organizations[0].name,name);assert.equal(me.body.organizations[0].address,address);
  const [stored]=await f.db.query('SELECT o.name,o.address,o.finess,o.referent FROM organization o JOIN membership m ON m.organization_id=o.id WHERE m.user_id=$1',[result.body.user.id]);assert.equal(stored.name,name);assert.equal(stored.address,address);assert.equal(stored.referent,'Camille Exemple RH 0100000000');f.ok('Registration '+round+': official or edited coordinates persist in organization and are returned by auth/me');
 }
}finally{await f.close();}
await mkdir('docs/proofs/cookies-finess',{recursive:true});await writeFile('docs/proofs/cookies-finess/backend.json',JSON.stringify({at:new Date().toISOString(),checks:f.checks,isolated:true,rollback:true},null,2));
