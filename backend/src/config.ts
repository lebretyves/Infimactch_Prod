import { config } from "dotenv";
import { resolve } from "node:path";
const candidateRoot = resolve(__dirname, "../..");
export const projectRoot = candidateRoot.endsWith("backend")
  ? resolve(candidateRoot, "..")
  : candidateRoot;
config({ path: resolve(projectRoot, ".env"), quiet: true });
export function required(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("GENERATE_"))
    throw new Error("Missing configuration: " + name);
  return v;
}
export function validateConfiguration(): void {
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
}
