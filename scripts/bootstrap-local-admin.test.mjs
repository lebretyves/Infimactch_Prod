import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateLocalAdminConfig} from './bootstrap-local-admin.mjs';
const local={NODE_ENV:'development',DATABASE_URL:'postgresql://infimatch:local@127.0.0.1:55432/infimatch',ADMIN_ORIGIN:'http://127.0.0.1:5175'};
test('accepts the documented local setup',()=>assert.doesNotThrow(()=>validateLocalAdminConfig(local,'owner@example.test')));
test('rejects production mode',()=>assert.throws(()=>validateLocalAdminConfig({...local,NODE_ENV:'production'},'owner@example.test')));
test('rejects remote databases',()=>assert.throws(()=>validateLocalAdminConfig({...local,DATABASE_URL:'postgresql://u:p@db.example.com:55432/infimatch'},'owner@example.test')));
test('rejects connection parameter host overrides',()=>assert.throws(()=>validateLocalAdminConfig({...local,DATABASE_URL:local.DATABASE_URL+'?host=db.example.com'},'owner@example.test')));
test('rejects a different local database or port',()=>{for(const url of ['postgresql://u:p@127.0.0.1:5432/infimatch','postgresql://u:p@127.0.0.1:55432/production'])assert.throws(()=>validateLocalAdminConfig({...local,DATABASE_URL:url},'owner@example.test'));});
test('rejects incorrect admin origin and missing recipient',()=>{assert.throws(()=>validateLocalAdminConfig({...local,ADMIN_ORIGIN:'https://admin.example.com'},'owner@example.test'));assert.throws(()=>validateLocalAdminConfig(local,''));});
