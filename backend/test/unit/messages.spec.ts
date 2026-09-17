import { test } from "node:test";
import { expect } from "expect";
import { REMINDER_MESSAGE } from "../../src/domain/messages";

test("reminder notification keeps its French encoding", () => {
  expect(REMINDER_MESSAGE).toBe("Une mission reste à pourvoir.");
});
