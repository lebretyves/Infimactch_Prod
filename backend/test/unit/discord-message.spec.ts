import {test} from "node:test";
import assert from "node:assert/strict";
import {discordNotificationMessage as render} from "../../src/notifications/discord-message";
const notice={kind:"APPLICATION_SUBMITTED",message:"Votre candidature est enregistrée. Vous n’êtes pas encore affecté.",href:"/missions/m_123",notification_id:"notice-123"};
const mission={title:"Infirmier de nuit",establishment_name:"Clinique du Parc",start_at:"2026-10-24T18:00:00Z",end_at:"2026-10-25T06:00:00Z",timezone:"Europe/Paris"};
test("Discord candidature has a clear title, useful mission context and a discreet tracked link",()=>{
 const text=render({...notice,mission},"https://app.example");
 assert.match(text,/^\*\*Candidature envoyée\*\*/);
 assert.match(text,/pas encore affecté/);
 assert.match(text,/Clinique du Parc/);
 assert.match(text,/24 oct\. 2026.*20:00/);
 assert.match(text,/25 oct\. 2026.*07:00/);
 assert.match(text,/\[Voir la mission\]\(<https:\/\/app\.example\/missions\/m_123\?notification=notice-123>\)/);
 assert.doesNotMatch(text,/Référence mission/);
});
test("Organization notifications say candidature received rather than sent",()=>{
 assert.match(render({...notice,organization_id:"org"},"https://app.example"),/^\*\*Candidature reçue/);
});
test("Date-only missions never invent shift times",()=>{
 const text=render({...notice,mission:{...mission,schedule_precision:"DATE"}},"https://app.example");
 assert.match(text,/horaires à préciser/);assert.doesNotMatch(text,/20:00|07:00/);
});
test("Invalid dates or timezone do not block an otherwise valid notification",()=>{
 for(const m of [{...mission,start_at:"invalid"},{...mission,timezone:"invalid"},{title:"Mission"}]){
 const text=render({...notice,mission:m},"https://app.example");
 assert.doesNotMatch(text,/\*\*Dates :/);assert.match(text,/Voir la mission/);
 }
});
test("Mission text cannot inject markdown links or active mentions",()=>{
 const text=render({...notice,mission:{title:"[faux](https://evil.example) @everyone\n**urgent**"}},"https://app.example");
 assert.ok(text.includes("\\[faux\\]\\(https://evil.example\\)"));
 assert.ok(text.includes("@\u200beveryone"));assert.ok(!text.includes("\n**urgent**"));
});
test("Long user titles remain within Discord relay limits and retain the full action link",()=>{
 const text=render({...notice,message:"x".repeat(5000),mission:{...mission,title:"x".repeat(5000),establishment_name:"x".repeat(5000)}},"https://app.example");
 assert.ok(text.length<=2000);assert.ok(text.endsWith("notification=notice-123>)"));
});
test("Non-mission events have a useful action and unknown kinds have a safe title",()=>{
 assert.match(render({...notice,kind:"WELCOME",href:"/notifications"},"https://app.example"),/Ouvrir mon espace InfiMatch/);
 assert.match(render({...notice,kind:"NEED_CREATED",href:"/besoins"},"https://app.example"),/Voir les besoins/);
 assert.match(render({...notice,kind:"unknown"},"https://app.example"),/Nouvelle notification/);
});
test("Notification links preserve routing and reject external or credential-bearing URLs",()=>{
 assert.match(render({...notice,href:"/gestion/missions/id?tab=details"},"https://app.example"),/tab=details&notification=notice-123/);
 for(const href of ["https://evil.example","//evil.example","https://user:password@app.example/x"]){
 assert.throws(()=>render({...notice,href},"https://app.example"),/INVALID_NOTIFICATION_LINK/);
 }
 assert.throws(()=>render(notice,"ftp://app.example"),/INVALID_NOTIFICATION_LINK/);
});
