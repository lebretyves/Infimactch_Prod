import {withRole,request} from './common.mjs';
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 for(const action of ['matches','confirmation','cancellation','reminders']){
  const response=await fetch(values.N8N_WEBHOOK_BASE+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});
  if(response.status!==401&&response.status!==403)throw Error('Unauthenticated n8n route '+action+' status '+response.status);
 }console.log('Four production webhooks reject missing credentials PASS');
 const reminder=await fetch(values.N8N_WEBHOOK_BASE+'/reminders',{method:'POST',headers:{'Content-Type':'application/json','X-InfiMatch-Token':values.SERVICE_TOKEN},body:'{}',signal:AbortSignal.timeout(90000)});
 if(!reminder.ok)throw Error('Reminder workflow HTTP '+reminder.status);const body=await reminder.json();if(!body||typeof body!=='object')throw Error('Invalid reminder response');console.log('n8n Cloud -> production backend authenticated reminder PASS');
 const relay=await fetch(values.DISCORD_RELAY_URL,{method:'POST',headers:{'Content-Type':'application/json','X-InfiMatch-Discord':values.DISCORD_RELAY_TOKEN},body:JSON.stringify({method:'GET',path:'/users/@me'}),signal:AbortSignal.timeout(30000)});
 if(!relay.ok)throw Error('Discord relay HTTP '+relay.status);const result=await relay.json();const item=Array.isArray(result)?result[0]:result;const discord=item.body??item;if(!discord.id||discord.bot!==true)throw Error('Discord bot response invalid');console.log('n8n Cloud -> Discord bot authenticated read PASS');
});}catch(e){console.error(e.message);process.exitCode=1;}
