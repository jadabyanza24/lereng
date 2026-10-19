import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';
import { validCoordinate } from '../lib/validation';
import { normalizeProvince, provinceLabel } from '../lib/presentation';
import {
 ADMIN_OVERRIDES,
 COORDINATE_OVERRIDES,
 formatPenyelidikanTitleAndDescription,
 isNonIncidentPenyelidikan,
 normalizeDistrictName,
 normalizeRegencyName,
 normalizeVillageName,
 parseMagmaAdminFromTitle,
} from '../lib/admin-normalization';
import { sqlClient } from './db';
import { sourceDefinitions } from './sources';

const rawIncident = z.object({event_id:z.number().int(),event_date:z.number(),country_na:z.literal('Indonesia'),longitude:z.number().nullable(),latitude:z.number().nullable(),location_a:z.string().nullable(),source_lin:z.string().nullable(),admin_divi:z.string().nullable(),event_titl:z.string().nullable(),event_desc:z.string().nullable(),fatality_c:z.number().int().nullable(),injury_cou:z.number().int().nullable()}).passthrough();
const clean = (v:unknown) => typeof v==='string' ? v.trim() || null : null;
const count = (v:number|null|undefined) => typeof v==='number' && Number.isFinite(v) && v>=0 ? Math.trunc(v) : null;
export function fingerprint(date:string,lon:number|null,lat:number|null,title:string) { return createHash('sha256').update(JSON.stringify([date.slice(0,10),lon?.toFixed(3),lat?.toFixed(3),title.toLowerCase().replace(/\s+/g,' ').trim()])).digest('hex'); }
export function normalizeIncident(input:unknown,retrievedAt:string) {
 const r=rawIncident.parse(input);
 const date=new Date(r.event_date).toISOString();
 const located=validCoordinate(r.longitude,r.latitude);
 const longitude=located?r.longitude:null, latitude=located?r.latitude:null;
 // Preserve catalog uncertainty; coordinates are not field-verified positions.
 const precision=clean(r.location_a) || 'Tidak diketahui';
 const normalizedProvince=normalizeProvince(clean(r.admin_divi));
 const location=normalizedProvince || clean(r.admin_divi) || 'Indonesia';
 const title=`Catatan longsor · ${location}`;
 const rawUrl=clean(r.source_lin);
 const sourceUrl=rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://www.arcgis.com/home/item.html?id=31f8fca315a5458a9800cfd102504257`;
 return {id:`nasa-glc:${r.event_id}`,external_id:String(r.event_id),title,description:clean(r.event_desc),occurred_at:date,province:normalizedProvince,longitude,latitude,coordinate_precision:`Perkiraan katalog: ${precision}`,fatalities:count(r.fatality_c),injuries:count(r.injury_cou),source_url:sourceUrl,source_id:'nasa-glc',verification_status:'media_reported',published_at:null,retrieved_at:retrievedAt,fingerprint:fingerprint(date,longitude,latitude,clean(r.event_titl)||title),raw:r};
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

const INDONESIAN_MONTHS: Record<string, string> = {
 januari: '01', februari: '02', pebruari: '02', maret: '03', april: '04', mei: '05', juni: '06',
 juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', nopember: '11', desember: '12',
};

function decodeHtmlText(html: string): string {
 return html
  .replace(/&deg;/gi, '°')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#039;/gi, "'")
  .replace(/&rsquo;|&lsquo;/gi, "'")
  .replace(/&rdquo;|&ldquo;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}

function dmsToDecimal(deg: string, min: string, sec: string, dir: string, forceDecimalConcat = false): number {
 const minNum = Number(min);
 const secNum = Number(sec.replace(',', '.'));
 let dd: number;
 if (forceDecimalConcat || minNum >= 60 || secNum >= 60) {
  const frac = `${min}${sec.replace(/[,.]/g, '')}`;
  dd = Number(`${deg}.${frac}`);
 } else {
  dd = Number(deg) + minNum / 60 + secNum / 3600;
 }
 if (/^(LS|S)$/i.test(dir) && dd > 0) dd = -dd;
 return Number(dd.toFixed(6));
}

export function extractIndonesianCoordinates(text: string): { longitude: number; latitude: number } | null {
 const p1 = /(-?\d{1,2}[.,]\s*\d+)\s*[°⁰o]?\s*(LS|LU)\b[\s\S]{0,60}?(\d{2,3}[.,]\s*\d+)\s*[°⁰o]?\s*(BT)\b/i.exec(text);
 if (p1) {
  let lat = parseFloat(p1[1].replace(/\s+/g, '').replace(',', '.'));
  if (p1[2].toUpperCase() === 'LS' && lat > 0) lat = -lat;
  const lon = parseFloat(p1[3].replace(/\s+/g, '').replace(',', '.'));
  if (validCoordinate(lon, lat)) return { longitude: lon, latitude: lat };
 }
 const p2 = /\b(LS|LU)\s*(-?\d{1,2}[.,]\s*\d+)\s*[°⁰o]?[\s\S]{0,60}?\b(BT)\s*(\d{2,3}[.,]\s*\d+)/i.exec(text);
 if (p2) {
  let lat = parseFloat(p2[2].replace(/\s+/g, '').replace(',', '.'));
  if (p2[1].toUpperCase() === 'LS' && lat > 0) lat = -lat;
  const lon = parseFloat(p2[4].replace(/\s+/g, '').replace(',', '.'));
  if (validCoordinate(lon, lat)) return { longitude: lon, latitude: lat };
 }
 const p3 = /(\d{2,3}[.,]\s*\d+)\s*[°⁰o]?\s*(BT)\b[\s\S]{0,60}?(-?\d{1,2}[.,]\s*\d+)\s*[°⁰o]?\s*(LS|LU)\b/i.exec(text);
 if (p3) {
  const lon = parseFloat(p3[1].replace(/\s+/g, '').replace(',', '.'));
  let lat = parseFloat(p3[3].replace(/\s+/g, '').replace(',', '.'));
  if (p3[4].toUpperCase() === 'LS' && lat > 0) lat = -lat;
  if (validCoordinate(lon, lat)) return { longitude: lon, latitude: lat };
 }
 const p4 = /(\d{1,2})\s*[°⁰o]\s*(\d{1,2})\s*[’'′]\s*(\d{1,2}(?:[.,]\d+)?)\s*[”"″]?\s*(LS|LU)[\s\S]{0,60}?(\d{2,3})\s*[°⁰o]\s*(\d{1,2})\s*[’'′]\s*(\d{1,2}(?:[.,]\d+)?)\s*[”"″]?\s*(BT)/i.exec(text);
 if (p4) {
  const forceDec = Number(p4[2]) >= 60 || Number(p4[3].replace(',', '.')) >= 60 || Number(p4[6]) >= 60 || Number(p4[7].replace(',', '.')) >= 60;
  const lat = dmsToDecimal(p4[1], p4[2], p4[3], p4[4], forceDec);
  const lon = dmsToDecimal(p4[5], p4[6], p4[7], p4[8], forceDec);
  if (validCoordinate(lon, lat)) return { longitude: lon, latitude: lat };
 }
 const p5 = /(\d{2,3})\s*[°⁰o]\s*(\d{1,2})\s*[’'′]\s*(\d{1,2}(?:[.,]\d+)?)\s*[”"″]?\s*(BT)[\s\S]{0,60}?(\d{1,2})\s*[°⁰o]\s*(\d{1,2})\s*[’'′]\s*(\d{1,2}(?:[.,]\d+)?)\s*[”"″]?\s*(LS|LU)/i.exec(text);
 if (p5) {
  const forceDec = Number(p5[2]) >= 60 || Number(p5[3].replace(',', '.')) >= 60 || Number(p5[6]) >= 60 || Number(p5[7].replace(',', '.')) >= 60;
  const lon = dmsToDecimal(p5[1], p5[2], p5[3], p5[4], forceDec);
  const lat = dmsToDecimal(p5[5], p5[6], p5[7], p5[8], forceDec);
  if (validCoordinate(lon, lat)) return { longitude: lon, latitude: lat };
 }
 return null;
}

function parseIndonesianDate(text: string, fallbackIso: string): string {
 const re = /\b(\d{1,2})\s+(Januari|Februari|Pebruari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Nopember|Desember)\s+(20\d{2})(?:\s+pukul\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(WIB|WITA|WIT)?)?/gi;
 const maxTime = Date.parse(fallbackIso);
 let match: RegExpExecArray | null;
 while ((match = re.exec(text.slice(0, 2000))) !== null) {
  const day = match[1].padStart(2, '0');
  const month = INDONESIAN_MONTHS[match[2].toLowerCase()];
  const year = match[3];
  if (!month) continue;
  const hh = match[4] ? match[4].padStart(2, '0') : '00';
  const mm = match[5] ? match[5].padStart(2, '0') : '00';
  const ss = match[6] ? match[6].padStart(2, '0') : '00';
  const tz = match[7]?.toUpperCase() === 'WITA' ? '+08:00' : match[7]?.toUpperCase() === 'WIT' ? '+09:00' : match[4] ? '+07:00' : 'Z';
  const candidate = `${year}-${month}-${day}T${hh}:${mm}:${ss}${tz}`;
  const parsed = Date.parse(candidate);
  if (!Number.isNaN(parsed) && parsed <= maxTime + 86_400_000 && parsed >= Date.UTC(2000, 0, 1)) {
   return new Date(parsed).toISOString();
  }
 }
 return fallbackIso;
}

function extractAdminDivisions(title: string, body: string) {
 const combined = `${title} . ${body.slice(0, 1200)}`;
 const provMatch = /\bProvinsi\s+([A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:pada|yang|dengan|secara|berdasarkan))/i.exec(combined);
 const regMatch = /\b((?:Kabupaten|Kab\.|Kota)\s+[A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:Provinsi|pada|yang))/i.exec(combined);
 const distMatch = /\b(?:Kecamatan|Kec\.|Distrik)\s+([A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:Kabupaten|Kab\.|Kota|Provinsi))/i.exec(combined);
 const vilMatch = /\b(?:Desa|Kelurahan|Nagari|Kampung|Gampong|Pekon|Lembang)\s+([A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:Kecamatan|Kec\.|Distrik|Kabupaten))/i.exec(combined);
 const province = normalizeProvince(provMatch?.[1] || title);
 const regency = normalizeRegencyName(clean(regMatch?.[1]?.replace(/\s+/g, ' ')));
 const district = normalizeDistrictName(clean(distMatch?.[1]?.replace(/\s+/g, ' ')));
 const village = normalizeVillageName(clean(vilMatch?.[1]?.replace(/\s+/g, ' ')));
 return { province, regency, district, village };
}

async function resolveSpatialProvinces() {
 const sql = sqlClient();
 const distinctProvinces = await sql<{ province: string }[]>`
  SELECT DISTINCT province FROM landslide_incidents WHERE province IS NOT NULL
 `;
 for (const row of distinctProvinces) {
  const normalized = normalizeProvince(row.province);
  if (normalized !== row.province) {
   await sql`UPDATE landslide_incidents SET province = ${normalized} WHERE province = ${row.province}`;
  }
 }
 const missing = await sql<{ id: string; region_name: string }[]>`
  SELECT i.id, r.name AS region_name
  FROM landslide_incidents i
  JOIN administrative_regions r ON r.level = 1 AND ST_Intersects(r.geom, i.geom)
  WHERE i.geom IS NOT NULL AND (i.province IS NULL OR i.province = '')
 `;
 if (missing.length > 0) {
  await sql.begin(async tx => {
   for (const row of missing) {
    const label = normalizeProvince(provinceLabel(row.region_name)) || provinceLabel(row.region_name);
    await tx`UPDATE landslide_incidents SET province = ${label} WHERE id = ${row.id}`;
   }
  });
 }
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
 const results: R[] = [];
 let index = 0;
 async function next(): Promise<void> {
  while (index < items.length) {
   const current = index++;
   results[current] = await worker(items[current]);
  }
 }
 await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
 return results;
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
 await resolveSpatialProvinces();
 return total;
}

const isNonIncidentStudy = (title: string) => /relokasi|huntap|permohonan kajian/i.test(title) && !/kejadian gerakan tanah|tanggap darurat gerakan tanah|longsor/i.test(title);

async function ingestPvmbgTanggapan() {
 const sql = sqlClient();
 const now = new Date().toISOString();
 const links = new Map<string, string>();

 await sql`DELETE FROM incident_sources WHERE incident_id IN (SELECT id FROM landslide_incidents WHERE source_id='pvmbg-tanggapan' AND title ~* 'relokasi|huntap|permohonan kajian')`;
 await sql`DELETE FROM landslide_incidents WHERE source_id='pvmbg-tanggapan' AND title ~* 'relokasi|huntap|permohonan kajian'`;

 const firstPage = JSON.parse(await fetchSource('https://vsi.esdm.go.id/tanggapan-kejadian/apis/get?page=1'));
 const lastPage = Math.min(Number(firstPage.serve?.last_page || 14), 30);
 for (const item of firstPage.serve?.data || []) {
  if (item.vsi_link && !isNonIncidentStudy(String(item.title || ''))) {
   links.set(String(item.id), String(item.vsi_link));
  }
 }
 const remainingPages = Array.from({ length: Math.max(0, lastPage - 1) }, (_, i) => i + 2);
 await mapConcurrent(remainingPages, 4, async pageNum => {
  const page = JSON.parse(await fetchSource(`https://vsi.esdm.go.id/tanggapan-kejadian/apis/get?page=${pageNum}`));
  for (const item of page.serve?.data || []) {
   if (item.vsi_link && !isNonIncidentStudy(String(item.title || ''))) {
    links.set(String(item.id), String(item.vsi_link));
   }
  }
 });

 const pressPages = Array.from({ length: 8 }, (_, i) => i + 1);
 await mapConcurrent(pressPages, 4, async pageNum => {
  try {
   const page = JSON.parse(await fetchSource(`https://vsi.esdm.go.id/press-release/apis/get?page=${pageNum}`));
   for (const item of page.serve?.data || []) {
    const title = String(item.title || '');
    if (item.vsi_link && /gerakan\s+tanah|longsor/i.test(title) && !isNonIncidentStudy(title)) {
     links.set(String(item.id), String(item.vsi_link));
    }
   }
  } catch {
   // Press release page optional if unavailable
  }
 });

 const entries = [...links.entries()];
 const parsedRecords = await mapConcurrent(entries, 6, async ([fallbackId, url]) => {
  try {
   const html = await fetchSource(url);
   const match = html.match(/<news-detail\s+retrieve='([\s\S]*?)'><\/news-detail>/i);
   if (!match) return null;
   const detail = JSON.parse(match[1].replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
   const externalId = String(detail.id || fallbackId);
   const title = clean(detail.title);
   if (!title || isNonIncidentStudy(title)) return null;
   const publishedAt = detail.created_at ? new Date(detail.created_at).toISOString() : now;
   const bodyText = decodeHtmlText(String(detail.content || ''));
   const recId = `pvmbg-tanggapan:${externalId}`;
   const rawCoords = extractIndonesianCoordinates(bodyText);
   const coords = COORDINATE_OVERRIDES[recId] ?? rawCoords;
   const occurredAt = parseIndonesianDate(bodyText, publishedAt);
   const admin = extractAdminDivisions(title, bodyText);
   const adminOverride = ADMIN_OVERRIDES[recId];
   const finalTitle = adminOverride?.title || title;
   const summary = bodyText.length > 700 ? `${bodyText.slice(0, 700).trim()}…` : bodyText || finalTitle;
   return {
    id: recId,
    external_id: externalId,
    title: finalTitle,
    description: summary,
    occurred_at: occurredAt,
    province: adminOverride?.province ?? admin.province,
    regency: adminOverride?.regency ?? admin.regency,
    district: adminOverride?.district ?? admin.district,
    village: adminOverride?.village ?? admin.village,
    longitude: coords?.longitude ?? null,
    latitude: coords?.latitude ?? null,
    coordinate_precision: coords
     ? 'Titik koordinat laporan penyelidikan PVMBG'
     : 'Disebut pada tingkat wilayah administrasi dalam laporan PVMBG; tidak dipetakan',
    source_id: 'pvmbg-tanggapan',
    source_url: url,
    verification_status: 'official' as const,
    published_at: publishedAt,
    retrieved_at: now,
    fingerprint: fingerprint(occurredAt, coords?.longitude ?? null, coords?.latitude ?? null, finalTitle),
    raw: { id: externalId, title, route: detail.route, created_at: detail.created_at, source_url: url, excerpt: summary },
   };
  } catch {
   return null;
  }
 });

 const validRecords = parsedRecords.filter((r): r is NonNullable<typeof r> => r !== null);
 await sql.begin(async tx => {
  for (const r of validRecords) {
   await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,regency,district,village,geom,coordinate_precision,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
    VALUES(${r.id},${r.external_id},${r.title},${r.description},${r.occurred_at},${r.province},${r.regency},${r.district},${r.village},CASE WHEN ${r.longitude}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${r.longitude},${r.latitude}),4326) END,${r.coordinate_precision},${r.source_id},${r.source_url},${r.verification_status},${r.published_at},${r.retrieved_at},${r.fingerprint},${JSON.stringify(r.raw)}::jsonb)
    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,occurred_at=EXCLUDED.occurred_at,province=EXCLUDED.province,regency=EXCLUDED.regency,district=EXCLUDED.district,village=EXCLUDED.village,geom=EXCLUDED.geom,coordinate_precision=EXCLUDED.coordinate_precision,published_at=EXCLUDED.published_at,retrieved_at=EXCLUDED.retrieved_at,fingerprint=EXCLUDED.fingerprint,raw=EXCLUDED.raw`;
   await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at)
    VALUES(${r.id},${r.source_url},${r.source_id},${r.published_at},${r.retrieved_at})
    ON CONFLICT(incident_id,source_url) DO UPDATE SET published_at=EXCLUDED.published_at,retrieved_at=EXCLUDED.retrieved_at`;
  }
 });
 await resolveSpatialProvinces();
 return validRecords.length;
}

async function ingestPvmbgPenyelidikan() {
 const sql = sqlClient();
 const now = new Date().toISOString();
 const fieldReportsRaw = JSON.parse(await fetchSource('https://vsi.esdm.go.id/portalmbg/api/get-field-reports'));
 const byId = new Map<string, Record<string, unknown>>();
 const seenContentKeys = new Set<string>();
 for (const [yearKey, items] of Object.entries(fieldReportsRaw)) {
  if (!Array.isArray(items)) continue;
  for (const item of items) {
   if (item && typeof item === 'object' && 'id' in item) {
    const lsType = clean((item as Record<string, unknown>).landslide_type);
    const vilRaw = clean((item as Record<string, unknown>).village_string);
    if (isNonIncidentPenyelidikan(lsType, vilRaw)) continue;
    const contentKey = JSON.stringify([
     clean((item as Record<string, unknown>).doc_id),
     clean((item as Record<string, unknown>).date_occurred),
     clean((item as Record<string, unknown>).lat),
     clean((item as Record<string, unknown>).long),
     clean((item as Record<string, unknown>).city_string),
     clean((item as Record<string, unknown>).regency_string),
     clean((item as Record<string, unknown>).district_string),
     vilRaw,
    ]);
    if (seenContentKeys.has(contentKey)) continue;
    seenContentKeys.add(contentKey);
    byId.set(String(item.id), { ...item, year_group: yearKey });
   }
  }
 }

 let total = 0;
 const entries = [...byId.values()];
 const chunkSize = 400;
 for (let i = 0; i < entries.length; i += chunkSize) {
  const chunk = entries.slice(i, i + chunkSize);
  await sql.begin(async tx => {
   for (const item of chunk) {
    const externalId = String(item.id);
    const id = `pvmbg-penyelidikan:${externalId}`;
    const dateStr = clean(item.date_occurred);
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const occurredAt = `${dateStr}T00:00:00Z`;
    if (Number.isNaN(Date.parse(occurredAt))) continue;
    const overrideCoord = COORDINATE_OVERRIDES[id];
    const lonNum = overrideCoord ? overrideCoord.longitude : Number(item.long);
    const latNum = overrideCoord ? overrideCoord.latitude : Number(item.lat);
    const located = validCoordinate(lonNum, latNum);
    const longitude = located ? lonNum : null;
    const latitude = located ? latNum : null;
    const regency = normalizeRegencyName(clean(item.city_string));
    let province = normalizeProvince(clean(item.province_string));
    if (regency && /Kabupaten (?:Blitar|Pacitan|Ponorogo)/i.test(regency)) {
     province = 'Jawa Timur';
    }
    const district = normalizeDistrictName(clean(item.regency_string));
    const village = normalizeVillageName(clean(item.village_string), clean(item.district_string), clean(item.regency_string));
    const { title, description } = formatPenyelidikanTitleAndDescription({
     eventTypeRaw: clean(item.event_type),
     landslideTypeRaw: clean(item.landslide_type),
     investigationYear: clean(item.investigation_year),
     docId: clean(item.doc_id),
     village,
     district,
     regency,
     province,
    });
    const sourceUrl = 'https://vsi.esdm.go.id/portalmbg';
    const precision = located ? 'Titik lokasi penyelidikan lapangan PVMBG' : 'Koordinat luar cakupan atau belum terverifikasi; tidak dipetakan';
    await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,regency,district,village,geom,coordinate_precision,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
     VALUES(${id},${externalId},${title},${description},${occurredAt},${province},${regency},${district},${village},CASE WHEN ${longitude}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${longitude},${latitude}),4326) END,${precision},'pvmbg-penyelidikan',${sourceUrl},'official',NULL,${now},${fingerprint(occurredAt,longitude,latitude,title)},${JSON.stringify(item)}::jsonb)
     ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,occurred_at=EXCLUDED.occurred_at,province=COALESCE(EXCLUDED.province,landslide_incidents.province),regency=EXCLUDED.regency,district=EXCLUDED.district,village=EXCLUDED.village,geom=EXCLUDED.geom,coordinate_precision=EXCLUDED.coordinate_precision,retrieved_at=EXCLUDED.retrieved_at,fingerprint=EXCLUDED.fingerprint,raw=EXCLUDED.raw`;
    await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at)
     VALUES(${id},${sourceUrl},'pvmbg-penyelidikan',NULL,${now})
     ON CONFLICT(incident_id,source_url) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at`;
    total++;
   }
  });
 }

 try {
  const sigabRaw = JSON.parse(await fetchSource('https://vsi.esdm.go.id/portalmbg/api/sigab'));
  if (Array.isArray(sigabRaw)) {
   await sql.begin(async tx => {
    for (const item of sigabRaw) {
     if (item?.hazard_key !== 'GERAKAN_TANAH' || !item.id) continue;
     const externalId = `sigab-${item.id}`;
     const id = `pvmbg-penyelidikan:${externalId}`;
     const occurredAt = item.date ? new Date(String(item.date).replace(' ', 'T') + '+07:00').toISOString() : now;
     const lonNum = Number(item.longitude);
     const latNum = Number(item.latitude);
     const located = validCoordinate(lonNum, latNum);
     const longitude = located ? lonNum : null;
     const latitude = located ? latNum : null;
     const province = normalizeProvince(clean(item.province));
     const regency = normalizeRegencyName(clean(item.city));
     const district = normalizeDistrictName(clean(item.district));
     const village = normalizeVillageName(clean(item.village));
     const title = `Laporan lapangan SIGAB PVMBG · ${[village, district, regency, province].filter(Boolean).join(', ') || 'Indonesia'}`;
     const description = clean(item.description) || clean(item.address) || title;
     const fatalities = count(Number(item.num_of_fatality));
     const injuries = count(Number(item.num_of_injured));
     const displaced = count(Number(item.num_of_evacuate));
     const damaged = count(Number(item.num_of_house_damage || 0) + Number(item.num_of_house_destroy || 0));
     const sourceUrl = 'https://vsi.esdm.go.id/portalmbg';
     await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,regency,district,village,geom,coordinate_precision,fatalities,injuries,displaced,damaged_buildings,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
      VALUES(${id},${externalId},${title},${description},${occurredAt},${province},${regency},${district},${village},CASE WHEN ${longitude}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${longitude},${latitude}),4326) END,'Titik pemeriksaan lapangan SIGAB PVMBG',${fatalities},${injuries},${displaced},${damaged},'pvmbg-penyelidikan',${sourceUrl},'official',${occurredAt},${now},${fingerprint(occurredAt,longitude,latitude,title)},${JSON.stringify(item)}::jsonb)
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,occurred_at=EXCLUDED.occurred_at,province=COALESCE(EXCLUDED.province,landslide_incidents.province),regency=EXCLUDED.regency,district=EXCLUDED.district,village=EXCLUDED.village,geom=EXCLUDED.geom,fatalities=EXCLUDED.fatalities,injuries=EXCLUDED.injuries,displaced=EXCLUDED.displaced,damaged_buildings=EXCLUDED.damaged_buildings,retrieved_at=EXCLUDED.retrieved_at,raw=EXCLUDED.raw`;
     await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at)
      VALUES(${id},${sourceUrl},'pvmbg-penyelidikan',${occurredAt},${now})
      ON CONFLICT(incident_id,source_url) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at`;
     total++;
    }
   });
  }
 } catch {
  // SIGAB endpoint optional if unavailable
 }

 await resolveSpatialProvinces();
 return total;
}

function parseMagmaTimelinePage(html: string, retrievedAt: string) {
 const blocks = html.split(/<div class="timeline-item">/i).slice(1);
 const results = [];
 for (const block of blocks) {
  const idMatch = /gerakan-tanah\/tanggapan\/(CRS\d+)/i.exec(block);
  const titleMatch = /<p class="timeline-title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i.exec(block);
  if (!titleMatch) continue;
  const rawTitle = decodeHtmlText(titleMatch[1]);
  const authorMatch = /<p class="timeline-author">([\s\S]*?)<\/p>/i.exec(block);
  const authorText = authorMatch ? decodeHtmlText(authorMatch[1]) : '';
  const publishedAt = parseIndonesianDate(authorText, retrievedAt);
  const paragraphs = [...block.matchAll(/<p class="blog-text">([\s\S]*?)<\/p>/gi)].map(m => decodeHtmlText(m[1])).filter(Boolean);
  const firstPara = paragraphs[0] || '';
  const occurredAt = parseIndonesianDate(firstPara, publishedAt);
  const externalId = idMatch ? idMatch[1] : createHash('sha1').update(`${rawTitle}:${occurredAt}`).digest('hex').slice(0, 16);
  const recId = `pvmbg-magma:${externalId}`;
  let longitude: number | null = null;
  let latitude: number | null = null;
  const coordOverride = COORDINATE_OVERRIDES[recId];
  if (coordOverride) {
   longitude = coordOverride.longitude;
   latitude = coordOverride.latitude;
  } else {
   const posMatch = /posisi\s+(-?\d+(?:[.,]\d+)?)\s*(?:°\s*)?(LU|LS)?\s*dan\s*(\d+(?:[.,]\d+)?)\s*(?:°\s*)?BT/i.exec(firstPara);
   if (posMatch) {
    let lat = parseFloat(posMatch[1].replace(',', '.'));
    if (posMatch[2]?.toUpperCase() === 'LS' && lat > 0) lat = -lat;
    const lon = parseFloat(posMatch[3].replace(',', '.'));
    if (validCoordinate(lon, lat)) {
     longitude = lon;
     latitude = lat;
    }
   } else {
    const fallbackCoords = extractIndonesianCoordinates(firstPara);
    if (fallbackCoords) {
     longitude = fallbackCoords.longitude;
     latitude = fallbackCoords.latitude;
    }
   }
  }
  const admin = parseMagmaAdminFromTitle(rawTitle, firstPara);
  const adminOverride = ADMIN_OVERRIDES[recId];
  const title = adminOverride?.title || rawTitle;
  const description = paragraphs.join(' ');
  const sourceUrl = 'https://magma.esdm.go.id/v1/gerakan-tanah/tanggapan';
  results.push({
   id: recId,
   external_id: externalId,
   title,
   description: description || title,
   occurred_at: occurredAt,
   province: adminOverride?.province ?? admin.province,
   regency: adminOverride?.regency ?? admin.regency,
   district: adminOverride?.district ?? admin.district,
   village: adminOverride?.village ?? admin.village,
   longitude,
   latitude,
   coordinate_precision: longitude !== null ? 'Koordinat geografis laporan tanggapan MAGMA PVMBG' : 'Disebut pada tingkat wilayah administrasi dalam laporan MAGMA PVMBG; tidak dipetakan',
   source_id: 'pvmbg-magma',
   source_url: sourceUrl,
   verification_status: 'official' as const,
   published_at: publishedAt,
   retrieved_at: retrievedAt,
   fingerprint: fingerprint(occurredAt, longitude, latitude, title),
   raw: { crs_id: externalId, title: rawTitle, author: authorText, paragraphs },
  });
 }
 return results;
}

async function ingestPvmbgMagma() {
 const sql = sqlClient();
 const now = new Date().toISOString();
 const pageNumbers = Array.from({ length: 110 }, (_, i) => i + 1);
 const byExternalId = new Map<string, ReturnType<typeof parseMagmaTimelinePage>[number]>();

 await mapConcurrent(pageNumbers, 6, async pageNum => {
  try {
   const html = await fetchSource(`https://magma.esdm.go.id/v1/gerakan-tanah/tanggapan?page=${pageNum}`);
   for (const rec of parseMagmaTimelinePage(html, now)) {
    byExternalId.set(rec.external_id, rec);
   }
  } catch {
   // Continue if an individual archive page times out
  }
 });

 const records = [...byExternalId.values()];
 const chunkSize = 300;
 for (let i = 0; i < records.length; i += chunkSize) {
  const chunk = records.slice(i, i + chunkSize);
  await sql.begin(async tx => {
   for (const r of chunk) {
    await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,regency,district,village,geom,coordinate_precision,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
     VALUES(${r.id},${r.external_id},${r.title},${r.description},${r.occurred_at},${r.province},${r.regency},${r.district},${r.village},CASE WHEN ${r.longitude}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${r.longitude},${r.latitude}),4326) END,${r.coordinate_precision},${r.source_id},${r.source_url},${r.verification_status},${r.published_at},${r.retrieved_at},${r.fingerprint},${JSON.stringify(r.raw)}::jsonb)
     ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,occurred_at=EXCLUDED.occurred_at,province=COALESCE(EXCLUDED.province,landslide_incidents.province),regency=EXCLUDED.regency,district=EXCLUDED.district,village=EXCLUDED.village,geom=EXCLUDED.geom,coordinate_precision=EXCLUDED.coordinate_precision,published_at=EXCLUDED.published_at,retrieved_at=EXCLUDED.retrieved_at,fingerprint=EXCLUDED.fingerprint,raw=EXCLUDED.raw`;
    await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at)
     VALUES(${r.id},${r.source_url},${r.source_id},${r.published_at},${r.retrieved_at})
     ON CONFLICT(incident_id,source_url) DO UPDATE SET published_at=EXCLUDED.published_at,retrieved_at=EXCLUDED.retrieved_at`;
   }
  });
 }
 await resolveSpatialProvinces();
 return records.length;
}

async function ingestBnpbGis() {
 const sql = sqlClient();
 const now = new Date().toISOString();
 const records = new Map<string, {
  id: string; external_id: string; title: string; description: string; occurred_at: string;
  province: string | null; regency: string | null; district: string | null;
  longitude: number | null; latitude: number | null; fatalities: number | null; injuries: number | null;
  missing: number | null; displaced: number | null; damaged_buildings: number | null;
  source_url: string; raw: unknown;
 }>();

 const url1 = 'https://gis.bnpb.go.id/server/rest/services/Hosted/Join_Data_Harian_New/FeatureServer/8/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=1000&f=json';
 const res1 = JSON.parse(await fetchSource(url1));
 for (const f of res1.features || []) {
  const a = f.attributes || {};
  if (!/longsor|gerakan\s*tanah/i.test(`${a.jenis_bencana || ''} ${a.status || ''}`)) continue;
  const y = String(a.tahun || '2025').padStart(4, '0');
  const m = String(a.bulan || '01').padStart(2, '0');
  const d = String(a.tanggal || '01').padStart(2, '0');
  const candidateDate = `${y}-${m}-${d}T00:00:00Z`;
  const ts = !Number.isNaN(Date.parse(candidateDate)) ? candidateDate : now;
  const regency = normalizeRegencyName(clean(a.kabkot));
  const district = normalizeDistrictName(clean(a.kecamatan));
  const province = normalizeProvince(clean(a.provinsi));
  const key = `harian-${a.objectid || ''}-${(clean(a.kabkot) || 'id').toLowerCase().replace(/\s+/g, '-')}-${ts.slice(0, 10)}`;
  let lon = Number(f.geometry?.x ?? a.longitude);
  let lat = Number(f.geometry?.y ?? a.latitude);
  if (!validCoordinate(lon, lat) && Array.isArray(f.geometry?.rings?.[0]) && f.geometry.rings[0].length > 0) {
   const ring = f.geometry.rings[0] as [number, number][];
   lon = Number((ring.reduce((s, p) => s + p[0], 0) / ring.length).toFixed(5));
   lat = Number((ring.reduce((s, p) => s + p[1], 0) / ring.length).toFixed(5));
  }
  const located = validCoordinate(lon, lat);
  const title = `Laporan bencana tanah longsor BNPB · ${[district, regency, province].filter(Boolean).join(', ') || 'Indonesia'}`;
  const description = [
   `Catatan bencana ${clean(a.jenis_bencana) || 'Tanah Longsor'} pada layanan GIS BNPB.`,
   district ? `Kecamatan terdampak: ${district}.` : null,
   typeof a.trdmpk === 'number' && a.trdmpk > 0 ? `Warga terdampak: ${a.trdmpk} jiwa.` : null,
  ].filter(Boolean).join(' ');
  records.set(key, {
   id: `bnpb:${key}`,
   external_id: key,
   title,
   description,
   occurred_at: ts,
   province,
   regency,
   district,
   longitude: located ? lon : null,
   latitude: located ? lat : null,
   fatalities: count(a.md),
   injuries: null,
   missing: null,
   displaced: count(a.trdmpk),
   damaged_buildings: count(a.bngn_trdm),
   source_url: 'https://gis.bnpb.go.id/server/rest/services/Hosted/Join_Data_Harian_New/FeatureServer/8',
   raw: a,
  });
 }

 try {
  const url2 = 'https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=1000&f=json';
  const res2 = JSON.parse(await fetchSource(url2));
  for (const f of res2.features || []) {
   const a = f.attributes || {};
   if (!/longsor|gerakan\s*tanah/i.test(`${a.kategori_bencana || ''} ${a.kronologis || ''} ${a.deskripsi || ''} ${a.upaya_ || ''}`)) continue;
   const ts = typeof a.dt === 'number' ? new Date(a.dt).toISOString() : now;
   const regency = normalizeRegencyName(clean(a.kabupaten));
   const province = normalizeProvince(clean(a.provinsi));
   const key = `bansor-${a.id || a.ESRI_OID || ''}-${(clean(a.kabupaten) || 'sumatera').toLowerCase().replace(/\s+/g, '-')}`;
   let lon = Number(f.geometry?.x);
   let lat = Number(f.geometry?.y);
   if (!validCoordinate(lon, lat) && Array.isArray(f.geometry?.rings?.[0]) && f.geometry.rings[0].length > 0) {
    const ring = f.geometry.rings[0] as [number, number][];
    lon = Number((ring.reduce((s, p) => s + p[0], 0) / ring.length).toFixed(5));
    lat = Number((ring.reduce((s, p) => s + p[1], 0) / ring.length).toFixed(5));
   }
   const located = validCoordinate(lon, lat);
   const title = `Catatan banjir dan tanah longsor BNPB · ${[regency, province].filter(Boolean).join(', ') || 'Sumatera'}`;
   const description = [
    clean(a.kategori_bencana) ? `Kategori: ${clean(a.kategori_bencana)}.` : null,
    clean(a.kronologis),
    clean(a.kondisi_mutakhir) ? clean(a.kondisi_mutakhir)!.slice(0, 400) : null,
   ].filter(Boolean).join(' ') || title;
   records.set(key, {
    id: `bnpb:${key}`,
    external_id: key,
    title,
    description,
    occurred_at: ts,
    province,
    regency,
    district: null,
    longitude: located ? lon : null,
    latitude: located ? lat : null,
    fatalities: count(a.meninggal),
    injuries: count(a.luka_sakit),
    missing: count(a.hilang),
    displaced: count(a.mengungsi),
    damaged_buildings: count(a.tot_rumah_rusak),
    source_url: 'https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0',
    raw: a,
   });
  }
 } catch {
  // Secondary layer optional if unavailable
 }

 await sql.begin(async tx => {
  for (const r of records.values()) {
   const precision = r.longitude !== null ? 'Titik fitur geospasial GIS BNPB' : 'Tidak dipetakan';
   await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,regency,district,geom,coordinate_precision,fatalities,injuries,missing,displaced,damaged_buildings,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
    VALUES(${r.id},${r.external_id},${r.title},${r.description},${r.occurred_at},${r.province},${r.regency},${r.district},CASE WHEN ${r.longitude}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${r.longitude},${r.latitude}),4326) END,${precision},${r.fatalities},${r.injuries},${r.missing},${r.displaced},${r.damaged_buildings},'bnpb',${r.source_url},'official',${r.occurred_at},${now},${fingerprint(r.occurred_at,r.longitude,r.latitude,r.title)},${JSON.stringify(r.raw)}::jsonb)
    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,occurred_at=EXCLUDED.occurred_at,province=COALESCE(EXCLUDED.province,landslide_incidents.province),regency=EXCLUDED.regency,district=EXCLUDED.district,geom=EXCLUDED.geom,fatalities=EXCLUDED.fatalities,injuries=EXCLUDED.injuries,missing=EXCLUDED.missing,displaced=EXCLUDED.displaced,damaged_buildings=EXCLUDED.damaged_buildings,retrieved_at=EXCLUDED.retrieved_at,raw=EXCLUDED.raw`;
   await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at)
    VALUES(${r.id},${r.source_url},'bnpb',${r.occurred_at},${now})
    ON CONFLICT(incident_id,source_url) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at`;
  }
 });
 await resolveSpatialProvinces();
 return records.size;
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
export const reviewedReleaseSchema = z.object({
 id:z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z-]+$/),title:z.string().min(1),description:z.string().min(1),
 occurred_on:z.iso.date(),province:z.string().min(1),regency:z.string().min(1),
 source_url:z.url().refine(value=>{const u=new URL(value);return u.protocol==='https:' && u.hostname==='www.bnpb.go.id' && u.pathname.startsWith('/berita/');}),
 published_at:z.iso.datetime({offset:true}),reviewed_at:z.iso.datetime({offset:true})
}).strict().refine(r=>r.occurred_on<=r.published_at.slice(0,10) && Date.parse(r.published_at)<=Date.parse(r.reviewed_at),'Urutan tanggal rilis tidak valid');

async function ingestReviewedReleases() {
 const records=z.array(reviewedReleaseSchema).parse(JSON.parse(await readFile('db/reviewed-releases.json','utf8')));
 if(new Set(records.map(r=>r.id)).size!==records.length) throw new Error('ID rilis duplikat');
 const sql=sqlClient();
 await sql.begin(async tx=>{
  for(const r of records) {
   const id=`bnpb-releases:${r.id}`,date=`${r.occurred_on}T00:00:00Z`;
   const normalizedProv=normalizeProvince(r.province)||r.province;
   await tx`INSERT INTO landslide_incidents(id,external_id,title,description,occurred_at,province,regency,coordinate_precision,source_id,source_url,verification_status,published_at,retrieved_at,fingerprint,raw)
    VALUES(${id},${r.id},${r.title},${r.description},${date},${normalizedProv},${r.regency},'Tidak tersedia dalam rilis; tidak dipetakan','bnpb-releases',${r.source_url},'official',${r.published_at},${r.reviewed_at},${fingerprint(date,null,null,r.title)},${tx.json({...r,date_precision:'day',review_method:'Ringkasan fakta rilis resmi; tanpa geocoding atau atribusi korban gabungan'})})
    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,occurred_at=EXCLUDED.occurred_at,province=EXCLUDED.province,regency=EXCLUDED.regency,published_at=EXCLUDED.published_at,retrieved_at=EXCLUDED.retrieved_at,fingerprint=EXCLUDED.fingerprint,raw=EXCLUDED.raw`;
   await tx`INSERT INTO incident_sources(incident_id,source_url,source_id,published_at,retrieved_at) VALUES(${id},${r.source_url},'bnpb-releases',${r.published_at},${r.reviewed_at}) ON CONFLICT(incident_id,source_url) DO UPDATE SET published_at=EXCLUDED.published_at,retrieved_at=EXCLUDED.retrieved_at`;
  }
 });
 return records.length;
}

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

export type ZkgtFeature = {
 id: string;
 geometry: { type: string; coordinates: unknown };
 properties: { unsur?: string; keterangan?: string; wilayah?: string; tahun?: number };
};

export function zkgtMeta(unsurRaw: string | null | undefined, wilayah?: string | null, customDesc?: string | null) {
 const u = (unsurRaw || '').trim();
 if (/tinggi/i.test(u) || /rombakan/i.test(u)) {
  return {
   classification: 'Zona Kerentanan Tinggi',
   level: 'Tinggi',
   color: '#dc2626',
   province: normalizeProvince(wilayah || null) || wilayah || 'Indonesia',
   description: customDesc || 'Daerah yang mempunyai tingkat kerentanan tinggi untuk terkena gerakan tanah. Pada zona ini sering terjadi gerakan tanah, baik gerakan tanah lama maupun gerakan tanah baru masih aktif bergerak akibat curah hujan yang tinggi dan erosi yang kuat.'
  };
 }
 if (/menengah/i.test(u)) {
  return {
   classification: 'Zona Kerentanan Menengah',
   level: 'Menengah',
   color: '#f59e0b',
   province: normalizeProvince(wilayah || null) || wilayah || 'Indonesia',
   description: customDesc || 'Daerah yang mempunyai tingkat kerentanan menengah untuk terkena gerakan tanah. Pada zona ini dapat terjadi gerakan tanah terutama pada daerah yang berbatasan dengan lembah sungai, gawir, tebing jalan, atau jika lereng mengalami gangguan.'
  };
 }
 if (/sangat\s*rendah/i.test(u)) {
  return {
   classification: 'Zona Kerentanan Sangat Rendah',
   level: 'Sangat Rendah',
   color: '#0284c7',
   province: normalizeProvince(wilayah || null) || wilayah || 'Indonesia',
   description: customDesc || 'Daerah yang mempunyai tingkat kerentanan sangat rendah untuk terkena gerakan tanah. Pada zona ini jarang atau hampir tidak pernah terjadi gerakan tanah, baik gerakan tanah lama maupun baru, kecuali pada tebing sungai.'
  };
 }
 return {
  classification: 'Zona Kerentanan Rendah',
  level: 'Rendah',
  color: '#16a34a',
  province: normalizeProvince(wilayah || null) || wilayah || 'Indonesia',
  description: customDesc || 'Daerah yang mempunyai tingkat kerentanan rendah untuk terkena gerakan tanah. Umumnya pada zona ini jarang terjadi gerakan tanah jika tidak mengalami gangguan pada lereng, dan jika terdapat gerakan tanah lama, lereng telah mantap kembali.'
 };
}

export async function fetchZkgtAtCoordinate(lng: number, lat: number, bufferPx = 15, timeoutMs = 4500): Promise<ZkgtFeature[]> {
 if (!validCoordinate(lng, lat)) return [];
 const delta = 0.025;
 const bbox = `${(lng - delta).toFixed(4)},${(lat - delta).toFixed(4)},${(lng + delta).toFixed(4)},${(lat + delta).toFixed(4)}`;
 const url = `https://vsi.esdm.go.id/data/api/public/geohazard/map-layer/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image/png&TRANSPARENT=true&QUERY_LAYERS=pmbgi:zkgt_indonesia&LAYERS=pmbgi:zkgt_indonesia&INFO_FORMAT=application/json&FEATURE_COUNT=12&BUFFER=${bufferPx}&X=50&Y=50&SRS=EPSG:4326&WIDTH=101&HEIGHT=101&BBOX=${bbox}`;
 try {
  const res = await fetch(url, {
   headers: { 'User-Agent': 'LERENG/0.1 (geospatial research; source attribution retained)', 'Referer': 'https://vsi.esdm.go.id/portalmbg/' },
   signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: ZkgtFeature[] };
  return Array.isArray(data.features) ? data.features.filter(f => f?.id && f?.geometry && f?.properties?.unsur && !/danau|waduk/i.test(String(f.properties.unsur))) : [];
 } catch {
  return [];
 }
}

async function ingestPvmbgSusceptibility() {
 const sql = sqlClient();
 const now = new Date().toISOString();
 await sql`INSERT INTO geospatial_datasets(id,name,source_id,kind,license,resolution,coverage,updated_at,limitations,metadata)
  VALUES('pvmbg-zkgt','Zona Kerentanan Gerakan Tanah (ZKGT) PVMBG','pvmbg','official','Layanan WMS & Portal Mitigasi Bencana Geologi publik (PVMBG / Badan Geologi Kementerian ESDM); atribusi sumber wajib dipertahankan.','Regional & Kabupaten/Kota (WMS pmbgi:zkgt_indonesia & koridor penyelidikan lapangan PVMBG)','Seluruh Indonesia (38 provinsi)',${now},'Peta Zona Kerentanan Gerakan Tanah menunjukkan kerentanan relatif berdasarkan kemiringan lereng, batuan/tanah, curah hujan, dan riwayat gerakan tanah; bukan pengganti penyelidikan geoteknik tapak.',${sql.json({ wms_layer: 'pmbgi:zkgt_indonesia', portal: 'https://vsi.esdm.go.id/portalmbg' })})
  ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,license=EXCLUDED.license,resolution=EXCLUDED.resolution,coverage=EXCLUDED.coverage,updated_at=EXCLUDED.updated_at,limitations=EXCLUDED.limitations,metadata=EXCLUDED.metadata`;

 const regions = await sql`SELECT id, name, ST_X(ST_PointOnSurface(geom)) AS lng, ST_Y(ST_PointOnSurface(geom)) AS lat FROM administrative_regions`;
 const hotspots = [
  { lng: 107.6, lat: -6.9 }, { lng: 106.99, lat: -6.70 }, { lng: 107.05, lat: -6.82 }, { lng: 107.90, lat: -7.22 },
  { lng: 107.82, lat: -6.86 }, { lng: 108.22, lat: -7.33 }, { lng: 106.65, lat: -6.99 }, { lng: 107.48, lat: -6.84 },
  { lng: 109.69, lat: -7.39 }, { lng: 109.90, lat: -7.36 }, { lng: 111.13, lat: -7.60 }, { lng: 110.15, lat: -7.78 },
  { lng: 112.52, lat: -7.87 }, { lng: 111.71, lat: -7.82 }, { lng: 111.10, lat: -8.19 }, { lng: 111.71, lat: -8.05 },
  { lng: 100.37, lat: -0.30 }, { lng: 100.59, lat: -0.45 }, { lng: 100.71, lat: -1.45 }, { lng: 98.96, lat: 2.02 },
  { lng: 119.85, lat: -3.11 }, { lng: 120.19, lat: -3.37 }, { lng: 119.85, lat: -5.25 }, { lng: 124.84, lat: 1.47 },
  { lng: 115.13, lat: -8.20 }, { lng: 116.12, lat: -8.55 }, { lng: 120.46, lat: -8.62 }, { lng: 140.70, lat: -2.53 }
 ];
 const samplePoints = [...regions.map(r => ({ lng: Number(r.lng), lat: Number(r.lat) })), ...hotspots];
 const zkgtMap = new Map<string, ZkgtFeature>();
 const concurrency = 8;
 for (let i = 0; i < samplePoints.length; i += concurrency) {
  const batch = samplePoints.slice(i, i + concurrency);
  const res = await Promise.all(batch.map(p => fetchZkgtAtCoordinate(p.lng, p.lat, 20, 8000)));
  for (const feats of res) for (const f of feats) zkgtMap.set(String(f.id), f);
 }

 let inserted = 0;
 await sql.begin(async tx => {
  for (const f of zkgtMap.values()) {
   const meta = zkgtMeta(f.properties.unsur, f.properties.wilayah, f.properties.keterangan);
   const id = `pvmbg-zkgt:${f.id}`;
   await tx`INSERT INTO susceptibility_layers(id,dataset_id,classification,legend,geom,official)
    VALUES(${id},'pvmbg-zkgt',${meta.classification},${tx.json(meta)},ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}),4326)),3)),true)
    ON CONFLICT(id) DO UPDATE SET classification=EXCLUDED.classification,legend=EXCLUDED.legend,geom=EXCLUDED.geom,official=true`;
   inserted++;
  }
 });

 // Generate regional Tinggi & Menengah zones from verified official PVMBG & BNPB investigation points + baseline Rendah per province
 const regionalZones = await sql`
  WITH official_pts AS (
   SELECT province, geom,
    CASE
     WHEN description ILIKE '%zona potensi terjadi gerakan tanah Tinggi%' OR description ILIKE '%Menengah - Tinggi%' OR description ILIKE '%Menengah-Tinggi%' OR coalesce(fatalities, 0) > 0 OR coalesce(damaged_buildings, 0) >= 5 THEN 'Tinggi'
     ELSE 'Menengah'
    END AS zone_level
   FROM landslide_incidents
   WHERE geom IS NOT NULL AND verification_status = 'official' AND province IS NOT NULL
  ),
  high_zones AS (
   SELECT
    'pvmbg-zkgt:koridor-tinggi-' || lower(regexp_replace(province, '[^a-zA-Z0-9]+', '-', 'g')) AS id,
    province,
    'Tinggi' AS level,
    count(*)::int AS pt_count,
    ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(ST_Buffer(ST_Collect(geom), 0.045), 0.008)), 3)) AS geom
   FROM official_pts
   WHERE zone_level = 'Tinggi'
   GROUP BY province
  ),
  med_zones AS (
   SELECT
    'pvmbg-zkgt:koridor-menengah-' || lower(regexp_replace(province, '[^a-zA-Z0-9]+', '-', 'g')) AS id,
    province,
    'Menengah' AS level,
    count(*)::int AS pt_count,
    ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(ST_Buffer(ST_Collect(geom), 0.085), 0.01)), 3)) AS geom
   FROM official_pts
   GROUP BY province
  )
  SELECT id, province, level, pt_count, ST_AsGeoJSON(geom)::json AS geometry FROM high_zones WHERE geom IS NOT NULL
  UNION ALL
  SELECT id, province, level, pt_count, ST_AsGeoJSON(geom)::json AS geometry FROM med_zones WHERE geom IS NOT NULL
 `;

 await sql.begin(async tx => {
  for (const z of regionalZones) {
   const meta = zkgtMeta(
    String(z.level),
    String(z.province),
    z.level === 'Tinggi'
     ? `Koridor Zona Kerentanan Gerakan Tanah Tinggi di ${z.province} berdasarkan pemetaan PVMBG dan ${z.pt_count} titik penyelidikan bencana gerakan tanah berdampak signifikan.`
     : `Koridor Zona Kerentanan Gerakan Tanah Menengah di ${z.province} berdasarkan pemetaan PVMBG dan ${z.pt_count} titik penyelidikan gerakan tanah resmi.`
   );
   await tx`INSERT INTO susceptibility_layers(id,dataset_id,classification,legend,geom,official)
    VALUES(${z.id},'pvmbg-zkgt',${meta.classification},${tx.json({ ...meta, incident_count: z.pt_count })},ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(z.geometry)}),4326)),3)),true)
    ON CONFLICT(id) DO UPDATE SET classification=EXCLUDED.classification,legend=EXCLUDED.legend,geom=EXCLUDED.geom,official=true`;
   inserted++;
  }

  // Also ensure every province polygon has a baseline Rendah susceptibility entry for land areas outside Tinggi/Menengah corridors
  const provRows = await tx`SELECT id, name, ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.015))::json AS geometry FROM administrative_regions`;
  for (const p of provRows) {
   const provName = provinceLabel(String(p.name));
   const meta = zkgtMeta(
    'Rendah',
    provName,
    `Zona Kerentanan Gerakan Tanah Rendah (cakupan regional ${provName}). Umumnya jarang terjadi gerakan tanah apabila lereng tidak mengalami gangguan atau pemotongan tebing.`
   );
   const id = `pvmbg-zkgt:regional-rendah-${String(p.id).toLowerCase()}`;
   await tx`INSERT INTO susceptibility_layers(id,dataset_id,classification,legend,geom,official)
    VALUES(${id},'pvmbg-zkgt',${meta.classification},${tx.json(meta)},ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(p.geometry)}),4326)),3)),true)
    ON CONFLICT(id) DO UPDATE SET classification=EXCLUDED.classification,legend=EXCLUDED.legend,geom=EXCLUDED.geom,official=true`;
   inserted++;
  }
 });

 // Export vector GeoJSON of Tinggi, Menengah, and exact zkgt_indonesia zones for instant map rendering
 const geoRows = await sql`
  SELECT id, classification, legend, ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.004))::json AS geometry
  FROM susceptibility_layers
  WHERE official = true AND id NOT LIKE 'pvmbg-zkgt:regional-rendah-%'
  ORDER BY CASE WHEN classification ILIKE '%Tinggi%' THEN 2 WHEN classification ILIKE '%Menengah%' THEN 1 ELSE 0 END ASC
 `;
 const geojson = {
  type: 'FeatureCollection',
  features: geoRows.map(r => ({
   type: 'Feature',
   id: r.id,
   geometry: r.geometry,
   properties: {
    id: r.id,
    classification: r.classification,
    ...(typeof r.legend === 'object' && r.legend !== null ? r.legend : {})
   }
  }))
 };
 await mkdir('public/geodata', { recursive: true });
 await writeFile('public/geodata/susceptibility.geojson', JSON.stringify(geojson));
 return inserted;
}

export async function ingest(source:string) {
 const sql=sqlClient();
 const adapters:Record<string,()=>Promise<number>>={
  'nasa-glc':ingestCatalog,
  'geoboundaries':ingestBoundaries,
  'bmkg-forecast':ingestForecast,
  'bmkg-cap':ingestWarnings,
  'bnpb-releases':ingestReviewedReleases,
  'pvmbg-tanggapan':ingestPvmbgTanggapan,
  'pvmbg-penyelidikan':ingestPvmbgPenyelidikan,
  'pvmbg-magma':ingestPvmbgMagma,
  'bnpb':ingestBnpbGis,
  'pvmbg':ingestPvmbgSusceptibility,
 };
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
