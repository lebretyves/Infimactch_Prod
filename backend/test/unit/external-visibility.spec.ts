import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleExternalProviders} from '../../src/public-data/external-visibility';
import {ExternalVisibility1790024000000} from '../../src/database/external-visibility';

test('visible providers are selected independently from scheduling', async () => {
  const db: any = {query: async (sql:string) => {assert.match(sql,/WHERE visible/); assert.doesNotMatch(sql,/enabled/); return [{provider:'FRANCE_TRAVAIL'}];}};
  assert.deepEqual(await visibleExternalProviders(db), ['FRANCE_TRAVAIL']);
});

test('visibility migration preserves existing catalogues and refuses destructive rollback', async () => {
  const migration = new ExternalVisibility1790024000000();
  let statement = '';
  await migration.up({query: async (sql:string) => {statement=sql;}} as any);
  assert.match(statement, /ADD COLUMN visible boolean NOT NULL DEFAULT true/);
  await assert.rejects(migration.down(), /Restore verified backup/);
});

test("visibleExternalProviders returns only visible catalogue sources", async () => {
  const calls: unknown[][] = [];
  const db = {
    query: async (_sql: string, parameters: unknown[] = []) => {
      calls.push(parameters);
      return [
        { provider: "FRANCE_TRAVAIL" },
        { provider: "JOBSPIPE" },
      ];
    },
  };
  assert.deepEqual(await visibleExternalProviders(db as any), [
    "FRANCE_TRAVAIL",
    "JOBSPIPE",
  ]);
  assert.deepEqual(calls[0]?.[0], ["FRANCE_TRAVAIL", "JOBSPIPE"]);
});

test('a hidden catalogue returns no external providers', async () => {
  assert.deepEqual(await visibleExternalProviders({query:async()=>[]} as any), []);
});
