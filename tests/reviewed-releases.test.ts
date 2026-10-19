import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { reviewedReleaseSchema } from '../src/server/ingestion';

const records = JSON.parse(readFileSync('db/reviewed-releases.json', 'utf8'));

test('reviewed releases have unique IDs, official links and ordered dates', () => {
 expect(records.length).toBeGreaterThan(0);
 expect(new Set(records.map((r: { id: string }) => r.id)).size).toBe(records.length);
 for (const record of records) expect(reviewedReleaseSchema.safeParse(record).success).toBe(true);
});

test('rejects unrelated sources, invented coordinates and invalid chronology', () => {
 const record = records[0];
 for (const change of [
  { source_url: 'https://www.bnpb.go.id.evil.test/berita/test' },
  { source_url: 'http://www.bnpb.go.id/berita/test' },
  { longitude: 97 },
  { occurred_on: '2026-02-30' },
  { occurred_on: '2026-10-12' },
  { reviewed_at: '2026-10-01T00:00:00Z' },
 ]) expect(reviewedReleaseSchema.safeParse({ ...record, ...change }).success).toBe(false);
});
