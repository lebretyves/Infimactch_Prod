import {test} from "node:test";
import assert from "node:assert/strict";
import {channelPermissions,guildPermissions} from "../../src/notifications/discord-client";
import {noticeMessage,notificationCatalog,organizationKinds,personalKinds} from "../../src/notifications/catalog";
test("private channel overwrites deny everyone but allow only the bot role",()=>{
 const guild={id:"1",owner_id:"9"},roles=[{id:"1",permissions:"3072"},{id:"2",permissions:"0"}];
 const channel={permission_overwrites:[{id:"1",type:0,deny:"1024",allow:"0"},{id:"2",type:0,deny:"0",allow:"1024"}]};
 assert.equal(channelPermissions(guild,{user:{id:"3"},roles:[]},roles,channel)&1024n,0n);
 assert.equal(channelPermissions(guild,{user:{id:"4"},roles:["2"]},roles,channel)&3072n,3072n);
 channel.permission_overwrites.push({id:"4",type:1,deny:"2048",allow:"0"});
 assert.equal(channelPermissions(guild,{user:{id:"4"},roles:["2"]},roles,channel)&2048n,0n);
});
test("only guild owner or management roles authorize channel configuration",()=>{
 const guild={id:"1",owner_id:"9"},roles=[{id:"1",permissions:"0"},{id:"2",permissions:"32"}];
 assert.equal(guildPermissions(guild,{user:{id:"9"},roles:[]},roles),8n);
 assert.equal(guildPermissions(guild,{user:{id:"3"},roles:[]},roles),0n);
 assert.equal(guildPermissions(guild,{user:{id:"4"},roles:["2"]},roles),32n);
});
test("personal events cannot be selected for collective organization channels",()=>{
 for(const kind of personalKinds) assert.equal(organizationKinds.includes(kind),false);
 assert.match(noticeMessage("APPLICATION_SELECTED","NURSE"),/reste à confirmer/);
 assert.match(noticeMessage("APPLICATION_SUBMITTED","NURSE"),/pas encore affecté/);
 for(const kind of Object.keys(notificationCatalog)) assert.ok(noticeMessage(kind as keyof typeof notificationCatalog,"NURSE"));
});
