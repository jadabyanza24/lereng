import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
export const metadata:Metadata={title:'LERENG · Kenali Longsor di Sekitarmu',description:'Jelajahi riwayat kejadian longsor, pahami kondisi lingkungan, dan kenali sumber informasinya. Bukan layanan peringatan dini resmi.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;}
