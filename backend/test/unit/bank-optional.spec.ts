import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentsController, DocumentsService } from '../../src/documents/documents.module';
import { Database } from '../../src/database/database';
import type { Request } from 'express';

for (const assigned of [false, true]) {
  test(`bank details are optional with first assignment=${assigned}; suggestion follows the first mission`, async () => {
    const db = { query: async (sql: string, args: unknown[]) => {
      assert.equal(args[0], 'owner');
      if (sql.includes('FROM document')) return [];
      if (sql.includes('FROM assignment')) return assigned ? [{ id: 'assignment' }] : [];
      throw Error('Unexpected query');
    } } as unknown as Database;
    const controller = new DocumentsController(db, {} as DocumentsService);
    const result = await controller.getBank({ session: { userId: 'owner' } } as Request);
    assert.deepEqual(result, { iban: null, details: null, document: null, required: false, suggested: assigned });
  });
}

test('a bank document already supplied suppresses the optional reminder', async () => {
  const document = { id: 'file', mime: 'application/pdf', size_bytes: 10, created_at: '2026-01-01' };
  const db = { query: async (sql: string) => sql.includes('FROM document') ? [document] : [{ id: 'assignment' }] } as unknown as Database;
  const controller = new DocumentsController(db, {} as DocumentsService);
  const result = await controller.getBank({ session: { userId: 'owner' } } as Request);
  assert.equal(result.required, false);
  assert.equal(result.suggested, false);
});
