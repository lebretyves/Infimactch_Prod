import {CallHandler,ExecutionContext,Injectable,NestInterceptor} from '@nestjs/common';
import {catchError,mergeMap,throwError,from} from 'rxjs';
import {timingSafeEqual} from 'node:crypto';
import {Database} from '../database/database';
export function executionReference(value:unknown){return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value)?value:null;}
/** Persist only operational correlation metadata, never payloads, headers or response bodies. */
@Injectable()
export class ExecutionTrace implements NestInterceptor {
 constructor(private readonly db:Database){}
 intercept(ctx:ExecutionContext,next:CallHandler){const req=ctx.switchToHttp().getRequest(),token=req.headers['x-infimatch-token'],expected=process.env.SERVICE_TOKEN??'',executionId=executionReference(req.headers['x-n8n-execution-id']),workflowId=executionReference(req.headers['x-n8n-workflow-id']);
 if(!executionId||!workflowId||typeof token!=='string'||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return next.handle();
 const started=Date.now(),action=String(req.path).split('/').filter(Boolean).slice(4).join('/');
 const record=async(state:string)=>{await this.db.query("INSERT INTO operational_check(service,state,summary) VALUES('n8n-execution',$1,$2)",[state,JSON.stringify({executionId,workflowId,action,durationMs:Date.now()-started})]).catch(()=>{});};
 return next.handle().pipe(mergeMap(async result=>{await record('completed');return result;}),catchError(error=>from(record('failed')).pipe(mergeMap(()=>throwError(()=>error)))));
 }
}
