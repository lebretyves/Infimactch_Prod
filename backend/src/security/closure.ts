import {appendFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import mongoose from "mongoose";
import {Database} from "../database/database";
import {projectRoot} from "../config";
import {anonymizeAccount,cleanupRemovedDocuments} from "./retention";
/** Keep this ledger outside rotated backups, and replay it before reopening a restore. */
export async function executeClosure(db:Database,accountId:string,requestId?:string){
 if(!/^[0-9a-f-]{36}$/i.test(accountId))throw Error("Invalid account id");
 const result=await db.transaction(async em=>{
  const [account]=await em.query("SELECT id FROM account WHERE id=$1 FOR UPDATE",[accountId]);if(!account)throw Error("Account not found");
  if(requestId){const [request]=await em.query("SELECT status FROM closure_request WHERE id=$1 AND account_id=$2 FOR UPDATE",[requestId,accountId]);if(request?.status!=='APPROVED')return null;}
  const path=resolve(projectRoot,"data/privacy");await mkdir(path,{recursive:true});
  await appendFile(resolve(path,"erasure-ledger.ndjson"),JSON.stringify({accountId,approvedAt:new Date().toISOString()})+"\n",{mode:0o600});
  return anonymizeAccount(em,accountId);
 });
 if(!result)return {skipped:true};
 await cleanupRemovedDocuments(db,result.documentIds);
 const mongo=await mongoose.createConnection(process.env.MONGODB_URI!,{serverSelectionTimeoutMS:5000}).asPromise();
 try{await mongo.collection("matchingruns").deleteMany({ownerId:accountId});}finally{await mongo.close();}
 await db.query("UPDATE closure_request SET status='COMPLETED',completed_at=now() WHERE account_id=$1 AND status='APPROVED'",[accountId]);
 return result;
}
export async function processClosures(db:Database){
 const requests=await db.query("SELECT id,account_id FROM closure_request WHERE status='APPROVED' ORDER BY approved_at");
 const results=[];
 for(const request of requests){
  // Recheck the state: a user may have cancelled since listing.
  const [current]=await db.query("SELECT status FROM closure_request WHERE id=$1",[request.id]);if(current?.status!=='APPROVED')continue;
  results.push(await executeClosure(db,request.account_id,request.id));
 }
 return {processed:results.length};
}
