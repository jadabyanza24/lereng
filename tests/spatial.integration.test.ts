import { it,expect,afterAll } from 'vitest';
import { sqlClient } from '../src/server/db';
import { filterSchema } from '../src/lib/validation';
import { incidents,analytics } from '../src/server/queries';
import 'dotenv/config';
const enabled=!!process.env.DATABASE_URL;
afterAll(async()=>{if(enabled)await sqlClient().end();});
it.skipIf(!enabled)('PostGIS emprise, proximité et cohérence des agrégats persistés',async()=>{
 const sql=sqlClient();const [version]=await sql`SELECT PostGIS_Version() AS version`;expect(version.version).toMatch(/^3/);
 const f=filterSchema.parse({bbox:'94,-12,142,7',limit:2000});
 const records=await incidents(f);const stats=await analytics(f);expect(Number(stats.total)).toBe(records.total);
 expect(records.total).toBeGreaterThan(0);
 for(const r of records.data){expect(Number(r.longitude)).toBeGreaterThanOrEqual(94);expect(Number(r.latitude)).toBeLessThanOrEqual(7);}
 const near=await incidents(filterSchema.parse({lng:107,lat:-7,radius:50000}));
 const [count]=await sql`SELECT count(*)::int AS total FROM landslide_incidents WHERE ST_DWithin(geom::geography,ST_SetSRID(ST_MakePoint(107,-7),4326)::geography,50000)`;expect(near.total).toBe(count.total);
 const [duplicates]=await sql`SELECT count(*) AS total FROM (SELECT source_id,external_id,count(*) FROM landslide_incidents GROUP BY source_id,external_id HAVING count(*)>1) d`;expect(Number(duplicates.total)).toBe(0);
});
