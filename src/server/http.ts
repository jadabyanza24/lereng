import { NextResponse } from 'next/server';
// ponytail: per-process quota; use gateway/Redis limits before horizontal scaling.
const buckets=new Map<string,{count:number;until:number}>();
export function allowed(key:string,now=Date.now()) {
 if(buckets.size>10000) for(const [k,v] of buckets) if(v.until<now) buckets.delete(k);
 if(buckets.size>10000 && !buckets.has(key)) return false;
 const current=buckets.get(key);
 if(!current || current.until<now) {buckets.set(key,{count:1,until:now+60000});return true;}
 return ++current.count<=180;
}
export function result(data:unknown,extra:Record<string,unknown>={},status=200) {
 const empty=Array.isArray(data)?data.length===0:false;
 return NextResponse.json({data,meta:{availability:empty?'empty':'available',retrieved_at:new Date().toISOString(),...extra}},{status,headers:{'Cache-Control':status===200?'public, max-age=30, stale-while-revalidate=60':'no-store'}});
}
