import { createHash } from "node:crypto";
import { Database } from "../database/database";
const PAGE_SIZE = 25;
export type JobsPipePage = { data: any[]; metadata: { next_cursor: string | null } };
export type JobsPipeStatus = 'CONTINUE' | 'COMPLETE' | 'INCOMPLETE' | 'RETRY_REQUIRED' | 'QUOTA_EXHAUSTED' | 'AUTH_REQUIRED' | 'BUSY' | 'COOLDOWN';
export type JobsPipeState = { version: 1; cycleId: string; cursor: string | null; seenIds: string[]; seenCursors: string[]; startedAt: string; completedAt?: string; retryAt?: string; terminal?: JobsPipeStatus; reason?: string };
type Receipt = { status: 'READY' | 'CACHED' | 'BUSY' | 'EXHAUSTED' | 'EXPIRED'; page?: JobsPipePage };
export interface CreditStore {
  reserve(key: string, now: Date): Promise<Receipt>;
  finish(key: string, charged: number, page: JobsPipePage | null, status: number | null): Promise<void>;
}
type Options = { manual?: boolean; transport?: typeof fetch; now?: Date; creditStore?: CreditStore };
const month = (date: Date) => date.toISOString().slice(0, 7) + '-01';
const nextMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// Public-offer receipts contain no API keys. A full reservation remains on uncertain I/O.
export function jobsPipeCreditStore(db: Database): CreditStore {
  return {
    reserve: (key, now) => db.transaction(async em => {
      await em.query('SELECT pg_advisory_xact_lock(1789382200)');
      const [prior] = await em.query('SELECT request_key, budget_month::text AS budget_month, charged, state, created_at, lease_until, response, http_status FROM jobspipe_request_receipt WHERE request_key=$1 FOR UPDATE', [key]);
      if (prior?.state === 'SUCCESS') return { status: 'CACHED', page: prior.response };
      if (prior && prior.budget_month.slice(0,7) !== month(now).slice(0,7)) return { status: 'EXPIRED' };
      if (prior && now.getTime() - Date.parse(prior.created_at) >= 23 * 3600000) return { status: 'EXPIRED' };
      if (prior?.lease_until && Date.parse(prior.lease_until) > now.getTime()) return { status: 'BUSY' };
      const [used] = await em.query('SELECT COALESCE(sum(charged),0)::int AS used FROM jobspipe_request_receipt WHERE budget_month=$1', [month(now)]);
      const blocked = await em.query('SELECT 1 FROM jobspipe_request_receipt WHERE budget_month=$1 AND http_status=402 LIMIT 1', [month(now)]);
      const previousCharge = prior ? Number(prior.charged) : 0;
      if (blocked.length || Number(used.used) + PAGE_SIZE - previousCharge > 1000) return { status: 'EXHAUSTED' };
      if (prior) await em.query("UPDATE jobspipe_request_receipt SET charged=25,state='RESERVED',lease_until=$2 WHERE request_key=$1", [key, new Date(now.getTime() + 90000)]);
      else await em.query("INSERT INTO jobspipe_request_receipt(request_key,budget_month,charged,state,created_at,lease_until) VALUES($1,$2,25,'RESERVED',$3,$4)", [key, month(now), now, new Date(now.getTime() + 90000)]);
      return { status: 'READY' };
    }),
    finish: async (key, charged, page, status) => {
      await db.query('UPDATE jobspipe_request_receipt SET charged=$2,state=$3,response=$4::jsonb,http_status=$5,lease_until=NULL WHERE request_key=$1', [key, charged, page ? 'SUCCESS' : 'RETRY', page ? JSON.stringify(page) : null, status]);
    },
  };
}
function validPage(value: any): value is JobsPipePage {
  return value && Array.isArray(value.data) && value.data.length <= 25 && value.data.every((r: any) => typeof r?.id === 'string' && /^[A-Za-z0-9_:-]{1,200}$/.test(r.id)) && value.metadata && (value.metadata.next_cursor === null || (typeof value.metadata.next_cursor === 'string' && value.metadata.next_cursor.length > 0 && value.metadata.next_cursor.length < 10000));
}
async function requestPage(db: Database, identity: string, filters: Record<string, unknown>, options: Options): Promise<{ page?: JobsPipePage; status?: JobsPipeStatus; reason?: string }> {
  const key = process.env.JOBSPIPE_API_KEY;
  if (!key) return { status: 'AUTH_REQUIRED', reason: 'API_KEY_MISSING' };
  const now = options.now || new Date(), store = options.creditStore || jobsPipeCreditStore(db);
  const id = 'infimatch-jp-' + hash(identity + JSON.stringify(filters));
  const receipt = await store.reserve(id, now);
  if (receipt.status === 'CACHED') return validPage(receipt.page) ? { page: receipt.page } : { status: 'INCOMPLETE', reason: 'INVALID_RECEIPT' };
  if (receipt.status === 'BUSY') return { status: 'BUSY' };
  if (receipt.status === 'EXHAUSTED') return { status: 'QUOTA_EXHAUSTED' };
  if (receipt.status === 'EXPIRED') return { status: 'INCOMPLETE', reason: 'IDEMPOTENCY_WINDOW_EXPIRED' };
  let res: Response;
  try {
    res = await (options.transport || fetch)('https://api.jobspipe.dev/v1/jobs/search', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': id },
      body: JSON.stringify({ ...filters, limit: PAGE_SIZE }),
    });
  } catch { await store.finish(id, 25, null, null); return { status: 'RETRY_REQUIRED', reason: 'NETWORK_UNCERTAIN' }; }
  if (!res.ok) {
    await store.finish(id, [401,402,429,502,504].includes(res.status) ? 0 : res.status === 400 ? 1 : 25, null, res.status);
    return { status: res.status === 402 ? 'QUOTA_EXHAUSTED' : res.status === 401 ? 'AUTH_REQUIRED' : res.status === 400 ? 'INCOMPLETE' : 'RETRY_REQUIRED', reason: 'HTTP_' + res.status };
  }
  let body: unknown;
  try { body = await res.json(); } catch { /* keep conservative reservation */ }
  if (!validPage(body)) { await store.finish(id, 25, null, res.status); return { status: 'INCOMPLETE', reason: 'INVALID_RESPONSE' }; }
  await store.finish(id, body.data.length, body, res.status);
  return { page: body };
}
const filtersBase = { job_title_or: ['infirmier','infirmiere','infirmi\u00e8re','IADE','IBODE'], job_country_code_or: ['FR'], description_or: ['int\u00e9rim','interim'], status: 'active' };
function initialState(now: Date): JobsPipeState {
  return { version: 1, cycleId: now.toISOString().slice(0,10) + ':' + hash(JSON.stringify(filtersBase)).slice(0,16), cursor: null, seenIds: [], seenCursors: [], startedAt: now.toISOString() };
}
export async function advanceJobsPipeCollection(db: Database, previous: JobsPipeState | null, options: Options = {}) {
  const now = options.now || new Date();
  let state = previous ? structuredClone(previous) : initialState(now);
  const result = (status: JobsPipeStatus, rows: any[] = []) => ({ state, rows, status, coverage: { provider: 'JOBSPIPE', complete: status === 'COMPLETE', observed: state.seenIds.length, reason: state.reason || null, scope: 'FR_NURSING_INTERIM_FREE_BUDGET' } });
  if (options.manual && (state.terminal === 'INCOMPLETE' || state.terminal === 'AUTH_REQUIRED')) {
    // Deterministic successor stays distinct from the failed cycle, yet survives a
    // transaction rollback before the new state is persisted.
    const previousId = state.cycleId;
    state = initialState(now);
    state.cycleId = 'manual:' + hash(previousId + ':retry');
  }
  if (state.retryAt && Date.parse(state.retryAt) > now.getTime()) return result('COOLDOWN');
  if (state.terminal === 'INCOMPLETE') return result('INCOMPLETE');
  if (state.terminal === 'AUTH_REQUIRED' && !options.manual) return result('AUTH_REQUIRED');
  if (state.completedAt && now.toISOString().slice(0,10) === state.completedAt.slice(0,10)) return result('COOLDOWN');
  if (state.completedAt || state.terminal === 'QUOTA_EXHAUSTED') state = initialState(now);
  const response = await requestPage(db, state.cycleId, { ...filtersBase, ...(state.cursor ? {cursor:state.cursor} : {}) }, options);
  if (!response.page) {
    const status = response.status!; state.reason = response.reason;
    if (['INCOMPLETE','AUTH_REQUIRED','QUOTA_EXHAUSTED'].includes(status)) state.terminal = status;
    state.retryAt = status === 'QUOTA_EXHAUSTED' ? nextMonth(now) : new Date(now.getTime() + 300000).toISOString();
    return result(status);
  }
  const page = response.page, ids = new Set(state.seenIds);
  const rows = page.data.filter(row => { if(ids.has(row.id)) return false; ids.add(row.id); return true; });
  const cursor = page.metadata.next_cursor;
  if ((cursor && (cursor === state.cursor || state.seenCursors.includes(cursor))) || (page.data.length > 0 && rows.length === 0) || (page.data.length === 0 && cursor)) {
    state.terminal = 'INCOMPLETE'; state.reason = 'REPEATED_OR_EMPTY_PAGE'; return result('INCOMPLETE');
  }
  state.seenIds = [...ids]; if(state.cursor) state.seenCursors.push(state.cursor);
  state.cursor = cursor; delete state.retryAt; delete state.reason; delete state.terminal;
  if(cursor === null) { state.completedAt = now.toISOString(); return result('COMPLETE', rows); }
  return result('CONTINUE', rows);
}
export async function verifyJobsPipeOffers(db: Database, ids: string[], options: Options & {requestId: string}) {
  if(!ids.length || ids.length > 25 || ids.some(id => !/^[A-Za-z0-9_:-]{1,200}$/.test(id))) throw Error('INVALID_VERIFICATION_IDS');
  const response = await requestPage(db, 'verify:' + options.requestId, {job_ids:[...new Set(ids)].sort(),status:'any'}, options);
  return {rows:response.page?.data.filter(row => ids.includes(row.id)) || [],status:response.status || (response.page?.metadata.next_cursor ? 'INCOMPLETE' : 'COMPLETE'),missingMeansClosed:false as const,reason:response.reason};
}
