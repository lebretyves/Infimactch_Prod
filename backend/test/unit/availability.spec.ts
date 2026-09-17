import { test } from "node:test";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  changeAvailability,
  normalizeAvailability,
  subtractPeriods,
} from "../../src/domain/availability";
import { covers, overlaps } from "../../src/domain/matching";
import { AvailabilityPatchDto } from "../../src/profiles/profiles.module";
const slot = (start: number, end: number) => ({
  start: new Date(Date.UTC(2030, 0, 10, start)).toISOString(),
  end: new Date(Date.UTC(2030, 0, 10, end)).toISOString(),
});
test("unavailable sub-period splits availability and preserves both surrounding pieces", () => {
  const value = changeAvailability(
    { available: [slot(6, 22)], unavailable: [] },
    [{ ...slot(14, 18), state: "unavailable" }],
  );
  assert.deepEqual(value, {
    available: [slot(6, 14), slot(18, 22)],
    unavailable: [slot(14, 18)],
  });
  assert.ok(covers(slot(6, 14), value.available, value.unavailable));
  assert.ok(!covers(slot(6, 22), value.available, value.unavailable));
});
test("three clicks return available then unavailable then truly unreported", () => {
  let value = { available: [], unavailable: [] } as ReturnType<
    typeof normalizeAvailability
  >;
  for (const state of ["available", "unavailable", "unset"] as const) {
    value = changeAvailability(value, [{ ...slot(6, 14), state }]);
    assert.equal(value.available.length, state === "available" ? 1 : 0);
    assert.equal(value.unavailable.length, state === "unavailable" ? 1 : 0);
  }
});
test("re-enabling a sub-period overrides unavailability only inside the chosen slot", () => {
  assert.deepEqual(
    changeAvailability({ available: [], unavailable: [slot(6, 30)] }, [
      { ...slot(14, 22), state: "available" },
    ]),
    { available: [slot(14, 22)], unavailable: [slot(6, 14), slot(22, 30)] },
  );
});
test("legacy overlaps normalize with unavailability priority, duplicates and adjacency merge", () => {
  assert.deepEqual(
    normalizeAvailability({
      available: [slot(6, 14), slot(14, 22), slot(6, 14)],
      unavailable: [slot(12, 16), slot(14, 18)],
    }),
    { available: [slot(6, 12), slot(18, 22)], unavailable: [slot(12, 18)] },
  );
});
test("a night spanning DST keeps exact instants and never uses a fixed eight-hour duration", () => {
  const night = {
    start: "2026-03-28T22:00:00+01:00",
    end: "2026-03-29T06:00:00+02:00",
  };
  const value = changeAvailability({ available: [], unavailable: [] }, [
    { ...night, state: "available" },
  ]);
  assert.equal(
    Date.parse(value.available[0]!.end) - Date.parse(value.available[0]!.start),
    7 * 3600000,
  );
  assert.ok(covers(night, value.available, []));
  const erased = changeAvailability(value, [
    {
      start: "2026-03-29T00:00:00Z",
      end: "2026-03-29T01:00:00Z",
      state: "unset",
    },
  ]);
  assert.equal(erased.available.length, 2);
});
test("boundary-touching periods do not erase each other", () => {
  assert.deepEqual(subtractPeriods([slot(6, 14)], [slot(14, 22)]), [
    slot(6, 14),
  ]);
});
test("patch DTO rejects empty, excessive, invalid-state and malformed change bodies", () => {
  for (const body of [
    { changes: [] },
    {
      changes: Array.from({ length: 201 }, () => ({
        ...slot(6, 14),
        state: "available",
      })),
    },
    { changes: [{ ...slot(6, 14), state: "both" }] },
    { changes: [{ start: 7, end: null, state: "available" }] },
  ])
    assert.ok(validateSync(plainToInstance(AvailabilityPatchDto, body)).length);
  assert.equal(
    validateSync(
      plainToInstance(AvailabilityPatchDto, {
        changes: [{ ...slot(6, 14), state: "available" }],
      }),
    ).length,
    0,
  );
});
test("many alternating edits remain disjoint and agree with a pointwise reference model", () => {
  let value = { available: [], unavailable: [] } as ReturnType<
    typeof normalizeAvailability
  >;
  const model = Array.from({ length: 48 }, () => "unset");
  for (let i = 0; i < 150; i++) {
    const start = (i * 17) % 47,
      end = Math.min(48, start + 1 + ((i * 7) % 11)),
      state = (["available", "unavailable", "unset"] as const)[i % 3]!;
    value = changeAvailability(value, [{ ...slot(start, end), state }]);
    for (let h = start; h < end; h++) model[h] = state;
    for (const a of value.available)
      for (const b of value.unavailable) assert.equal(overlaps(a, b), false);
    for (let h = 0; h < 48; h++) {
      const sample = slot(h, h + 1);
      assert.equal(
        covers(sample, value.available, []),
        model[h] === "available",
      );
      assert.equal(
        covers(sample, value.unavailable, []),
        model[h] === "unavailable",
      );
    }
  }
});
