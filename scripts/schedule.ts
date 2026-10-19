import 'dotenv/config';
import { ingest } from '../src/server/ingestion';
import { sqlClient } from '../src/server/db';
async function tick() {
 const sources=await sqlClient()`SELECT id FROM data_sources WHERE id IN ('nasa-glc','geoboundaries','bmkg-forecast','bmkg-cap') AND (last_attempt_at IS NULL OR last_attempt_at < now() - make_interval(secs => (frequency_hours*3600)::integer))`;
 for(const s of sources) try {await ingest(s.id);} catch { /* Failure persisted by the adapter; continue other sources. */ }
}
await tick();
setInterval(()=>void tick().catch(e=>console.error(JSON.stringify({event:'scheduler_error',error:String(e)}))),60000);
