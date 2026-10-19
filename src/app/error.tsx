'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="fatal-error"><h1>Ruang kerja tidak dapat dimuat</h1><p>Terjadi kesalahan aplikasi. Muat ulang untuk mencoba kembali.</p><Button onClick={reset}>Coba kembali</Button></main>;}
