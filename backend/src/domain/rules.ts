import { createHash } from "node:crypto";
const defaults = { C: 0.45, Z: 0.25, D: 0.2, E: 0.1 };
const parsed = process.env.MATCHING_WEIGHTS_JSON
  ? JSON.parse(process.env.MATCHING_WEIGHTS_JSON)
  : defaults;
if (
  !parsed ||
  typeof parsed !== "object" ||
  Array.isArray(parsed) ||
  Object.keys(parsed).sort().join(",") !== "C,D,E,Z" ||
  Object.values(parsed).some(
    (v) => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1,
  ) ||
  Math.abs(
    Object.values(parsed).reduce<number>((a, b) => a + Number(b), 0) - 1,
  ) > 1e-9
)
  throw new Error("Invalid matching weights: C,Z,D,E must sum to 1");
const weights = Object.freeze({
  C: Number(parsed.C),
  Z: Number(parsed.Z),
  D: Number(parsed.D),
  E: Number(parsed.E),
});
const rppsRequired = process.env.DEMO_OPTIONAL_RPPS !== "true";
export const MATCH_RULES = Object.freeze({
  version:
    "1.2.0-rpps-policy-" +
    createHash("sha256")
      .update(JSON.stringify({ weights, rppsRequired }))
      .digest("hex")
      .slice(0, 10),
  weights,
  rppsRequired,
});
