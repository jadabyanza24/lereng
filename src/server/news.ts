import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { fetchSource } from './ingestion';
import { sqlClient } from './db';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export function normalizeNews(item:unknown,regionNames:string[]) {
 const parsed=z.object({title:z.string().min(1).max(1000),link:z.url(),pubDate:z.string().optional(),description:z.string().optional()}).parse(item);
 const url=new URL(parsed.link);if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error('URL artikel tidak valid');
 const title=parsed.title.replace(/<[^>]*>/g,'').trim();
 const description=(parsed.description||'').replace(/<[^>]*>/g,'').slice(0,1000);
 const text=(title+' '+description).toLowerCase();
 if(!/\blongsor\b|gerakan tanah/.test(text))return null;
 const published=parsed.pubDate?new Date(parsed.pubDate):null;if(published&&Number.isNaN(published.getTime()))throw new Error('Waktu publikasi berita tidak valid');
 return {id:hash(url.href),title,source_url:url.href,description,published_at:published?.toISOString()||null,geographic_mentions:regionNames.filter(r=>text.includes(r.toLowerCase())),duplicate_group:hash(title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()),verification_status:'unverified'};
}
export async function ingestNews(feedUrl:string,license:string,permission:boolean) {
 if(!permission||!license.trim())throw new Error('Izin agregasi metadata dan lisensi wajib dikonfirmasi operator');
 const feed=new URL(feedUrl);if(feed.protocol!=='https:')throw new Error('RSS harus menggunakan HTTPS');
 const sql=sqlClient(),id='news:'+feed.hostname;
 await sql`INSERT INTO data_sources(id,name,kind,url,license,limitations,frequency_hours) VALUES(${id},${'RSS '+feed.hostname},'media_reported',${feed.href},${license},'Hanya metadata feed dengan izin; bukan verifikasi kejadian.',6) ON CONFLICT(id) DO NOTHING`;
 const [run]=await sql`INSERT INTO ingestion_runs(source_id) VALUES(${id}) RETURNING id`;
 await sql`UPDATE data_sources SET last_attempt_at=now() WHERE id=${id}`;
 try{
  const raw=new XMLParser({ignoreAttributes:false}).parse(await fetchSource(feed.href));
  const items=raw.rss?.channel?.item;if(!items)throw new Error('Feed RSS kosong atau format tidak didukung');
  const names=(await sql`SELECT name FROM administrative_regions`).map(r=>String(r.name));let count=0;
  for(const item of Array.isArray(items)?items:[items]) {
   const record=normalizeNews(item,names);if(!record)continue;
   await sql`INSERT INTO news_articles(id,title,description,source_id,source_url,published_at,retrieved_at,geographic_mentions,duplicate_group) VALUES(${record.id},${record.title},${record.description},${id},${record.source_url},${record.published_at},now(),${JSON.stringify(record.geographic_mentions)}::jsonb,${record.duplicate_group}) ON CONFLICT(source_url) DO UPDATE SET retrieved_at=now(),title=EXCLUDED.title,description=EXCLUDED.description`;
   count++;
  }
  await sql`UPDATE ingestion_runs SET status='success',finished_at=now(),record_count=${count} WHERE id=${run.id}`;
  await sql`UPDATE data_sources SET status='available',last_success_at=now(),error=NULL WHERE id=${id}`;
  return count;
 }catch(e){const error=e instanceof Error?e.message:'RSS gagal';await sql`UPDATE ingestion_runs SET status='failed',finished_at=now(),error=${error} WHERE id=${run.id}`;await sql`UPDATE data_sources SET status='unavailable',error=${error} WHERE id=${id}`;throw e;}
}
