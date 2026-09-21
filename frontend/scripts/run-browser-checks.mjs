import {preview} from 'vite';
import {spawn} from 'node:child_process';
const server=await preview({preview:{host:'127.0.0.1',port:0,open:false}});
const address=server.httpServer.address();
try{
 for(const script of ['test-notification-read.mjs','test-mixed-recommendations.mjs','test-browser-errors.mjs','test-browser-accessibility.mjs','test-mission-publication.mjs','test-discord-defaults.mjs','test-rpps-demo.mjs']){
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['scripts/'+script],{stdio:'inherit',env:{...process.env,BASE_URL:`http://127.0.0.1:${address.port}`}});
   const timer=setTimeout(()=>{child.kill();reject(new Error(script+' exceeded 120 seconds'));},120000);
   child.on('error',e=>{clearTimeout(timer);reject(e);});
   child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(script+' failed: '+code));});
  });
 }
}finally{await new Promise(resolve=>server.httpServer.close(resolve));}
