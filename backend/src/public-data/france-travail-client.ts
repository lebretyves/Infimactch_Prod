export type FtQuery = { keyword?: string; rome?: string; department?: string; min?: string; max?: string; start: number };
export type FtPage = { rows: any[]; total: number; next: number | null };
export class FranceTravailClient {
 private token = ''; private expires = 0; private lastCall = 0; private deadline=Date.now()+90000;
 private signal(){const remaining=this.deadline-Date.now();if(remaining<=0)throw Error('FT_BATCH_DEADLINE');return AbortSignal.timeout(Math.max(1,Math.min(15000,remaining)));}
 constructor(private transport: typeof fetch = fetch, private pause = (ms:number)=>new Promise<void>(r=>setTimeout(r,ms))) {}
 private async authorization() {
  if(this.token && this.expires>Date.now()+30000)return this.token;
  const id=process.env.FT_CLIENT_ID,secret=process.env.FT_CLIENT_SECRET;
  if(!id||!secret)throw Error('France Travail credentials missing; no real acquisition performed');
  const res=await this.transport('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret,scope:'api_offresdemploiv2 o2dsoffre'}),signal:this.signal()});
  if(!res.ok)throw Error('France Travail authentication unavailable');
  const auth:any=await res.json();if(typeof auth.access_token!=='string'||!auth.access_token)throw Error('Invalid token response');
  this.token=auth.access_token;this.expires=Date.now()+Math.max(60,Number(auth.expires_in)||300)*1000;return this.token;
 }
 private async request(path:string,params?:URLSearchParams):Promise<Response>{
  for(let attempt=0;attempt<3;attempt++){
   const token=await this.authorization();const delay=Math.max(0,130-(Date.now()-this.lastCall));if(delay)await this.pause(delay);this.lastCall=Date.now();
   const url=new URL('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/'+path);if(params)url.search=params.toString();
   const response=await this.transport(url,{redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:this.signal()});
   if(response.status===401&&attempt===0){this.token='';continue;}
   if((response.status===429||response.status>=500)&&attempt<2){const retry=Number(response.headers.get('retry-after'));if(retry>5)return response;await this.pause(Number.isFinite(retry)&&retry>0?retry*1000:500*(attempt+1));continue;}
   return response;
  }throw Error('France Travail retry exhausted');
 }
 async search(query:FtQuery,limit=150):Promise<FtPage>{
  if(!Number.isInteger(limit)||limit<1||limit>150)throw Error('Limit must be between 1 and 150');
  if(!Number.isInteger(query.start)||query.start<0||query.start>3000)throw Error('FT_RANGE_LIMIT');
  if(query.department!==undefined&&!/^(?:\d{2}|2A|2B|97\d)$/.test(query.department))throw Error('Invalid department');
  const params=new URLSearchParams({typeContrat:'MIS',range:query.start+'-'+(query.start+limit-1),sort:'1'});
  if(query.keyword)params.set('motsCles',query.keyword);if(query.rome)params.set('codeROME',query.rome);if(query.department)params.set('departement',query.department);
  if(query.min)params.set('minCreationDate',query.min);if(query.max)params.set('maxCreationDate',query.max);
  const response=await this.request('search',params);
  if(response.status===204)return {rows:[],total:0,next:null};
  if(!response.ok)throw Error('France Travail search unavailable (HTTP '+response.status+')');
  const data:any=await response.json();if(!Array.isArray(data.resultats)||data.resultats.length>limit)throw Error('Unexpected offer response');
  for(const row of data.resultats)if(!row||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,50}$/.test(row.id))throw Error('Unexpected offer identifier');
  const range=response.headers.get('content-range')?.match(/^offres\s+(\d+)-(\d+)\/(\d+)$/i);
  if(response.status===206&&!range)throw Error('FT_PAGINATION_HEADER_MISSING');
  const total=range?Number(range[3]):query.start+data.resultats.length;
  if(range&&(Number(range[1])!==query.start||Number(range[2])+1-query.start!==data.resultats.length||total<Number(range[2])+1))throw Error('FT_PAGINATION_INCONSISTENT');
  const next=query.start+data.resultats.length;
  if(response.status===206&&!data.resultats.length)throw Error('FT_PAGINATION_STALLED');
  return {rows:data.resultats,total,next:next<total?next:null};
 }
 async detail(id:string){if(!/^[A-Za-z0-9_-]{1,50}$/.test(id))throw Error('Invalid offer identifier');return this.request(encodeURIComponent(id));}
}
export const FT_KEYWORDS=['infirmier','IDE','IADE','IBODE'];
export const FT_NURSING_ROME=['J1503','J1504','J1506'];
export function initialFtQueries(now=new Date()):FtQuery[]{const bounds={min:'1970-01-01T00:00:00Z',max:now.toISOString().replace(/\.\d{3}Z$/,'Z'),start:0};return [...FT_KEYWORDS.map(keyword=>({...bounds,keyword})),...FT_NURSING_ROME.map(rome=>({...bounds,rome}))];}
export function advanceFtQuery(query:FtQuery,page:FtPage):FtQuery[]{
 if(page.total>3150){
  const low=Date.parse(query.min||'1970-01-01T00:00:00Z'),high=Date.parse(query.max||new Date().toISOString());
  if(!Number.isFinite(low)||!Number.isFinite(high)||high-low<=3000)throw Error('FT_PARTITION_SATURATED_INCOMPLETE');
  const mid=high-low>60*86400000?high-30*86400000:Math.floor((low+high)/2000)*1000;const iso=(t:number)=>new Date(t).toISOString().replace(/\.\d{3}Z$/,'Z');
  return [{...query,start:0,max:iso(mid)},{...query,start:0,min:iso(mid-1000)}];
 }
 if(page.next===null)return [];
 if(page.next>3000)throw Error('FT_RANGE_INCOMPLETE');
 return [{...query,start:page.next}];
}
