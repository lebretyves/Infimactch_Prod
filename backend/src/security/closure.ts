import {ConflictException} from '@nestjs/common';
import {closureBlockers,lockClosure} from './closure-blockers';
import {appendFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import mongoose from "mongoose";
import {Database,audit} from "../database/database";
import {projectRoot} from "../config";
import {anonymizeAccount,cleanupRemovedDocuments,requireOwnerTransfer} from "./retention";
/** Keep this ledger outside rotated backups, and replay it before reopening a restore. */
export async function executeClosure(db:Database,accountId:string,requestId?:string){
 return closeAccount(db,accountId,requestId,false);
}
/** Operator-only replay of an already approved, independently retained erasure ledger. */
export async function replayApprovedErasure(db:Database,accountId:string){
 return closeAccount(db,accountId,undefined,true);
}
async function closeAccount(db:Database,accountId:string,requestId:string|undefined,replaying:boolean){
 if(!/^[0-9a-f-]{36}$/i.test(accountId))throw Error("Invalid account id");
 const result=await db.transaction(async em=>{
  await lockClosure(em,accountId);
  if(!replaying)await requireOwnerTransfer(em,accountId);
  const [account]=await em.query("SELECT id FROM account WHERE id=$1 FOR UPDATE",[accountId]);if(!account)throw Error("Account not found");
  if(requestId){const [request]=await em.query("SELECT status FROM closure_request WHERE id=$1 AND account_id=$2 FOR UPDATE",[requestId,accountId]);if(request?.status==='PROCESSING')return {id:accountId,documents:0,documentIds:[] as string[]};if(request?.status!=='APPROVED')return null;}
  const blockers=replaying?[]:await closureBlockers(em,accountId);if(blockers.length)throw new ConflictException({code:'CLOSURE_BLOCKED',message:blockers.map(b=>b.label).join(' ')});
  if(requestId)await em.query("UPDATE closure_request SET status='PROCESSING',last_error=NULL WHERE id=$1",[requestId]);
  if(process.env.DOCUMENT_STORAGE==='postgres'){
   // Independent of SQL backups: replay this ledger before reopening a restore.
   const ledger=await mongoose.createConnection(process.env.MONGODB_URI!,{serverSelectionTimeoutMS:5000}).asPromise();
   try{await ledger.collection<{_id:string;accountId:string;approvedAt:Date}>("erasureledger").updateOne({_id:accountId},{$setOnInsert:{accountId,approvedAt:new Date()}},{upsert:true,writeConcern:{w:'majority'}});}finally{await ledger.close();}
  }else{
   const path=resolve(process.env.ERASURE_LEDGER_DIRECTORY || resolve(projectRoot,"data/privacy"));await mkdir(path,{recursive:true});
   await appendFile(resolve(path,"erasure-ledger.ndjson"),JSON.stringify({accountId,approvedAt:new Date().toISOString()})+"\n",{mode:0o600});
  }
  return anonymizeAccount(em,accountId,{approvedErasureReplay:replaying});
 });
 if(!result)return {skipped:true};
 const pending=await db.query("SELECT id FROM document_erasure WHERE owner_id=$1",[accountId]);
 await cleanupRemovedDocuments(db,[...result.documentIds,...pending.map((r:{id:string})=>r.id)]);
 const mongo=await mongoose.createConnection(process.env.MONGODB_URI!,{serverSelectionTimeoutMS:5000}).asPromise();
 try{await mongo.collection("matchingruns").deleteMany({ownerId:accountId});}finally{await mongo.close();}
 await db.query("UPDATE closure_request SET status='COMPLETED',completed_at=now(),last_error=NULL WHERE account_id=$1 AND status='PROCESSING'",[accountId]);
 return result;
}
export async function approveClosure(db:Database,requestId:string){
 return db.transaction(async em=>{
  const [row]=await em.query("UPDATE closure_request SET status='APPROVED',approved_at=now() WHERE id=$1::uuid AND status='REQUESTED' RETURNING id,status",[requestId]);
  if(!row)throw Error("No pending request");
  await audit(em,null,"CLOSURE_APPROVED",row.id,{channel:"operator-cli"});return row;
 });
}
export async function processClosures(db:Database,limit=100){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid closure batch size");
 const requests=await db.query("SELECT id,account_id FROM closure_request WHERE status IN('APPROVED','PROCESSING') ORDER BY approved_at LIMIT $1",[limit]);
 let processed=0,skipped=0;const failures:{requestId:string,code:string}[]=[];
 for(const request of requests){
  try {
   const result=await executeClosure(db,request.account_id,request.id);
   if('skipped' in result)skipped++;else processed++;
  }catch { await db.query("UPDATE closure_request SET last_error='CLOSURE_RETRY_REQUIRED' WHERE id=$1 AND status IN('APPROVED','PROCESSING')",[request.id]); failures.push({requestId:request.id,code:"CLOSURE_RETRY_REQUIRED"}); }
 }
 return {processed,skipped,failed:failures.length,failures};
}
