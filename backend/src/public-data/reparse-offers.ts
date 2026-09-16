import { Database } from "../database/database";
import { currentParsedOffer, parseOffer } from "./offer-parser";
export async function reparseOffers(db: Database, apply: boolean) {
 return db.transaction(async em => {
  await em.query("SELECT pg_advisory_xact_lock(1789380901)");
  let cursor="00000000-0000-0000-0000-000000000000", scanned=0, changed=0;
  while(true) {
   const rows=await em.query("SELECT * FROM external_offer WHERE id>$1::uuid ORDER BY id LIMIT 100 FOR UPDATE",[cursor]);
   if(!rows.length) break;
   for(const row of rows) {
    scanned++;
    if(currentParsedOffer(row)) continue;
    const parsed=parseOffer(row); changed++;
    if(apply) await em.query("UPDATE external_offer SET parsed_offer=$2 WHERE id=$1",[row.id,JSON.stringify(parsed)]);
   }
   cursor=rows[rows.length-1].id;
  }
  const result={scanned,changed,applied:apply};
  if(apply) await em.query("INSERT INTO import_run(provider,status,summary) VALUES('LOCAL_PARSER','SUCCESS',$1)",[JSON.stringify(result)]);
  return result;
 });
}
