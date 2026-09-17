import { test } from "node:test";
import assert from "node:assert/strict";
import { findCrossSourceDuplicates, guardCrossSourceDuplicates } from "../../src/public-data/offer-deduplication";
const a = { id: "a", source: "FRANCE_TRAVAIL", title: "IDE", description: "Mission de soins en interim. ".repeat(15), url: "https://candidat.francetravail.fr/offres/recherche/detail/ABC123", location_label: "Paris", qualification: "IDE" };
const b = { ...a, id: "b", source: "JOBSPIPE", url: "https://jobs.example/offers/456" };
test("identical cross-provider content is hidden deterministically", () => {
 assert.deepEqual(findCrossSourceDuplicates([b,a]), [{id:"b",duplicateOf:"a",reason:"EXACT_CONTENT_AND_LOCATION"}]);
});
test("different cities, shifts and qualifications remain separate", () => {
 for (const change of [{location_label:"Lyon"},{qualification:"IADE"},{description:b.description+" Travail de nuit."}]) assert.equal(findCrossSourceDuplicates([a,{...b,...change}]).length,0);
});
test("same France Travail detail URL identifies syndicated offer despite tracking", () => {
 assert.equal(findCrossSourceDuplicates([a,{...b,description:"Short",url:a.url+"?utm_source=jobs#apply"}])[0]?.reason,"SAME_SOURCE_URL");
});
test("same-source offers and short boilerplate are not merged", () => {
 assert.equal(findCrossSourceDuplicates([a,{...b,source:a.source}]).length,0);
 assert.equal(findCrossSourceDuplicates([{...a,description:"Interim"},{...b,description:"Interim"}]).length,0);
});
test("guard preserves records and records the canonical offer",async()=>{
 const queries:any[]=[];
 const duplicates=await guardCrossSourceDuplicates({query:async(sql,args)=>{queries.push([sql,args]);return sql.startsWith("SELECT")?[a,b]:[];}});
 assert.equal(duplicates.length,1);
 assert.ok(queries[1][0].includes("active=false"));
 assert.equal(JSON.parse(queries[1][1][1]).duplicateOf,"a");
 assert.ok(!queries.some(q=>q[0].includes("DELETE")));
});
