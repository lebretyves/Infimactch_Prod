import { rankingBudget } from '../security/ranking-budget';
import {IsOptional,IsIn} from 'class-validator';
import {Controller,Get,Query,Req,UseGuards,NotFoundException} from '@nestjs/common';
import {Request} from 'express';
import {Database} from '../database/database';
import {SessionGuard,user} from '../common/access';
import {MatchingService} from '../matching/matching.module';
import {professional} from '../profiles/profile-mapping';
import {partialOfferMatch} from '../public-data/partial-matching';
import {externalPresentation} from '../public-data/offer-quality';
import {visibleExternalProviders} from '../public-data/external-visibility';
import {externalRankingProvenanceSql} from '../public-data/external-ranking';

export function publicationDate(value:unknown,now=Date.now()):string|null {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
  const time=Date.parse(value);return Number.isFinite(time)&&time<=now?new Date(time).toISOString():null;
}
export function externalRelevance(comparison:ReturnType<typeof partialOfferMatch>) {
  // A relative ordering aid only, never an eligibility or global matching score.
  return [comparison.knownMismatches.length,comparison.indicativeMismatches.length,-Object.values(comparison.criteria).filter(c=>c.status==='MATCH'||c.status==='INDICATIVE_MATCH').length];
}
export function compareRecentExternal(a:any,b:any) {
  for(let i=0;i<3;i++){const delta=a.relevance[i]-b.relevance[i];if(delta)return delta;}
  return (Date.parse(b.publicationDate??'')||0)-(Date.parse(a.publicationDate??'')||0)||a.id.localeCompare(b.id);
}

class OriginQuery {@IsOptional() @IsIn(['toutes','partenaires','externes']) origine?:'toutes'|'partenaires'|'externes';}
@Controller('me/recommendations') @UseGuards(SessionGuard)
export class RecommendationsController {
  constructor(private readonly db:Database,private readonly matching:MatchingService){}
  @Get() async recommendations(@Req() r:Request,@Query() query:OriginQuery) {
    const actor=user(r),now=Date.now(),generatedAt=new Date(now).toISOString();
    const [profile]=await this.db.query('SELECT p.* FROM profile p JOIN account a ON a.id=p.user_id WHERE p.user_id=$1 AND a.active',[actor]);
    if(!profile)throw new NotFoundException();
    const visibility=visibleExternalProviders(this.db);
    const results=await Promise.allSettled([
      query.origine==='externes'?Promise.resolve({status:'HIDDEN',items:[]}):this.internal(actor,profile),
      query.origine==='partenaires'?Promise.resolve({status:'HIDDEN',personalization:profile.qualifications.length?'PARTIAL':'GENERAL_PROFILE_INCOMPLETE',items:[],sources:[]}):visibility.then(sources=>this.external(profile,generatedAt,sources)),
      visibility,
    ] as const);
    const externalCatalogueVisible=results[2].status==='fulfilled'&&results[2].value.length>0;
    return {mode:'MIXED',generatedAt,externalCatalogueVisible,
      internal:results[0].status==='fulfilled'?results[0].value:{status:'UNAVAILABLE',rppsStatus:profile.rpps_status,items:[]},
      external:results[1].status==='fulfilled'?results[1].value:{status:'UNAVAILABLE',personalization:profile.qualifications.length?'PARTIAL':'GENERAL_PROFILE_INCOMPLETE',items:[],sources:[]},
    };
  }
  private async internal(actor:string,profile:any) {
    if(!profile.qualifications.length || profile.rpps_status!=='FOUND'){
      const rows=await this.db.query("SELECT id,title,qualification,service,shift,address,start_at,end_at,timezone,hourly_salary,status,version,created_at FROM mission WHERE status='OPEN' AND start_at>now() ORDER BY created_at DESC,id LIMIT 3");
      return {status:'READY',personalization:'GENERAL_PROFILE_INCOMPLETE',rppsStatus:profile.rpps_status,items:rows.map(m=>({...m,id:'m_'+m.id,kind:'INTERNAL_MISSION',publicationDate:m.created_at,importedAt:null,sourceUpdatedAt:null,salary:{amount:Number(m.hourly_salary),currency:'EUR',unit:'HOUR',gross:true}}))};
    }
    const selected=await this.matching.forNurse(actor,{limit:3,offset:0},'recent');
    if(!selected.items.length)return {status:'READY',personalization:'COMPATIBLE',rppsStatus:selected.rppsStatus,items:[]};
    const rows=await this.db.query("SELECT id,title,qualification,service,shift,address,start_at,end_at,timezone,hourly_salary,status,version FROM mission WHERE id=ANY($1::uuid[]) AND status='OPEN' AND start_at>now()",[selected.items.map(x=>x.missionId)]);
    return {status:'READY',personalization:'COMPATIBLE',rppsStatus:selected.rppsStatus,items:selected.items.flatMap((x:any)=>{
      const m=rows.find(r=>r.id===x.missionId);if(!m||m.version!==x.missionVersion)return [];
      return [{...m,id:'m_'+m.id,kind:'INTERNAL_MISSION',matching_score:x.score,match_explanation_id:x.explanationId,publicationDate:x.publishedAt??null,importedAt:null,sourceUpdatedAt:null,salary:{amount:Number(m.hourly_salary),currency:'EUR',unit:'HOUR',gross:true}}];
    })};
  }
  private async external(profile:any,generatedAt:string,visibleSources:string[]) {
    if(!visibleSources.length){
      return {status:'HIDDEN',personalization:profile.qualifications.length?'PARTIAL':'GENERAL_PROFILE_INCOMPLETE',items:[],sources:[]};
    }
    return this.db.transaction(async em=>{
    // Rank and hydrate one consistent snapshot without transferring full provider payloads.
    await em.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await em.query("SET LOCAL statement_timeout = '5000ms'");
    const budget = rankingBudget();
    let cursor='00000000-0000-0000-0000-000000000000';const top:any[]=[];
    const p=professional(profile);
    while(true){
      const batch=await em.query("SELECT id,title,"+externalRankingProvenanceSql('provenance')+" AS provenance FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at>now()) AND source=ANY($1::text[]) AND id>$2::uuid ORDER BY id LIMIT 500",[visibleSources,cursor]);
      budget(batch.length);
      if(!batch.length)break;
      for(const row of batch){
        const comparison=partialOfferMatch(row,p,generatedAt);
        const item={id:'e_'+row.id,profileCorrespondence:comparison,publicationDate:publicationDate(row.provenance?.publishedAt,Date.parse(generatedAt)),relevance:externalRelevance(comparison)};
        top.push(item);top.sort(compareRecentExternal);if(top.length>3)top.pop();
      }
      cursor=batch[batch.length-1].id;
    }
    const rows=top.length?await em.query("SELECT id,source,title,description,url,location_label,qualification,imported_at,expires_at,provenance,parsed_offer FROM external_offer WHERE id=ANY($1::uuid[]) AND active AND (expires_at IS NULL OR expires_at>now()) AND source=ANY($2::text[])",[top.map(item=>item.id.slice(2)),visibleSources]):[];
    const byId=new Map(rows.map(row=>['e_'+row.id,row]));
    const sources=await em.query("SELECT DISTINCT ON(provider) provider,status,created_at FROM import_run WHERE provider=ANY($1::text[]) ORDER BY provider,created_at DESC",[visibleSources]);
    return {status:'READY',personalization:profile.qualifications.length?'PARTIAL':'GENERAL_PROFILE_INCOMPLETE',items:top.flatMap(({relevance,...item})=>{
      const row=byId.get(item.id);if(!row)return [];
      return [externalPresentation({...row,...item,kind:'EXTERNAL_OFFER',applicationMode:'REDIRECT',eligibility:'INCOMPLETE',importedAt:row.imported_at,sourceUpdatedAt:publicationDate(row.provenance?.sourceUpdatedAt,Date.parse(generatedAt))})];
    }),sources};
    });
  }
}
