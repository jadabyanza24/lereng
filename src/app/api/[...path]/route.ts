import { NextRequest,NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { filterSchema,predictionSchema } from '@/lib/validation';
import { database } from '@/server/db';
import { incidents,analytics,regions,environment } from '@/server/queries';
import { allowed,result } from '@/server/http';
import { sourceDefinitions,unavailableModel } from '@/server/sources';
import { layers } from '@/server/layers';
import { fetchZkgtAtCoordinate,zkgtMeta } from '@/server/ingestion';
import { searchPlaces } from '@/server/places';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
const TRANSPARENT_PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII=','base64');
export async function GET(request:NextRequest,ctx:Context) {
 const path=(await ctx.params).path.join('/');
 if(path==='susceptibility/tile') {
  const bbox=request.nextUrl.searchParams.get('bbox')||'';
  if(!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(bbox)) return new NextResponse(TRANSPARENT_PNG,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'}});
  try {
   const wmsUrl=`https://vsi.esdm.go.id/data/api/public/geohazard/map-layer/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=pmbgi:zkgt_indonesia&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX=${encodeURIComponent(bbox)}`;
   const upstream=await fetch(wmsUrl,{headers:{'User-Agent':'LERENG/0.1','Referer':'https://vsi.esdm.go.id/portalmbg/'},signal:AbortSignal.timeout(6000)});
   if(!upstream.ok || !upstream.headers.get('content-type')?.includes('image')) return new NextResponse(TRANSPARENT_PNG,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=600'}});
   const buf=Buffer.from(await upstream.arrayBuffer());
   return new NextResponse(buf,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
  } catch {
   return new NextResponse(TRANSPARENT_PNG,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=300'}});
  }
 }
 const key=process.env.TRUST_PROXY==='true'?request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local':'local';
 if(!allowed(key)) return NextResponse.json({error:'rate_limited',message:'Terlalu banyak permintaan.'},{status:429,headers:{'Retry-After':'60'}});
 const parsed=filterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
 if(!parsed.success) return NextResponse.json({error:'invalid_request',message:'Parameter tidak valid.',issues:parsed.error.issues},{status:400});
 const f=parsed.data;
  if(path==='ai/status'||path==='ai/metadata') return result(unavailableModel);
  if(path==='places') {
   const id=request.nextUrl.searchParams.get('id');
   if(id&&!/^[a-zA-Z0-9:._-]{1,100}$/.test(id))return result(null,{message:'Identitas wilayah tidak valid.'},400);
   return result(searchPlaces(f.q||'',id,Math.min(f.limit,10)));
  }
 try {
  if(path==='susceptibility') {
   const format=request.nextUrl.searchParams.get('format');
   const where=f.province?sql`s.official=true AND s.legend->>'province'=${f.province}`:sql`s.official=true AND s.id NOT LIKE 'pvmbg-zkgt:regional-rendah-%'`;
   const rows=await database().execute(sql`SELECT s.id,s.classification,s.legend,s.official,d.name,d.source_id,d.updated_at,d.limitations,ST_AsGeoJSON(ST_SimplifyPreserveTopology(s.geom,0.005))::json AS geometry FROM susceptibility_layers s JOIN geospatial_datasets d ON d.id=s.dataset_id WHERE ${where} ORDER BY CASE WHEN s.classification ILIKE '%Tinggi%' THEN 1 WHEN s.classification ILIKE '%Menengah%' THEN 2 ELSE 3 END LIMIT ${f.limit}`);
   if(format==='geojson') {
    return result({type:'FeatureCollection',features:rows.map(r=>({type:'Feature',id:r.id,geometry:r.geometry,properties:{id:r.id,classification:r.classification,official:r.official,name:r.name,source_id:r.source_id,updated_at:r.updated_at,limitations:r.limitations,...(typeof r.legend==='object'&&r.legend!==null?r.legend:{})}}))});
   }
   return result(rows,{total:rows.length});
  }
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
   const db=database();
   const regions=await db.execute(sql`SELECT id,name,level,source_id FROM administrative_regions WHERE ST_Covers(geom,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326)) ORDER BY level DESC`);
   let susceptibility=await db.execute(sql`SELECT s.id,s.classification,s.legend,s.official,d.name,d.source_id,d.updated_at,d.limitations FROM susceptibility_layers s JOIN geospatial_datasets d ON d.id=s.dataset_id WHERE s.official=true AND ST_Covers(s.geom,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326)) ORDER BY CASE WHEN s.id LIKE 'pvmbg-zkgt:zkgt_%' THEN 0 WHEN s.id LIKE 'pvmbg-zkgt:koridor-tinggi-%' THEN 1 WHEN s.id LIKE 'pvmbg-zkgt:koridor-menengah-%' THEN 2 ELSE 3 END, CASE WHEN s.classification ILIKE '%Tinggi%' THEN 1 WHEN s.classification ILIKE '%Menengah%' THEN 2 ELSE 3 END`);
   const hasExactZkgt=susceptibility.some(r=>String(r.id).startsWith('pvmbg-zkgt:zkgt_'));
   if(!hasExactZkgt) {
    const liveFeats=await fetchZkgtAtCoordinate(f.lng,f.lat,6,2200);
    if(liveFeats.length) {
     for(const lf of liveFeats) {
      const meta=zkgtMeta(lf.properties.unsur,lf.properties.wilayah,lf.properties.keterangan);
      const id=`pvmbg-zkgt:${lf.id}`;
      try {
       await db.execute(sql`INSERT INTO susceptibility_layers(id,dataset_id,classification,legend,geom,official) VALUES(${id},'pvmbg-zkgt',${meta.classification},${JSON.stringify(meta)}::jsonb,ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(lf.geometry)}),4326)),3)),true) ON CONFLICT(id) DO NOTHING`);
      } catch {}
     }
     susceptibility=await db.execute(sql`SELECT s.id,s.classification,s.legend,s.official,d.name,d.source_id,d.updated_at,d.limitations FROM susceptibility_layers s JOIN geospatial_datasets d ON d.id=s.dataset_id WHERE s.official=true AND ST_Covers(s.geom,ST_SetSRID(ST_MakePoint(${f.lng},${f.lat}),4326)) ORDER BY CASE WHEN s.id LIKE 'pvmbg-zkgt:zkgt_%' THEN 0 WHEN s.id LIKE 'pvmbg-zkgt:koridor-tinggi-%' THEN 1 WHEN s.id LIKE 'pvmbg-zkgt:koridor-menengah-%' THEN 2 ELSE 3 END, CASE WHEN s.classification ILIKE '%Tinggi%' THEN 1 WHEN s.classification ILIKE '%Menengah%' THEN 2 ELSE 3 END`);
    }
   }
   return result({regions,susceptibility,limitations:['Batas administratif geoBoundaries bukan batas hukum BIG.','Peta Zona Kerentanan Gerakan Tanah PVMBG bersifat regional dan bukan pengganti penyelidikan geoteknik tapak.','Tidak ada data bukan berarti aman.']});
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
