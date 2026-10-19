import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { sqlClient } from '../src/server/db';
import { sourceDefinitions } from '../src/server/sources';
const sql=sqlClient();
try {
 await sql.begin(async tx=>{
  await tx.unsafe(await readFile('db/001_initial.sql','utf8'));
  for(const s of sourceDefinitions) await tx`INSERT INTO data_sources ${tx(s)} ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,license=EXCLUDED.license,limitations=EXCLUDED.limitations,frequency_hours=EXCLUDED.frequency_hours`;
 });
 console.log(JSON.stringify({event:'migration_complete'}));
} finally {await sql.end();}
