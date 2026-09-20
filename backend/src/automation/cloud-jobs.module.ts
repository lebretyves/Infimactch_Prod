import {cleanupSharedRateLimits} from "../security/shared-rate-limit";
import {RefreshService,RefreshModule,PROVIDERS,providerName} from "../public-data/refresh.service";
import {UseInterceptors} from "@nestjs/common";
import {ExecutionTrace} from "./execution-trace";
import {processClosures} from "../security/closure";
import {Controller,Headers,Module,Param,Post,UnauthorizedException} from "@nestjs/common";
import {timingSafeEqual} from "node:crypto";
import {required} from "../config";
import {Database} from "../database/database";
import {DocumentsModule,DocumentsService} from "../documents/documents.module";
import {retireStaleOffers} from "../public-data/freshness";
import {applyRetention,cleanupRemovedDocuments} from "../security/retention";
import {AutomationModule,AutomationService} from "./automation.module";
import {NotificationsModule,NotificationsService} from "../notifications/notifications.module";
@Controller("internal/automation/jobs")
@UseInterceptors(ExecutionTrace)
export class CloudJobsController {
 constructor(private readonly automation:AutomationService,private readonly notifications:NotificationsService,private readonly db:Database,private readonly documents:DocumentsService,private readonly refreshService:RefreshService){}
 private authorize(token:string){
  const expected=required("SERVICE_TOKEN");
  if(typeof token!=="string"||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))throw new UnauthorizedException();
 }
 @Post("dispatch") async dispatch(@Headers("x-infimatch-token") token:string){
  this.authorize(token);
  const events=await this.automation.dispatch(1);
  await this.notifications.dispatch(5);
  await this.db.query("INSERT INTO operational_check(service,state,summary) VALUES('cloud-dispatch','ready',$1)",[JSON.stringify({processed:events.length})]);
  return {processed:events.length};
 }
 @Post("refresh-offers") async refresh(@Headers("x-infimatch-token") token:string){
  this.authorize(token);
  const providers=await Promise.all(PROVIDERS.map(provider=>this.refreshService.runBatch(provider)));
  return {providers};
 }
 @Post("refresh-offers/:provider") async refreshProvider(@Headers("x-infimatch-token") token:string,@Param("provider") provider:string){
  this.authorize(token);
  return this.refreshService.runBatch(providerName(provider));
 }
 @Post("maintenance") async maintenance(@Headers("x-infimatch-token") token:string){
  this.authorize(token);
  const started=Date.now();
  try{
   const result=await this.db.transaction(async em=>{
    const [lock]=await em.query('SELECT pg_try_advisory_xact_lock(1789905601) AS acquired');
    if(!lock?.acquired)return {busy:true};
    await this.db.query("INSERT INTO operational_check(service,state) VALUES('retention-maintenance','running')");
    await cleanupSharedRateLimits(this.db,500);
    const closures=await processClosures(this.db,5);
    if(closures.failed)throw Error('CLOSURE_RETRY_REQUIRED');
    await this.documents.reconcile(5);
    await retireStaleOffers(this.db,true);
    await em.query("SET LOCAL statement_timeout='20s'");
    // Business history deletion is excluded until its separate policy is approved.
    const retention=await applyRetention(em,{includeBusinessHistory:false});
    return {busy:false,documentCount:retention.documentIds?.length??0};
   });
   if(result.busy)return {ok:false,status:'BUSY'};
   await cleanupRemovedDocuments(this.db);
   const [pending]=await this.db.query('SELECT count(*)::int AS n FROM document_erasure');
   if(pending?.n)throw Error('DOCUMENT_ERASURE_RETRY_REQUIRED');
   await this.db.query("INSERT INTO operational_check(service,state,summary) VALUES('retention-maintenance','completed',$1)",[JSON.stringify({durationMs:Date.now()-started,documentCount:result.documentCount,businessHistoryEnabled:false})]);
   return {ok:true};
  }catch(error){
   await this.db.query("INSERT INTO operational_check(service,state,summary) VALUES('retention-maintenance','failed',$1)",[JSON.stringify({durationMs:Date.now()-started,code:'MAINTENANCE_FAILED'})]);
   throw error;
  }
 }
}
@Module({imports:[AutomationModule,NotificationsModule,DocumentsModule,RefreshModule],controllers:[CloudJobsController],providers:[ExecutionTrace]})
export class CloudJobsModule {}
