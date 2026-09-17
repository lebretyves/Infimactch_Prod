import {withRole,request} from './common.mjs';
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const r=await fetch('https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/refresh-offers',{method:'POST',headers:{'X-InfiMatch-Token':values.SERVICE_TOKEN},signal:AbortSignal.timeout(240000)});
 if(!r.ok)throw Error('Refresh HTTP '+r.status);const result=await r.json();console.log(JSON.stringify(result));if(result.providers?.some(p=>p.status!=='SUCCESS'))process.exitCode=1;
});}catch(e){console.error(e.message);process.exitCode=1;}
