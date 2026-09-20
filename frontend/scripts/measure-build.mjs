/** Reproducible artifact inventory. Run AFTER Vite and public-page generation. */
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {resolve, relative, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export const REPORT_PATH = 'quality/build-weight.json';
const hash=data=>createHash('sha256').update(data).digest('hex');
export async function measureBuild(dist, measuredAt=new Date().toISOString()) {
 dist=resolve(dist);
 // Missing artifacts fail loudly: never publish a zero-byte success report.
 const html=await readFile(resolve(dist,'index.html'),'utf8');
 const manifest=JSON.parse(await readFile(resolve(dist,'.vite/manifest.json'),'utf8'));
 const files=[];
 async function walk(dir) {
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)) {
   const path=resolve(dir,entry.name),name=relative(dist,path).replaceAll('\\','/');
   if(name===REPORT_PATH)continue; // avoid a self-referential hash/size
   if(entry.isDirectory())await walk(path);
   else if(entry.isFile()) {const content=await readFile(path);files.push({path:name,bytes:content.length,sha256:hash(content)});}
  }
 }
 await walk(dist);
 files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const initial=new Set(['index.html']);
 const visited=new Set();
 function addEntry(key){
  if(visited.has(key))return;visited.add(key);
  const entry=manifest[key];if(!entry)throw new Error('Missing manifest entry: '+key);
  initial.add(entry.file);for(const css of entry.css||[])initial.add(css);
  for(const imported of entry.imports||[])addEntry(imported);
 }
 const root=Object.keys(manifest).find(k=>manifest[k].isEntry&&k==='index.html');
 if(!root)throw new Error('Missing index.html entry in Vite manifest');
 addEntry(root);
 // Include explicit local HTML assets/preloads. Runtime images/fonts are measured separately.
 for(const m of html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)) {
  const name=m[1].slice(1).split(/[?#]/)[0];if(files.some(f=>f.path===name))initial.add(name);
 }
 const initialFiles=[...initial].sort().map(path=>{const f=files.find(f=>f.path===path);if(!f)throw new Error('Missing initial asset: '+path);return f;});
 return {
  schemaVersion:1,measuredAt,artifactSha256:hash(JSON.stringify(files)),
  installed:{bytes:files.reduce((n,f)=>n+f.bytes,0),fileCount:files.length,excludes:[REPORT_PATH],meaning:'Uncompressed deployment files, including deferred OCR assets; not node_modules or browser storage.'},
  initial:{bytes:initialFiles.reduce((n,f)=>n+f.bytes,0),files:initialFiles.map(f=>f.path),meaning:'Static uncompressed HTML and entry dependency estimate. Excludes dynamic chunks and runtime-loaded resources; not a network measurement.'},
  transfers:null,
  topAssets:[...files].sort((a,b)=>b.bytes-a.bytes||(a.path<b.path?-1:1)).slice(0,15),
 };
}
export async function publishBuildReport(dist, measuredAt) {
 const report=await measureBuild(dist,measuredAt),target=resolve(dist,REPORT_PATH);
 await mkdir(dirname(target),{recursive:true});await writeFile(target,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const dist=resolve(process.argv[2]||fileURLToPath(new URL('../dist',import.meta.url)));
 const report=await publishBuildReport(dist);
 console.log(JSON.stringify({report:resolve(dist,REPORT_PATH),measuredAt:report.measuredAt,sha256:report.artifactSha256,installedBytes:report.installed.bytes,initialEstimateBytes:report.initial.bytes,transfers:report.transfers}));
}
