import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';
import { validCoordinate } from '../lib/validation';
import { sqlClient } from './db';
import { sourceDefinitions } from './sources';

const rawIncident = z.object({event_id:z.number().int(),event_date:z.number(),country_na:z.literal('Indonesia'),longitude:z.number().nullable(),latitude:z.number().nullable(),location_a:z.string().nullable(),source_lin:z.string().nullable(),admin_divi:z.string().nullable(),event_titl:z.string().nullable(),event_desc:z.string().nullable(),fatality_c:z.number().int().nullable(),injury_cou:z.number().int().nullable()}).passthrough();
const clean = (v:unknown) => typeof v==='string' ? v.trim() || null : null;
const count = (v:number|null) => v!==null && v>=0 ? v : null;
export function fingerprint(date:string,lon:number|null,lat:number|null,title:string) { return createHash('sha256').update(JSON.stringify([date.slice(0,10),lon?.toFixed(3),lat?.toFixed(3),title.toLowerCase().replace(/\s+/g,' ').trim()])).digest('hex'); }
export function normalizeIncident(input:unknown,retrievedAt:string) {
 const r=rawIncident.parse(input);
 const date=new Date(r.event_date).toISOString();
 const located=validCoordinate(r.longitude,r.latitude);
 const longitude=located?r.longitude:null, latitude=located?r.latitude:null;
 // Preserve catalog uncertainty; coordinates are not field-verified positions.
 const precision=clean(r.location_a) || 'Tidak diketahui';
 const location=clean(r.admin_divi) || 'Indonesia';
 const title=`Catatan longsor · ${location}`;
 const rawUrl=clean(r.source_lin);
 const sourceUrl=rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://www.arcgis.com/home/item.html?id=31f8fca315a5458a9800cfd102504257`;
 return {id:`nasa-glc:${r.event_id}`,external_id:String(r.event_id),title,description:clean(r.event_desc),occurred_at:date,province:clean(r.admin_divi),longitude,latitude,coordinate_precision:`Perkiraan katalog: ${precision}`,fatalities:count(r.fatality_c),injuries:count(r.injury_cou),source_url:sourceUrl,source_id:'nasa-glc',verification_status:'media_reported',published_at:null,retrieved_at:retrievedAt,fingerprint:fingerprint(date,longitude,latitude,clean(r.event_titl)||title),raw:r};
}

export async function fetchSource(url:string):Promise<string> {
 for(let attempt=0;attempt<3;attempt++) {
  try {
   const r=await fetch(url,{headers:{'User-Agent':'LERENG/0.1 (geospatial research; source attribution retained)'},signal:AbortSignal.timeout(30000)});
   if(!r.ok) throw new Error(`HTTP ${r.status}`);
   const text=await r.text();
   if(text.length>40_000_000) throw new Error('Respons terlalu besar');
   return text;
  } catch(e) {if(attempt===2) throw e;await new Promise(r=>setTimeout(r,1000*2**attempt));}
 }
 throw new Error('Sumber tidak tersedia');
}

async function ingestCatalog() {
 const sql=sqlClient(); let total=0;
 const metadata=JSON.parse(await fetchSource('https://www.arcgis.com/sharing/rest/content/items/31f8fca315a5458a9800cfd102504257?f=json'));
 if(!metadata.licenseInfo?.includes('PERMISSION TO USE'))throw new Error('Izin katalog tidak ditemukan; hentikan impor');
 await mkdir('public/geodata',{recursive:true});
 await writeFile('public/geodata/nasa-glc-permission.txt','NASA Global Landslide Catalog (GLC)\nRetrieved: '+new Date().toISOString()+'\nModifications: Indonesia subset normalized to LERENG schema; original records retained.\n\n'+metadata.licenseInfo.replace(/<[^>]+>/g,'\n'));
 for(let offset=0;offset<20000;offset+=1000) {
  const base=sourceDefinitions[0].url;
  const p=new URLSearchParams({f:'json',where:"country_na='Indonesia'",outFields:'*',returnGeometry:'false',resultOffset:String(offset),resultRecordCount:'1000',orderByFields:'FID ASC'});
  const page=JSON.parse(await fetchSource(`${base}/query?${p}`));
  if(page.error || !Array.isArray(page.features)) throw new Error(`Format katalog tidak valid: ${page.error?.message||'features hilang'}`);
  const now=new Date().toISOString();
  await sql.begin(async tx=>{
   for(const f of page.features) {
    const r=normalizeIncident(f.attributes,now);
    await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,geom,coordinate_precision,fatalities,injuries,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
      VALUES(${r.id},${r.external_id},${r.title},${r.description},${r.occurred_at},${r.province},CASE WHEN ${r.longitude}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${r.longitude},${r.latitude}),4326) END,${r.coordinate_precision},${r.fatalities},${r.injuries},${r.source_id},${r.source_url},${r.verification_status},${r.published_at},${r.retrieved_at},${r.fingerprint},${JSON.stringify(r.raw)}::jsonb)
      ON CONFLICT(id) DO UPDATE SET description=EXCLUDED.description,province=EXCLUDED.province,geom=EXCLUDED.geom,coordinate_precision=EXCLUDED.coordinate_precision,fatalities=EXCLUDED.fatalities,injuries=EXCLUDED.injuries,retrieved_at=EXCLUDED.retrieved_at,raw=EXCLUDED.raw`;
    await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at) VALUES(${r.id},${r.source_url},${r.source_id},NULL,${now}) ON CONFLICT(incident_id,source_url) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at`;
    total++;
   }
  });
  if(!page.exceededTransferLimit) break;
  await new Promise(r=>setTimeout(r,1100));
 }
 return total;
}

async function ingestBoundaries() {
 const sql=sqlClient();
 const metadata=JSON.parse(await fetchSource(sourceDefinitions[3].url));
 const download=new URL(metadata.simplifiedGeometryGeoJSON);
 if(!['github.com','raw.githubusercontent.com'].includes(download.hostname)) throw new Error('Host unduhan batas tidak diizinkan');
 const geo=JSON.parse(await fetchSource(download.toString()));
 if(geo.type!=='FeatureCollection' || !geo.features?.length) throw new Error('GeoJSON batas tidak valid');
 await sql.begin(async tx=>{
  for(const f of geo.features) {
   const p=z.object({shapeID:z.string(),shapeName:z.string()}).passthrough().parse(f.properties);
   await tx`INSERT INTO administrative_regions(id,name,level,source_id,geom,metadata) VALUES(${p.shapeID},${p.shapeName},1,'geoboundaries',ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}),4326)),${tx.json(metadata)}) ON CONFLICT(id) DO UPDATE SET geom=EXCLUDED.geom,name=EXCLUDED.name,retrieved_at=now(),metadata=EXCLUDED.metadata`;
  }
 });
 await mkdir('public/geodata',{recursive:true});
 await writeFile('public/geodata/provinces.geojson',JSON.stringify(geo));
 await writeFile('public/geodata/metadata.json',JSON.stringify({...metadata,retrieved_at:new Date().toISOString()}));
 return geo.features.length;
}

async function ingestForecast() {
 const sql=sqlClient(); let total=0;
 for(const adm4 of (process.env.BMKG_ADM4||'31.71.03.1001').split(',')) {
  if(!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) throw new Error('Kode adm4 tidak valid');
  const data=JSON.parse(await fetchSource(`${sourceDefinitions[1].url}?adm4=${adm4}`));
  const location=z.object({lon:z.number(),lat:z.number(),desa:z.string(),provinsi:z.string()}).passthrough().parse(data.lokasi);
  if(!validCoordinate(location.lon,location.lat)) throw new Error('Koordinat prakiraan tidak valid');
  for(const group of data.data) for(const day of group.cuaca) for(const item of day) {
   const r=z.object({datetime:z.iso.datetime(),analysis_date:z.string(),t:z.number(),hu:z.number(),weather_desc:z.string()}).passthrough().parse(item);
   const issued=new Date(r.analysis_date.endsWith('Z')?r.analysis_date:r.analysis_date+'Z').toISOString();
   await sql`INSERT INTO weather_forecasts(id,source_id,adm4,location_name,geom,issued_at,valid_at,retrieved_at,temperature,humidity,description,payload) VALUES(${`${adm4}:${issued}:${r.datetime}`},'bmkg-forecast',${adm4},${location.desa+', '+location.provinsi},ST_SetSRID(ST_MakePoint(${location.lon},${location.lat}),4326),${issued},${r.datetime},now(),${r.t},${r.hu},${r.weather_desc},${JSON.stringify(r)}::jsonb) ON CONFLICT(id) DO UPDATE SET retrieved_at=now(),payload=EXCLUDED.payload`;
   total++;
  }
  await new Promise(r=>setTimeout(r,1100));
 }
 return total;
}

const list = <T>(v:T|T[]|undefined):T[] => v===undefined?[]:Array.isArray(v)?v:[v];
async function ingestWarnings() {
 const sql=sqlClient();const parser=new XMLParser({ignoreAttributes:false});
 const feed=parser.parse(await fetchSource(sourceDefinitions[2].url));
 let total=0;
 for(const item of list<Record<string,string>>(feed.rss?.channel?.item)) {
  const link=new URL(item.link);
  if(link.hostname!=='www.bmkg.go.id' || !link.pathname.startsWith('/alerts/nowcast/id/')) continue;
  const raw=parser.parse(await fetchSource(link.toString()));
  const alert=raw.alert; if(!alert) throw new Error('CAP tidak valid');
  const info=list<Record<string,unknown>>(alert.info).find(i=>String(i.language).startsWith('id')) || list<Record<string,unknown>>(alert.info)[0];
  if(!info) continue;
  const polygons:number[][][][]=[];
  for(const area of list<Record<string,unknown>>(info.area as Record<string,unknown>|Record<string,unknown>[]|undefined)) for(const p of list<string>(area.polygon as string|string[]|undefined)) {
   const ring=String(p).trim().split(/\s+/).map(pair=>pair.split(',').map(Number).reverse());
   if(ring.length>=4 && ring.every(c=>validCoordinate(c[0],c[1]))) {if(JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1))) ring.push(ring[0]);polygons.push([ring]);}
  }
  const geom=polygons.length?JSON.stringify({type:'MultiPolygon',coordinates:polygons}):null;
  await sql`INSERT INTO official_warnings(id,source_id,title,description,source_url,effective_at,expires_at,published_at,retrieved_at,geom,payload) VALUES(${String(alert.identifier)},'bmkg-cap',${String(info.headline||info.event)},${String(info.description||'')},${link.toString()},${String(info.effective)},${String(info.expires)},${String(alert.sent)},now(),CASE WHEN ${geom}::text IS NULL THEN NULL ELSE ST_Multi(ST_GeomFromGeoJSON(${geom})) END,${sql.json(raw)}) ON CONFLICT(id) DO UPDATE SET retrieved_at=now(),expires_at=EXCLUDED.expires_at,payload=EXCLUDED.payload`;
  total++;await new Promise(r=>setTimeout(r,1100));
 }
 return total;
}

export async function ingest(source:string) {
 const sql=sqlClient();
 const adapters:Record<string,()=>Promise<number>>={'nasa-glc':ingestCatalog,'geoboundaries':ingestBoundaries,'bmkg-forecast':ingestForecast,'bmkg-cap':ingestWarnings};
 if(!adapters[source]) throw new Error('Adaptor belum tersedia atau izin sumber belum terverifikasi');
 const lockConnection=await sql.reserve();
 const [lock]=await lockConnection`SELECT pg_try_advisory_lock(hashtext(${`lereng:${source}`})) AS locked`;
 if(!lock.locked) {lockConnection.release();return;}
 const [run]=await sql`INSERT INTO ingestion_runs(source_id) VALUES(${source}) RETURNING id`;
 await sql`UPDATE data_sources SET last_attempt_at=now() WHERE id=${source}`;
 try {
  const count=await adapters[source]();
  await sql`UPDATE ingestion_runs SET finished_at=now(),status='success',record_count=${count} WHERE id=${run.id}`;
  await sql`UPDATE data_sources SET status='available',last_success_at=now(),error=NULL WHERE id=${source}`;
  console.log(JSON.stringify({event:'ingestion_success',source,count}));
 } catch(e) {
  const error=e instanceof Error?e.message:'Kesalahan ingest';
  await sql`UPDATE ingestion_runs SET finished_at=now(),status='failed',error=${error} WHERE id=${run.id}`;
  await sql`UPDATE data_sources SET status='unavailable',error=${error} WHERE id=${source}`;
  console.error(JSON.stringify({event:'ingestion_failed',source,error}));
  throw e;
 } finally {await lockConnection`SELECT pg_advisory_unlock(hashtext(${`lereng:${source}`}))`;lockConnection.release();}
}
