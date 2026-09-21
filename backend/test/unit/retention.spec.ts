import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anonymizeAccount,
  applyRetention,
  inspectRetention,
  retentionPolicy,
} from "../../src/security/retention";

function client(replies: { counts?: Record<string, number>; rows?: Record<string, any[]> } = {}) {
  const queries: { sql: string; parameters: unknown[] }[] = [];
  return {
    queries,
    query: async (sql: string, parameters: unknown[] = []) => {
      queries.push({ sql, parameters });
      if (sql.includes("count(*)")) {
        for (const [fragment, n] of Object.entries(replies.counts ?? {}))
          if (sql.includes(fragment)) return [{ n }];
        return [{ n: 0 }];
      }
      for (const [fragment, rows] of Object.entries(replies.rows ?? {}))
        if (sql.includes(fragment)) return rows;
      return [];
    },
  };
}

test("retention policy keeps business records and bounds traces", () => {
  assert.equal(retentionPolicy.auditDays, 365);
  assert.equal(retentionPolicy.supersededBankDays, 30);
  assert.equal(retentionPolicy.matchingExplanationDays, 30);
});

test("dry inspection counts expired traces without deletes", async () => {
  const em = client({
    counts: {
      "FROM session": 2,
      "FROM idempotency": 1,
      "FROM notification": 4,
      "FROM audit": 9,
      "status='STAGING'": 1,
      "kind='BANK'": 3,
      "FROM outbox": 0,
    },
  });
  const summary = await inspectRetention(em);
  assert.deepEqual(summary, {
    sessions: 2,
    idempotency: 1,
    notifications: 4,
    audit: 9,
    stagingDocuments: 1,
    supersededBankDocuments: 3,
    completedOutbox: 0,
    businessMissions: 0,
  });
  assert.equal(
    em.queries.some((q) => q.sql.startsWith("DELETE")),
    false,
  );
});

test("apply deletes traces, superseded bank files and never missions", async () => {
  const bankId = "11111111-1111-4111-8111-111111111111";
  const em = client({
    counts: { "FROM session": 1, "kind='BANK'": 1 },
    rows: { "kind='BANK'": [{ id: bankId }] },
  });
  const summary = await applyRetention(em);
  assert.equal(summary.dryRun, false);
  assert.ok(em.queries.some((q) => q.sql === "DELETE FROM session WHERE expire<now()"));
  assert.ok(
    em.queries.some(
      (q) =>
        q.sql === "DELETE FROM document WHERE id=ANY($1::uuid[])" &&
        (q.parameters[0] as string[]).includes(bankId),
    ),
  );
  assert.equal(
    em.queries.some((q) => /DELETE FROM (mission|account|assignment)/.test(q.sql)),
    false,
  );
  assert.ok(
    em.queries.some((q) => q.parameters.includes("RETENTION_PURGED")),
  );
});

test("anonymize closes the account and removes private documents", async () => {
  const id = "22222222-2222-4222-8222-222222222222";
  const doc = "33333333-3333-4333-8333-333333333333";
  const em = client({
    rows: {
      "FROM account": [{ id }],
      "FROM document WHERE owner_id": [{ id: doc }],
    },
  });
  const result = await anonymizeAccount(em, id);
  assert.deepEqual(result, { id, documents: 1, documentIds: [doc] });
  assert.ok(em.queries.some(q=>q.sql.includes("FROM document WHERE owner_id")&&q.sql.includes("'CV'")));
  assert.ok(em.queries.some((q) => q.sql.includes("DELETE FROM session")));
  assert.ok(em.queries.some((q) => q.sql.includes("DELETE FROM google_identity")));
  assert.ok(em.queries.some((q) => q.sql.includes("Compte clôturé")));
  assert.ok(
    em.queries.some(
      (q) =>
        q.sql.includes("UPDATE account SET email") &&
        q.parameters[1] === "closed." + id + "@anonymized.invalid",
    ),
  );
  assert.ok(em.queries.some((q) => q.parameters.includes("ACCOUNT_ANONYMIZED")));
});


test("business history has no automatic duration for real users", async()=>{
 const {businessHistoryDays}=await import('../../src/security/retention');
 const previous=process.env.BUSINESS_HISTORY_RETENTION_DAYS;
 try{delete process.env.BUSINESS_HISTORY_RETENTION_DAYS;assert.equal(businessHistoryDays(),null);
 process.env.BUSINESS_HISTORY_RETENTION_DAYS='365';assert.equal(businessHistoryDays(),365);
 process.env.BUSINESS_HISTORY_RETENTION_DAYS='0';assert.throws(()=>businessHistoryDays());
 }finally{if(previous===undefined)delete process.env.BUSINESS_HISTORY_RETENTION_DAYS;else process.env.BUSINESS_HISTORY_RETENTION_DAYS=previous;}
});


test('automatic maintenance excludes business history even when a duration exists',async()=>{
 const old=process.env.BUSINESS_HISTORY_RETENTION_DAYS;process.env.BUSINESS_HISTORY_RETENTION_DAYS='1';
 try{const em=client();await applyRetention(em,{includeBusinessHistory:false});const query=em.queries.find(q=>q.sql.includes('SELECT id FROM mission m'));assert.deepEqual(query?.parameters,[null]);}
 finally{if(old===undefined)delete process.env.BUSINESS_HISTORY_RETENTION_DAYS;else process.env.BUSINESS_HISTORY_RETENTION_DAYS=old;}
});
