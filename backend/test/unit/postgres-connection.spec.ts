import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postgresConnection } from '../../src/database/connection';
const uri='postgresql://infimatch_app.project:example@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=verify-full';
test('legacy PostgreSQL configuration is unchanged without custom CA',()=>{assert.deepEqual(postgresConnection(uri,''),{connectionString:uri});});
test('custom CA enforces hostname verification without URL overriding the CA',()=>{const r=postgresConnection(uri,'public CA');assert.deepEqual(r.ssl,{ca:'public CA',rejectUnauthorized:true});assert.equal(new URL(r.connectionString).searchParams.has('sslmode'),false);assert.equal(new URL(r.connectionString).hostname,'aws-1-eu-west-1.pooler.supabase.com');});
test('weaker TLS modes and conflicting SSL URL settings are rejected',()=>{for(const mode of ['disable','no-verify','prefer','allow'])assert.throws(()=>postgresConnection(uri.replace('verify-full',mode),'public CA'));for(const key of ['ssl','sslrootcert','sslcert','sslkey','uselibpqcompat'])assert.throws(()=>postgresConnection(uri+'&'+key+'=value','public CA'));});
test('custom CA promotes require and verify-ca to full verification',()=>{for(const mode of ['require','verify-ca'])assert.equal(postgresConnection(uri.replace('verify-full',mode),'public CA').ssl?.rejectUnauthorized,true);});
test('custom CA preserves escaped credentials and non-TLS connection options',()=>{const u=new URL(uri);u.password=encodeURIComponent('a:@/%!?');u.searchParams.set('application_name','InfiMatch');const result=new URL(postgresConnection(u.href,'public CA').connectionString);assert.equal(decodeURIComponent(result.password),'a:@/%!?');assert.equal(result.searchParams.get('application_name'),'InfiMatch');});

