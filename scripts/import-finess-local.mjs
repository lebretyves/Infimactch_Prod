#!/usr/bin/env node
/**
 * Download the official monthly FINESS snapshot and import it into local Postgres.
 * Usage (from repo root, with .env + Docker Postgres + migrations):
 *   npm run finess:import
 * Options:
 *   --force     re-download even if the local file already exists
 *   --url URL   pin a static.data.gouv.fr FINESS gzip URL (skip dataset discovery)
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { rename, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = resolve(ROOT, "data/public");
const DATASET_API = "https://www.data.gouv.fr/api/1/datasets/finess-structures-1/";
const FALLBACK_URL =
  "https://static.data.gouv.fr/resources/finess-structures-1/20260901-021627/finess-structures-mensuel-202608.json.gz";

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const FORCE = process.argv.includes("--force");
const PINNED_URL = argValue("--url");

function assertOfficialUrl(raw) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "static.data.gouv.fr" ||
    !url.pathname.includes("/finess-structures-1/") ||
    !url.pathname.endsWith(".json.gz")
  ) {
    throw new Error("Only official https://static.data.gouv.fr/.../finess-structures-1/*.json.gz URLs are allowed.");
  }
  return url.toString();
}

export async function resolveLatestFinessUrl(fetchImpl = fetch) {
  const response = await fetchImpl(DATASET_API, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`data.gouv dataset API HTTP ${response.status}`);
  const body = await response.json();
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const monthly = resources
    .filter(
      (r) =>
        typeof r?.url === "string" &&
        r.url.includes("finess-structures-mensuel") &&
        r.url.endsWith(".json.gz") &&
        r.url.startsWith("https://static.data.gouv.fr/"),
    )
    .sort((a, b) => String(b.last_modified || "").localeCompare(String(a.last_modified || "")));
  if (!monthly.length) throw new Error("No monthly FINESS json.gz resource found on data.gouv.fr");
  return assertOfficialUrl(monthly[0].url);
}

async function download(url, dest) {
  console.log("Downloading FINESS snapshot…");
  console.log(url);
  const response = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!response.ok || !response.body) throw new Error(`Download failed HTTP ${response.status}`);
  const tmp = dest + ".partial";
  const hash = createHash("sha256");
  const { Readable } = await import("node:stream");
  const input = Readable.fromWeb(response.body);
  input.on("data", (chunk) => hash.update(chunk));
  await pipeline(input, createWriteStream(tmp));
  await rename(tmp, dest);
  const sha256 = hash.digest("hex");
  const size = statSync(dest).size;
  console.log(`Saved ${basename(dest)} (${size} bytes, sha256=${sha256})`);
  return { sha256, size };
}

export function runImport(file, sourceUrl, spawnImpl = spawn) {
  return new Promise((resolvePromise, reject) => {
    console.log("Importing into Postgres (may take a few minutes)…");
    const child = spawnImpl(
      process.execPath,
      [require.resolve("tsx/cli"), "src/cli.ts", "import-finess", "--file", file, "--source-url", sourceUrl],
      {
        cwd: resolve(ROOT, "backend"),
        stdio: "inherit",
        env: process.env,
        shell: false,
        windowsHide: true,
      },
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`import-finess exited with code ${code}`));
    });
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let sourceUrl;
  try {
    sourceUrl = PINNED_URL ? assertOfficialUrl(PINNED_URL) : await resolveLatestFinessUrl();
  } catch (error) {
    if (PINNED_URL) throw error;
    console.warn(`Dataset discovery failed (${error.message}); using documented fallback URL.`);
    sourceUrl = assertOfficialUrl(FALLBACK_URL);
  }
  const file = resolve(OUT_DIR, basename(new URL(sourceUrl).pathname));
  if (!FORCE && existsSync(file) && statSync(file).size > 0) {
    console.log(`Local snapshot already present: ${file}`);
  } else {
    try {
      await download(sourceUrl, file);
    } catch (error) {
      if (existsSync(file + ".partial")) await unlink(file + ".partial").catch(() => {});
      throw error;
    }
  }
  await runImport(file, sourceUrl);
  console.log("FINESS reference ready. Search: GET /api/v1/reference-data/finess?q=…");
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
