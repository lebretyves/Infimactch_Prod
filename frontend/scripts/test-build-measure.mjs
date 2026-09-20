import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {measureBuild,publishBuildReport,REPORT_PATH} from './measure-build.mjs';
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'infimatch-weight-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
test('missing build fails instead of publishing a success',async t=>{const dir=await fixture(t);await assert.rejects(publishBuildReport(dir),/ENOENT/);await assert.rejects(readFile(join(dir,REPORT_PATH)),/ENOENT/);});
test('deterministic inventory except date; report exists in served dist, excludes deferred resources from initial weight',async t=>{
 const dir=await fixture(t);await mkdir(join(dir,'.vite'));await mkdir(join(dir,'assets'));
 await writeFile(join(dir,'index.html'),'<script type="module" src="/assets/main.js"></script>');
 await writeFile(join(dir,'assets/main.js'),'entry');await writeFile(join(dir,'assets/lazy.js'),'large deferred resource');
 await writeFile(join(dir,'.vite/manifest.json'),JSON.stringify({'index.html':{isEntry:true,file:'assets/main.js',dynamicImports:['lazy']},lazy:{file:'assets/lazy.js'}}));
 const a=await publishBuildReport(dir,'2026-01-01T00:00:00Z'),b=await publishBuildReport(dir,'2026-02-01T00:00:00Z');
 assert.deepEqual({...a,measuredAt:null},{...b,measuredAt:null});assert.equal(b.transfers,null);
 assert(!b.initial.files.includes('assets/lazy.js'));assert(b.installed.bytes>b.initial.bytes);
 assert.deepEqual(JSON.parse(await readFile(join(dir,REPORT_PATH),'utf8')),b);
 await writeFile(join(dir,'assets/lazy.js'),'changed');assert.notEqual((await measureBuild(dir)).artifactSha256,b.artifactSha256);
});
test('missing manifest or entry dependency is an error',async t=>{const dir=await fixture(t);await writeFile(join(dir,'index.html'),'ok');await assert.rejects(measureBuild(dir),/ENOENT/);await mkdir(join(dir,'.vite'));await writeFile(join(dir,'.vite/manifest.json'),JSON.stringify({'index.html':{isEntry:true,file:'missing.js'}}));await assert.rejects(measureBuild(dir),/Missing initial asset/);});
