import {withRole,request} from './common.mjs';
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const maximum=process.argv.includes('--drain')?512:1;
 for(let step=1;step<=maximum;step++){
  const response=await fetch('https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/refresh-offers',{method:'POST',headers:{'X-InfiMatch-Token':values.SERVICE_TOKEN},signal:AbortSignal.timeout(240000)});
  if(!response.ok)throw Error('Refresh HTTP '+response.status);const result=await response.json();console.log(JSON.stringify({step,...result}));
  const pending=result.providers?.some(p=>p.status==='IN_PROGRESS');
  if(!pending){if(result.providers?.some(p=>['RETRY_REQUIRED','AUTH_REQUIRED','INCOMPLETE'].includes(p.status)))process.exitCode=1;break;}
  if(step===maximum&&maximum>1)throw Error('Collection still incomplete; scheduled continuation retained');
 }
});}catch(error){console.error(error.message);process.exitCode=1;}
