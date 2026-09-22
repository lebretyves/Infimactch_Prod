import test from "node:test";
import assert from "node:assert/strict";
import {
  visibleExternalProviders,
  isExternalSourceVisible,
} from "../../src/public-data/external-visibility";

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
