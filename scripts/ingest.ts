import 'dotenv/config';
import { ingest } from '../src/server/ingestion';
import { sqlClient } from '../src/server/db';
const sources=process.argv.slice(2);
try {
 for(const s of sources.length?sources:['geoboundaries','nasa-glc','bmkg-forecast','bmkg-cap']) {
  try {await ingest(s);} catch {process.exitCode=1;}
 }
} finally {await sqlClient().end();}
