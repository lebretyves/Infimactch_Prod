import assert from "node:assert/strict";
import { test } from "node:test";
import { availabilityDateLabel } from "../src/lib/availabilityDateLabel.ts";
test("availability dates use Paris, not the browser timezone or UTC day", () => {
  const period = { start: "2026-09-17T22:00:00Z", end: "2026-09-18T06:00:00Z" };
  assert.equal(availabilityDateLabel(period), "18/09/2026");
  assert.equal(period.start, "2026-09-17T22:00:00Z");
});
test("exclusive midnight end does not add the following day", () => {
  assert.equal(
    availabilityDateLabel({
      start: "2026-09-17T22:00:00Z",
      end: "2026-09-18T22:00:00Z",
    }),
    "18/09/2026",
  );
});
test("multiple days and partial hours are a date range without whole-day claims", () => {
  assert.equal(
    availabilityDateLabel({
      start: "2026-09-17T20:00:00Z",
      end: "2026-09-20T04:00:00Z",
    }),
    "Du 17/09/2026 au 20/09/2026",
  );
});
test("spring and autumn DST preserve Paris calendar dates", () => {
  assert.equal(
    availabilityDateLabel({
      start: "2026-03-28T23:00:00Z",
      end: "2026-03-29T22:00:00Z",
    }),
    "29/03/2026",
  );
  assert.equal(
    availabilityDateLabel({
      start: "2026-10-24T22:00:00Z",
      end: "2026-10-25T23:00:00Z",
    }),
    "25/10/2026",
  );
});
test("invalid or reversed intervals have a safe explicit fallback", () => {
  for (const period of [
    { start: "bad", end: "bad" },
    { start: "2026-09-17", end: "2026-09-16" },
    { start: "2026-09-17", end: "2026-09-17" },
  ])
    assert.equal(availabilityDateLabel(period), "Dates à vérifier");
});
