import { test } from "node:test";
import { expect } from "expect";
import { retryTransaction } from "../../src/common/retry";
test("transient serialization failure is retried, then returns committed result", async () => {
  let calls = 0;
  const result = await retryTransaction(async () => {
    if (++calls < 3) throw { code: "40001" };
    return { id: "committed" };
  });
  expect(result.id).toBe("committed");
  expect(calls).toBe(3);
});
test("deadlock retries stop after three attempts", async () => {
  let calls = 0;
  await expect(
    retryTransaction(async () => {
      calls++;
      throw { code: "40P01" };
    }),
  ).rejects.toMatchObject({ code: "40P01" });
  expect(calls).toBe(3);
});
test("uniqueness/business conflicts are not retried", async () => {
  let calls = 0;
  await expect(
    retryTransaction(async () => {
      calls++;
      throw { code: "23505" };
    }),
  ).rejects.toMatchObject({ code: "23505" });
  expect(calls).toBe(1);
});
