import { withRole, request } from './common.mjs';
// Secret supplied over stdin by the masked PowerShell prompt, never in process arguments.
try {
  let input = '';
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 1024) throw Error('INVALID_KEY'); }
  const key = input.trim();
  if (!/^jp_live_[A-Za-z0-9_-]+$/.test(key)) throw Error('INVALID_KEY');
  await withRole('operator', async token => {
    const path = 'kv/data/infimatch/v1/backend';
    const current = (await request(path, {token})).data;
    await request(path, {method:'POST', token, data:{options:{cas:current.metadata.version}, data:{...current.data, JOBSPIPE_API_KEY:key}}});
  });
  console.log('JobsPipe key saved in Vault.');
} catch { console.error('JobsPipe key not saved. Check key and Vault availability.'); process.exitCode=1; }
