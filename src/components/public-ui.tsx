'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, CloudRain, Compass, ExternalLink, Info, Map, MapPin, Menu, Moon, Mountain, Search, ShieldAlert, ShieldCheck, Sun, X } from 'lucide-react';
import { Button } from './ui/button';
import type { ApiResult, Incident, Place, SusceptibilityZone } from '@/lib/types';
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
  const labels: Record<string, string> = {
    available: 'Tersedia',
    stale: 'Perlu diperbarui',
    unavailable: 'Belum dapat diakses',
    not_ingested: 'Belum tersedia di LERENG',
    official: 'Sumber resmi',
    media_reported: 'Laporan media',
    unverified: 'Belum terverifikasi',
    observational: 'Data referensi',
    Tinggi: 'Kerentanan Tinggi',
    Menengah: 'Kerentanan Menengah',
    Rendah: 'Kerentanan Rendah',
    'Sangat Rendah': 'Sangat Rendah',
  };
  const slug = value.toLowerCase().replace(/\s+/g, '-');
  return <span className={`status status-${slug}`}>{labels[value] || value}</span>;
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
  const items = [
    { name: 'Beranda', href: '/', active: view === 'dashboard' },
    { name: 'Jelajahi Peta', href: '/peta', active: ['peta', 'kerawanan', 'analisis'].includes(view) },
    { name: 'Kejadian Longsor', href: '/kejadian', active: view === 'kejadian' },
    { name: 'Prediksi AI', href: '/prediksi-ai', active: view === 'prediksi-ai' },
    { name: 'Tentang LERENG', href: '/tentang', active: view === 'tentang' }
  ];
  return <header className="public-header">
    <div className="nav-container">
      <Link href="/" className="brand" aria-label="LERENG, Beranda">
        <BrandLogo />
      </Link>
      <nav id="public-navigation" aria-label="Navigasi utama" className={open ? 'public-nav is-open' : 'public-nav'}>
        {items.map(item => <Link key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} onClick={() => setOpen(false)}>{item.name}</Link>)}
      </nav>
      <div className="nav-actions">
        <Button variant="ghost" size="icon" aria-label={dark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'} onClick={onTheme}>{dark ? <Sun size={20} /> : <Moon size={20} />}</Button>
        <Button ref={menuButton} variant="ghost" className="mobile-menu" aria-expanded={open} aria-controls="public-navigation" aria-label={open ? 'Tutup menu' : 'Buka menu'} onClick={() => setOpen(v => !v)}>{open ? <X size={21} /> : <Menu size={21} />}<span>Menu</span></Button>
      </div>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="footer-inner"><div><Link className="brand" href="/" aria-label="LERENG, Beranda"><BrandLogo /></Link><p>Kenali wilayahnya.<br />Pahami informasinya.</p></div><nav aria-label="Informasi tambahan"><Link href="/tentang">Tentang LERENG</Link><Link href="/tentang#faktor-longsor">Mengenal longsor</Link><Link href="/lingkungan">Kondisi lingkungan</Link></nav><nav aria-label="Data dan pengaturan"><Link href="/sumber-data">Sumber & pembaruan data</Link><Link href="/prediksi-ai#metodologi">Metodologi AI</Link><Link href="/pengaturan">Pengaturan tampilan</Link></nav></div><div className="footer-note"><div><span>Landslide Early Risk & Event Navigation Geoportal</span><p style={{ margin: '4px 0 0', opacity: 0.85 }}>Developed by Jad Abyanza Fauzan</p></div><p>Informasi untuk membantu memahami wilayah, bukan jaminan keselamatan atau pengganti arahan BPBD.</p></div></footer>;
}

function BrandLogo() {
  return <><Image className="brand-logo brand-logo-light" src="/brand/lereng-light.svg" width={1994} height={509} alt="LERENG" unoptimized /><Image className="brand-logo brand-logo-dark" src="/brand/lereng-dark.svg" width={1994} height={509} alt="LERENG" unoptimized /></>;
}

const QUICK_LOCATIONS = [
  { label: 'Jawa Barat', value: 'Jawa Barat' },
  { label: 'Jawa Tengah', value: 'Jawa Tengah' },
  { label: 'Jawa Timur', value: 'Jawa Timur' },
  { label: 'Sumatera Barat', value: 'Sumatera Barat' },
  { label: 'Sulawesi Selatan', value: 'Sulawesi Selatan' },
  { label: 'Puncak Bogor', value: '-6.70, 106.99' },
];

export function LocationSearch({ value, onChange, onSubmit, onPlaceSelect, onQuickSelect, onPreview, error, compact = false }: { value: string; onChange: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onPlaceSelect: (place: Place) => void; onQuickSelect?: (target: string) => void; onPreview?: (province: string) => void; error?: string; compact?: boolean }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const optionList = useRef<HTMLUListElement>(null);
  const trimmed = value.trim();
  const isCoordinate = /^-?[\d.]+\s*,/.test(trimmed);
  useEffect(() => { const timer = setTimeout(() => setQuery(trimmed), 200); return () => clearTimeout(timer); }, [trimmed]);
  const recommendations = useQuery({
    queryKey: ['places', query],
    queryFn: async ({ signal }): Promise<ApiResult<Place[]>> => {
      const response = await fetch(`/api/places?q=${encodeURIComponent(query)}&limit=8`, { signal });
      if (!response.ok) throw new Error('Rekomendasi belum bisa dimuat.');
      return response.json();
    },
    enabled: open && query.length >= 2 && !isCoordinate,
    staleTime: 300000,
    retry: 1,
  });
  const matches = query === trimmed ? recommendations.data?.data || [] : [];
  const showPanel = open && trimmed.length >= 2 && !isCoordinate;
  const loading = query !== trimmed || recommendations.isLoading;
  const activeOption = matches[active];
  useEffect(() => { optionList.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [active]);
  function choose(place: Place) { setOpen(false); setActive(-1); onPlaceSelect(place); }
  return <div className={`location-search-wrap ${compact ? 'compact-search' : ''}`}>
    <form className="location-search" onSubmit={event => { setOpen(false); onSubmit(event); }} role="search" aria-label="Cari lokasi di peta">
      <Search size={21} aria-hidden="true" />
      <input role="combobox" aria-autocomplete="list" aria-expanded={showPanel} aria-controls={showPanel ? `${id}-options` : undefined} aria-activedescendant={showPanel && activeOption ? `${id}-option-${activeOption.id}` : undefined} aria-label="Cari wilayah atau koordinat" aria-describedby={error ? `${id}-error` : `${id}-hint`} aria-invalid={!!error} autoComplete="off" placeholder="Cari kabupaten, kota, provinsi…" value={value} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); if (matches.length) setActive(index => event.key === 'ArrowDown' ? (index + 1) % matches.length : (index < 1 ? matches.length - 1 : index - 1)); }
        if (event.key === 'Enter' && showPanel && activeOption) { event.preventDefault(); choose(activeOption); }
      }} />
      <button type="submit" aria-label="Cari lokasi">{compact ? <Search size={21} /> : 'Cari lokasi'}</button>
    </form>
    {showPanel && <div className="location-suggestions">
      <p className="suggestions-heading">Pilih wilayah</p>
      <ul id={`${id}-options`} role="listbox" aria-label="Rekomendasi wilayah" ref={optionList}>{matches.map((place, index) => <li key={place.id} role="presentation"><button id={`${id}-option-${place.id}`} type="button" role="option" aria-selected={active === index} tabIndex={-1} className={active === index ? 'is-active' : ''} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(place)}><MapPin size={18} aria-hidden="true" /><span><strong>{place.name}</strong><small>{place.kind === 'province' ? 'Provinsi' : place.province}</small></span><ChevronRight size={16} aria-hidden="true" /></button></li>)}</ul>
      {loading && <p role="status" className="suggestions-state">Mencari wilayah…</p>}
      {!loading && recommendations.isError && <p role="status" className="suggestions-state">Rekomendasi belum bisa dimuat. Coba lagi atau gunakan koordinat.</p>}
      {!loading && !recommendations.isError && !matches.length && <p role="status" className="suggestions-state">Wilayah tidak ditemukan. Coba nama lain atau koordinat.</p>}
      <p className="suggestions-footnote">Referensi batas 2017/2020, bukan alamat jalan.</p>
    </div>}
    <p id={`${id}-hint`} className="search-hint">Cari provinsi, kabupaten/kota, atau koordinat seperti -6.9, 107.6.</p>
    {!compact && onQuickSelect && (
      <div className="quick-search-chips" aria-label="Pilihan cepat wilayah">
        <span className="quick-chip-label"><Compass size={14} />Cek cepat:</span>
        {QUICK_LOCATIONS.slice(0, 3).map(item => (
          <button key={item.label} type="button" className="quick-chip" onFocus={() => onPreview?.(item.value)} onBlur={() => onPreview?.('')} onPointerEnter={() => onPreview?.(item.value)} onPointerLeave={() => onPreview?.('')} onClick={() => onQuickSelect(item.value)}>
            {item.label}
          </button>
        ))}
        <details className="more-locations"><summary>Wilayah lain</summary><div>{QUICK_LOCATIONS.slice(3).map(item => <button key={item.label} type="button" className="quick-chip" onFocus={() => onPreview?.(item.value)} onBlur={() => onPreview?.('')} onPointerEnter={() => onPreview?.(item.value)} onPointerLeave={() => onPreview?.('')} onClick={() => onQuickSelect(item.value)}>{item.label}</button>)}</div></details>
      </div>
    )}
    {error && <p id={`${id}-error`} className="search-error" role="alert">{error}</p>}
  </div>;
}

export function ProvenanceNote({ compact = false }: { compact?: boolean }) {
  if (compact) return <div className="provenance-note"><Info size={18} /><p>Catatan PVMBG, BNPB, dan NASA GLC, bukan peringatan aktif. Ketelitian lokasi dan cakupan berbeda. <Link href="/sumber-data">Periksa sumber</Link>.</p></div>;
  return <div className="provenance-note"><Info size={18} /><p>Data memadukan <strong>Peta Zona Kerentanan Gerakan Tanah (ZKGT) & laporan penyelidikan resmi PVMBG</strong> (Badan Geologi Kementerian ESDM), catatan & rilis bencana resmi <strong>BNPB</strong>, serta katalog historis <strong>NASA GLC</strong>. Ketelitian lokasi berbeda tiap sumber. <Link href="/sumber-data">Kenali sumber dan keterbatasannya</Link>.</p></div>;
}

export function SusceptibilityCard({ zones, loading }: { zones?: SusceptibilityZone[]; loading?: boolean }) {
  if (loading) {
    return <section className="risk-availability"><Mountain size={23} /><div><h3>Memeriksa zona kerawanan…</h3><p>Sedang memuat klasifikasi Zona Kerentanan Gerakan Tanah PVMBG untuk koordinat ini.</p></div></section>;
  }
  const primary = zones?.[0];
  if (!primary) {
    return <section className="risk-availability"><Mountain size={23} /><div><h3>Kerawanan belum diketahui</h3><p>Titik ini berada di luar cakupan poligon daratan PVMBG yang tersimpan. Ini <strong>bukan berarti lokasi ini aman atau berisiko rendah</strong>.</p><Link href="/sumber-data">Lihat ketersediaan sumber<ChevronRight size={15} /></Link></div></section>;
  }
  const rawLevel = primary.legend?.level || (primary.classification.includes('Tinggi') ? 'Tinggi' : primary.classification.includes('Menengah') ? 'Menengah' : primary.classification.includes('Sangat') ? 'Sangat Rendah' : 'Rendah');
  const steps = ['Sangat Rendah', 'Rendah', 'Menengah', 'Tinggi'];
  const activeIdx = Math.max(0, steps.indexOf(rawLevel));
  const advice = rawLevel === 'Tinggi'
    ? 'Waspadai retakan tanah, rembesan air baru pada tebing, pohon/tiang miring, dan hindari aktivitas di bawah lereng curam saat hujan deras.'
    : rawLevel === 'Menengah'
    ? 'Perhatikan kestabilan tebing jalan, lembah sungai, serta saluran drainase lereng terutama saat hujan berdurasi lama.'
    : 'Tetap jaga drainase lereng dan hindari pemotongan tebing tanpa perkuatan geoteknik.';

  return <section className={`risk-availability risk-card-${rawLevel.toLowerCase().replace(/\s+/g, '-')}`} aria-label="Status kerawanan gerakan tanah">
    <div className="risk-card-header">
      <div className="risk-icon-badge">
        {rawLevel === 'Tinggi' || rawLevel === 'Menengah' ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
      </div>
      <div className="risk-title-group">
        <div className="risk-badges">
          <DataStatus value={rawLevel} />
          <DataStatus value="official" />
        </div>
        <h3>{primary.classification}</h3>
      </div>
    </div>
    <div className="risk-meter" aria-label={`Tingkat kerentanan: ${rawLevel}`}>
      {steps.map((step, index) => (
        <div key={step} className={`risk-meter-step ${index <= activeIdx ? 'is-active' : ''} ${index === activeIdx ? 'is-current' : ''}`} data-level={step.toLowerCase().replace(/\s+/g, '-')}>
          <span className="risk-meter-bar" />
          <span className="risk-meter-label">{step}</span>
        </div>
      ))}
    </div>
    <p className="risk-description">{primary.legend?.description || primary.limitations}</p>
    <div className="risk-advice">
      <strong>Panduan kesiapsiagaan warga:</strong>
      <p>{advice}</p>
    </div>
    <div className="risk-footer">
      <span>Sumber: {primary.name}</span>
      <Link href="/sumber-data">Rincian sumber<ChevronRight size={15} /></Link>
    </div>
  </section>;
}

function sourceBadgeLabel(sourceId: string): string {
  const map: Record<string, string> = {
    'pvmbg-tanggapan': 'PVMBG · Tanggapan',
    'pvmbg-penyelidikan': 'PVMBG · Penyelidikan',
    'pvmbg-magma': 'PVMBG · MAGMA',
    'bnpb': 'BNPB · GIS Resmi',
    'bnpb-releases': 'BNPB · Rilis Resmi',
    'nasa-glc': 'NASA GLC',
  };
  return map[sourceId] || sourceId;
}

export function IncidentCard({ incident, onSelect, compact = false }: { incident: Incident; onSelect: (incident: Incident) => void; compact?: boolean }) {
  const area = [incident.district, incident.regency, incident.province].filter(Boolean).join(', ') || incident.province || 'Wilayah belum diketahui';
  return <article className={`incident-card ${compact ? 'incident-compact' : ''}`}>
    <div className="incident-card-meta">
      <span className="incident-location-tag"><MapPin size={15} />{incident.province || 'Wilayah belum diketahui'}</span>
      <DataStatus value={incident.verification_status} />
      <span className="incident-source-pill">{sourceBadgeLabel(incident.source_id)}</span>
    </div>
    <h3><button aria-label={compact ? incident.title : undefined} onClick={() => onSelect(incident)}>{compact ? `Catatan di ${incident.regency || incident.province || 'wilayah belum diketahui'}` : incident.title}</button></h3>
    {!compact && <p className="incident-subplace">{area}</p>}
    <time dateTime={incident.occurred_at}>{formatDate(incident.occurred_at)}</time>
    {(incident.fatalities || incident.injuries || incident.damaged_buildings) ? (
      <div className="incident-impact-row">
        {incident.fatalities != null && incident.fatalities > 0 && <span className="impact-badge impact-severe">{formatNumber(incident.fatalities)} meninggal</span>}
        {incident.injuries != null && incident.injuries > 0 && <span className="impact-badge">{formatNumber(incident.injuries)} luka</span>}
        {incident.damaged_buildings != null && incident.damaged_buildings > 0 && <span className="impact-badge">{formatNumber(incident.damaged_buildings)} bangunan terdampak</span>}
      </div>
    ) : null}
    <p>{precisionLabel(incident.coordinate_precision || 'Ketelitian lokasi belum diketahui')}.{!compact && ' Baca detail sebelum menafsirkan titik pada peta.'}</p>
    <div className="incident-card-actions">
      <Button variant="ghost" onClick={() => onSelect(incident)}>Baca detail<ChevronRight size={16} /></Button>
      {incident.longitude !== null && incident.latitude !== null && <Link href={`/peta?lat=${incident.latitude}&lng=${incident.longitude}&incident=${encodeURIComponent(incident.id)}`}>Lihat di peta<MapPin size={15} /></Link>}
    </div>
  </article>;
}

export function IncidentDetails({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return <section className="incident-details" aria-label="Detail kejadian">
    <div className="section-heading"><h2>Detail kejadian</h2><Button variant="ghost" size="icon" aria-label="Tutup detail kejadian" onClick={onClose}><X size={20} /></Button></div>
    <div className="incident-detail-badges">
      <DataStatus value={incident.verification_status} />
      <span className="incident-source-pill">{sourceBadgeLabel(incident.source_id)}</span>
    </div>
    <h3>{incident.title}</h3>
    <p className="place-line"><MapPin size={17} />{[incident.village, incident.district, incident.regency, incident.province].filter(Boolean).join(', ') || 'Wilayah belum diketahui'}</p>
    <dl className="detail-list">
      <div><dt>Tanggal kejadian</dt><dd>{formatDate(incident.occurred_at)}</dd></div>
      <div><dt>Ketelitian lokasi</dt><dd>{incident.coordinate_precision}</dd></div>
      <div><dt>Meninggal dilaporkan</dt><dd>{formatNumber(incident.fatalities)}</dd></div>
      <div><dt>Luka-luka dilaporkan</dt><dd>{formatNumber(incident.injuries)}</dd></div>
      {incident.damaged_buildings != null && <div><dt>Bangunan terdampak</dt><dd>{formatNumber(incident.damaged_buildings)} unit</dd></div>}
      {incident.displaced != null && <div><dt>Warga mengungsi</dt><dd>{formatNumber(incident.displaced)} jiwa</dd></div>}
      <div><dt>Terbit di sumber</dt><dd>{formatDate(incident.published_at)}</dd></div>
      <div><dt>Diambil LERENG</dt><dd>{formatDate(incident.retrieved_at, true)}</dd></div>
    </dl>
    {incident.description && <details open><summary>Baca deskripsi asli dari sumber</summary><p className="original-description">{incident.description}</p><p className="small muted">Bahasa asli dipertahankan agar makna laporan tidak berubah.</p></details>}
    <a className="text-link" href={incident.source_url} target="_blank" rel="noreferrer">Buka laporan sumber<ExternalLink size={16} /></a>
    <p className="small muted">Nilai yang belum diketahui tidak berarti nol. Catatan ini bukan peringatan longsor yang sedang berlangsung.</p>
  </section>;
}

export function StartOptions() {
  return <section className="content-section start-section"><div className="section-heading"><div><h2>Mulai dari Mana?</h2><p>Pilih informasi sesuai pertanyaan Anda.</p></div></div><div className="start-options"><Link href="/kerawanan" className="start-card"><h3>Bagaimana kerentanan wilayahnya?</h3><p>Lihat klasifikasi regional Zona Kerentanan Gerakan Tanah PVMBG. Bukan prediksi waktu kejadian.</p><span>Buka peta kerawanan</span></Link><Link href="/kejadian" className="start-card"><h3>Apa yang pernah dilaporkan?</h3><p>Telusuri laporan PVMBG, catatan BNPB, dan katalog historis NASA GLC beserta ketelitian lokasinya.</p><span>Lihat daftar kejadian</span></Link><Link href="/tentang#faktor-longsor" className="start-card"><h3>Apa yang memengaruhi longsor?</h3><p>Pahami hubungan hujan, kemiringan lereng, geologi, perubahan lahan, dan drainase.</p><span>Pelajari faktor longsor</span></Link></div></section>;
}

export function EducationalSection() {
  return <section id="faktor-longsor" className="content-section education-section"><div className="education-intro"><h2>Mengenal Faktor Penyebab Longsor</h2><p>Longsor dipengaruhi gabungan kondisi alam dan aktivitas manusia. Satu faktor tidak menentukan kapan longsor terjadi.</p><a className="text-link" href="https://pubs.usgs.gov/fs/2004/3072/" target="_blank" rel="noreferrer">Baca penjelasan USGS (bahasa Inggris)<ExternalLink size={16} /></a></div><div className="factor-list"><article><CloudRain size={25} /><div><h3>Hujan & air dalam tanah</h3><p>Air yang meresap menambah beban lereng dan dapat mengurangi kekuatan tanah.</p></div></article><article><Mountain size={25} /><div><h3>Kemiringan & kondisi batuan</h3><p>Lereng terjal dan tanah pelapukan di atas batuan kedap air dapat meningkatkan kerentanan.</p></div></article><article><Map size={25} /><div><h3>Perubahan lahan & drainase</h3><p>Pemotongan tebing dan kebocoran saluran air dapat mengganggu kestabilan lereng.</p></div></article></div></section>;
}

export function HowItWorks() {
  return <section className="content-section how-section"><h2>Bagaimana LERENG Bekerja?</h2><p className="section-lead">Informasi berbeda dibaca bersama, bukan dijadikan satu skor kepastian.</p><div className="how-columns"><div className="how-card"><h3>Lokasi menjadi titik awal</h3><p>Cari provinsi atau koordinat; GPS hanya digunakan atas izin Anda.</p></div><div className="how-card"><h3>Setiap lapisan punya batas</h3><p>Kerentanan PVMBG, riwayat dalam 50 km, dan cuaca BMKG bukan prediksi waktu longsor.</p></div><div className="how-card"><h3>Periksa sumber aslinya</h3><p>Ketelitian lokasi dan cakupan berbeda; tidak adanya catatan bukan berarti aman.</p></div></div></section>;
}

export function TrustedSources() {
  return <section className="content-section trust-section"><div><h2>Sumber Informasi Terpercaya</h2><p>Periksa asal, waktu pembaruan, lisensi, dan keterbatasan sebelum menggunakan data.</p><Link className="text-link" href="/sumber-data">Periksa semua sumber</Link></div><ul><li><strong>PVMBG · Badan Geologi ESDM</strong><span>Kerentanan regional dan laporan gerakan tanah.</span></li><li><strong>BNPB</strong><span>Catatan geospasial dan rilis bencana.</span></li><li><strong>BMKG</strong><span>Prakiraan desa dan peringatan cuaca, bukan peringatan longsor.</span></li><li><strong>NASA GLC & geoBoundaries</strong><span>Katalog historis dan batas provinsi referensi 2017.</span></li></ul></section>;
}

export function LocationBottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const [expanded, setExpanded] = useState(true);
  return <aside className={`location-sheet ${expanded ? 'is-expanded' : ''}`} aria-label="Informasi lokasi terpilih"><div className="sheet-heading"><button aria-expanded={expanded} aria-controls="location-sheet-content" onClick={() => setExpanded(v => !v)}><span className="sheet-handle" /><strong>{title}</strong><ChevronDown size={18} /></button><Button variant="ghost" size="icon" aria-label="Tutup informasi lokasi" onClick={onClose}><X size={20} /></Button></div><div id="location-sheet-content" className="sheet-content" hidden={!expanded}>{children}</div></aside>;
}
