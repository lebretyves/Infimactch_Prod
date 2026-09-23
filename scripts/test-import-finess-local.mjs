import assert from 'node:assert/strict';
import { resolveLatestFinessUrl } from './import-finess-local.mjs';

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
