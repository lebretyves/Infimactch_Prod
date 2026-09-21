import { randomBytes } from "node:crypto";
import { GoogleAuth } from "../auth/google";
import {IsString,Length,Equals} from 'class-validator';
import * as argon2 from 'argon2';
import {Controller,Get,Post,Delete,Module,Req,UseGuards,ConflictException,Body,BadRequestException,UnauthorizedException} from "@nestjs/common";
import {Request} from "express";
import {Database,audit} from "../database/database";
import {SessionGuard,user} from "../common/access";
class ClosureGoogle { @IsString() @Length(1,10000) credential!:string; @IsString() @Length(64,64) nonce!:string; @Equals(true) confirmed!:boolean; }
class ClosurePassword {@IsString() @Length(1,128) password!:string;}
@Controller("me/closure-request")
@UseGuards(SessionGuard)
export class PrivacyController {
 constructor(private readonly db:Database, private readonly google:GoogleAuth){}
 @Get() async status(@Req() req:Request){const [request]=await this.db.query("SELECT id,status,requested_at,approved_at,completed_at,decision_reason,last_error FROM closure_request WHERE account_id=$1 ORDER BY requested_at DESC LIMIT 1",[user(req)]);const [identity]=await this.db.query("SELECT 1 FROM google_identity WHERE account_id=$1",[user(req)]);return {request:request??null,googleLinked:!!identity};}
 @Post("google/challenge") async challenge(@Req() req:Request){
  const [linked]=await this.db.query("SELECT 1 FROM google_identity WHERE account_id=$1",[user(req)]);
  if(!linked || !this.google.configuration().enabled)throw new BadRequestException("Confirmation Google indisponible pour ce compte.");
  const nonce=randomBytes(32).toString('hex');
  req.session.googleClosureChallenge={nonce,expires:Date.now()+5*60*1000,accountId:user(req)};
  await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
  return {nonce};
 }
 @Post("google") async requestGoogle(@Req() req:Request,@Body() body:ClosureGoogle){
  const actor=user(req),challenge=req.session.googleClosureChallenge;
  delete req.session.googleClosureChallenge;
  await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
  if(body.confirmed!==true || !challenge || challenge.accountId!==actor || challenge.nonce!==body.nonce || challenge.expires<=Date.now())throw new BadRequestException({code:"CLOSURE_GOOGLE_EXPIRED",message:"La confirmation a expiré. Relancez la confirmation Google."});
  const identity=await this.google.verifyIdentity(body.credential,challenge.nonce).catch(error=>{
    if(error instanceof UnauthorizedException)throw new BadRequestException({code:"CLOSURE_GOOGLE_INVALID",message:"La réponse Google est invalide. Relancez la confirmation Google."});
    throw error;
  });
  return this.db.transaction(async em=>{
    const [account]=await em.query("SELECT id,active,session_version FROM account WHERE id=$1 FOR UPDATE",[actor]);
    const [linked]=await em.query("SELECT 1 FROM google_identity WHERE account_id=$1 AND subject=$2",[actor,identity.subject]);
    if(!account?.active || account.session_version!==req.session.sessionVersion || !linked)throw new BadRequestException({code:"CLOSURE_GOOGLE_MISMATCH",message:"Choisissez le compte Google associé à votre compte InfiMatch."});
    const [existing]=await em.query("SELECT id,status,requested_at FROM closure_request WHERE account_id=$1 AND status IN('REQUESTED','APPROVED','PROCESSING')",[actor]);if(existing)return existing;
    const [created]=await em.query("INSERT INTO closure_request(account_id) VALUES($1) RETURNING id,status,requested_at",[actor]);
    await audit(em,actor,"CLOSURE_REQUESTED",created.id,{confirmation:"GOOGLE"});return created;
  });
 }
 @Post() async request(@Req() req:Request,@Body() body:ClosurePassword){return this.db.transaction(async em=>{
  const [account]=await em.query("SELECT id,password_hash,active FROM account WHERE id=$1 FOR UPDATE",[user(req)]);
  if(!account?.active || !(await argon2.verify(account.password_hash,body.password).catch(()=>false)))throw new BadRequestException({code:"CLOSURE_PASSWORD_INVALID",message:"Mot de passe incorrect."});
  const [existing]=await em.query("SELECT id,status,requested_at FROM closure_request WHERE account_id=$1 AND status IN('REQUESTED','APPROVED','PROCESSING')",[user(req)]);if(existing)return existing;
  const [created]=await em.query("INSERT INTO closure_request(account_id) VALUES($1) RETURNING id,status,requested_at",[user(req)]);await audit(em,user(req),"CLOSURE_REQUESTED",created.id);return created;
 });}
 @Delete() async cancel(@Req() req:Request){return this.db.transaction(async em=>{
  await em.query("SELECT id FROM account WHERE id=$1 FOR UPDATE",[user(req)]);
  const [request]=await em.query("UPDATE closure_request SET status='CANCELLED' WHERE account_id=$1 AND status IN('REQUESTED','APPROVED') RETURNING id,status,requested_at",[user(req)]);
  if(!request)throw new ConflictException("No pending closure request");await audit(em,user(req),"CLOSURE_CANCELLED",request.id);return request;
 });}
}
@Module({controllers:[PrivacyController],providers:[GoogleAuth]})
export class PrivacyModule{}
