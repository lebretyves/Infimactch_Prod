#!/usr/bin/env node
/**
 * Mesure le poids du build Vite (dist/).
 * Cadre RGESN : suivi de ressource, pas un score ni une estimation CO₂.
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, "public", "quality");
const outFile = join(outDir, "build-weight.json");

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e && e.code === "ENOENT") {
      console.error("Dossier dist/ introuvable. Lancez d’abord : npm run build");
      process.exitCode = 1;
      return files;
    }
    throw e;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, files);
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const paths = await walk(dist);
if (process.exitCode) process.exit(process.exitCode);

const rows = [];
let totalBytes = 0;
let jsBytes = 0;
let cssBytes = 0;
let imageBytes = 0;
let fontBytes = 0;

for (const path of paths) {
  const size = (await stat(path)).size;
  totalBytes += size;
  const rel = relative(dist, path).replaceAll("\\", "/");
  const lower = rel.toLowerCase();
  if (lower.endsWith(".js")) jsBytes += size;
  else if (lower.endsWith(".css")) cssBytes += size;
  else if (/\.(png|jpe?g|webp|gif|svg|avif)$/.test(lower)) imageBytes += size;
  else if (/\.(woff2?|ttf|otf)$/.test(lower)) fontBytes += size;
  rows.push({ path: rel, bytes: size });
}

rows.sort((a, b) => b.bytes - a.bytes);

const report = {
  measuredAt: new Date().toISOString(),
  totalBytes,
  jsBytes,
  cssBytes,
  imageBytes,
  fontBytes,
  topAssets: rows.slice(0, 20),
  note: "Poids des fichiers du build Vite (dist/). Ce n’est pas une mesure énergétique, ni un score RGESN, ni un gain de CO₂.",
};

await mkdir(outDir, { recursive: true });
await writeFile(outFile, JSON.stringify(report, null, 2) + "\n");

const kb = (n) => (n / 1024).toFixed(1) + " ko";
console.log(
  [
    `Build mesuré → ${relative(root, outFile)}`,
    `total ${kb(totalBytes)} · JS ${kb(jsBytes)} · CSS ${kb(cssBytes)} · images ${kb(imageBytes)} · polices ${kb(fontBytes)}`,
    report.note,
  ].join("\n"),
);
