const str={type:"string"},num={type:"number"},int={type:"integer"},bool={type:"boolean"},uuid={...str,format:"uuid"},date={...str,format:"date-time"};
const obj=(properties:Record<string,any>,required:string[]=[])=>({type:"object",properties,required});
const array=(items:any)=>({type:"array",items});const nullable=(s:any)=>({...s,nullable:true});const ref=(s:string)=>({$ref:"#/components/schemas/"+s});
const page=(items:any)=>obj({items:array(items),limit:int,offset:int,total:int,excluded:int},["items","limit","offset","total"]);
const conversionRate=obj({numerator:int,denominator:int,percent:nullable(num)},["numerator","denominator","percent"]);
const interval=obj({start:date,end:date},["start","end"]);
const organization=obj({id:uuid,kind:{...str,enum:["AGENCY","ESTABLISHMENT"]},name:str,address:str,referent:str,finess:nullable(str),siret:nullable(str)},["id","kind","name"]);
const session=obj({idleTimeoutMs:int,idleExpiresAt:int},["idleTimeoutMs","idleExpiresAt"]);
const match=obj({eligible:bool,score:nullable(num),indicativeScore:num,reasons:array(str),missionId:uuid,explanationId:nullable(str),historyStatus:str,candidateId:uuid,display_name:str,qualifications:array(str),skills:array(str)},["eligible","score"]);
const closure=obj({id:uuid,status:{...str,enum:["REQUESTED","APPROVED","PROCESSING","COMPLETED","CANCELLED","REJECTED"]},requested_at:date,approved_at:nullable(date),completed_at:nullable(date),decision_reason:nullable(str),last_error:nullable(str)},["id","status","requested_at"]);
const profile=obj({user_id:uuid,display_name:str,qualifications:array(str),skills:array(str),experience:array(obj({service:str,start:date,end:date,establishment:str})),available:array(interval),unavailable:array(interval),latitude:nullable(num),longitude:nullable(num),radius_km:nullable(num),accepted_shifts:array(str),preferred_shifts:array(str),visible:bool,notifications_enabled:bool,rpps_number:nullable(str),rpps_status:{...str,enum:["NOT_CHECKED","FOUND","NOT_FOUND","PENDING"]},rpps_version:int,rpps_checked_at:nullable(date),updated_at:date,details:{type:"object",additionalProperties:true,description:"Versioned professional form fields; no bank document or credential"}},["user_id","display_name","qualifications","available","unavailable","rpps_status"]);
const auth=obj({user:obj({id:uuid,family:{...str,enum:["NURSE","ENTERPRISE"]}},["id","family"]),csrfToken:str},["user","csrfToken"]);
const ok=obj({ok:{type:"boolean",enum:[true]}},["ok"]);
const finess=obj({finess:str,name:str,address:str,city:str,postal_code:str,category_code:str,category_label:str},["finess","name"]);
const emailDeliveryJournal=obj({items:array(obj({id:uuid,kind:{...str,enum:['CONFIRMATION','CANCELLATION']},sendStatus:{...str,enum:['PENDING','SENDING','SENT','FAILED','CANCELLED','UNCERTAIN']},deliveryStatus:{...str,enum:['NOT_REPORTED','PROCESSED','DELIVERED','BOUNCED','REJECTED','SPAM']},createdAt:date,acceptedAt:nullable(date),deliveryEventAt:nullable(date),processedAt:nullable(date),deliveredAt:nullable(date),bouncedAt:nullable(date),rejectedAt:nullable(date),spamAt:nullable(date),attempts:int,events:array(obj({event:str,happenedAt:date,receivedAt:date,bounceType:nullable(str)}))})),limit:int,observedAt:date},['items','limit','observedAt']);
const correction=obj({id:uuid,field:str,proposed_value:str,status:{...str,enum:['REQUESTED','COMPLETED','REJECTED']},requested_at:date,completed_at:nullable(date),decision_reason:nullable(str)},['id','field','proposed_value','status','requested_at']);
const supportTicket=obj({id:uuid,category:{...str,enum:['ACCESS','PROFILE','MISSION','DOCUMENT','NOTIFICATION','OTHER']},subject:str,status:{...str,enum:['OPEN','RESOLVED']},created_at:date,updated_at:date},['id','category','subject','status','created_at','updated_at']);
const supportList=obj({items:array(supportTicket),hasMore:bool},['items','hasMore']);
const supportDetail=obj({ticket:obj({...supportTicket.properties,description:str},[...supportTicket.required,'description']),replies:array(obj({id:uuid,body:str,is_staff:bool,created_at:date},['id','body','is_staff','created_at'])),hasMore:bool},['ticket','replies','hasMore']);
const cvEvidence={evidence:str,warnings:array(str)};
const cvCatalog=obj({code:str,label:str,...cvEvidence},['code','label','evidence','warnings']);
const contractPreparation=obj({
 assignment:obj({id:uuid,status:{...str,enum:['ACTIVE','COMPLETED','CANCELLED']}},['id','status']),
 mission:obj({id:uuid,title:str,qualification:str,service:str,address:str,startAt:date,endAt:date,timeZone:str,hourlySalary:{oneOf:[str,num]}},['id','title','qualification','service','address','startAt','endAt','timeZone','hourlySalary']),
 employer:obj({id:uuid,kind:str,name:str,address:str,siret:nullable(str),contact:str},['id','kind','name','address','siret','contact']),
 establishment:obj({name:str,address:str,finess:nullable(str)},['name','address','finess']),
 worker:obj({displayName:str,firstName:nullable(str),lastName:nullable(str)},['displayName','firstName','lastName']),
 canEdit:bool,preparation:obj({version:int,notes:obj({reason:str,workSchedule:str,payTerms:str,contactName:str,additionalNotes:str},['reason','workSchedule','payTerms','contactName','additionalNotes']),updatedAt:nullable(date)},['version','notes','updatedAt']),
 missingInformation:array(str),notice:str,
},['assignment','mission','employer','establishment','worker','canEdit','preparation','missingInformation','notice']);
export const additionalSchemas={
 RecoveryRequestDto:obj({email:{type:'string',format:'email',minLength:3,maxLength:254}},['email']),
 RecoveryCompleteDto:obj({token:{type:'string',pattern:'^[a-f0-9]{64}$'},password:{type:'string',minLength:12,maxLength:128}},['token','password']),
Profile:profile,Organization:organization,SessionTiming:session,AuthReceipt:auth,MatchResult:match,ClosureRequest:closure,
 OfferFreshness:obj({lastSeenAt:nullable(date),staleAfterDays:int,state:{...str,enum:["RECENTLY_SEEN","STALE_UNVERIFIED","EXPIRED"]}},["lastSeenAt","staleAfterDays","state"]),
 ExternalCorrespondence:obj({mode:str,score:nullable(num),eligibilityVerified:bool,criteria:{type:"object",additionalProperties:obj({status:str,reason:str,offerValue:{},profileValue:{},value:{}})},warnings:array(str),missingForFullMatching:array(str)}),
};
export const additionalResponses:Record<string,any>={
 "GET /api/v1/assignments/{id}/contract-preparation":contractPreparation,
 "PUT /api/v1/assignments/{id}/contract-preparation":contractPreparation,

 "GET /api/v1/missions/{id}/application-check":obj({warnings:array(str),blockingReasons:array(str),missingSkills:array(str),experienceMonths:num,requiredExperienceMonths:num,distanceKm:nullable(num)},['warnings','blockingReasons','missingSkills','experienceMonths','requiredExperienceMonths','distanceKm']),
 "GET /api/v1/me/missions/{id}/assignments":array(obj({id:uuid,status:{...str,enum:['ACTIVE','COMPLETED','CANCELLED']}},['id','status'])),
 "GET /api/v1/enterprise/missions":page({allOf:[ref('Mission'),obj({establishment_name:str,establishment_address:str,can_manage:bool})]}),
 "GET /api/v1/listings/locations/communes":obj({provider:{...str,enum:['IGN']},items:array(obj({label:str,latitude:num,longitude:num},['label','latitude','longitude']))},['provider','items']),
 "POST /api/v1/internal/automation/jobs/refresh-offers/{provider}":obj({provider:str,status:str,accepted:int},['provider','status','accepted']),

 "GET /api/v1/me/personal-corrections":obj({request:nullable(correction)},['request']),
 "POST /api/v1/me/personal-corrections":obj({id:uuid,status:str,requested_at:date},['id','status','requested_at']),
 "GET /api/v1/admin/personal-corrections":page(obj({...correction.properties,account_id:uuid,email:str,previous_value:str,reviewed_by:nullable(uuid)})),
 "POST /api/v1/admin/personal-corrections/{id}/approve":ok,
 "POST /api/v1/admin/personal-corrections/{id}/reject":ok,
 "GET /api/v1/me/support-tickets":supportList,
 "POST /api/v1/me/support-tickets":obj({id:uuid,status:str,created_at:date},['id','status','created_at']),
 "GET /api/v1/me/support-tickets/{id}":supportDetail,
 "POST /api/v1/me/support-tickets/{id}/replies":obj({id:uuid},['id']),
 "GET /api/v1/admin/support-tickets":supportList,
 "GET /api/v1/admin/support-tickets/{id}":supportDetail,
 "POST /api/v1/admin/support-tickets/{id}/replies":obj({id:uuid},['id']),
 "GET /api/v1/dashboards/conversions":obj({organization:obj({id:uuid,name:str,kind:str},['id','name','kind']),period:obj({from:{...str,format:'date'},to:{...str,format:'date'},timeZone:{...str,enum:['UTC']},endInclusive:bool}),observedAt:date,fillRate:conversionRate,selectionRate:conversionRate,missionCancellationRate:conversionRate,assignmentCancellationRate:conversionRate,fillDelay:obj({averageHours:nullable(num),samples:int}),exclusions:obj({demoMissions:int,undatedPublications:int,undatedApplications:int,externalOffers:bool}),definitions:obj({fill:str,selection:str,cancellation:str,delay:str,history:str})},['organization','period','observedAt','fillRate','selectionRate','missionCancellationRate','assignmentCancellationRate','fillDelay','exclusions','definitions']),
 "POST /api/v1/profile/cv/parse":obj({experiences:array(obj({establishment:str,service:str,startDate:{...str,format:'date'},endDate:{...str,format:'date'},periodLabel:str,...cvEvidence})),warnings:array(str),method:{...str,enum:['RULES_V2']},requiresReview:{...bool,enum:[true]},suggestions:obj({identity:obj(Object.fromEntries(['firstName','lastName','email','phone','city','postalCode'].map(key=>[key,obj({value:str,...cvEvidence},['value','evidence','warnings'])]))),diplomas:array(obj({qualification:{...str,enum:['IDE','IADE','IBODE']},year:nullable(int),...cvEvidence})),skills:array(cvCatalog),services:array(cvCatalog)})}),

 "POST /api/v1/internal/automation/smtp2go/webhook":ok,
 "GET /api/v1/me/email-deliveries":emailDeliveryJournal,
 "GET /api/v1/admin/accounts/{id}/email-deliveries":emailDeliveryJournal,
 "GET /api/v1/me/matches/mission/{id}":match,
 "GET /api/v1/matching/rules":obj({version:str,weights:obj({C:num,Z:num,D:num,E:num},['C','Z','D','E']),rppsRequired:bool},['version','weights','rppsRequired']),
 "GET /api/v1/assignments/{id}/cancellation":obj({status:str,document_id:nullable(uuid),created_at:date},['status','document_id']),

 "GET /api/v1/listings/locations":obj({provider:str,items:array(obj({label:str,latitude:num,longitude:num}))}),

 "PUT /api/v1/me/bank-document":obj({id:uuid,status:str}),
 "GET /api/v1/me/bank-document":{type:'string',format:'binary'},

 "POST /api/v1/auth/recovery/request":obj({ok:bool,message:str}),
 "POST /api/v1/auth/recovery/complete":ok,
 "GET /api/v1/admin/recovery-requests":page(obj({id:uuid,account_id:uuid,email:str,status:str,requested_at:date,issued_at:nullable(date),expires_at:nullable(date),completed_at:nullable(date),decision_reason:nullable(str)})),
 "POST /api/v1/admin/recovery-requests/{id}/issue":obj({id:uuid,status:str,resetUrl:str,expiresAt:date}),
 "POST /api/v1/admin/recovery-requests/{id}/reject":ok,
 "GET /api/v1/admin/privacy-requests/{id}":obj({request:closure,blockers:array(obj({code:str,label:str})),canExecute:bool}),
 "POST /api/v1/admin/privacy-requests/{id}/approve":ok,
 "POST /api/v1/admin/privacy-requests/{id}/reject":ok,
 "POST /api/v1/admin/privacy-requests/{id}/execute":obj({ok:bool,status:str,last_error:nullable(str)}),

 "GET /api/v1/admin/csrf":obj({csrfToken:str}),
 "GET /api/v1/admin/accounts/{id}/notifications":obj({observedAt:str,connection:obj({}),personal:obj({}),internal:obj({}),deliveries:obj({}),organizations:array(obj({})),catalog:obj({})}),
 "POST /api/v1/admin/invitation/check":obj({passwordSetupRequired:bool}),
 "POST /api/v1/admin/login":obj({status:str,csrfToken:str,secret:str,otpauthUri:str},["status","csrfToken"]),
 "POST /api/v1/admin/activate":obj({status:str,csrfToken:str,secret:str,otpauthUri:str},["status","csrfToken"]),
 "POST /api/v1/admin/reauth":ok,"POST /api/v1/admin/logout":ok,
 "POST /api/v1/admin/mfa":obj({status:str,csrfToken:str,role:str,recoveryCodes:array(str)},["status","csrfToken","role"]),
 "POST /api/v1/admin/mfa/recover":obj({status:str,csrfToken:str,secret:str,otpauthUri:str}),
 "GET /api/v1/admin/me":obj({id:uuid,email:str,role:str,permissions:array(str),confirmedAt:num}),
 "GET /api/v1/admin/overview":obj({observedAt:date,counts:obj({accounts:int,organizations:int,applications:int,pendingEvents:int,failedEvents:int,documents:int,missions:{type:"object",additionalProperties:int}}),alerts:array(obj({kind:str,message:str,href:str}))}),
 "GET /api/v1/admin/accounts":page(obj({id:uuid,email:str,family:str,active:bool,created_at:date,organizations:array(organization),rpps_status:str,rpps_checked_at:nullable(date)})),
 "GET /api/v1/admin/accounts/{id}":obj({account:obj({id:uuid,email:str,family:str,active:bool,created_at:date}),profile:nullable(obj({display_name:str,qualifications:array(str),rpps_status:str})),organizations:array(organization),documents:array(obj({id:uuid,kind:str,mime:str,status:str,size_bytes:int,created_at:date})),audit:array(obj({event:str,created_at:date}))}),
 "POST /api/v1/admin/accounts/{id}/state":ok,"POST /api/v1/admin/accounts/{id}/revoke":ok,
 "GET /api/v1/admin/organizations":page(organization),
 "GET /api/v1/admin/organizations/{id}":obj({organization,members:array(obj({user_id:uuid,email:str,active:bool,account_active:bool})),links:array(obj({agency_id:uuid,establishment_id:uuid,agency_name:str,establishment_name:str}))}),
 "POST /api/v1/admin/organizations/{id}/members":ok,"POST /api/v1/admin/organizations/{id}/links":ok,
 "GET /api/v1/admin/missions/{id}/matching":page(obj({id:str,ownerId:uuid,missionId:uuid,missionVersion:int,profileVersion:str,rulesVersion:str,createdAt:date,expiresAt:date,result:match,stale:bool})),
 "GET /api/v1/admin/accounts/{id}/verification":obj({directory:obj({status:str,checkedAt:nullable(date),reason:nullable(str),identityReview:str}),professionalIdentity:nullable(obj({issuer:str,authenticatedAt:date})),reviews:array(obj({id:uuid,state:str,reason:str,created_at:date,actor_id:uuid}))}),
 "POST /api/v1/admin/accounts/{id}/verification":ok,
 "GET /api/v1/admin/operations":obj({sources:array(obj({provider:str,enabled:bool,updated_at:date,nextScheduleLabel:str,counts:obj({total:int,active:int}),lastRun:nullable(obj({status:str,created_at:date,accepted:nullable(int),rejected:nullable(int),duplicates:nullable(int),error:nullable(str)}))})),incidents:array(obj({id:uuid,service:str,state:str,impact:str,owner_label:str,started_at:date,updated_at:date,resolved_at:nullable(date)})),observedAt:date}),
 "POST /api/v1/admin/operations/sources/{provider}/state":ok,
 "POST /api/v1/admin/operations/sources/{provider}/visibility":ok,
 "POST /api/v1/admin/operations/sources/{provider}/refresh":obj({provider:str,status:str,accepted:int}),
 "GET /api/v1/admin/incidents":page(obj({id:uuid,service:str,state:str,impact:str,owner_label:str,started_at:date,updated_at:date,resolved_at:nullable(date)})),
 "POST /api/v1/admin/incidents":obj({id:uuid}),"POST /api/v1/admin/incidents/{id}":ok,
 "GET /api/v1/admin/privacy-requests":page(obj({id:uuid,account_id:uuid,status:str,requested_at:date,approved_at:nullable(date),completed_at:nullable(date)})),

 "GET /api/v1/admin/missions":page(ref("Mission")),
 "GET /api/v1/admin/missions/{id}":obj({mission:ref("Mission"),applications:array(ref("Application")),assignments:array(ref("Assignment")),events:array(obj({event:str,created_at:date,actor_id:nullable(uuid)}))}),
 "GET /api/v1/admin/jobs":page(obj({id:uuid,event:str,attempts:int,created_at:date,available_at:date,completed_at:nullable(date),lease_until:nullable(date),last_error:nullable(str)})),
 "POST /api/v1/admin/jobs/{id}/retry":obj({id:uuid,status:str}),
 "GET /api/v1/admin/executions":page(obj({id:uuid,state:str,checked_at:date,execution_id:str,workflow_id:str,action:str,duration_ms:str})),
 "GET /api/v1/admin/sources":obj({items:array(obj({source:str,count:nullable(int),active:nullable(int),lastImportedAt:nullable(date),configuration:str}))}),
 "GET /api/v1/admin/infrastructure":obj({observedAt:date,version:str,services:array(obj({name:str,state:str,latencyMs:num,message:str}))}),
 "GET /api/v1/admin/audit":page(obj({id:str,actor_id:nullable(uuid),event:str,resource_id:nullable(uuid),created_at:date})),
 "GET /api/v1/admin/access":obj({items:array(obj({user_id:uuid,email:str,platform_only:bool,role:str,active:bool,mfa_enrolled:bool,activation_completed:bool,invitation_pending:bool,invitation_expires_at:nullable(date),created_at:date}))}),
 "POST /api/v1/admin/access/invite":obj({invitation:str,expiresAt:date,email:str}),"POST /api/v1/admin/access/{id}/invitation":obj({invitation:str,expiresAt:date,email:str}),"POST /api/v1/admin/access/{id}/delete":ok,"POST /api/v1/admin/access/{id}":ok,
 "GET /api/v1/admin/quality":obj({items:array(obj({domain:str,status:str,detail:str,evidence:nullable(str)}))}),
 "GET /api/v1/admin/backups":obj({state:str,message:str,lastVerifiedAt:nullable(date)}),
 "GET /api/v1/auth/psc/config":obj({enabled:bool,environment:nullable(str)}),
 "POST /api/v1/auth/psc/start":obj({url:str}),
 "GET /api/v1/auth/psc/callback":obj({redirect:str}),

 "GET /api/v1/me/notifications-settings":obj({configured:bool,link:nullable(obj({discord_user_id:str,connected_at:date})),destinations:array(obj({id:uuid,user_id:nullable(uuid),organization_id:nullable(uuid),enabled:bool,events:array(str),channel_name:nullable(str),target_id:str})),preferences:array(obj({kind:str,discord:bool})),catalog:{type:"object",additionalProperties:str},organizationKinds:array(str)},["configured","link","destinations","preferences","catalog","organizationKinds"]),
 "POST /api/v1/me/notifications-settings/discord/challenge":ok,
 "POST /api/v1/me/notifications-settings/discord/verify":ok,
 "DELETE /api/v1/me/notifications-settings/discord":ok,
 "PUT /api/v1/me/notifications-settings/discord":ok,
 "PUT /api/v1/me/notifications-settings/organizations/{id}/discord":ok,
 "PUT /api/v1/me/notifications-settings/preferences/{kind}":ok,
 "GET /api/v1/me/notifications-settings/deliveries":array(obj({id:uuid,kind:str,status:str,last_error:nullable(str),created_at:date,sent_at:nullable(date)},["id","kind","status","created_at"])),
 "POST /api/v1/internal/automation/cancellation/{id}":obj({status:str,notifications:int},["status"]),
 "GET /api/v1/facilities/{id}":{allOf:[ref("Facility"),obj({missions:array(ref("Mission"))})]},
 "GET /api/v1/health":obj({status:str,application:str},["status","application"]),
 "GET /api/v1/auth/google/config":obj({enabled:bool,clientId:nullable(str)},["enabled","clientId"]),
 "POST /api/v1/auth/google/challenge":obj({nonce:str},["nonce"]),
 "GET /api/v1/auth/csrf":obj({csrfToken:str},["csrfToken"]),
 "POST /api/v1/auth/login":auth,"POST /api/v1/auth/register":auth,"POST /api/v1/auth/google/register":auth,
 "POST /api/v1/auth/google":{oneOf:[auth,obj({registrationRequired:{type:"boolean",enum:[true]}},["registrationRequired"])]},
 "GET /api/v1/auth/google/registration":obj({email:{...str,format:"email"},firstName:str,lastName:str},["email"]),
 "GET /api/v1/auth/me":obj({id:uuid,email:{...str,format:"email"},family:str,terms_version:str,terms_at:date,organizations:array(organization),session},["id","email","family","organizations","session"]),
 "POST /api/v1/auth/logout":ok,
 "GET /api/v1/profile":profile,"PUT /api/v1/profile":ok,
 "PATCH /api/v1/profile/availability":obj({available:array(interval),unavailable:array(interval)},["available","unavailable"]),
 "PUT /api/v1/profile/rpps":obj({status:str,reason:str},["status"]),"POST /api/v1/profile/rpps/retry":obj({status:str,reason:str},["status"]),
 "GET /api/v1/missions/{id}":{allOf:[ref("Mission"),obj({assignments:array(ref("Assignment")),application_count:int,can_manage:bool,events:array(obj({event:str,created_at:date}))})]},
 "GET /api/v1/applications/{id}":ref("Application"),
 "GET /api/v1/me/recommendations":obj({mode:str,generatedAt:date,externalCatalogueVisible:bool,internal:obj({status:str,rppsStatus:nullable(str),items:array(obj({id:str,title:str,qualification:str,matching_score:nullable(num),match_explanation_id:nullable(str),publicationDate:nullable(date)}))}),external:obj({status:str,personalization:str,items:array(obj({id:str,title:str,source:str,url:str,publicationDate:nullable(date),importedAt:nullable(date),sourceUpdatedAt:nullable(date)})),sources:array(obj({provider:str,status:str,created_at:date}))})}),
 "GET /api/v1/me/matches":{...page(match),properties:{...page(match).properties,rppsStatus:str}},
 "GET /api/v1/missions/{id}/candidates":page(match),
 "GET /api/v1/matches/{id}/explanation":obj({_id:str,ownerId:uuid,missionId:uuid,profileVersion:str,missionVersion:int,missionStatus:str,rulesVersion:str,result:match,stale:bool,notice:nullable(str),createdAt:date,updatedAt:date,expiresAt:date},["missionId","result","stale"]),
 "GET /api/v1/me/listings/{id}/correspondence":obj({id:str,profileCorrespondence:ref("ExternalCorrespondence")}),
 "POST /api/v1/me/favorites":ok,"DELETE /api/v1/me/favorites/{kind}/{id}":ok,
 "POST /api/v1/me/notifications/{id}/read":ok,
 "GET /api/v1/dashboards":obj({family:{...str,enum:["NURSE","ENTERPRISE"]},profile:obj({display_name:str,rpps_status:str,available:array(interval)}),counts:{type:"object",additionalProperties:{oneOf:[int,{type:"string",pattern:"^[0-9]+$"}]}},organizations:array(organization)},["family","counts"]),
 "GET /api/v1/me/establishments":page(obj({id:uuid,name:str,address:str,finess:nullable(str),agencies:array(obj({id:uuid,name:str})),total:int,counts:obj({DRAFT:int,OPEN:int,FILLED:int,COMPLETED:int,CANCELLED:int})})),
 "GET /api/v1/me/organizations":obj({organizations:array(organization),links:array(obj({agency_id:uuid,establishment_id:uuid}))},["organizations","links"]),
 "POST /api/v1/agencies/{agencyId}/establishments":obj({id:uuid,alreadyLinked:bool}),
 "DELETE /api/v1/agencies/{agencyId}/establishments/{id}":ok,
 "PUT /api/v1/organizations/{id}":ok,
 "GET /api/v1/assignments/{id}/confirmation":obj({status:str,document_id:nullable(uuid),mission_version:int,template_version:int},["status","document_id"]),
 "GET /api/v1/me/bank-details":obj({iban:nullable(str),details:nullable(obj({iban:str,bic:str,holder:str,bankName:str})),required:{type:"boolean",enum:[false],description:"Le RIB est toujours facultatif sur InfiMatch."},suggested:bool,document:nullable(obj({id:uuid,mime:str,size_bytes:int,created_at:date}))},["iban","details","required","suggested","document"]),
 "GET /api/v1/reference-data":obj({qualifications:array(str),ideServices:array(str),populations:array(str),blocks:array(str),blockSpecialties:array(str),shifts:array(str),salary:obj({currency:str,unit:str,gross:bool}),timezone:str,intervalConvention:str,search:obj({sameDimension:str,withinBranch:str,branches:str,dateWindow:str}),matching:{type:"object",additionalProperties:true},limits:obj({pageSize:int,maxPageSize:int,maxRadiusKm:int,documentMiB:int}),termsVersion:str}),
 "GET /api/v1/reference-data/finess":{...page(finess),properties:{...page(finess).properties,generated_at:date,imported_at:date,source_url:str,sha256:str,grantsOrganizationAccess:{type:"boolean",enum:[false]}}},
 "GET /api/v1/reference-data/finess/{finess}":obj({establishment:nullable(finess),status:{...str,enum:["FOUND_IN_SNAPSHOT","NOT_IN_SNAPSHOT"]},generated_at:date,imported_at:date,source_url:str,sha256:str,grantsOrganizationAccess:{type:"boolean",enum:[false]}},["establishment","status","grantsOrganizationAccess"]),
 "POST /api/v1/internal/automation/matches/{id}":obj({status:str,notifications:int},["status"]),
 "POST /api/v1/internal/automation/jobs/dispatch":obj({processed:int},["processed"]),
 "POST /api/v1/internal/automation/jobs/refresh-offers":obj({providers:array(obj({provider:str,status:str,accepted:int},["provider","status","accepted"]))},["providers"]),
 "POST /api/v1/internal/automation/jobs/maintenance":ok,
 "POST /api/v1/internal/automation/reminders":obj({status:str,notifications:int},["status","notifications"]),
 "POST /api/v1/internal/automation/confirmation/{id}":obj({status:str,documentId:uuid,done:bool},["status"]),
 "GET /api/v1/me/closure-request":obj({request:nullable(closure),googleLinked:bool},["request","googleLinked"]),
 "POST /api/v1/me/closure-request/google/challenge":obj({nonce:str},["nonce"]),
 "POST /api/v1/me/closure-request/google":closure,
 "POST /api/v1/me/closure-request":closure,"DELETE /api/v1/me/closure-request":closure,
};
