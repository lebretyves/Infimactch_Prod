const str={type:"string"},num={type:"number"},int={type:"integer"},bool={type:"boolean"},uuid={...str,format:"uuid"},date={...str,format:"date-time"};
const obj=(properties:Record<string,any>,required:string[]=[])=>({type:"object",properties,required});
const array=(items:any)=>({type:"array",items});const nullable=(s:any)=>({...s,nullable:true});const ref=(s:string)=>({$ref:"#/components/schemas/"+s});
const page=(items:any)=>obj({items:array(items),limit:int,offset:int,total:int,excluded:int},["items","limit","offset","total"]);
const interval=obj({start:date,end:date},["start","end"]);
const organization=obj({id:uuid,kind:{...str,enum:["AGENCY","ESTABLISHMENT"]},name:str,address:str,referent:str,finess:nullable(str),siret:nullable(str)},["id","kind","name"]);
const session=obj({idleTimeoutMs:int,idleExpiresAt:int},["idleTimeoutMs","idleExpiresAt"]);
const match=obj({eligible:bool,score:nullable(num),reasons:array(str),missionId:uuid,explanationId:nullable(str),historyStatus:str,candidateId:uuid,display_name:str,qualifications:array(str),skills:array(str)},["eligible","score"]);
const closure=obj({id:uuid,status:{...str,enum:["REQUESTED","APPROVED","COMPLETED","CANCELLED"]},requested_at:date,approved_at:nullable(date),completed_at:nullable(date)},["id","status","requested_at"]);
const profile=obj({user_id:uuid,display_name:str,qualifications:array(str),skills:array(str),experience:array(obj({service:str,months:num})),available:array(interval),unavailable:array(interval),latitude:nullable(num),longitude:nullable(num),radius_km:nullable(num),accepted_shifts:array(str),preferred_shifts:array(str),visible:bool,notifications_enabled:bool,rpps_number:nullable(str),rpps_status:{...str,enum:["NOT_CHECKED","FOUND","NOT_FOUND","PENDING"]},rpps_version:int,rpps_checked_at:nullable(date),updated_at:date,details:{type:"object",additionalProperties:true,description:"Versioned professional form fields; no bank document or credential"}},["user_id","display_name","qualifications","available","unavailable","rpps_status"]);
const auth=obj({user:obj({id:uuid,family:{...str,enum:["NURSE","ENTERPRISE"]}},["id","family"]),csrfToken:str},["user","csrfToken"]);
const ok=obj({ok:{type:"boolean",enum:[true]}},["ok"]);
const finess=obj({finess:str,name:str,address:str,city:str,postal_code:str,category_code:str,category_label:str},["finess","name"]);
export const additionalSchemas={Profile:profile,Organization:organization,SessionTiming:session,AuthReceipt:auth,MatchResult:match,ClosureRequest:closure,
 OfferFreshness:obj({lastSeenAt:nullable(date),staleAfterDays:int,state:{...str,enum:["RECENTLY_SEEN","STALE_UNVERIFIED","EXPIRED"]}},["lastSeenAt","staleAfterDays","state"]),
 ExternalCorrespondence:obj({mode:str,score:nullable(num),eligibilityVerified:bool,criteria:{type:"object",additionalProperties:obj({status:str,reason:str,offerValue:{},profileValue:{},value:{}})},warnings:array(str),missingForFullMatching:array(str)}),
};
export const additionalResponses:Record<string,any>={
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
 "GET /api/v1/missions/{id}":{allOf:[ref("Mission"),obj({assignments:array(ref("Assignment")),application_count:int})]},
 "GET /api/v1/applications/{id}":ref("Application"),
 "GET /api/v1/me/matches":{...page(match),properties:{...page(match).properties,rppsStatus:str}},
 "GET /api/v1/missions/{id}/candidates":page(match),
 "GET /api/v1/matches/{id}/explanation":obj({_id:str,ownerId:uuid,missionId:uuid,profileVersion:str,missionVersion:int,missionStatus:str,rulesVersion:str,result:match,stale:bool,notice:nullable(str),createdAt:date,updatedAt:date,expiresAt:date},["missionId","result","stale"]),
 "GET /api/v1/me/listings/{id}/correspondence":obj({id:str,profileCorrespondence:ref("ExternalCorrespondence")}),
 "POST /api/v1/me/favorites":ok,"DELETE /api/v1/me/favorites/{kind}/{id}":ok,
 "POST /api/v1/me/notifications/{id}/read":ok,
 "GET /api/v1/dashboards":obj({family:{...str,enum:["NURSE","ENTERPRISE"]},profile:obj({display_name:str,rpps_status:str,available:array(interval)}),counts:{type:"object",additionalProperties:{oneOf:[int,{type:"string",pattern:"^[0-9]+$"}]}},organizations:array(organization)},["family","counts"]),
 "GET /api/v1/me/organizations":obj({organizations:array(organization),links:array(obj({agency_id:uuid,establishment_id:uuid}))},["organizations","links"]),
 "PUT /api/v1/organizations/{id}":ok,
 "GET /api/v1/assignments/{id}/confirmation":obj({status:str,document_id:nullable(uuid),mission_version:int,template_version:int},["status","document_id"]),
 "GET /api/v1/me/bank-details":obj({iban:nullable(str),fictional:bool},["iban"]),
 "GET /api/v1/reference-data":obj({qualifications:array(str),ideServices:array(str),populations:array(str),blocks:array(str),blockSpecialties:array(str),shifts:array(str),salary:obj({currency:str,unit:str,gross:bool}),timezone:str,intervalConvention:str,search:obj({sameDimension:str,withinBranch:str,branches:str,dateWindow:str}),matching:{type:"object",additionalProperties:true},limits:obj({pageSize:int,maxPageSize:int,maxRadiusKm:int,documentMiB:int}),termsVersion:str}),
 "GET /api/v1/reference-data/finess":{...page(finess),properties:{...page(finess).properties,generated_at:date,imported_at:date,source_url:str,sha256:str,grantsOrganizationAccess:{type:"boolean",enum:[false]}}},
 "GET /api/v1/reference-data/finess/{finess}":obj({establishment:nullable(finess),status:{...str,enum:["FOUND_IN_SNAPSHOT","NOT_IN_SNAPSHOT"]},generated_at:date,imported_at:date,source_url:str,sha256:str,grantsOrganizationAccess:{type:"boolean",enum:[false]}},["establishment","status","grantsOrganizationAccess"]),
 "POST /api/v1/internal/automation/matches/{id}":obj({status:str,notifications:int},["status"]),
 "POST /api/v1/internal/automation/reminders":obj({status:str,notifications:int},["status","notifications"]),
 "POST /api/v1/internal/automation/confirmation/{id}":obj({status:str,documentId:uuid,done:bool},["status"]),
 "GET /api/v1/me/closure-request":obj({request:nullable(closure)},["request"]),
 "POST /api/v1/me/closure-request":closure,"DELETE /api/v1/me/closure-request":closure,
};
