import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {rotateProductionBackups} from './rotate-production-backups.mjs';
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'infimatch-backup-rotation-'));try{await fn(root);}finally{const target=resolve(root);if(!target.startsWith(resolve(tmpdir())+sep)||!target.split(sep).at(-1).startsWith('infimatch-backup-rotation-'))throw Error('UNSAFE_TEST_CLEANUP');await rm(target,{recursive:true,force:true});}}
const old='2026-08-19T00-00-00-000Z',recent='2026-09-19T00-00-00-000Z',now=Date.parse('2026-09-19T12:00:00Z');
test('dry-run then apply removes all expired backups, even last copy, keeps recent/unrelated',()=>fixture(async base=>{for(const name of [old,recent,'operator-notes']){await mkdir(join(base,name));await writeFile(join(base,name,'manifest.json'),'{}');}const preview=await rotateProductionBackups({base,now});assert.deepEqual(preview.expiredFolders,[old]);assert.equal((await readdir(base)).length,3);await rotateProductionBackups({base,now,apply:true});assert.deepEqual((await readdir(base)).sort(),[recent,'operator-notes'].sort());}));
test('unexpected file refuses deletion',()=>fixture(async base=>{await mkdir(join(base,old));await writeFile(join(base,old,'private.txt'),'preserve');await assert.rejects(rotateProductionBackups({base,now,apply:true}),/UNEXPECTED_CONTENT/);assert.equal(await readFile(join(base,old,'private.txt'),'utf8'),'preserve');}));
test('directory junction refuses traversal outside backup directory',()=>fixture(async root=>{const base=join(root,'backups'),outside=join(root,'outside');await mkdir(base);await mkdir(outside);await writeFile(join(outside,'manifest.json'),'preserve');await symlink(outside,join(base,old),'junction');await assert.rejects(rotateProductionBackups({base,now,apply:true}),/UNSAFE_FOLDER/);assert.equal(await readFile(join(outside,'manifest.json'),'utf8'),'preserve');}));
