import { test } from "node:test";
import assert from "node:assert/strict";
const protectedMigrations = [
  "account-security",
  "admin-mfa-recovery",
  "admin-password",
  "admin-operations",
  "client-requests",
  "contract-preparation",
  "cv-documents",
  "discord-notifications",
  "document-security",
  "email-delivery",
  "erasure-recovery",
  "extended",
  "finess",
  "google-identity",
  "harden",
  "mission-guardrails",
  "mission-mail",
  "mission-schedule-precision",
  "mission-time-slots",
  "notification-center",
  "personal-corrections",
  "platform-admin",
  "privacy-requests",
  "professional-identity",
  "recovery-email",
  "schema",
  "shared-rate-limit",
  "staffing-request-details",
  "support-tickets",
];
for (const name of protectedMigrations)
  test(`migration ${name} refuses destructive rollback before any database write`, async () => {
    const exports = require("../../src/database/" + name);
    const Migration: any = Object.values(exports).find(
      (value: any) =>
        typeof value === "function" &&
        typeof value.prototype?.down === "function",
    );
    assert.ok(Migration, "Migration constructor missing");
    let queries = 0;
    await assert.rejects(
      new Migration().down({
        query: async () => {
          queries++;
          throw Error("Unexpected SQL");
        },
      }),
      /restore|backup|forward|irreversible/i,
    );
    assert.equal(queries, 0);
  });
