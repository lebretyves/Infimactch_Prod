// Safe demonstration importer. It never creates organizations or publishes missions.
// SQL reads may be supplied by an authorized caller; writes require isolated local test DB.
const fs=require('node:fs'),crypto=require('node:crypto');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
require(ROOT+'/node_modules/reflect-metadata');
const {validate}=require(ROOT+'/node_modules/class-validator');
const {MissionDto}=require(ROOT+'/backend/dist/missions/mission.dto');
const {finessFreshness}=require(ROOT+'/backend/dist/reference-data/finess-freshness');
const {interval}=require(ROOT+'/backend/dist/domain/matching');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function load(directory){
 const dataset=fs.readFileSync(directory+'/missions.json'),fingerprint=sha(dataset);
 const envelopes=JSON.parse(fs.readFileSync(directory+'/mission-draft-payloads.json'));
 if(envelopes.datasetSha256!==fingerprint)throw Error('DATASET_FINGERPRINT_MISMATCH');
 const missions=JSON.parse(dataset).missions,reference=JSON.parse(fs.readFileSync(directory+'/sources/finess-active-20260917.json'));
 const byFiness=new Map();for(const row of reference.rows){const group=byFiness.get(row.finess)||[];group.push(row);byFiness.set(row.finess,group);}
 const sourceById=new Map(missions.map(m=>[m.id,m]));
 if(sourceById.size!==missions.length)throw Error('DUPLICATE_REQUEST_ID');
 const expected=missions.reduce((n,m)=>n+m.schedule.shifts.length,0);
 if(envelopes.rows.length!==expected)throw Error('VACATION_COUNT_MISMATCH');
 const seen=new Set();
 for(const item of envelopes.rows){
 const key=item.requestId+':'+item.vacationNumber;if(seen.has(key))throw Error('DUPLICATE_VACATION');seen.add(key);
 const source=sourceById.get(item.requestId),shift=source?.schedule.shifts[item.vacationNumber-1];
 if(!source||!shift||source.establishment.finess!==item.sourceFiness)throw Error('SOURCE_REFERENCE_MISMATCH');
 if(['establishmentId','agencyId','staffingRequestId'].some(k=>k in item.dto))throw Error('PREBOUND_ORGANIZATION_NOT_ALLOWED');
 if((item.dto.specialty??null)!==(source.specialty??null))throw Error('SPECIALTY_SOURCE_MISMATCH');
 if(item.metadata.timezone!==source.schedule.timezone)throw Error('SOURCE_TIMEZONE_MISMATCH');
 if(item.dto.start!==shift.start||item.dto.end!==shift.end)throw Error('VACATION_INTERVAL_MISMATCH');
 if(item.dto.timezone!==source.schedule.timezone)throw Error('PAYLOAD_TIMEZONE_MISMATCH');
 for(const field of ['title','qualification','service','population','block','minExperienceMonths','shift'])if(item.dto[field]!==source[field])throw Error('PAYLOAD_SOURCE_MISMATCH:'+field);
 for(const field of ['requiredSkills','desiredSkills'])if(JSON.stringify(item.dto[field])!==JSON.stringify(source[field]))throw Error('PAYLOAD_SOURCE_MISMATCH:'+field);
 for(const field of ['address','latitude','longitude'])if(item.dto[field]!==source.establishment[field])throw Error('PAYLOAD_SOURCE_MISMATCH:'+field);
 if(item.dto.hourlySalary!==source.salary.hourlyGrossEstimate||item.dto.description!=='DEMONSTRATION — BESOIN FICTIF, NON PUBLIE PAR CET ETABLISSEMENT.\n'+source.description)throw Error('PAYLOAD_CONTENT_MISMATCH');
 if(!source.isDemo||source.publicationAllowed!==false||item.targetState!=='DRAFT')throw Error('DEMO_ONLY');
 }
 return {fingerprint,envelopes,missions,reference,byFiness};
}
async function organizationCandidates(db,finesses,actor){
 // No account details returned. Exact geographic FINESS only; never fuzzy name matching.
 return db.query(`SELECT o.id,o.finess,
 EXISTS(SELECT 1 FROM account a JOIN membership m ON m.user_id=a.id WHERE a.id=$2::uuid AND a.active AND NOT a.platform_only AND a.family='ENTERPRISE' AND m.active AND m.organization_id=o.id) AS direct_authorized,
 ARRAY(SELECT l.agency_id FROM agency_link l JOIN membership m ON m.organization_id=l.agency_id JOIN organization agency ON agency.id=l.agency_id JOIN account a ON a.id=m.user_id WHERE l.establishment_id=o.id AND agency.kind='AGENCY' AND m.user_id=$2::uuid AND m.active AND a.active AND NOT a.platform_only AND a.family='ENTERPRISE' ORDER BY l.agency_id) AS authorized_agencies
 FROM organization o WHERE o.kind='ESTABLISHMENT' AND o.finess=ANY($1::text[]) ORDER BY o.finess,o.id`,[finesses,actor||null]);
}
async function prepare(loaded,candidates=[],actorKnown=false){
 const freshness=finessFreshness({generated_at:loaded.reference.generatedAt,imported_at:null,summary:{rows:loaded.reference.rows.length}});
 const groups=new Map();for(const org of candidates){const rows=groups.get(org.finess)||[];rows.push(org);groups.set(org.finess,rows);}
 const rows=[],sites=[];
 for(const finess of new Set(loaded.envelopes.rows.map(r=>r.sourceFiness))){
 const refs=loaded.byFiness.get(finess)||[],orgs=groups.get(finess)||[];let referenceStatus=refs.length===1&&refs[0].status==='A'&&!refs[0].closedAt?'MATCHED_ACTIVE':refs.length>1?'AMBIGUOUS':'MISSING_OR_CLOSED';
 const org=orgs.length===1?orgs[0]:null;
 const agencies=org?.authorized_agencies||[];
 const auth=!!(actorKnown&&org&&(org.direct_authorized||agencies.length===1));
 sites.push({finess,referenceStatus,organizationStatus:orgs.length===0?'MISSING':orgs.length>1?'AMBIGUOUS':'MATCHED',authorizationStatus:!actorKnown?'NOT_CHECKED':auth?'AUTHORIZED':agencies.length>1&&!org?.direct_authorized?'AMBIGUOUS_AGENCY':'NOT_AUTHORIZED',organizationId:org?.id||null,agencyId:auth&&!org.direct_authorized?agencies[0]:null});
 }
 const siteById=new Map(sites.map(r=>[r.finess,r]));
 for(const source of loaded.envelopes.rows){
 const site=siteById.get(source.sourceFiness),errors=[];
 if(['EXPIRED','INVALID','MISSING'].includes(freshness.status))errors.push('FINESS_REFERENCE_'+freshness.status);
 if(site.referenceStatus!=='MATCHED_ACTIVE')errors.push('FINESS_'+site.referenceStatus);
 if(site.organizationStatus!=='MATCHED')errors.push('ORGANIZATION_'+site.organizationStatus);
 if(site.authorizationStatus!=='AUTHORIZED')errors.push('AUTHORIZATION_'+site.authorizationStatus);
 const body={...source.dto,timezone:source.metadata.timezone};if(site.organizationId)body.establishmentId=site.organizationId;if(site.agencyId)body.agencyId=site.agencyId;
 for(const e of await validate(Object.assign(new MissionDto(),body),{whitelist:true,forbidNonWhitelisted:true}))errors.push('DTO_'+e.property.toUpperCase());
 try{interval(body);}catch(e){errors.push(e.message);}
 rows.push({requestId:source.requestId,vacationNumber:source.vacationNumber,sourceFiness:source.sourceFiness,targetState:'DRAFT',idempotencyKey:'demo:'+sha(loaded.fingerprint+':'+source.requestId+':'+source.vacationNumber),body,errors:[...new Set(errors)],warnings:source.warnings,sourceTimezone:source.metadata.timezone});
 }
 const count=(values,key)=>values.reduce((o,r)=>(o[r[key]]=(o[r[key]]||0)+1,o),{});
 return {datasetSha256:loaded.fingerprint,referenceGeneratedAt:loaded.reference.generatedAt,freshness,actorAuthorizationChecked:actorKnown,summary:{sites:sites.length,requests:loaded.missions.length,vacations:rows.length,reference:count(sites,'referenceStatus'),organizations:count(sites,'organizationStatus'),authorization:count(sites,'authorizationStatus'),readyVacations:rows.filter(r=>!r.errors.length).length,blockedVacations:rows.filter(r=>r.errors.length).length},sites,rows};
}
async function applyIsolated(db,service,loaded,actor,databaseUrl){
 const u=new URL(databaseUrl);if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
 const connection=new URL(db.source.options.url);if(connection.href!==u.href)throw Error('DATABASE_CONNECTION_MISMATCH');
 const ids=[...new Set(loaded.envelopes.rows.map(r=>r.sourceFiness))];
 const prepared=await prepare(loaded,await organizationCandidates(db,ids,actor),true);
 const results=[];
 for(const row of prepared.rows){
 if(row.errors.length)continue;
 const result=await service.create(actor,row.body,row.idempotencyKey);if(result.status!=='DRAFT')throw Error('DRAFT_REQUIRED');
 results.push({requestId:row.requestId,vacationNumber:row.vacationNumber,missionId:result.id,status:result.status});
 }
 return {prepared,results};
}
module.exports={load,prepare,organizationCandidates,applyIsolated};
if(require.main===module){const dir=process.argv[2]||path.resolve(ROOT,'../livrables/missions-500');(async()=>{const evidenceFile=dir+'/organization-finess-readonly.json',evidence=fs.existsSync(evidenceFile)?JSON.parse(fs.readFileSync(evidenceFile)):null;const result=await prepare(load(dir),evidence?.organizations||[],false);result.organizationLookupScope=evidence?.summary||'NO_DATABASE_CONNECTED; MISSING means no supplied organization evidence, not absence from application database.';fs.writeFileSync(dir+'/mission-import-prepared-finess.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary));})().catch(e=>{console.error(e.message);process.exitCode=1});}
