import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoveryMailConfig, sendRecoveryMail, RECOVERY_SEND_TIMEOUT_MS } from '../../src/auth/recovery-mail';

const config = { apiKey: 'fictional-key', sender: 'InfiMatch <recovery@example.invalid>', origin: 'https://example.invalid' };
const token = 'a'.repeat(64);

test('reset mail uses only a trusted-origin fragment link, plain text and one recipient', async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.smtp2go.com/v3/email/send');
    assert.equal(options?.redirect, 'error');
    assert.equal((options?.headers as Record<string,string>)['X-Smtp2go-Api-Key'], config.apiKey);
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.to, ['client@example.invalid']);
    assert.equal(body.html_body, undefined);
    assert.equal(body.cc, undefined); assert.equal(body.bcc, undefined);
    assert.match(body.text_body, /https:\/\/example\.invalid\/reinitialiser-mot-de-passe#token=[a-f0-9]{64}/);
    assert.match(body.text_body, /30 minutes/);
    return Response.json({data:{succeeded:1,failed:0,email_id:'fictional-provider-id'}});
  };
  assert.deepEqual(await sendRecoveryMail(config,'client@example.invalid',token,transport), {status:'ACCEPTED',providerId:'fictional-provider-id',error:null});
  assert.equal(calls,1);
});

test('explicit provider rejections are distinguished from ambiguous sends, without retries or raw errors',async()=>{
  for(const status of [400,401,403,429,500,503,408]) {
    let calls=0;
    const result=await sendRecoveryMail(config,'client@example.invalid',token,async()=>{calls++;return new Response('sensitive-provider-body-'+token,{status});});
    assert.equal(result.status,[500,503,408].includes(status)?'UNCERTAIN':'FAILED');
    assert.equal(calls,1); assert.ok(!JSON.stringify(result).includes(token));
  }
  const failed=await sendRecoveryMail(config,'client@example.invalid',token,async()=>Response.json({data:{succeeded:0,failed:1}}));
  assert.equal(failed.status,'FAILED');
  for(const receipt of [{}, {data:{succeeded:1,failed:0}}, {data:{succeeded:1,failed:1,email_id:'x'}}]) {
    assert.equal((await sendRecoveryMail(config,'client@example.invalid',token,async()=>Response.json(receipt))).status,'UNCERTAIN');
  }
  assert.equal((await sendRecoveryMail(config,'client@example.invalid',token,async()=>{throw Error(token);})).status,'UNCERTAIN');
});

test('the timeout bounds a stalled provider body and does not resend',async()=>{
  let calls=0;
  const started=Date.now();
  const result=await sendRecoveryMail(config,'client@example.invalid',token,async()=>{
    calls++;
    return {ok:true,json:()=>new Promise(()=>undefined)} as unknown as Response;
  });
  assert.equal(result.status,'UNCERTAIN'); assert.equal(result.error,'RECOVERY_SEND_TIMEOUT'); assert.equal(calls,1);
  assert.ok(Date.now()-started>=RECOVERY_SEND_TIMEOUT_MS-20);
  assert.ok(Date.now()-started<RECOVERY_SEND_TIMEOUT_MS+1500);
});

test('recovery config rejects untrusted URLs and supports manual fallback',()=>{
  const names=['SMTP2GO_API_KEY','SMTP2GO_FROM','APP_ORIGIN','NODE_ENV'] as const;
  const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  try {
    process.env.SMTP2GO_API_KEY=config.apiKey;process.env.SMTP2GO_FROM=config.sender;process.env.NODE_ENV='production';
    for(const origin of ['http://example.invalid','https://user:password@example.invalid','not-a-url','javascript:alert(1)']) {
      process.env.APP_ORIGIN=origin;assert.equal(recoveryMailConfig(),null);
    }
    process.env.APP_ORIGIN=config.origin;assert.equal(recoveryMailConfig()?.origin,config.origin);
    delete process.env.SMTP2GO_API_KEY;assert.equal(recoveryMailConfig(),null);
    process.env.SMTP2GO_API_KEY=config.apiKey;process.env.NODE_ENV='test';process.env.APP_ORIGIN='http://127.0.0.1:5173';
    assert.equal(recoveryMailConfig()?.origin,'http://127.0.0.1:5173');
  } finally {for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}}
});
