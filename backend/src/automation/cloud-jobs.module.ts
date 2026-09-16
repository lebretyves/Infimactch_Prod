import {processClosures} from "../security/closure";
import {Controller,Headers,Module,Post,UnauthorizedException} from "@nestjs/common";
import {timingSafeEqual} from "node:crypto";
import {required} from "../config";
import {Database} from "../database/database";
import {DocumentsModule,DocumentsService} from "../documents/documents.module";
import {fetchOffers,importOffers} from "../public-data/offers";
import {fetchJobsPipe,normalizeJobsPipe} from "../public-data/jobspipe";
import {retireStaleOffers} from "../public-data/freshness";
import {applyRetention,cleanupRemovedDocuments} from "../security/retention";
import {AutomationModule,AutomationService} from "./automation.module";
import {NotificationsModule,NotificationsService} from "../notifications/notifications.module";
@Controller("internal/automation/jobs")
export class CloudJobsController {
 constructor(private readonly automation:AutomationService,private readonly notifications:NotificationsService,private readonly db:Database,private readonly documents:DocumentsService){}
 private authorize(token:string){
  const expected=required("SERVICE_TOKEN");
  if(typeof token!=="string"||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))throw new UnauthorizedException();
 }
 @Post("dispatch") async dispatch(@Headers("x-infimatch-token") token:string){
  this.authorize(token);
  const events=await this.automation.dispatch(1);
  await this.notifications.dispatch(5);
  return {processed:events.length};
 }
 @Post("refresh-offers") async refresh(@Headers("x-infimatch-token") token:string){
  this.authorize(token);
  const results=await Promise.allSettled([
   (async()=>importOffers(this.db,await fetchOffers(25),false))(),
   (async()=>importOffers(this.db,await fetchJobsPipe(10),false,normalizeJobsPipe,"JOBSPIPE"))(),
  ]);
  const providers=results.map((r,i)=>({provider:i===0?"FRANCE_TRAVAIL":"JOBSPIPE",status:r.status==='fulfilled'?"SUCCESS":"RETRY_REQUIRED",accepted:r.status==='fulfilled'?r.value.accepted:0}));
  for(const p of providers)if(p.status!=="SUCCESS")await this.db.query("INSERT INTO import_run(provider,status,summary) VALUES($1,'FAILED',$2)",[p.provider,JSON.stringify({code:"PROVIDER_REFRESH_FAILED"})]);
  return {providers};
 }
 @Post("maintenance") async maintenance(@Headers("x-infimatch-token") token:string){
  this.authorize(token);
  const closures=await processClosures(this.db,5);
  if(closures.failed)throw Error("CLOSURE_RETRY_REQUIRED");
  await this.documents.reconcile(5);
  await retireStaleOffers(this.db,true);
  const retention=await this.db.transaction(em=>applyRetention(em));
  await cleanupRemovedDocuments(this.db,retention.documentIds??[]);
  return {ok:true};
 }
}
@Module({imports:[AutomationModule,NotificationsModule,DocumentsModule],controllers:[CloudJobsController]})
export class CloudJobsModule {}
