import { Injectable } from "@nestjs/common";
import { Database, audit, queueProfileMatches } from "../database/database";
import { nurse } from "../common/access";
export type RppsResult = {
  status: "FOUND" | "NOT_FOUND" | "PENDING";
  reason: string;
  identityReview?: "NOT_CHECKED" | "CONSISTENT_NAMES" | "REVIEW_REQUIRED";
};
export async function lookupRpps(
  number: string,
  apiKey: string | undefined,
  transport: typeof fetch = fetch,
  identity?: {firstName?:string;lastName?:string},
): Promise<RppsResult> {
  if (!apiKey) return { status: "PENDING", reason: "CREDENTIALS_MISSING" };
  try {
    const url = new URL(
      "https://gateway.api.esante.gouv.fr/fhir/v2/Practitioner",
    );
    url.searchParams.set("identifier", number);
    const res = await transport(url, {
      headers: { "ESANTE-API-KEY": apiKey, Accept: "application/fhir+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "PENDING", reason: res.status===429?"RATE_LIMITED":"PROVIDER_UNAVAILABLE" };
    const data: any = await res.json();
    if (
      data.resourceType !== "Bundle" ||
      data.type !== "searchset" ||
      !Number.isInteger(data.total) ||
      data.total < 0
    )
      return { status: "PENDING", reason: "INVALID_RESPONSE" };
    if (
      data.total === 0 &&
      (!data.entry || (Array.isArray(data.entry) && data.entry.length === 0))
    )
      return { status: "NOT_FOUND", reason: "EMPTY_EXACT_SEARCH" };
    const exact = Array.isArray(data.entry) ? data.entry.filter((e:any)=>e.resource?.resourceType==='Practitioner' && Array.isArray(e.resource.identifier) && e.resource.identifier.some((i:any)=>['https://rpps.esante.gouv.fr','http://rpps.esante.gouv.fr'].includes(i.system)&&i.value===number)) : [];
    if(exact.length===1){
      const normalize=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]/g,'');
      const names=exact[0].resource.name;
      if(identity?.firstName&&identity?.lastName){
        const same=Array.isArray(names)&&names.some((n:any)=>typeof n.family==='string'&&normalize(n.family)===normalize(identity.lastName!)&&Array.isArray(n.given)&&n.given.some((g:any)=>typeof g==='string'&&normalize(g)===normalize(identity.firstName!)));
        if(!same)return {status:'PENDING',reason:'IDENTITY_REVIEW_REQUIRED',identityReview:'REVIEW_REQUIRED'};
        return {status:'FOUND',reason:'EXACT_IDENTIFIER_FOUND',identityReview:'CONSISTENT_NAMES'};
      }
      return {status:'FOUND',reason:'EXACT_IDENTIFIER_FOUND',identityReview:'NOT_CHECKED'};
    }
    return { status: "PENDING", reason: "INCONSISTENT_RESPONSE" };
  } catch {
    return { status: "PENDING", reason: "PROVIDER_UNAVAILABLE" };
  }
}
@Injectable()
export class RppsService {
  constructor(private readonly db: Database) {}
  protected lookup(number: string, identity?: {firstName?:string;lastName?:string}): Promise<RppsResult> {
    if(process.env.RPPS_ENABLED==='false')return Promise.resolve({status:'PENDING',reason:'PROVIDER_DISABLED'});
    return lookupRpps(number, process.env.RPPS_API_KEY,fetch,identity);
  }
  async verify(actor: string, number: string) {
    const version = await this.db.transaction(async (em) => {
      await nurse(em, actor);
      const [p] = await em.query(
        "UPDATE profile SET rpps_number=$2,rpps_status='PENDING',rpps_version=rpps_version+1,rpps_checked_at=NULL,updated_at=now() WHERE user_id=$1 RETURNING rpps_version",
        [actor, number],
      );
      await audit(em, actor, "RPPS_REQUESTED", actor, {
        version: p.rpps_version,
      });
      return p.rpps_version;
    });
    const [identity]=await this.db.query("SELECT details FROM profile WHERE user_id=$1",[actor]);
    const result = await this.lookup(number,identity?.details);
    return this.db.transaction(async (em) => {
      await nurse(em, actor);
      const rows = await em.query(
        "UPDATE profile SET rpps_status=$4,rpps_checked_at=now(),rpps_reason=$5,rpps_identity_review=$6,updated_at=now() WHERE user_id=$1 AND rpps_number=$2 AND rpps_version=$3 RETURNING rpps_status",
        [actor, number, version, result.status,result.reason,result.identityReview??"NOT_CHECKED"],
      );
      if (!rows.length) return { status: "STALE_RESULT_IGNORED" };
      await audit(em, actor, "RPPS_RESULT", actor, { version, ...result });
      await queueProfileMatches(em, actor);
      return result;
    });
  }
}
