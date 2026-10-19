'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, CloudRain, ExternalLink, Info, Map, MapPin, Menu, Moon, Mountain, Search, ShieldCheck, Sun, X } from 'lucide-react';
import { Button } from './ui/button';
import type { Incident } from '@/lib/types';
import { precisionLabel } from '@/lib/presentation';

export const formatNumber = (value: number | null | undefined) => value == null ? 'Belum diketahui' : new Intl.NumberFormat('id-ID').format(value);
export function formatDate(value: string | null | undefined, time = false) {
  return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', ...(time ? { timeStyle: 'short' } : {}) }).format(new Date(value)) : 'Belum diketahui';
}

export function DataState({ loading, error, empty, emptyTitle = 'Belum ada catatan untuk pilihan ini', emptyText = 'Coba wilayah atau waktu lain. Tidak adanya laporan bukan berarti tidak ada longsor.', children }: { loading?: boolean; error?: Error | null; empty?: boolean; emptyTitle?: string; emptyText?: string; children?: React.ReactNode }) {
  if (loading) return <div className="data-state" role="status"><span className="loading-dot" />Sedang menyiapkan informasi…</div>;
  if (error) return <div className="data-state error" role="alert"><Info size={22} /><div><strong>Informasi belum bisa dimuat</strong><p>{error.message}</p><p>Jika koneksi lemah, coba lagi dengan tombol Muat ulang. Daftar kejadian tetap bisa digunakan tanpa membuka peta.</p></div></div>;
  if (empty) return <div className="data-state"><MapPin size={24} /><div><strong>{emptyTitle}</strong><p>{emptyText}</p></div></div>;
  return children;
}

export function DataStatus({ value }: { value: string }) {
  const labels: Record<string, string> = { available: 'Tersedia', stale: 'Perlu diperbarui', unavailable: 'Belum dapat diakses', not_ingested: 'Belum tersedia di LERENG', official: 'Sumber resmi', media_reported: 'Laporan media', unverified: 'Belum terverifikasi', observational: 'Data referensi' };
  return <span className={`status status-${value}`}>{labels[value] || value}</span>;
}

export function PublicNavbar({ view, dark, onTheme }: { view: string; dark: boolean; onTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  const items = [{ name: 'Beranda', href: '/', active: view === 'dashboard' }, { name: 'Jelajahi Peta', href: '/peta', active: ['peta', 'kerawanan', 'analisis'].includes(view) }, { name: 'Kejadian Longsor', href: '/kejadian', active: view === 'kejadian' }, { name: 'Prediksi AI', href: '/prediksi-ai', active: view === 'prediksi-ai' }, { name: 'Tentang LERENG', href: '/tentang', active: view === 'tentang' }];
  return <header className="public-header">
    <div className="nav-container"><Link href="/" className="brand" aria-label="LERENG, Beranda">LERENG<span>.</span></Link>
      <nav id="public-navigation" aria-label="Navigasi utama" className={open ? 'public-nav is-open' : 'public-nav'}>{items.map(item => <Link key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} onClick={() => setOpen(false)}>{item.name}</Link>)}</nav>
      <div className="nav-actions"><Button variant="ghost" size="icon" aria-label={dark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'} onClick={onTheme}>{dark ? <Sun size={20} /> : <Moon size={20} />}</Button><Button ref={menuButton} variant="ghost" className="mobile-menu" aria-expanded={open} aria-controls="public-navigation" aria-label={open ? 'Tutup menu' : 'Buka menu'} onClick={() => setOpen(v => !v)}>{open ? <X size={21} /> : <Menu size={21} />}<span>Menu</span></Button></div>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="footer-inner"><div><Link className="brand" href="/">LERENG<span>.</span></Link><p>Kenali wilayahnya.<br />Pahami informasinya.</p></div><nav aria-label="Informasi tambahan"><Link href="/tentang">Tentang LERENG</Link><Link href="/tentang#faktor-longsor">Mengenal longsor</Link><Link href="/lingkungan">Kondisi lingkungan</Link></nav><nav aria-label="Data dan pengaturan"><Link href="/sumber-data">Sumber & pembaruan data</Link><Link href="/prediksi-ai#metodologi">Metodologi AI</Link><Link href="/pengaturan">Pengaturan tampilan</Link></nav></div><div className="footer-note"><span>Landslide Early Risk & Event Navigation Geoportal</span><p>Informasi untuk membantu memahami wilayah, bukan jaminan keselamatan atau pengganti arahan BPBD.</p></div></footer>;
}

export function LocationSearch({ value, onChange, onSubmit, regions = [], error, compact = false }: { value: string; onChange: (value: string) => void; onSubmit: (event: React.FormEvent) => void; regions?: string[]; error?: string; compact?: boolean }) {
  const id = useId();
  return <div className={`location-search-wrap ${compact ? 'compact-search' : ''}`}><form className="location-search" onSubmit={onSubmit} role="search" aria-label="Cari lokasi di peta"><Search size={21} aria-hidden="true" /><input aria-label="Cari wilayah atau koordinat" aria-describedby={error ? `${id}-error` : `${id}-hint`} aria-invalid={!!error} placeholder="Cari provinsi atau koordinat…" list={`${id}-regions`} value={value} onChange={event => onChange(event.target.value)} /><datalist id={`${id}-regions`}>{regions.map(name => <option key={name} value={name} />)}</datalist><button type="submit" aria-label="Cari lokasi"><ArrowRight size={21} /></button></form><p id={`${id}-hint`} className="search-hint">Pilih provinsi, atau tulis koordinat seperti -6.9, 107.6.</p>{error && <p id={`${id}-error`} className="search-error" role="alert">{error}</p>}</div>;
}

export function ProvenanceNote() {
  return <div className="provenance-note"><Info size={18} /><p>Riwayat NASA GLC berasal dari laporan historis, bukan inventaris resmi BNPB. Lokasinya dapat berupa perkiraan. <Link href="/sumber-data">Kenali sumber dan keterbatasannya</Link>.</p></div>;
}

export function IncidentCard({ incident, onSelect, compact = false }: { incident: Incident; onSelect: (incident: Incident) => void; compact?: boolean }) {
  return <article className={`incident-card ${compact ? 'incident-compact' : ''}`}><div className="incident-card-meta"><span><MapPin size={16} />{incident.province || 'Wilayah belum diketahui'}</span><DataStatus value={incident.verification_status} /></div><h3><button onClick={() => onSelect(incident)}>{incident.title}</button></h3><time dateTime={incident.occurred_at}>{formatDate(incident.occurred_at)}</time><p>{precisionLabel(incident.coordinate_precision || 'Ketelitian lokasi belum diketahui')}. Baca detail sebelum menafsirkan titik pada peta.</p><div className="incident-card-actions"><Button variant="ghost" onClick={() => onSelect(incident)}>Baca detail<ChevronRight size={16} /></Button>{incident.longitude !== null && incident.latitude !== null && <Link href={`/peta?lat=${incident.latitude}&lng=${incident.longitude}&incident=${encodeURIComponent(incident.id)}`}>Lihat di peta<MapPin size={15} /></Link>}</div></article>;
}

export function IncidentDetails({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return <section className="incident-details" aria-label="Detail kejadian"><div className="section-heading"><h2>Detail kejadian</h2><Button variant="ghost" size="icon" aria-label="Tutup detail kejadian" onClick={onClose}><X size={20} /></Button></div><DataStatus value={incident.verification_status} /><h3>{incident.title}</h3><p className="place-line"><MapPin size={17} />{[incident.regency, incident.province].filter(Boolean).join(', ') || 'Wilayah belum diketahui'}</p><dl className="detail-list"><div><dt>Tanggal kejadian</dt><dd>{formatDate(incident.occurred_at)}</dd></div><div><dt>Ketelitian lokasi</dt><dd>{incident.coordinate_precision}</dd></div><div><dt>Meninggal dilaporkan</dt><dd>{formatNumber(incident.fatalities)}</dd></div><div><dt>Luka-luka dilaporkan</dt><dd>{formatNumber(incident.injuries)}</dd></div><div><dt>Terbit di sumber</dt><dd>{formatDate(incident.published_at)}</dd></div><div><dt>Diambil LERENG</dt><dd>{formatDate(incident.retrieved_at, true)}</dd></div></dl>{incident.description && <details><summary>Baca deskripsi asli dari sumber</summary><p className="original-description">{incident.description}</p><p className="small muted">Bahasa asli dipertahankan agar makna laporan tidak berubah.</p></details>}<a className="text-link" href={incident.source_url} target="_blank" rel="noreferrer">Buka laporan sumber<ExternalLink size={16} /></a><p className="small muted">Nilai yang belum diketahui tidak berarti nol. Catatan ini bukan peringatan longsor yang sedang berlangsung.</p></section>;
}

export function StartOptions() {
  return <section className="content-section start-section"><div className="section-heading"><h2>Mulai dari Mana?</h2><p>Tidak perlu memahami peta untuk mulai mencari tahu.</p></div><div className="start-options"><Link href="/kerawanan"><Mountain size={27} /><h3>Cek Kerawanan Wilayah</h3><p>Kenali informasi yang tersedia dan bedakan belum ada data dengan risiko rendah.</p><span>Buka peta<ArrowRight size={17} /></span></Link><Link href="/kejadian"><MapPin size={27} /><h3>Lihat Kejadian Longsor</h3><p>Telusuri riwayat laporan, lokasi, dan sumber kejadian di Indonesia.</p><span>Lihat riwayat<ArrowRight size={17} /></span></Link><Link href="/tentang#faktor-longsor"><BookOpen size={27} /><h3>Kenali Faktor Risiko</h3><p>Pahami hubungan hujan, kemiringan lereng, dan kondisi tanah.</p><span>Pelajari faktornya<ArrowRight size={17} /></span></Link></div></section>;
}

export function EducationalSection() {
  return <section id="faktor-longsor" className="content-section education-section"><div className="education-intro"><h2>Mengenal Faktor Penyebab Longsor</h2><p>Longsor dipengaruhi gabungan kondisi alam dan aktivitas manusia. Satu faktor saja tidak cukup untuk menyimpulkan kapan longsor akan terjadi.</p><a className="text-link" href="https://pubs.usgs.gov/fs/2004/3072/" target="_blank" rel="noreferrer">Baca penjelasan USGS (bahasa Inggris)<ExternalLink size={16} /></a></div><div className="factor-list"><article><CloudRain size={25} /><div><h3>Hujan & air dalam tanah</h3><p>Air yang meresap dapat mengurangi kestabilan lereng. Prakiraan hujan bukan kepastian akan terjadi longsor.</p></div></article><article><Mountain size={25} /><div><h3>Kemiringan & kondisi batuan</h3><p>Lereng, tanah, dan batuan memiliki karakter berbeda. Penilaian setempat memerlukan informasi yang lebih lengkap.</p></div></article><article><Map size={25} /><div><h3>Perubahan lahan & drainase</h3><p>Pemotongan lereng, perubahan tutupan lahan, dan aliran air dapat memengaruhi kestabilan tanah.</p></div></article></div></section>;
}

export function HowItWorks() {
  return <section className="content-section how-section"><h2>Bagaimana LERENG Bekerja?</h2><p className="section-lead">Menghubungkan tempat dengan informasi yang bisa ditelusuri, bukan menebak keadaan di lapangan.</p><div className="how-columns"><div><Search size={24} /><h3>Mulai dari lokasi</h3><p>Cari provinsi atau pilih titik di peta. Lihat catatan di sekitarnya tanpa membagikan lokasi perangkat.</p></div><div><BookOpen size={24} /><h3>Baca dengan konteks</h3><p>Riwayat kejadian, kerawanan jangka panjang, dan prakiraan cuaca ditampilkan sebagai informasi yang berbeda.</p></div><div><ShieldCheck size={24} /><h3>Periksa sumbernya</h3><p>Kenali asal informasi dan kapan data diambil. Jika data belum tersedia, LERENG menyatakannya dengan jelas.</p></div></div></section>;
}

export function TrustedSources() {
  return <section className="content-section trust-section"><div><ShieldCheck size={30} /><h2>Sumber Informasi Terpercaya</h2><p>Kepercayaan dimulai dari mengetahui asal informasi dan batas penggunaannya. LERENG tidak mewakili instansi pemerintah.</p><Link className="text-link" href="/sumber-data">Periksa semua sumber<ArrowRight size={17} /></Link></div><ul><li><strong>BMKG</strong><span>Prakiraan desa dan peringatan cuaca resmi.</span></li><li><strong>NASA Global Landslide Catalog</strong><span>Riwayat laporan media melalui salinan ArcGIS publik.</span></li><li><strong>geoBoundaries</strong><span>Referensi batas provinsi tahun 2017, bukan batas hukum resmi.</span></li></ul></section>;
}

export function LocationBottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const [expanded, setExpanded] = useState(true);
  return <aside className={`location-sheet ${expanded ? 'is-expanded' : ''}`} aria-label="Informasi lokasi terpilih"><div className="sheet-heading"><button aria-expanded={expanded} aria-controls="location-sheet-content" onClick={() => setExpanded(v => !v)}><span className="sheet-handle" /><strong>{title}</strong><ChevronDown size={18} /></button><Button variant="ghost" size="icon" aria-label="Tutup informasi lokasi" onClick={onClose}><X size={20} /></Button></div><div id="location-sheet-content" className="sheet-content" hidden={!expanded}>{children}</div></aside>;
}
