import {Controller,Get,Post,Delete,Module,Req,UseGuards,ConflictException} from "@nestjs/common";
import {Request} from "express";
import {Database,audit} from "../database/database";
import {SessionGuard,user} from "../common/access";
@Controller("me/closure-request")
@UseGuards(SessionGuard)
export class PrivacyController {
 constructor(private readonly db:Database){}
 @Get() async status(@Req() req:Request){const [request]=await this.db.query("SELECT id,status,requested_at,approved_at,completed_at FROM closure_request WHERE account_id=$1 ORDER BY requested_at DESC LIMIT 1",[user(req)]);return {request:request??null};}
 @Post() async request(@Req() req:Request){return this.db.transaction(async em=>{
  await em.query("SELECT id FROM account WHERE id=$1 FOR UPDATE",[user(req)]);
  const [existing]=await em.query("SELECT id,status,requested_at FROM closure_request WHERE account_id=$1 AND status IN('REQUESTED','APPROVED')",[user(req)]);if(existing)return existing;
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
