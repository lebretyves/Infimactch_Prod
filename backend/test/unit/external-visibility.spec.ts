import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isExternalSourceVisible, visibleExternalProviders} from '../../src/public-data/external-visibility';
import {ExternalVisibility1790024000000} from '../../src/database/external-visibility';

test('external source visibility rejects unknown, missing and hidden sources', async () => {
  let calls = 0, rows: any[] = [];
  const db: any = {query: async (_sql: string, args: any[]) => {calls++; assert.deepEqual(args, ['FRANCE_TRAVAIL']); return rows;}};
  assert.equal(await isExternalSourceVisible(db, 'UNKNOWN'), false);
  assert.equal(calls, 0);
  assert.equal(await isExternalSourceVisible(db, 'FRANCE_TRAVAIL'), false);
  rows = [{visible:false}];
  assert.equal(await isExternalSourceVisible(db, 'FRANCE_TRAVAIL'), false);
  rows = [{visible:true}];
  assert.equal(await isExternalSourceVisible(db, 'FRANCE_TRAVAIL'), true);
});

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

test("isExternalSourceVisible reads the provider flag", async () => {
  const db = {
    query: async () => [{ visible: false }],
  };
  assert.equal(await isExternalSourceVisible(db as any, "FRANCE_TRAVAIL"), false);
  assert.equal(await isExternalSourceVisible(db as any, "OTHER"), false);
});
