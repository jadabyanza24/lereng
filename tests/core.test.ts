import { describe,it,expect,vi,afterEach } from 'vitest';
import { normalizeIncident,fingerprint,fetchSource } from '../src/server/ingestion';
import { validCoordinate,filterSchema,predictionSchema } from '../src/lib/validation';
import { incidentWhere } from '../src/server/queries';
import { PgDialect } from 'drizzle-orm/pg-core';
import { allowed } from '../src/server/http';
import { normalizeNews } from '../src/server/news';
const input={event_id:1,event_date:Date.UTC(2020,0,1),country_na:'Indonesia',longitude:107,latitude:-7,location_a:'5km',source_lin:'https://example.org/report',admin_divi:'Jawa Barat',event_titl:'Source title',event_desc:'Source description',fatality_c:null,injury_cou:-1};
describe('normalisasi dan provenance',()=>{
 it('menyimpan ketidakpastian, nilai hilang, dan waktu terpisah',()=>{const row=normalizeIncident(input,'2026-10-19T00:00:00Z');expect(row.coordinate_precision).toContain('5km');expect(row.fatalities).toBeNull();expect(row.injuries).toBeNull();expect(row.verification_status).toBe('media_reported');expect(row.published_at).toBeNull();expect(row.occurred_at).not.toBe(row.retrieved_at);});
 it('tidak menciptakan lokasi untuk koordinat tidak valid',()=>{const row=normalizeIncident({...input,longitude:0},'2026-01-01T00:00:00Z');expect(row.longitude).toBeNull();expect(row.latitude).toBeNull();});
 it('identitas upsert dan fingerprint stabil',()=>{const a=normalizeIncident(input,'2026-01-01T00:00:00Z'),b=normalizeIncident(input,'2026-02-01T00:00:00Z');expect(a.id).toBe(b.id);expect(a.fingerprint).toBe(b.fingerprint);expect(fingerprint('2020-01-01',107,-7,'  A  B ')).toBe(fingerprint('2020-01-01',107,-7,'a b'));});
 it('menolak sumber/struktur palsu dan tautan skrip',()=>{expect(()=>normalizeIncident({...input,country_na:'Other'},'2026-01-01')).toThrow();expect(normalizeIncident({...input,source_lin:'javascript:alert(1)'},'2026-01-01').source_url).toMatch(/^https:/);});
});
describe('validasi API dan parameterisasi spasial',()=>{
 it('menolak koordinat asing dan non-finite',()=>{expect(validCoordinate(107,-7)).toBe(true);expect(validCoordinate(0,0)).toBe(false);expect(validCoordinate(NaN,-7)).toBe(false);expect(validCoordinate('107',-7)).toBe(false);});
 it('menolak bbox terbalik, tanggal salah, dan pagination besar',()=>{for(const value of [{bbox:'142,-7,94,7'},{from:'2020-02-30'},{from:'2021-01-01',to:'2020-01-01'},{limit:'99999'},{lng:'107'},{lat:'abc'}])expect(filterSchema.safeParse(value).success).toBe(false);});
 it('membatasi horizon dan menolak kunci tak dikenal',()=>{expect(predictionSchema.safeParse({geographic_unit:'u',horizon_hours:24}).success).toBe(true);expect(predictionSchema.safeParse({geographic_unit:'u',horizon_hours:48}).success).toBe(false);expect(predictionSchema.safeParse({geographic_unit:'u',horizon_hours:24,probability:.9}).success).toBe(false);});
 it('tidak menyisipkan SQL dari filter pengguna',()=>{const attack="x' OR 1=1--";const f=filterSchema.parse({province:attack,bbox:'94,-12,142,7',lng:107,lat:-7,from:'2020-01-01'});const built=new PgDialect().sqlToQuery(incidentWhere(f));expect(built.sql).not.toContain(attack);expect(built.params).toContain(attack);expect(built.sql).toContain('ST_DWithin');expect(built.sql).toContain('ST_MakeEnvelope');});
 it('kuota dibatasi dan jendela dipulihkan',()=>{const key='test-rate';for(let i=0;i<180;i++)expect(allowed(key,1)).toBe(true);expect(allowed(key,2)).toBe(false);expect(allowed(key,60002)).toBe(true);});
});
describe('sumber eksternal gagal',()=>{
 afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
 it('retry terbatas tanpa mengembalikan catatan buatan',async()=>{vi.useFakeTimers();const fetch=vi.fn().mockResolvedValue({ok:false,status:503});vi.stubGlobal('fetch',fetch);const request=fetchSource('https://example.org/data');const check=expect(request).rejects.toThrow('HTTP 503');await vi.runAllTimersAsync();await check;expect(fetch).toHaveBeenCalledTimes(3);});
});
describe('metadata berita tetap belum terverifikasi',()=>{
 it('membersihkan markup, mengenali wilayah, dan mengelompokkan judul tanpa mengonfirmasi kejadian',()=>{
  const a=normalizeNews({title:'<b>Longsor di Jawa Barat!</b>',link:'https://example.org/a',description:'<p>Laporan awal.</p>',pubDate:'2026-10-19T00:00:00Z'},['Jawa Barat','Bali'])!;
  const b=normalizeNews({title:'Longsor di Jawa Barat',link:'https://example.org/b'},[])!;
  expect(a.title).toBe('Longsor di Jawa Barat!');expect(a.description).toBe('Laporan awal.');expect(a.geographic_mentions).toEqual(['Jawa Barat']);expect(a.verification_status).toBe('unverified');expect(a.duplicate_group).toBe(b.duplicate_group);expect(a.id).not.toBe(b.id);
 });
 it('mengabaikan berita lain dan menolak tanggal serta protokol tidak valid',()=>{
  expect(normalizeNews({title:'Berita olahraga',link:'https://example.org/a'},[])).toBeNull();
  expect(()=>normalizeNews({title:'Longsor',link:'javascript:alert(1)'},[])).toThrow();
  expect(()=>normalizeNews({title:'Longsor',link:'https://example.org/a',pubDate:'invalid'},[])).toThrow();
 });
});
