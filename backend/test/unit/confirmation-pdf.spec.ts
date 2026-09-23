import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import {
  createConfirmationPdf,
  ConfirmationDetails,
} from "../../src/automation/confirmation-pdf";
const base: ConfirmationDetails = {
  assignmentId: "assignment-123",
  missionId: "mission-456",
  missionVersion: 3,
  title: "Mission IDE",
  qualification: "IDE",
  address: "15 rue Exemple, Paris",
  start: "2030-01-15T07:00:00Z",
  end: "2030-01-15T15:00:00Z",
  hourlySalary: 25.5,
  professionalName: "Alice Martin",
  establishmentName: "Hospital Test",
  issuedAt: new Date("2030-01-01T12:00:00Z"),
};
function content(pdf: Buffer) {
  const raw = pdf.toString("latin1");
  let text = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let stream: string;
    try {
      stream = inflateSync(Buffer.from(m[1]!, "latin1")).toString("latin1");
    } catch {
      continue;
    }
    for (const h of stream.matchAll(/<([0-9a-f]+)>/gi))
      text += Buffer.from(h[1]!, "hex").toString("latin1");
  }
  assert.match(raw, /^%PDF-1\.7/);
  assert.equal((raw.match(/\/Type \/Page\b/g) || []).length, 1);
  assert.match(raw, /\/StructTreeRoot/);
  return text;
}
test("confirmation PDF preserves assignment, participant, place, timezone and salary on one tagged page", async () => {
  const text = content(
    await createConfirmationPdf({
      ...base,
      service: "URGENCES",
      population: "ADULT",
      block: "GENERAL",
      establishmentContact: "Dr Example",
      agencyName: "Agency Test",
    }),
  );
  for (const expected of [
    "Mission IDE",
    "Alice Martin",
    "Hospital Test",
    "15 rue Exemple",
    "assignment-123",
    "mission-456",
    "08:00",
    "16:00",
    "25,50",
    "Dr Example",
    "Agency Test",
    "Europe/Paris",
  ])
    assert.ok(text.includes(expected), expected);
  assert.ok(!text.includes("undefined"));
  assert.ok(!text.includes("NaN"));
});
test("date-only demonstration uses unconfirmed hours and tolerates absent optional fields", async () => {
  const text = content(
    await createConfirmationPdf({
      ...base,
      schedulePrecision: "DATE",
      demonstration: true,
      hourlySalary: null,
      professionalName: undefined,
      establishmentName: undefined,
      missionId: undefined,
      timezone: "",
      service: "CUSTOM_SERVICE",
      address: "",
    }),
  );
  assert.ok(text.includes("Horaires"));
  assert.ok(!text.includes("08:00"));
  assert.ok(text.includes("EXEMPLE FICTIF"));
  assert.ok(text.includes("custom service"));
  assert.ok(!text.includes("undefined"));
});
for (const initiator of ["NURSE", "ENTERPRISE"] as const)
  test(
    "cancellation PDF retains initiator and reason: " + initiator,
    async () => {
      const text = content(
        await createConfirmationPdf({
          ...base,
          cancellation: {
            initiator,
            cancelledAt: "2030-01-10T12:00:00Z",
            reason: "Transport indisponible",
          },
          hourlySalary: "not-a-number",
        }),
      );
      assert.ok(text.includes("Transport indisponible"));
      assert.ok(text.includes("ANNULATION"));
      assert.ok(text.includes("assignment-123"));
      assert.ok(!text.includes("NaN"));
      assert.ok(
        text.includes(initiator === "ENTERPRISE" ? "entreprise" : "int"),
      );
    },
  );
test("long content is compacted without losing the final address or cancellation reason", async () => {
  const text = content(
    await createConfirmationPdf({
      ...base,
      title: "Mission soins ".repeat(10),
      professionalName: "Alice ".repeat(15),
      establishmentName: "Hospital ".repeat(12),
      address: "Long address ".repeat(30) + "ADDRESS-END",
      cancellation: {
        initiator: "NURSE",
        cancelledAt: "2030-01-10T12:00:00Z",
        reason: "Absence personnelle",
      },
    }),
  );
  assert.ok(text.includes("ADDRESS-END"));
  assert.ok(text.includes("Absence personnelle"));
});
test("oversize PDF and invalid timestamps fail explicitly instead of producing a truncated document", async () => {
  await assert.rejects(
    createConfirmationPdf({ ...base, address: "long address ".repeat(2000) }),
    /PDF_CONTENT_EXCEEDS_SINGLE_PAGE/,
  );
  await assert.rejects(
    createConfirmationPdf({ ...base, start: "invalid" }),
    RangeError,
  );
});
