import { sql } from 'drizzle-orm';
import { database } from './db';
import type { Filters } from '../lib/validation';

export function incidentWhere(f:Filters) {
 const clauses=[sql`true`];
 if(f.from) clauses.push(sql`occurred_at >= ${f.from}::date`);
 if(f.to) clauses.push(sql`occurred_at < ${f.to}::date + interval '1 day'`);
 if(f.province) clauses.push(sql`province=${f.province}`);
 if(f.status) clauses.push(sql`verification_status=${f.status}`);
 if(f.q) clauses.push(sql`(title ILIKE ${'%'+f.q+'%'} OR description ILIKE ${'%'+f.q+'%'})`);
 if(f.bbox) clauses.push(sql`geom && ST_MakeEnvelope(${f.bbox[0]},${f.bbox[1]},${f.bbox[2]},${f.bbox[3]},4326)`);
 if(f.lng!==undefined && f.lat!==undefined) clauses.push(sql`ST_DWithin(geom::geography,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326)::geography,${f.radius})`);
 return sql.join(clauses,sql` AND `);
}
export async function incidents(f:Filters) {
 const db=database(), where=incidentWhere(f);
 const [data,count]=await Promise.all([db.execute(sql`SELECT id,title,description,occurred_at,province,regency,district,village,ST_X(geom) AS longitude,ST_Y(geom) AS latitude,coordinate_precision,fatalities,injuries,missing,displaced,damaged_buildings,infrastructure_impact,source_id,source_url,verification_status,published_at,retrieved_at FROM landslide_incidents WHERE ${where} ORDER BY occurred_at DESC,id LIMIT ${f.limit} OFFSET ${f.offset}`),db.execute(sql`SELECT count(*)::int AS total FROM landslide_incidents WHERE ${where}`)]);
 return {data,total:Number(count[0].total)};
}
export async function analytics(f:Filters) {
 const db=database(),where=incidentWhere(f);
 const [summary,provinces,monthly,years]=await Promise.all([
 db.execute(sql`SELECT count(*)::int AS total,count(geom)::int AS located,sum(fatalities)::int AS fatalities,sum(injuries)::int AS injuries FROM landslide_incidents WHERE ${where}`),
 db.execute(sql`SELECT coalesce(province,'Tidak diketahui') AS name,count(*)::int AS count FROM landslide_incidents WHERE ${where} GROUP BY province ORDER BY count DESC`),
 db.execute(sql`SELECT to_char(occurred_at AT TIME ZONE 'UTC','YYYY-MM') AS month,count(*)::int AS count FROM landslide_incidents WHERE ${where} GROUP BY month ORDER BY month`),
 db.execute(sql`SELECT to_char(occurred_at AT TIME ZONE 'UTC','YYYY') AS year,count(*)::int AS count FROM landslide_incidents WHERE ${where} GROUP BY year ORDER BY year`)]);
 return {total:Number(summary[0].total),located:Number(summary[0].located),fatalities:summary[0].fatalities===null?null:Number(summary[0].fatalities),injuries:summary[0].injuries===null?null:Number(summary[0].injuries),provinces,monthly,years};
}
export async function regions(f:Filters,geojson=false) {
 const db=database();
 const where=f.q?sql`name ILIKE ${'%'+f.q+'%'}`:sql`true`;
 if(geojson) {
  const rows=await db.execute(sql`SELECT id,name,level,source_id,ST_AsGeoJSON(ST_Simplify(geom,0.008))::json AS geometry,ST_AsGeoJSON(ST_PointOnSurface(geom))::json AS center,ST_XMin(Box3D(geom)) AS west,ST_YMin(Box3D(geom)) AS south,ST_XMax(Box3D(geom)) AS east,ST_YMax(Box3D(geom)) AS north FROM administrative_regions WHERE ${where} ORDER BY name LIMIT ${f.limit}`);
  return {type:'FeatureCollection',features:rows.map(r=>({type:'Feature',geometry:r.geometry,properties:{id:r.id,name:r.name}}))};
 }
 return db.execute(sql`SELECT id,name,level,source_id,ST_AsGeoJSON(ST_PointOnSurface(geom))::json AS center,ST_XMin(Box3D(geom)) AS west,ST_YMin(Box3D(geom)) AS south,ST_XMax(Box3D(geom)) AS east,ST_YMax(Box3D(geom)) AS north FROM administrative_regions WHERE ${where} ORDER BY name LIMIT ${f.limit}`);
}
export async function environment(kind:string,f:Filters) {
 const db=database();
 const table=kind==='forecasts'?sql`weather_forecasts`:kind==='warnings'?sql`official_warnings`:sql`weather_observations`;
 const conditions=[f.lng!==undefined && f.lat!==undefined?sql`ST_DWithin(geom::geography,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326)::geography,${f.radius})`:f.bbox?sql`geom && ST_MakeEnvelope(${f.bbox[0]},${f.bbox[1]},${f.bbox[2]},${f.bbox[3]},4326)`:sql`true`];
 if(f.province)conditions.push(sql`EXISTS (SELECT 1 FROM administrative_regions r WHERE r.name=${f.province} AND ST_Intersects(r.geom,${table}.geom))`);
 const timestamp=kind==='forecasts'?sql`valid_at`:kind==='warnings'?sql`effective_at`:sql`observed_at`;
 if(f.from)conditions.push(sql`${timestamp} >= ${f.from}::date`);
 if(f.to)conditions.push(sql`${timestamp} < ${f.to}::date + interval '1 day'`);
 const spatial=sql.join(conditions,sql` AND `);
 if(kind==='forecasts') return db.execute(sql`SELECT id,source_id,adm4,location_name,issued_at,valid_at,retrieved_at,temperature,humidity,description,ST_X(geom) AS longitude,ST_Y(geom) AS latitude FROM weather_forecasts WHERE ${spatial} AND valid_at >= now() AND issued_at=(SELECT max(issued_at) FROM weather_forecasts w2 WHERE w2.adm4=weather_forecasts.adm4) ORDER BY valid_at LIMIT ${f.limit}`);
 if(kind==='warnings') return db.execute(sql`SELECT id,title,description,source_id,source_url,effective_at,expires_at,published_at,retrieved_at,ST_AsGeoJSON(geom)::json AS geometry FROM official_warnings WHERE ${spatial} AND effective_at <= now() AND expires_at>now() ORDER BY expires_at LIMIT ${f.limit}`);
 return db.execute(sql`SELECT id,source_id,observed_at,retrieved_at,rainfall_mm,interval_hours,ST_X(geom) AS longitude,ST_Y(geom) AS latitude FROM weather_observations WHERE ${spatial} ORDER BY observed_at DESC LIMIT ${f.limit}`);
}
