// Export the same document served by createApp, using an isolated local test database.
const {writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const database=new URL(process.env.DATABASE_URL||'http://invalid');
assert.equal(process.env.NODE_ENV,'test','OpenAPI export requires an isolated test environment');
assert.equal(database.hostname,'127.0.0.1');assert.equal(database.port,'55433');assert.equal(database.pathname,'/infimatch_test');
process.env.INFIMATCH_SECRET_SOURCE='vault'; // Disable fallback loading of a private .env; no Vault access is made.
const {createApp}=require('../backend/dist/app');
(async()=>{
 const app=await createApp();
 try {
  await app.listen(0,'127.0.0.1');
  const address=app.getHttpServer().address();
  const response=await fetch('http://127.0.0.1:'+address.port+'/api/docs-json',{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);
  const doc=await response.json();
  assert.ok(doc.paths['/api/v1/profile']);
  const webhook=doc.paths['/api/v1/internal/automation/smtp2go/webhook']?.post;
  assert.ok(webhook,'Delivery module must be registered before export');
  assert.deepEqual(webhook.security,[{Smtp2goWebhook:[]}]);
  assert.ok(!webhook.parameters?.some(p=>p.name==='X-InfiMatch-Token'||p.name==='X-CSRF-Token'));
  assert.ok(webhook.responses['200']);
  assert.ok(!doc.components.schemas.BankDto.required.includes('bic'));
  const output=resolve(__dirname,'../docs/openapi.json');
  writeFileSync(output,JSON.stringify(doc,null,2)+'\n');
  const operations=Object.values(doc.paths).reduce((n,path)=>n+Object.keys(path).filter(k=>['get','post','put','patch','delete'].includes(k)).length,0);
  console.log(JSON.stringify({exported:'docs/openapi.json',paths:Object.keys(doc.paths).length,operations,webhookBearer:true,bicOptional:true}));
 } finally {await app.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
