import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './orientation.css';
export const metadata:Metadata={metadataBase:new URL(process.env.SITE_URL || 'http://localhost:3000'),title:'LERENG · Kenali lereng di sekitar Anda',description:'Cari lokasi untuk membaca kerentanan wilayah, riwayat longsor, dan cuaca beserta sumbernya. Bukan layanan peringatan dini resmi.',icons:{icon:'/favicon.svg',apple:'/apple-touch-icon.png'},openGraph:{images:[{url:'/og.png',width:1200,height:630,alt:'LERENG: informasi longsor Indonesia beserta sumber dan keterbatasannya.'}]}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id" suppressHydrationWarning><head><link rel="preload" href="/fonts/public-sans-regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/><link rel="preload" href="/fonts/public-sans-bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/></head><body><Providers>{children}</Providers></body></html>;}
