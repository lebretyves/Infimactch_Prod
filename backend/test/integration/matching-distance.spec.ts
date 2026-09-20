import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../../src/database/database';
import {geodesicKm,geodesicKmBatch} from '../../src/database/distance';
let db: Database;
before(async()=>{
  const u=new URL(process.env.DATABASE_URL||'http://invalid');
  if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');
  db=await new Database().connect();
});
after(async()=>{await db?.onModuleDestroy();});
test('batch distances exactly preserve scalar PostGIS results, order, duplicates and missing coordinates',async()=>{
  const origin={latitude:48,longitude:2};
  const pairs: Parameters<typeof geodesicKmBatch>[1]=[
    [origin,origin],
    [origin,{latitude:48,longitude:2.4}],
    [{latitude:null,longitude:2},origin],
    [origin,{latitude:48,longitude:null}],
    [{latitude:0,longitude:0},{latitude:0,longitude:1}],
    [{latitude:0,longitude:179.9},{latitude:0,longitude:-179.9}],
    [origin,{latitude:48,longitude:2.4}],
    [{latitude:48,longitude:null},origin],
    [origin,{latitude:null,longitude:2}],
  ];
  const scalar=[];
  for(const [a,b] of pairs)scalar.push(await geodesicKm(db,a,b));
  assert.deepEqual(await geodesicKmBatch(db,pairs),scalar);
  assert.equal(scalar[0],0);
  assert.deepEqual(await geodesicKmBatch(db,[]),[]);
  // Boundary eligibility must receive the identical floating-point distance.
  const radius=scalar[1]!;
  const batch=await geodesicKmBatch(db,pairs);
  for(const limit of [radius-1e-9,radius,radius+1e-9])
    assert.equal(batch[1]!<=limit,scalar[1]!<=limit);
});
