import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {ListingsController} from '../../src/listings/listings.module';
import {RecommendationsController} from '../../src/listings/recommendations';
import {AdminOperationsController} from '../../src/admin/operations';
let db:Database, listings:ListingsController, admin:AdminOperationsController, actor:string;
const offers:Record<string,string>={};
const req=()=>({session:{userId:actor,family:'NURSE'}} as any);
const adminReq=()=>({adminRole:'OWNER',session:{adminId:actor,adminVerifiedAt:Date.now()}} as any);
const page={limit:20,offset:0};
const reason='Isolated visibility regression test';
before(async()=>{
 const url=new URL(process.env.DATABASE_URL||'http://invalid');
 if(process.env.NODE_ENV!=='test'||url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/infimatch_test')throw Error('Requires isolated local database');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
 listings=new ListingsController(db);admin=new AdminOperationsController(db,{} as any,{} as any);
 const [account]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);actor=account.id;
 await db.query('INSERT INTO profile(user_id) VALUES($1)',[actor]);
 for(const source of ['FRANCE_TRAVAIL','JOBSPIPE']) {
  const [offer]=await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash) VALUES($1,$2,'IDE fictional','Fixture','https://example.invalid/offer','Paris','IDE','fixture') RETURNING id",[source,randomUUID()]);offers[source]=offer.id;
 }
});
after(async()=>{await db?.onModuleDestroy();});

test('existing source rows remain visible after the additive migration',async()=>{
 const rows=await db.query('SELECT provider,visible FROM source_control ORDER BY provider');
 assert.equal(rows.length,2);assert.ok(rows.every(row=>row.visible===true));
 assert.equal((await listings.external(page)).total,2);
});

test('hiding one source removes public, private and favorite access without erasing offers',async()=>{
 const id=offers.FRANCE_TRAVAIL!;
 await listings.favorite(req(),{kind:'EXTERNAL',targetId:id});
 assert.equal((await listings.favorites(req(),page)).length,1);
 const [before]=await db.query("SELECT enabled FROM source_control WHERE provider='FRANCE_TRAVAIL'");
 await admin.sourceVisibility(adminReq(),'FRANCE_TRAVAIL',{visible:false,reason});
 const publicPage=await listings.external(page);
 assert.equal(publicPage.total,1);assert.equal(publicPage.items[0].source,'JOBSPIPE');
 for(const action of [()=>listings.detail('e_'+id),()=>listings.compareExternal(req(),'e_'+id),()=>listings.favorite(req(),{kind:'EXTERNAL',targetId:id})])
  await assert.rejects(action(),(error:any)=>error.getStatus()===404);
 assert.equal((await listings.favorites(req(),page)).length,0);
 const search=await listings.search(req(),{qualifications:[],origine:'externes',...page});
 assert.equal(search.total,1);assert.equal(search.items[0].source,'JOBSPIPE');
 const recommendations=await new RecommendationsController(db,{} as any).recommendations(req(),{origine:'externes'});
 assert.equal(recommendations.external.status,'READY');assert.equal(recommendations.external.items.length,1);
 assert.equal((await db.query('SELECT id FROM external_offer')).length,2);
 assert.equal((await db.query('SELECT * FROM favorite WHERE user_id=$1',[actor])).length,1);
 const [after]=await db.query("SELECT enabled FROM source_control WHERE provider='FRANCE_TRAVAIL'");assert.equal(after.enabled,before.enabled);
 const [audit]=await db.query("SELECT details FROM audit WHERE event='ADMIN_SOURCE_VISIBILITY_CHANGED' ORDER BY created_at DESC LIMIT 1");
 assert.equal(audit.details.visible,false);assert.equal(audit.details.reason,reason);
});

test('all-hidden catalogue is empty and revealing a source restores saved favorites',async()=>{
 await admin.sourceVisibility(adminReq(),'JOBSPIPE',{visible:false,reason});
 assert.equal((await listings.external(page)).total,0);
 const recommendations=await new RecommendationsController(db,{} as any).recommendations(req(),{});
 assert.equal(recommendations.external.status,'HIDDEN');assert.equal(recommendations.internal.status,'READY');
 assert.equal(recommendations.externalCatalogueVisible,false);
 await admin.sourceVisibility(adminReq(),'FRANCE_TRAVAIL',{visible:true,reason});
 assert.equal((await listings.external(page)).total,1);
 assert.equal((await listings.favorites(req(),page))[0].target_id,offers.FRANCE_TRAVAIL);
});

test('unauthorized visibility changes leave SQL state untouched',async()=>{
 await assert.rejects(admin.sourceVisibility({...adminReq(),adminRole:'SUPPORT'},'FRANCE_TRAVAIL',{visible:false,reason}));
 await assert.rejects(admin.sourceVisibility({...adminReq(),session:{adminId:actor,adminVerifiedAt:0}},'FRANCE_TRAVAIL',{visible:false,reason}));
 assert.equal((await db.query("SELECT visible FROM source_control WHERE provider='FRANCE_TRAVAIL'"))[0].visible,true);
});
