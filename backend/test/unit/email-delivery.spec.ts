import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authorizeEmailWebhook,parseEmailEvent,nextDeliveryState} from '../../src/automation/email-delivery';
import {EmailWebhookController,MyEmailDeliveriesController,AdminEmailDeliveriesController} from '../../src/automation/email-delivery.module';
const time='2026-09-19T10:00:00Z',now=Date.parse(time)+3600000;
const body={event:'delivered',time,email_id:'provider-message-1',rcpt:'fixture@example.invalid','X-InfiMatch-Email-ID':randomUUID()};
test('email webhook fails closed without a long independent bearer secret',()=>{
  assert.throws(()=>authorizeEmailWebhook(undefined,'x'.repeat(40)));
  assert.throws(()=>authorizeEmailWebhook('Bearer '+ 'x'.repeat(40),'wrong'));
  assert.throws(()=>authorizeEmailWebhook('Basic '+ 'x'.repeat(40),'x'.repeat(40)));
  authorizeEmailWebhook('Bearer '+ 'x'.repeat(40),'x'.repeat(40));
});
test('email event parsing retains technical data only and handles provider UTC time',()=>{
  const e=parseEmailEvent({...body,time:'2026-09-19 10:00:00',auth:'private',message:'private',subject:'private'},now)!;
  assert.equal(e.happenedAt.toISOString(),'2026-09-19T10:00:00.000Z');
  assert.equal(parseEmailEvent({...body,time:'2026-09-19 10:00:00 +0000'},now)!.fingerprint,e.fingerprint);
  assert.equal(e.fingerprint.length,64); assert.ok(!('auth' in e));assert.ok(!('message' in e));assert.ok(!('subject' in e));
  assert.equal(parseEmailEvent({...body,time:Date.parse(time)/1000},now)!.fingerprint,e.fingerprint);
  assert.equal(parseEmailEvent({...body,event:'open'},now),null);assert.equal(parseEmailEvent({...body,event:'click'},now),null);
  for(const b of [[],null,{...body,rcpt:'invalid'},{...body,time:'yesterday'},{...body,time:now+3600000},{...body,'X-InfiMatch-Email-ID':'not-an-id'},{...body,'x-infimatch-email-id':randomUUID()}])assert.throws(()=>parseEmailEvent(b,now));
});
test('delivery status does not regress on replay, late processed, or older callbacks; later outcomes can resolve a bounce',()=>{
 const delivered=parseEmailEvent(body,now)!;
 const earlier=parseEmailEvent({...body,event:'processed',time:'2026-09-19T09:59:00Z'},now)!;
 const later=parseEmailEvent({...body,event:'processed',time:'2026-09-19T10:02:00Z'},now)!;
 assert.equal(nextDeliveryState('DELIVERED',time,earlier).status,'DELIVERED');
 assert.equal(nextDeliveryState('DELIVERED',time,later).status,'DELIVERED');
 assert.equal(nextDeliveryState('PROCESSED',later.happenedAt,delivered).status,'DELIVERED');
 const bounce=parseEmailEvent({...body,event:'bounce',time:'2026-09-19T10:01:00Z',bounce:'soft'},now)!;
 assert.equal(nextDeliveryState('DELIVERED',time,bounce).status,'BOUNCED');
 assert.equal(nextDeliveryState('BOUNCED',bounce.happenedAt,delivered).status,'BOUNCED');
 assert.equal(nextDeliveryState('BOUNCED',bounce.happenedAt,parseEmailEvent({...body,time:'2026-09-19T10:03:00Z'},now)!).status,'DELIVERED');
 assert.equal(nextDeliveryState('SPAM',time,delivered).status,'SPAM');
 const reject=parseEmailEvent({...body,event:'reject'},now)!;assert.equal(nextDeliveryState('DELIVERED',time,reject).status,'REJECTED');
});
test('journal controllers fix self identity and require admin accounts permission',async()=>{
 const calls:any[]=[];const service={journal:(...args:any[])=>{calls.push(args);return {};}} as any;
 const own=new MyEmailDeliveriesController(service);own.list({session:{userId:'self'}} as any);assert.deepEqual(calls,[['self']]);
 const admin=new AdminEmailDeliveriesController(service);
 assert.throws(()=>admin.list({adminRole:'OPS',session:{adminId:'admin'}} as any,'target'));
 admin.list({adminRole:'SUPPORT',session:{adminId:'admin'}} as any,'target');assert.deepEqual(calls[1],['target',true]);
 assert.ok(Reflect.getMetadata('__guards__',MyEmailDeliveriesController)?.length);assert.ok(Reflect.getMetadata('__guards__',AdminEmailDeliveriesController)?.length);
 const webhook=new EmailWebhookController({receive:()=>{throw Error('must not run');}} as any);
 assert.throws(()=>webhook.webhook('invalid',body),e=>(e as any).getStatus()===401);
});
