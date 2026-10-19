import { NextRequest,NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { filterSchema,predictionSchema } from '@/lib/validation';
import { database } from '@/server/db';
import { incidents,analytics,regions,environment } from '@/server/queries';
import { allowed,result } from '@/server/http';
import { sourceDefinitions,unavailableModel } from '@/server/sources';
import { layers } from '@/server/layers';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
export async function GET(request:NextRequest,ctx:Context) {
 const path=(await ctx.params).path.join('/');
 const key=process.env.TRUST_PROXY==='true'?request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local':'local';
 if(!allowed(key)) return NextResponse.json({error:'rate_limited',message:'Terlalu banyak permintaan.'},{status:429,headers:{'Retry-After':'60'}});
 const parsed=filterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
 if(!parsed.success) return NextResponse.json({error:'invalid_request',message:'Parameter tidak valid.',issues:parsed.error.issues},{status:400});
 const f=parsed.data;
 if(path==='ai/status'||path==='ai/metadata') return result(unavailableModel);
 if(path==='susceptibility') return result([],{message:'Peta kerentanan resmi belum tersedia. Tidak ada kelas atau skor rekaan.'});
 try {
  if(path==='health') {await database().execute(sql`SELECT PostGIS_Version()`);return result({status:'ok',database:'postgis'});}
  if(path==='incidents'||path==='incidents/nearby') {if(path==='incidents/nearby'&&(f.lng===undefined||f.lat===undefined))return result(null,{message:'Lintang dan bujur wajib diberikan.'},400);const r=await incidents(f);return result(r.data,{total:r.total,limit:f.limit,offset:f.offset,has_more:f.offset+r.data.length<r.total});}
  if(path.startsWith('incidents/')) {const id=path.slice('incidents/'.length);const data=await database().execute(sql`SELECT *,ST_X(geom) AS longitude,ST_Y(geom) AS latitude FROM landslide_incidents WHERE id=${id} LIMIT 1`);return data.length?result(data[0]):result(null,{message:'Kejadian tidak ditemukan.'},404);}
  if(path==='analytics') return result(await analytics(f));
  if(path==='layers') {
   const sources=await database().execute(sql`SELECT id,status,last_success_at FROM data_sources`);
   return result(layers.map(layer=>{const source=sources.find(s=>s.id===layer.source);return {...layer,last_updated:source?.last_success_at||null,availability:layer.availability==='database'?(source?.status==='available'?'available':'unavailable'):layer.availability};}));
  }
  if(path==='location') {
   if(f.lng===undefined||f.lat===undefined)return result(null,{message:'Lintang dan bujur wajib diberikan.'},400);
   const regions=await database().execute(sql`SELECT id,name,level,source_id FROM administrative_regions WHERE ST_Covers(geom,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326)) ORDER BY level DESC`);
   const susceptibility=await database().execute(sql`SELECT s.classification,s.official,d.name,d.source_id,d.updated_at,d.limitations FROM susceptibility_layers s JOIN geospatial_datasets d ON d.id=s.dataset_id WHERE s.official=true AND ST_Covers(s.geom,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326))`);
   return result({regions,susceptibility,limitations:['Batas administratif geoBoundaries bukan batas hukum BIG.','Tidak ada data bukan berarti aman.']});
  }
  if(path==='regions') return result(await regions(f,request.nextUrl.searchParams.get('format')==='geojson'));
  if(path.startsWith('weather/')) {const kind=path.split('/')[1];if(!['observations','forecasts','warnings'].includes(kind)) return result(null,{},404);return result(await environment(kind,f));}
  if(path==='sources') {
   const rows=await database().execute(sql`SELECT *,CASE WHEN last_success_at IS NOT NULL AND last_success_at < now() - make_interval(secs => (frequency_hours*3600)::int) THEN 'stale' ELSE status END AS freshness FROM data_sources ORDER BY id`);
   return result(rows);
  }
  if(path==='news') return result(await database().execute(sql`SELECT * FROM news_articles WHERE (${f.q||''}='' OR title ILIKE ${'%'+(f.q||'')+'%'}) ORDER BY published_at DESC NULLS LAST LIMIT ${f.limit} OFFSET ${f.offset}`));
  return NextResponse.json({error:'not_found',message:'Layanan tidak ditemukan.'},{status:404});
 } catch(e) {
  console.error(JSON.stringify({event:'api_error',path,error:e instanceof Error?e.message:'unknown'}));
  if(path==='sources') return result(sourceDefinitions.map(s=>({...s,status:'not_ingested',last_success_at:null,last_attempt_at:null,error:null})),{availability:'unavailable',message:'Basis data belum terhubung. Registri sumber ditampilkan tanpa mengklaim data berhasil diimpor.'});
  return result(null,{availability:'unavailable',message:'Basis data belum tersedia. Periksa konfigurasi DATABASE_URL dan jalankan migrasi.'},503);
 }
}
export async function POST(request:NextRequest,ctx:Context) {
 if((await ctx.params).path.join('/')!=='ai/predict') return result(null,{},404);
 if(!allowed('predict')) return result(null,{message:'Terlalu banyak permintaan.'},429);
 let body;try{if(Number(request.headers.get('content-length')||0)>10000) return result(null,{},413);body=await request.json();}catch{return NextResponse.json({error:'invalid_json'},{status:400});}
 const parsed=predictionSchema.safeParse(body);
 if(!parsed.success) return NextResponse.json({error:'invalid_request',issues:parsed.error.issues},{status:400});
 // Never forward to an unapproved artifact. Activation requires a governance integration.
 return NextResponse.json({...unavailableModel,issued_at:null,predicted_value:null,geographic_unit:parsed.data.geographic_unit,horizon_hours:parsed.data.horizon_hours},{status:503});
}
