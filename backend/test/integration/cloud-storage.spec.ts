import mongoose from "mongoose";
import {executeClosure} from "../../src/security/closure";
import "reflect-metadata";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {Database} from "../../src/database/database";
import {DocumentsService} from "../../src/documents/documents.module";
let db:Database;const previous=process.env.DOCUMENT_STORAGE;const accounts:string[]=[];
before(async()=>{const url=new URL(process.env.DATABASE_URL||"http://invalid");if(process.env.NODE_ENV!=="test"||url.hostname!=="127.0.0.1"||url.port!=="55433"||url.pathname!=="/infimatch_test")throw Error("Cloud storage tests require the isolated local test database");process.env.DOCUMENT_STORAGE="postgres";db=await new Database().connect();});
after(async()=>{if(previous===undefined)delete process.env.DOCUMENT_STORAGE;else process.env.DOCUMENT_STORAGE=previous;if(db){for(const id of accounts){await db.query("DELETE FROM document WHERE owner_id=$1",[id]);await db.query("DELETE FROM account WHERE id=$1",[id]);}await db.onModuleDestroy();}});
async function account(){const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'test','NURSE','test') RETURNING id",[randomUUID()+"@example.invalid"]);accounts.push(a.id);return a.id;}
test("durable documents stay encrypted, enforce ownership and erase with metadata",async()=>{
 const owner=await account(),docs=new DocumentsService(db),clear=Buffer.from("%PDF-1.4 fictional cloud document");
 const stored=await docs.store(owner,"EVIDENCE","application/pdf",clear);
 const [blob]=await db.query("SELECT encrypted FROM document_blob WHERE document_id=$1",[stored.id]);
 assert.ok(Buffer.isBuffer(blob.encrypted));assert.notDeepEqual(blob.encrypted,clear);
 assert.deepEqual((await docs.read(owner,stored.id)).data,clear);
 await assert.rejects(docs.read(randomUUID(),stored.id));
 await db.query("DELETE FROM document WHERE id=$1",[stored.id]);
 assert.equal((await db.query("SELECT 1 FROM document_blob WHERE document_id=$1",[stored.id])).length,0);
});
test("failed SQL transaction leaves neither metadata nor encrypted blobs",async()=>{
 const owner=await account();
 const failing={transaction:(fn:any)=>db.transaction(async em=>{await fn(em);throw Error("simulated transaction failure");})} as unknown as Database;
 await assert.rejects(new DocumentsService(failing).store(owner,"EVIDENCE","application/pdf",Buffer.from("%PDF-1.4 fictional")));
 assert.equal((await db.query("SELECT 1 FROM document WHERE owner_id=$1",[owner])).length,0);
 assert.equal((await db.query("SELECT 1 FROM document_blob b LEFT JOIN document d ON d.id=b.document_id WHERE d.id IS NULL")).length,0);
});

test("cloud closure records a durable ledger before erasing encrypted documents",async()=>{
 const mongoUrl=new URL(process.env.MONGODB_URI!);
 if(mongoUrl.hostname!=="127.0.0.1"||mongoUrl.port!=="57018")throw Error("Cloud closure requires isolated local MongoDB");
 const owner=await account(),docs=new DocumentsService(db);
 const document=await docs.store(owner,"EVIDENCE","application/pdf",Buffer.from("%PDF-1.4 fictional erasure"));
 const mongo=await mongoose.createConnection(process.env.MONGODB_URI!).asPromise();
 try{
  await executeClosure(db,owner);
  const entry=await mongo.collection("erasureledger").findOne({accountId:owner});assert.ok(entry);
  const [state]=await db.query("SELECT active,email FROM account WHERE id=$1",[owner]);assert.equal(state.active,false);assert.equal(state.email,"closed."+owner+"@anonymized.invalid");
  assert.equal((await db.query("SELECT 1 FROM document_blob WHERE document_id=$1",[document.id])).length,0);
 }finally{await mongo.collection("erasureledger").deleteOne({accountId:owner});await mongo.close();}
});
