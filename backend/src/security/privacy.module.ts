import {IsString,Length} from 'class-validator';
import * as argon2 from 'argon2';
﻿import {Controller,Get,Post,Delete,Module,Req,UseGuards,ConflictException,Body,BadRequestException} from "@nestjs/common";
import {Request} from "express";
import {Database,audit} from "../database/database";
import {SessionGuard,user} from "../common/access";
class ClosurePassword {@IsString() @Length(1,128) password!:string;}
@Controller("me/closure-request")
@UseGuards(SessionGuard)
export class PrivacyController {
 constructor(private readonly db:Database){}
 @Get() async status(@Req() req:Request){const [request]=await this.db.query("SELECT id,status,requested_at,approved_at,completed_at,decision_reason,last_error FROM closure_request WHERE account_id=$1 ORDER BY requested_at DESC LIMIT 1",[user(req)]);return {request:request??null};}
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
@Module({controllers:[PrivacyController]})
export class PrivacyModule{}
