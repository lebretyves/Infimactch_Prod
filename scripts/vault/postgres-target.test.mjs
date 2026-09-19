import {test} from 'node:test';
import assert from 'node:assert/strict';
import {managedPostgresUrl,restrictedApplicationUrl,managedPostgresConnection} from './postgres-target.mjs';
const direct='postgresql://infimatch_app:example@db.skdrmhqwapxwwbupllhu.supabase.co:5432/postgres';
const pooled='postgresql://infimatch_app.skdrmhqwapxwwbupllhu:example@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
test('production restricted role supports direct and pooler connections',()=>{
 assert.equal(restrictedApplicationUrl(direct),true);assert.equal(restrictedApplicationUrl(pooled),true);
 assert.equal(restrictedApplicationUrl(pooled.replace('infimatch_app.','postgres.')),false);
 assert.equal(restrictedApplicationUrl(direct.replace('infimatch_app:','postgres:')),false);
 assert.equal(restrictedApplicationUrl(pooled.replace('infimatch_app.skdrmhqwapxwwbupllhu','infimatch_app')),false);
});
test('maintenance connections reject unrelated providers, lookalike hosts and missing credentials',()=>{
 for(const uri of ['postgresql://user:example@db.example.org/postgres',direct.replace('.supabase.co','.supabase.co.evil.invalid'),pooled.replace('.supabase.com','.supabase.com.evil.invalid'),direct.replace('postgresql:','https:'),direct.replace(':example@','@'),direct.replace('/postgres','/')])assert.throws(()=>managedPostgresUrl(uri));
});
test('maintenance TLS pins CA and preserves pooler username and unrelated options',()=>{
 const c=managedPostgresConnection(pooled+'?sslmode=verify-full&application_name=maintenance','example-ca');
 assert.deepEqual(c.ssl,{ca:'example-ca',rejectUnauthorized:true});const u=new URL(c.connectionString);
 assert.equal(u.searchParams.has('sslmode'),false);assert.equal(u.searchParams.get('application_name'),'maintenance');assert.equal(u.username,'infimatch_app.skdrmhqwapxwwbupllhu');
});
test('missing certificate, TLS downgrades and URL overrides are refused',()=>{
 for(const ca of [undefined,'','  '])assert.throws(()=>managedPostgresConnection(direct,ca));
 for(const option of ['sslmode=disable','sslmode=prefer','sslmode=allow','ssl=false','sslrootcert=system','sslcert=other','sslkey=other','uselibpqcompat=true'])assert.throws(()=>managedPostgresConnection(direct+'?'+option,'example-ca'));
});
