import { config } from "dotenv";
import { isIP } from "node:net";
import { resolve } from "node:path";
const candidateRoot = resolve(__dirname, "../..");
export const projectRoot = candidateRoot.endsWith("backend")
  ? resolve(candidateRoot, "..")
  : candidateRoot;
// The Vault launcher supplies validated secrets before importing the application.
// Never fall back to the legacy .env when Vault is the selected source.
if (process.env.INFIMATCH_SECRET_SOURCE !== "vault") {
  config({ path: resolve(projectRoot, ".env"), quiet: true });
}
export function required(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("GENERATE_"))
    throw new Error("Missing configuration: " + name);
  return v;
}
export function parseTrustProxy(
  value = process.env.TRUST_PROXY,
  environment = process.env.NODE_ENV,
): false | number | string[] {
  const configured = value?.trim();
  if (!configured) {
    if (environment === "production")
      throw new Error("TRUST_PROXY required in production");
    return false;
  }
  if (/^\d+$/.test(configured)) {
    const hops = Number(configured);
    if (!Number.isSafeInteger(hops) || hops < 1 || hops > 10)
      throw new Error("TRUST_PROXY hop count must be between 1 and 10");
    return hops;
  }
  const entries = configured.split(",").map((entry) => entry.trim());
  if (
    entries.some((entry) => {
      if (["loopback", "linklocal", "uniquelocal"].includes(entry))
        return false;
      const [address, prefix, extra] = entry.split("/");
      const version = address ? isIP(address) : 0;
      if (extra !== undefined || !version) return true;
      if (prefix === undefined) return false;
      const bits = version === 4 ? 32 : 128;
      return !/^\d+$/.test(prefix) || Number(prefix) > bits;
    })
  )
    throw new Error("TRUST_PROXY must contain trusted IPs, CIDRs, or subnets");
  return entries;
}
export function documentQuotaBytes(
  value = process.env.DOCUMENT_QUOTA_BYTES,
): number {
  const quota =
    value === undefined || value === "" ? 25 * 1024 * 1024 : Number(value);
  if (!Number.isSafeInteger(quota) || quota < 5 * 1024 * 1024)
    throw new Error(
      "DOCUMENT_QUOTA_BYTES must be an integer of at least 5 MiB",
    );
  return quota;
}
export function validateConfiguration(): void {
  if (process.env.DOCUMENT_STORAGE && !["filesystem", "postgres"].includes(process.env.DOCUMENT_STORAGE)) throw new Error("Invalid DOCUMENT_STORAGE");
  if (process.env.VERCEL && process.env.DOCUMENT_STORAGE !== "postgres") throw new Error("Persistent DOCUMENT_STORAGE required on Vercel");
  for (const n of [
    "DATABASE_URL",
    "MONGODB_URI",
    "SESSION_SECRET",
    "DOCUMENT_KEY",
    "SERVICE_TOKEN",
    "APP_ORIGIN",
  ])
    required(n);
  if (
    required("SESSION_SECRET").length < 32 ||
    required("SERVICE_TOKEN").length < 32
  )
    throw new Error("Secrets must contain at least 32 characters");
  if (Buffer.from(required("DOCUMENT_KEY"), "base64").length !== 32)
    throw new Error("DOCUMENT_KEY must encode 32 bytes");
  if (
    process.env.NODE_ENV === "production" &&
    !required("APP_ORIGIN").startsWith("https://")
  )
    throw new Error("HTTPS origin required");
  parseTrustProxy();
  documentQuotaBytes();
}
