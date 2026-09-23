import { test } from "node:test";
import { expect } from "expect";
import { lookupRpps } from "../../src/profiles/rpps";
const num = "10000000001";
const response = (body: unknown, status = 200) =>
  (async () =>
    new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
test("missing credentials is pending", async () =>
  expect(await lookupRpps(num, undefined)).toMatchObject({
    status: "PENDING",
  }));
test("zero exact results is not found", async () =>
  expect(
    await lookupRpps(
      num,
      "test",
      response({ resourceType: "Bundle", type: "searchset", total: 0 }),
    ),
  ).toMatchObject({ status: "NOT_FOUND" }));
test("exact RPPS found", async () =>
  expect(
    await lookupRpps(
      num,
      "test",
      response({
        resourceType: "Bundle",
        type: "searchset",
        total: 1,
        entry: [
          {
            resource: {
              resourceType: "Practitioner",
              identifier: [
                { system: "https://rpps.esante.gouv.fr", value: num },
              ],
            },
          },
        ],
      }),
    ),
  ).toMatchObject({ status: "FOUND" }));
for (const status of [401, 403, 404, 429, 500, 503])
  test("HTTP " + status + " remains pending", async () =>
    expect(await lookupRpps(num, "test", response({}, status))).toMatchObject({
      status: "PENDING",
    }),
  );
test("malformed results cannot prove absence", async () =>
  expect(await lookupRpps(num, "test", response({ total: 0 }))).toMatchObject({
    status: "PENDING",
  }));
test("a different practitioner does not count as found", async () =>
  expect(
    await lookupRpps(
      num,
      "test",
      response({
        resourceType: "Bundle",
        type: "searchset",
        total: 1,
        entry: [
          {
            resource: {
              resourceType: "Practitioner",
              identifier: [{ value: "other" }],
            },
          },
        ],
      }),
    ),
  ).toMatchObject({ status: "PENDING" }));

test("name discrepancy remains pending for manual review, punctuation is normalized", async()=>{
 const provider=response({resourceType:'Bundle',type:'searchset',total:1,entry:[{resource:{resourceType:'Practitioner',identifier:[{system:'https://rpps.esante.gouv.fr',value:num}],name:[{family:'DUPONT',given:['\u00c9lo\u00efse']} ]}}]});
 expect(await lookupRpps(num,'test',provider,{firstName:'Eloise',lastName:'Dupont'})).toMatchObject({status:'FOUND',identityReview:'CONSISTENT_NAMES'});
 expect(await lookupRpps(num,'test',provider,{firstName:'Autre',lastName:'Dupont'})).toMatchObject({status:'PENDING',identityReview:'REVIEW_REQUIRED'});
});
