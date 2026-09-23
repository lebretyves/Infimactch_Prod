import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runImport, resolveLatestFinessUrl } from './import-finess-local.mjs';

{
  let called = false;
  const url = await resolveLatestFinessUrl(async () => {
    called = true;
    return {
      ok: true,
      async json() {
        return {
          resources: [
            {
              last_modified: '2026-08-01T00:00:00Z',
              url: 'https://static.data.gouv.fr/resources/finess-structures-1/old/finess-structures-mensuel-202607.json.gz',
            },
            {
              last_modified: '2026-09-01T00:00:00Z',
              url: 'https://static.data.gouv.fr/resources/finess-structures-1/new/finess-structures-mensuel-202608.json.gz',
            },
            {
              last_modified: '2026-09-02T00:00:00Z',
              url: 'https://example.com/evil.json.gz',
            },
          ],
        };
      },
    };
  });
  assert.equal(called, true);
  assert.equal(
    url,
    'https://static.data.gouv.fr/resources/finess-structures-1/new/finess-structures-mensuel-202608.json.gz',
  );
}
console.log('import-finess-local resolve checks passed');

await assert.rejects(resolveLatestFinessUrl(async()=>({ok:false,status:503})),/HTTP 503/);
await assert.rejects(resolveLatestFinessUrl(async()=>({ok:true,json:async()=>({resources:[]})})),/No monthly FINESS/);
await assert.rejects(resolveLatestFinessUrl(async()=>({ok:true,json:async()=>({resources:[{url:'https://static.data.gouv.fr/other/finess-structures-mensuel.json.gz'}]})})),/Only official/);

const file='C:\\Test folder\\finess.json.gz';
const source='https://static.data.gouv.fr/resources/finess-structures-1/snapshot.json.gz?one=1&two=2';
let started=0;
function launcher(code, error) {
 return (exe,args,options)=>{
  started++;
  assert.equal(exe,process.execPath);
  assert.ok(args[0].endsWith('cli.mjs'));
  assert.deepEqual(args.slice(1),['src/cli.ts','import-finess','--file',file,'--source-url',source]);
  assert.equal(options.shell,false);
  assert.equal(options.windowsHide,true);
  const child=new EventEmitter();
  queueMicrotask(()=>error?child.emit('error',error):child.emit('exit',code));
  return child;
 };
}
await runImport(file,source,launcher(0));
await assert.rejects(runImport(file,source,launcher(1)),/exited with code 1/);
await assert.rejects(runImport(file,source,launcher(null,new Error('spawn failed'))),/spawn failed/);
assert.equal(started,3);
console.log('PASS FINESS: latest official snapshot, HTTP/missing/invalid-source errors, shell-free Windows arguments, successful process and error propagation. No download or database import executed.');
