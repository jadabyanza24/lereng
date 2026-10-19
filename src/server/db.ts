import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
const globalDb = globalThis as unknown as {sql?:ReturnType<typeof postgres>};
export function sqlClient() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum dikonfigurasi');
  return globalDb.sql ??= postgres(process.env.DATABASE_URL,{max:10,connect_timeout:15,idle_timeout:20,prepare:false,connection:{statement_timeout:15000}});
}
export function database() {return drizzle(sqlClient());}
