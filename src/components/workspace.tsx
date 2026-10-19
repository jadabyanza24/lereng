'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowRight, BrainCircuit, ChevronRight, CloudRain, Download, ExternalLink, Info, Layers, MapPin, Mountain, RefreshCw, Search, Settings2, ShieldCheck, X } from 'lucide-react';
import { Button } from './ui/button';
import { OrientationMap } from './orientation-map';
import type { MapTarget } from './geo-map';
import type { Incident, Source, Analytics, SusceptibilityZone, ApiResult, Place } from '@/lib/types';
import { views } from '@/lib/navigation';
import { provinceLabel } from '@/lib/presentation';
import { DataState, DataStatus, EducationalSection, HowItWorks, IncidentCard, IncidentDetails, LocationBottomSheet, LocationSearch, ProvenanceNote, PublicFooter, PublicNavbar, StartOptions, SusceptibilityCard, TrustedSources, formatDate as date, formatNumber as number } from './public-ui';

const GeoMap = dynamic(() => import('./geo-map'), { ssr: false, loading: () => <div className="map-loading" role="status">Sedang membuka peta… Jika koneksi lambat, Anda juga bisa membaca <Link href="/kejadian">daftar kejadian</Link>.</div> });
type Region = { id: string; name: string; west: number; south: number; east: number; north: number; center: { coordinates: [number, number] } };
type Forecast = { id: string; adm4: string; location_name: string; valid_at: string; issued_at: string; retrieved_at: string; temperature: number | null; humidity: number | null; description: string; longitude: number; latitude: number };
type Warning = { id: string; title: string; description: string; source_url: string; expires_at: string; published_at: string; retrieved_at: string };
type Layer = { id: string; name: string; source: string | null; kind: string; resolution: string | null; last_updated: string | null; availability: string; limitations: string };

async function get<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch('/api/' + path);
  const body = await response.json();
  if (!response.ok) throw new Error(body.meta?.message || body.message || 'Koneksi ke layanan terputus. Silakan coba lagi.');
  return body;
}
function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

export function Workspace({ view }: { view: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isHome = view === 'dashboard';
  const mapView = ['peta', 'kerawanan', 'analisis'].includes(view);
  const [dark, setDark] = useState(false), [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [province, setProvince] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [status, setStatus] = useState('');
  const [bbox, setBbox] = useState('94,-12,142,7'), [selected, setSelected] = useState<Incident | null>(null), [point, setPoint] = useState<{ lng: number; lat: number } | null>(null), [target, setTarget] = useState<MapTarget | null>(null);
  const [showIncidents, setShowIncidents] = useState(true), [showBoundaries, setShowBoundaries] = useState(true), [showSusceptibility, setShowSusceptibility] = useState(true), [opacity, setOpacity] = useState(0.85), [basemap, setBasemap] = useState('streets'), [horizon, setHorizon] = useState(24), [searchMessage, setSearchMessage] = useState(''), [offset, setOffset] = useState(0);
  const [linkedIncident, setLinkedIncident] = useState('');
  const [linkedPlaceId, setLinkedPlaceId] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [previewProvince, setPreviewProvince] = useState('');
  const settingsButton = useRef<HTMLButtonElement>(null);
  const detailAnchor = useRef<HTMLDivElement>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const hydratedSearch = useRef(false);
  const searchRequest = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animations.push(entry.target.animate([{ opacity: 0.65, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }));
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('#main .content-section, #main .page-heading, #main .orientation-intro, #main .orientation-index').forEach(element => observer.observe(element));
    const stop = () => { if (reduced.matches) { observer.disconnect(); animations.forEach(animation => animation.cancel()); } };
    reduced.addEventListener('change', stop);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); reduced.removeEventListener('change', stop); };
  }, [view]);
  useEffect(() => {
    const saved = localStorage.getItem('lereng-theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const savedMap = localStorage.getItem('lereng-basemap');
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    queueMicrotask(() => { setDark(isDark); if (savedMap === 'streets' || savedMap === 'topographic') setBasemap(savedMap); });
  }, []);
  const changeTheme = () => { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light'; localStorage.setItem('lereng-theme', next ? 'dark' : 'light'); };
  const changeBasemap = (value: string) => { setBasemap(value); localStorage.setItem('lereng-basemap', value); };
  useEffect(() => {
    if (!settingsOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSettingsOpen(false); settingsButton.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [settingsOpen]);

  const active = views.find(item => item.id === view)!;
  const invalidDates = !!from && !!to && from > to;
  const q = useDebounced(query);
  const parameters = new URLSearchParams();
  if (from) parameters.set('from', from); if (to) parameters.set('to', to); if (province) parameters.set('province', province); if (status) parameters.set('status', status); if (q) parameters.set('q', q);
  const filters = parameters.toString();
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => get<Source[]>('sources') });
  const regions = useQuery({ queryKey: ['regions'], queryFn: () => get<Region[]>('regions?limit=100') });
  const weatherParameters = new URLSearchParams(parameters);
  const weatherRegion = regions.data?.data.find(region => provinceLabel(region.name) === province);
  if (weatherRegion) weatherParameters.set('province', weatherRegion.name);
  const weatherFilters = weatherParameters.toString();
  const incidents = useQuery({ queryKey: ['incidents', filters, bbox], queryFn: () => get<Incident[]>(`incidents?${filters}&bbox=${bbox}&limit=2000`), enabled: mapView && !invalidDates });
  const stats = useQuery({ queryKey: ['analytics', filters], queryFn: () => get<Analytics>('analytics?' + filters), enabled: (mapView || view === 'kejadian' || isHome) && !invalidDates });
  const incidentList = useQuery({ queryKey: ['incident-list', filters, offset], queryFn: () => get<Incident[]>(`incidents?${filters}&limit=25&offset=${offset}`), enabled: view === 'kejadian' && !invalidDates });
  const latest = useQuery({ queryKey: ['latest-incidents'], queryFn: () => get<Incident[]>('incidents?limit=3'), enabled: isHome });
  const selectedParams = point ? `lng=${point.lng}&lat=${point.lat}&radius=50000` : '';
  const nearby = useQuery({ queryKey: ['nearby', selectedParams, filters], queryFn: () => get<Incident[]>(`incidents/nearby?${selectedParams}&${filters}&limit=10`), enabled: !!point });
  const forecast = useQuery({ queryKey: ['forecast', selectedParams, weatherFilters], queryFn: () => get<Forecast[]>('weather/forecasts?' + selectedParams + '&' + weatherFilters), enabled: (mapView || view === 'lingkungan') && !invalidDates });
  const warnings = useQuery({ queryKey: ['warnings', selectedParams, weatherFilters], queryFn: () => get<Warning[]>('weather/warnings?' + selectedParams + '&' + weatherFilters), enabled: (mapView || view === 'lingkungan') && !invalidDates });
  const location = useQuery({ queryKey: ['location', selectedParams], queryFn: () => get<{ regions: { name: string }[]; susceptibility: SusceptibilityZone[] }>('location?' + selectedParams), enabled: !!point });
  const layerMetadata = useQuery({ queryKey: ['layers'], queryFn: () => get<Layer[]>('layers'), enabled: view === 'sumber-data' });
  const ai = useQuery({ queryKey: ['ai'], queryFn: () => get<{ status: string; message: string }>('ai/status'), enabled: view === 'prediksi-ai' });
  const linked = useQuery({ queryKey: ['linked-incident', linkedIncident], queryFn: () => get<Incident>('incidents/' + encodeURIComponent(linkedIncident)), enabled: !!linkedIncident && mapView });
  const linkedPlace = useQuery({ queryKey: ['place', linkedPlaceId], queryFn: () => get<Place[]>('places?id=' + encodeURIComponent(linkedPlaceId)), enabled: !!linkedPlaceId && mapView });
  const onViewport = useCallback((value: string) => setBbox(value), []);
  const onSelect = useCallback((value: { lng: number; lat: number }, incident?: Incident) => { setSelectedPlace(null); setTarget(null); setPoint(value); setSelected(incident || null); }, []);

  function selectIncident(incident: Incident) {
    setSelectedPlace(null);
    if (!mapView) detailTrigger.current = document.activeElement as HTMLElement;
    setSelected(incident);
    if (mapView && incident.longitude !== null && incident.latitude !== null) { const value = { lng: incident.longitude, lat: incident.latitude }; setPoint(value); setTarget(value); }
    if (!mapView) requestAnimationFrame(() => { detailAnchor.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); detailAnchor.current?.focus({ preventScroll: true }); });
  }
  function selectProvince(name: string) {
    setSelectedPlace(null);
    setProvince(name); setOffset(0);
    const region = regions.data?.data.find(item => provinceLabel(item.name) === name);
    if (region && mapView) { const value = { lng: region.center.coordinates[0], lat: region.center.coordinates[1] }; setTarget({ ...value, bounds: [region.west, region.south, region.east, region.north] }); setPoint(value); setSelected(null); }
  }
  useEffect(() => {
    if (!mapView || hydratedSearch.current || !regions.data) return;
    hydratedSearch.current = true;
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get('lat')), lng = Number(params.get('lng'));
    const searchValue = params.get('q');
    const region = regions.data.data.find(item => provinceLabel(item.name).toLowerCase().includes((searchValue || '').toLowerCase()) || item.name.toLowerCase().includes((searchValue || '').toLowerCase()));
    queueMicrotask(() => {
      if (params.has('lat') && params.has('lng') && lat >= -12 && lat <= 7 && lng >= 94 && lng <= 142) { setTarget({ lat, lng }); setPoint({ lat, lng }); }
      if (searchValue && region) { setSearch(provinceLabel(region.name)); setProvince(provinceLabel(region.name)); const value = { lng: region.center.coordinates[0], lat: region.center.coordinates[1] }; setTarget({ ...value, bounds: [region.west, region.south, region.east, region.north] }); setPoint(value); }
      if (params.get('incident')) setLinkedIncident(params.get('incident')!);
    });
  }, [mapView, regions.data]);
  useEffect(() => { if (linked.data?.data) queueMicrotask(() => setSelected(linked.data!.data)); }, [linked.data]);

  useEffect(() => {
    if (!mapView) return;
    const id = new URLSearchParams(window.location.search).get('place');
    if (id) queueMicrotask(() => setLinkedPlaceId(id));
  }, [mapView]);
  useEffect(() => {
    const place = linkedPlace.data?.data[0];
    if (!place) return;
    queueMicrotask(() => { setSelectedPlace(place); setSearch(place.name); setProvince(place.province); setPoint({ lng: place.lng, lat: place.lat }); setTarget({ lng: place.lng, lat: place.lat, bounds: place.bounds }); setSelected(null); });
  }, [linkedPlace.data]);

  function choosePlace(place: Place) {
    searchRequest.current++;
    setSearch(place.name); setSearchMessage('');
    if (!mapView) { router.push('/peta?place=' + encodeURIComponent(place.id)); return; }
    setSelectedPlace(place); setProvince(place.province); setPoint({ lng: place.lng, lat: place.lat }); setTarget({ lng: place.lng, lat: place.lat, bounds: place.bounds }); setSelected(null);
  }

  async function runSearchValue(raw: string) {
    const request = ++searchRequest.current;
    const trimmed = raw.trim();
    const coordinate = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordinate) {
      const lat = Number(coordinate[1]), lng = Number(coordinate[2]);
      if (lat >= -12 && lat <= 7 && lng >= 94 && lng <= 142) {
        if (!mapView) router.push(`/peta?lat=${lat}&lng=${lng}`);
        else { setSelectedPlace(null); setTarget({ lat, lng }); setPoint({ lat, lng }); setSelected(null); setSearchMessage(''); }
      } else {
        setSearchMessage('Koordinat berada di luar cakupan Indonesia. Tulis lintang, bujur, misalnya -6.9, 107.6.');
      }
      return;
    }
    const found = regions.data?.data.find(item => provinceLabel(item.name).toLowerCase() === trimmed.toLowerCase() || item.name.toLowerCase() === trimmed.toLowerCase());
    if (found && trimmed) {
      if (!mapView) router.push('/peta?q=' + encodeURIComponent(provinceLabel(found.name)));
      else { selectProvince(provinceLabel(found.name)); setSearchMessage(''); }
    } else {
      if (trimmed.length < 2) { setSearchMessage('Tulis sedikitnya dua huruf nama wilayah atau koordinat.'); return; }
      try {
        const response = await get<Place[]>(`places?q=${encodeURIComponent(trimmed)}&limit=10`);
        if (request !== searchRequest.current) return;
        const exact = response.data.find(place => place.name.toLowerCase() === trimmed.toLowerCase());
        if (exact || response.data.length === 1) choosePlace(exact || response.data[0]);
        else setSearchMessage(response.data.length ? 'Ada beberapa wilayah dengan nama serupa. Pilih kabupaten atau kota dari rekomendasi.' : 'Wilayah belum ditemukan. Coba nama lain atau koordinat.');
      } catch { if (request === searchRequest.current) setSearchMessage('Pencarian wilayah belum bisa dimuat. Coba lagi atau gunakan koordinat.'); }
    }
  }
  function searchLocation(event: React.FormEvent) {
    event.preventDefault();
    void runSearchValue(search);
  }
  function handleQuickSelect(val: string) {
    setSearch(val);
    if (!mapView && !val.includes(',')) { router.push('/peta?q=' + encodeURIComponent(val)); return; }
    void runSearchValue(val);
  }
  function exportRecords() {
    const records = view === 'kejadian' ? incidentList.data?.data : incidents.data?.data;
    if (!records?.length || invalidDates) return;
    const collection = { type: 'FeatureCollection', features: records.map(incident => ({ type: 'Feature', geometry: incident.longitude === null || incident.latitude === null ? null : { type: 'Point', coordinates: [incident.longitude, incident.latitude] }, properties: incident })), attribution: 'PVMBG Badan Geologi ESDM, BNPB, dan NASA Global Landslide Catalog. Lihat DATA_SOURCES.md dan /api/sources untuk izin dan ketidakpastian.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lereng-catatan-terpilih.geojson'; anchor.click(); URL.revokeObjectURL(url);
  }
  function clearFilters() { setProvince(''); setFrom(''); setTo(''); setStatus(''); setQuery(''); setOffset(0); }
  function closeIncident() { setSelected(null); if (!mapView) requestAnimationFrame(() => detailTrigger.current?.focus({ preventScroll: true })); }
  const data = stats.data?.data;
  const latestSource = sources.data?.data.filter(source => source.last_success_at).sort((a, b) => b.last_success_at!.localeCompare(a.last_success_at!))[0];
  const searchControl = <LocationSearch value={search} onChange={value => { searchRequest.current++; setSearch(value); setSearchMessage(''); }} onSubmit={searchLocation} onPlaceSelect={choosePlace} onQuickSelect={handleQuickSelect} onPreview={isHome ? setPreviewProvince : undefined} error={searchMessage} compact={mapView} />;
  const filtersControl = <div className="filter-controls"><label>Provinsi<select aria-label="Pilih provinsi" value={province} onChange={event => selectProvince(event.target.value)}><option value="">Seluruh Indonesia</option>{[...new Set([...(regions.data?.data.map(region => provinceLabel(region.name)) || []), ...(data?.provinces.map(item => item.name) || [])])].sort().map(name => <option key={name}>{name}</option>)}</select></label><label>Dari tanggal<input type="date" aria-label="Tanggal awal" value={from} onChange={event => { setFrom(event.target.value); setOffset(0); }} /></label><label>Sampai tanggal<input type="date" aria-label="Tanggal akhir" aria-invalid={invalidDates} value={to} onChange={event => { setTo(event.target.value); setOffset(0); }} /></label><label>Jenis laporan<select aria-label="Status verifikasi" value={status} onChange={event => { setStatus(event.target.value); setOffset(0); }}><option value="">Semua laporan</option><option value="official">Sumber resmi</option><option value="media_reported">Laporan media</option><option value="unverified">Belum terverifikasi</option></select></label>{(province || from || to || status || query) && <Button variant="ghost" onClick={clearFilters}>Hapus filter</Button>}{invalidDates && <p role="alert" className="inline-message">Tanggal akhir tidak boleh lebih awal dari tanggal awal.</p>}</div>;
  const refresh = <Button variant="ghost" onClick={() => void queryClient.invalidateQueries()}><RefreshCw size={16} />Muat ulang</Button>;
  const map = <GeoMap incidents={incidents.data?.data || []} target={target} selectedPoint={point} onViewport={onViewport} onSelect={isHome ? (value, incident) => router.push(`/peta?lat=${value.lat}&lng=${value.lng}${incident ? '&incident=' + encodeURIComponent(incident.id) : ''}`) : onSelect} showIncidents={showIncidents} showBoundaries={showBoundaries} showSusceptibility={showSusceptibility} opacity={opacity} basemap={basemap} dark={dark} />;
  const riskInformation = <>
    {selectedPlace ? <><h3>{selectedPlace.name}</h3><p className="small muted">{selectedPlace.province}. Titik representatif untuk orientasi, bukan lokasi kejadian. Informasi di bawah berlaku di sekitar titik ini, bukan seluruh wilayah. <Link href="/geodata/place-metadata.json">Sumber batas referensi</Link>.</p></> : <DataState loading={location.isLoading} error={location.error}><h3>{location.data?.data.regions.map(region => provinceLabel(region.name)).join(', ') || 'Lokasi yang Anda pilih'}</h3></DataState>}
    {selectedPlace && <DataState loading={location.isLoading} error={location.error}>{null}</DataState>}
    {point && <p className="coordinates">{point.lat.toFixed(5)}° , {point.lng.toFixed(5)}°</p>}
    <SusceptibilityCard zones={location.data?.data.susceptibility} loading={location.isLoading} />
    <section className="context-section"><h3><CloudRain size={19} />Kondisi hujan & cuaca</h3><p>Prakiraan cuaca desa terdekat dari BMKG untuk membantu kewaspadaan saat hujan berdurasi lama.</p><DataState loading={forecast.isLoading} error={forecast.error} empty={!forecast.data?.data.length} emptyTitle="Belum ada prakiraan desa di sekitar" emptyText="Tidak ada prakiraan yang tersimpan dalam radius 50 km untuk pilihan ini.">{forecast.data?.data.slice(0, 1).map(item => <div className="nearby-weather" key={item.id}><strong>{item.location_name}</strong><p>{item.description} · {item.temperature != null ? `${item.temperature}°C · ` : ''}{date(item.valid_at, true)}</p><p className="small muted">Diterbitkan BMKG {date(item.issued_at, true)}.</p></div>)}</DataState><Link className="text-link" href="/lingkungan">Lihat informasi cuaca<ArrowRight size={15} /></Link></section>
    <section className="context-section"><h3><MapPin size={19} />Riwayat dalam jarak 50 km</h3><p className="small muted">Maksimal 10 catatan terdekat sesuai filter. Klik catatan untuk membaca detail laporan.</p><DataState loading={nearby.isLoading} error={nearby.error} empty={!nearby.data?.data.length} emptyTitle="Belum ada catatan di sekitar titik ini" emptyText="Tidak adanya catatan bukan berarti tidak pernah terjadi longsor.">{nearby.data?.data.map(incident => <button className="nearby-item" key={incident.id} onClick={() => selectIncident(incident)}><span><strong>{incident.title}</strong><small>{date(incident.occurred_at)} · {incident.verification_status === 'official' ? 'Sumber resmi' : 'Laporan media'}</small></span><ChevronRight size={17} /></button>)}</DataState></section>
    <details className="context-section"><summary>Sumber & waktu pembaruan</summary><p>Zona Kerawanan: PVMBG Badan Geologi Kementerian ESDM (ZKGT). Catatan kejadian: PVMBG, BNPB, dan NASA GLC. Batas wilayah: geoBoundaries (2017).</p><p>Impor berhasil terakhir: {date(latestSource?.last_success_at, true)}. Ini waktu pengambilan, bukan waktu kejadian.</p><Link className="text-link" href="/sumber-data">Periksa sumber<ArrowRight size={15} /></Link></details>
    <p className="small safety-note">Informasi ini bukan jaminan keselamatan. Ikuti arahan BPBD dan instansi berwenang.</p>
  </>;
  const analytics = <details className="analytics-disclosure"><summary>Ringkasan riwayat & data grafik</summary><p>Jumlah laporan dalam katalog sesuai filter, bukan ukuran bahaya atau seluruh kejadian Indonesia.</p>
    <DataState loading={stats.isLoading} error={stats.error} empty={!data?.total}>
      <div className="summary-numbers"><p><strong>{number(data?.total)}</strong>catatan</p><p><strong>{number(data?.fatalities)}</strong>meninggal dilaporkan</p><p><strong>{number(data?.provinces.length)}</strong>provinsi dalam catatan</p></div>
      <h3>Catatan per tahun</h3><div className="chart" role="img" aria-label="Jumlah catatan menurut tahun yang tersedia"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.years}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} /><Tooltip contentStyle={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} formatter={value => [value, 'Catatan']} /><Bar dataKey="count" fill="var(--accent)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      <p className="small muted">Hanya tahun dengan catatan ditampilkan; jarak kolom tidak menunjukkan selisih waktu.</p>
      <h3>Provinsi dengan catatan terbanyak</h3><div className="chart" role="img" aria-label="Perbandingan jumlah catatan delapan provinsi terbanyak"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.provinces.slice(0, 8)} layout="vertical"><CartesianGrid horizontal={false} stroke="var(--line)" /><XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} formatter={value => [value, 'Catatan']} /><Bar dataKey="count" fill="var(--accent)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      <div className="analytics-tables"><div><h3>Data tahunan</h3><table><thead><tr><th>Tahun</th><th>Catatan</th></tr></thead><tbody>{data?.years.map(item => <tr key={item.year}><td>{item.year}</td><td>{number(item.count)}</td></tr>)}</tbody></table></div><div><h3>Data seluruh provinsi</h3><table><thead><tr><th>Provinsi</th><th>Catatan</th></tr></thead><tbody>{data?.provinces.map(item => <tr key={item.name}><td>{item.name}</td><td>{number(item.count)}</td></tr>)}</tbody></table></div></div>
    </DataState></details>;

  return <div className={`public-site ${mapView ? 'map-site' : ''}`}><a href="#main" className="skip-link">Lewati navigasi</a><PublicNavbar view={view} dark={dark} onTheme={changeTheme} />
    <main id="main" className={mapView ? 'map-main' : 'public-main'}>
      {isHome && <>
        <section className="orientation-intro">
          <div><p className="orientation-kicker">Informasi longsor Indonesia</p><h1>Kenali lereng di sekitar Anda.</h1><p className="orientation-description">Cari lokasi untuk membaca kerentanan wilayah, riwayat longsor, dan cuaca beserta sumbernya.</p></div>
          <div><p className="orientation-search-label">Wilayah mana yang ingin Anda periksa?</p>{searchControl}</div>
        </section>
        <div className="orientation-index"><OrientationMap search={previewProvince || search} /></div>
        <div className="orientation-summary"><div role="status">{stats.isLoading ? <p>Sedang memuat jumlah catatan…</p> : stats.isError ? <p>Jumlah catatan belum dapat dimuat. {refresh}</p> : <p><strong>{number(data?.total)}</strong> catatan dalam katalog. Bukan seluruh kejadian Indonesia.</p>}</div><Link href="/sumber-data">Periksa sumber & cakupan</Link></div>
        <StartOptions />
        <section className="content-section orientation-records"><div className="section-heading"><div><h2>Catatan terbaru dalam katalog</h2><p>Tanggal kejadian menurut sumber, bukan peringatan yang sedang berlangsung.</p></div><Link className="text-link" href="/kejadian">Semua catatan</Link></div><DataState loading={latest.isLoading} error={latest.error} empty={!latest.data?.data.length}><div className="incident-grid">{latest.data?.data.map(incident => <IncidentCard key={incident.id} incident={incident} onSelect={selectIncident} compact />)}</div></DataState><ProvenanceNote />{selected && <div ref={detailAnchor} tabIndex={-1} className="detail-anchor"><IncidentDetails incident={selected} onClose={closeIncident} /></div>}{latest.isError && refresh}</section>
        <div className="orientation-explainer"><HowItWorks /></div><EducationalSection /><TrustedSources />
      </>}

      {mapView && <>
        <h1 className="sr-only">{active.name}</h1>
        <section className="map-stage" aria-label="Jelajahi peta longsor Indonesia">{map}
          <div className="map-search-overlay">
            {searchControl}
            <div className="map-quick-layers" role="group" aria-label="Lapisan cepat peta">
              <button type="button" className={`layer-pill ${showSusceptibility ? 'is-active' : ''}`} aria-pressed={showSusceptibility} onClick={() => setShowSusceptibility(v => !v)}>
                <Layers size={14} />Kerentanan
              </button>
              <button type="button" className={`layer-pill ${showIncidents ? 'is-active' : ''}`} aria-pressed={showIncidents} onClick={() => setShowIncidents(v => !v)}>
                <MapPin size={14} />Kejadian
              </button>
              <button type="button" className={`layer-pill ${basemap === 'topographic' ? 'is-active' : ''}`} aria-pressed={basemap === 'topographic'} onClick={() => changeBasemap(basemap === 'topographic' ? 'streets' : 'topographic')}>
                <Mountain size={14} />Topografi
              </button>
            </div>
          </div>
          <div className="map-settings-toggle"><Button ref={settingsButton} variant="outline" aria-expanded={settingsOpen} aria-controls="map-settings" onClick={() => setSettingsOpen(value => !value)}><Settings2 size={18} />Pengaturan Peta</Button></div>
          {settingsOpen && <section className="map-settings" id="map-settings" aria-label="Pengaturan peta"><div className="section-heading"><h2>Pengaturan Peta</h2><Button variant="ghost" size="icon" aria-label="Tutup pengaturan peta" onClick={() => { setSettingsOpen(false); settingsButton.current?.focus(); }}><X size={20} /></Button></div><fieldset className="layer-switcher"><legend>Informasi yang ditampilkan</legend><label><input type="checkbox" checked={showSusceptibility} onChange={event => setShowSusceptibility(event.target.checked)} /><span>Wilayah Rawan Longsor<small>Zona Kerentanan Gerakan Tanah PVMBG</small></span></label><label><input type="checkbox" checked={showIncidents} onChange={event => setShowIncidents(event.target.checked)} /><span>Riwayat Kejadian<small>PVMBG, BNPB & NASA GLC</small></span></label><label><input type="checkbox" checked={showBoundaries} onChange={event => setShowBoundaries(event.target.checked)} /><span>Batas Wilayah<small>Provinsi, referensi 2017</small></span></label><p><CloudRain size={18} />Curah Hujan<span>Pengamatan belum tersedia</span></p><Link className="text-link" href="/lingkungan">Lihat prakiraan cuaca BMKG<ArrowRight size={16} /></Link></fieldset><label className="control-label">Ketebalan warna penanda<input aria-label="Opasitas kejadian" type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label><label className="control-label">Peta dasar<select aria-label="Pilih peta dasar" value={basemap} onChange={event => changeBasemap(event.target.value)}><option value="streets">OpenStreetMap</option><option value="topographic">OpenTopoMap</option></select></label><details><summary>Saring riwayat kejadian</summary>{filtersControl}</details><div className="settings-actions">{refresh}<Button variant="outline" disabled={!incidents.data?.data.length || invalidDates} onClick={exportRecords}><Download size={16} />Ekspor GeoJSON</Button></div><p className="small muted">Ekspor hanya catatan dalam tampilan peta saat ini.</p><Link className="text-link" href="/pengaturan">Pengaturan tampilan<ChevronRight size={15} /></Link></section>}
          {(point || selected) && <LocationBottomSheet key={selected?.id || 'location'} title={selected ? 'Detail kejadian' : 'Informasi Longsor di Lokasi Ini'} onClose={() => { setSelected(null); setSelectedPlace(null); setPoint(null); setTarget(null); }}>{selected ? <><IncidentDetails incident={selected} onClose={() => setSelected(null)} />{riskInformation}</> : riskInformation}</LocationBottomSheet>}
          {linkedPlace.isError && <p className="map-error" role="alert">Wilayah dari tautan belum dapat dimuat. Cari kembali melalui kolom pencarian.</p>}
          {linkedPlace.data && !linkedPlace.data.data.length && <p className="map-error" role="status">Wilayah dari tautan tidak ditemukan. Cari kembali melalui kolom pencarian.</p>}
          {incidents.isError && <div className="map-error" role="alert">Riwayat belum bisa dimuat. {refresh}<Link href="/kejadian">Buka daftar kejadian</Link></div>}
          {linked.isError && <p className="map-error" role="alert">Detail tautan ini belum bisa dimuat. Coba pilih lokasi di peta.</p>}
        </section>
        <div className="map-below">
          <p className="map-instructions">Arahkan kursor ke titik untuk melihat ringkasan, klik untuk membaca detail. <Link href="/kejadian">Baca daftar tanpa peta</Link>.</p>
          <details className="map-availability">
            <summary>Kerentanan PVMBG, bukan prediksi</summary>
            <p>Pemetaan regional tidak menentukan kapan longsor terjadi. Pilih titik untuk memeriksa kelas, sumber, dan cakupan lokasi.</p>
            <Link href="/sumber-data" aria-label="Rincian sumber peta kerawanan">Rincian sumber</Link>
          </details>
          <section className="zkgt-guide-banner" aria-label="Panduan Zona Kerentanan Gerakan Tanah PVMBG">
            <div className="zkgt-guide-head">
              <div>
                <h2>Memahami Zona Kerentanan Gerakan Tanah (PVMBG)</h2>
                <p>Peta di atas menampilkan klasifikasi kerentanan gerakan tanah resmi dari Badan Geologi Kementerian ESDM (PVMBG). Pilih provinsi rawan berikut untuk langsung memeriksa petanya:</p>
              </div>
              <div className="zkgt-province-jumps">
                {['Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Sumatera Barat', 'Sulawesi Selatan', 'Banten'].map(prov => (
                  <button key={prov} type="button" className={`quick-chip ${province === prov ? 'is-selected' : ''}`} onClick={() => selectProvince(prov)}>
                    <MapPin size={13} />{prov}
                  </button>
                ))}
              </div>
            </div>
            <div className="zkgt-class-grid">
              <article className="zkgt-class-card zkgt-high">
                <span className="zkgt-dot" />
                <div>
                  <h3>Zona Kerentanan Tinggi</h3>
                  <p>Sering mengalami gerakan tanah lama maupun baru, terutama pada lereng terjal saat curah hujan tinggi.</p>
                </div>
              </article>
              <article className="zkgt-class-card zkgt-med">
                <span className="zkgt-dot" />
                <div>
                  <h3>Zona Kerentanan Menengah</h3>
                  <p>Dapat terjadi gerakan tanah terutama pada tebing jalan, gawir, lembah sungai, atau lereng yang terganggu.</p>
                </div>
              </article>
              <article className="zkgt-class-card zkgt-low">
                <span className="zkgt-dot" />
                <div>
                  <h3>Zona Kerentanan Rendah</h3>
                  <p>Jarang terjadi gerakan tanah bila lereng tidak mengalami gangguan dan kondisi drainase terjaga.</p>
                </div>
              </article>
              <article className="zkgt-class-card zkgt-vlow">
                <span className="zkgt-dot" />
                <div>
                  <h3>Zona Sangat Rendah</h3>
                  <p>Wilayah dataran atau lereng landai yang hampir tidak pernah mengalami gerakan tanah.</p>
                </div>
              </article>
            </div>
          </section>
          <ProvenanceNote />
          <p className="small muted">{incidents.isLoading ? 'Sedang memuat riwayat…' : incidents.isError ? 'Riwayat belum tersedia.' : `${number(incidents.data?.data.length)} catatan dalam tampilan`}{incidents.data?.meta.has_more ? '. Perbesar peta untuk melihat catatan lain.' : ''}</p>
          {analytics}
          <details><summary>Informasi koordinat peta</summary><p>Koordinat memakai WGS 84 (EPSG:4326). Titik kejadian mengikuti ketelitian katalog, bukan hasil pemeriksaan lapangan.</p></details>
        </div>
      </>}

      {!isHome && !mapView && <div className="page-container"><div className="page-heading"><div><h1>{active.name}</h1><p>{({ kejadian: 'Riwayat dalam katalog, beserta sumber dan ketelitian lokasinya.', lingkungan: 'Pahami prakiraan cuaca dan informasi lingkungan yang tersedia.', 'prediksi-ai': 'Memahami apa yang sedang dikembangkan, tanpa menganggapnya sebagai peringatan resmi.', 'sumber-data': 'Informasi yang berguna harus jelas asal dan keterbatasannya.', pengaturan: 'Buat tampilan LERENG lebih nyaman untuk Anda.', tentang: 'Membantu siapa pun mengenali wilayahnya dan memahami informasi longsor.' } as Record<string, string>)[view]}</p></div>{refresh}</div>
        {view === 'kejadian' && <>
          <div className="incident-tools"><label className="list-search"><Search size={20} /><input aria-label="Cari catatan kejadian" placeholder="Cari wilayah atau isi laporan" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); }} /></label><details className="filter-disclosure"><summary>Saring wilayah & tanggal</summary>{filtersControl}
          <div className="quick-filter-bar" aria-label="Filter cepat kejadian">
            <button type="button" className={`quick-chip ${!status && !province ? 'is-selected' : ''}`} onClick={clearFilters}>Semua ({number(data?.total)})</button>
            <button type="button" className={`quick-chip ${status === 'official' ? 'is-selected' : ''}`} onClick={() => { setStatus(status === 'official' ? '' : 'official'); setOffset(0); }}>Sumber Resmi PVMBG & BNPB</button>
            <button type="button" className={`quick-chip ${status === 'media_reported' ? 'is-selected' : ''}`} onClick={() => { setStatus(status === 'media_reported' ? '' : 'media_reported'); setOffset(0); }}>Laporan Media (NASA GLC)</button>
            {['Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Sumatera Barat', 'Sulawesi Selatan'].map(prov => (
              <button key={prov} type="button" className={`quick-chip ${province === prov ? 'is-selected' : ''}`} onClick={() => selectProvince(province === prov ? '' : prov)}>{prov}</button>
            ))}
          </div></details></div>
          <ProvenanceNote compact /><div className="results-heading"><p>{invalidDates ? 'Periksa rentang tanggal terlebih dahulu.' : incidentList.isLoading ? 'Sedang mencari catatan…' : incidentList.isError ? 'Catatan belum bisa dimuat.' : `${number(incidentList.data?.meta.total)} catatan sesuai pilihan`}</p><Button variant="outline" disabled={!incidentList.data?.data.length || invalidDates} onClick={exportRecords}><Download size={16} />Ekspor GeoJSON</Button></div><p className="small muted">Urutan berdasarkan tanggal kejadian terbaru dalam katalog. Ekspor mencakup halaman yang sedang dimuat.</p>
          {!invalidDates && <DataState loading={incidentList.isLoading} error={incidentList.error} empty={!incidentList.data?.data.length}><div className="incident-grid incident-results">{incidentList.data?.data.map(incident => <IncidentCard key={incident.id} incident={incident} onSelect={selectIncident} />)}</div></DataState>}
          <nav className="pagination" aria-label="Halaman riwayat"><Button variant="outline" disabled={offset === 0 || invalidDates} onClick={() => setOffset(value => Math.max(0, value - 25))}>Sebelumnya</Button><span>Halaman {Math.floor(offset / 25) + 1}</span><Button variant="outline" disabled={!incidentList.data?.meta.has_more || invalidDates || incidentList.isError} onClick={() => setOffset(value => value + 25)}>Berikutnya</Button></nav>
          {selected && <div ref={detailAnchor} tabIndex={-1} className="detail-anchor"><IncidentDetails incident={selected} onClose={closeIncident} /></div>}{analytics}
        </>}

        {view === 'lingkungan' && <>
          <div className="notice"><CloudRain size={25} /><div><h2>Prakiraan cuaca bukan pengamatan hujan</h2><p>BMKG menyediakan prakiraan untuk desa yang telah diambil datanya oleh LERENG. Hujan lebat tidak otomatis berarti longsor, namun pada wilayah dengan <strong>Zona Kerentanan Gerakan Tanah Menengah hingga Tinggi</strong>, hujan berdurasi panjang meningkatkan risiko gerakan tanah.</p></div></div><details className="filter-disclosure"><summary>Pilih wilayah & waktu</summary>{filtersControl}</details>
          <section className="content-section"><div className="section-heading"><h2>Prakiraan cuaca desa</h2><a className="text-link" href="https://data.bmkg.go.id/prakiraan-cuaca/" target="_blank" rel="noreferrer">Sumber BMKG<ExternalLink size={16} /></a></div><DataState loading={forecast.isLoading} error={forecast.error} empty={!forecast.data?.data.length} emptyTitle="Belum ada prakiraan yang sesuai" emptyText="Prakiraan tersimpan mungkin sudah melewati waktu berlaku, atau desa yang dipilih belum tercakup. Coba muat ulang atau buka BMKG."><div className="weather-grid">{forecast.data?.data.map(item => <article className="weather-card" key={item.id}><CloudRain size={25} /><h3>{item.location_name}</h3><time dateTime={item.valid_at}>{date(item.valid_at, true)}</time><strong className="weather-description">{item.description}</strong><p>{item.temperature == null ? 'Suhu belum diketahui' : `${item.temperature} °C`} · {item.humidity == null ? 'Kelembapan belum diketahui' : `Kelembapan ${item.humidity}%`}</p><details><summary>Waktu penerbitan & pengambilan</summary><p>Diterbitkan: {date(item.issued_at, true)}.</p><p>Diambil: {date(item.retrieved_at, true)}.</p></details></article>)}</div></DataState></section>
          <section className="content-section"><div className="section-heading"><h2>Peringatan cuaca yang masih berlaku</h2><DataStatus value="official" /></div><DataState loading={warnings.isLoading} error={warnings.error} empty={!warnings.data?.data.length} emptyTitle="Tidak ada peringatan aktif dalam data tersimpan" emptyText="Ini bukan jaminan tidak ada peringatan di wilayah Anda. Selalu periksa pembaruan BMKG.">{warnings.data?.data.map(item => <article className="warning-item" key={item.id}><h3>{item.title}</h3><p>{item.description}</p><p className="small muted">Berlaku sampai {date(item.expires_at, true)}. Diambil {date(item.retrieved_at, true)}.</p><a className="text-link" href={item.source_url} target="_blank" rel="noreferrer">Baca peringatan BMKG<ExternalLink size={16} /></a></article>)}</DataState></section><section className="notice"><Mountain size={26} /><div><h2>Bagaimana kondisi tanah dan lereng?</h2><p>Peta <strong>Zona Kerentanan Gerakan Tanah (ZKGT) PVMBG</strong> sudah dapat diperiksa pada halaman Peta. Untuk penilaian kemiringan lereng tapak secara rinci tetap diperlukan penyelidikan geoteknik lapangan.</p><Link className="text-link" href="/kerawanan">Buka Peta Zona Kerawanan PVMBG<ArrowRight size={16} /></Link></div></section>
        </>}

        {view === 'prediksi-ai' && <>
          <p className="ai-early-status"><Info size={19} /><span><strong>Prediksi AI belum tersedia.</strong> Model belum selesai dilatih dan divalidasi.</span></p>
          <div className="ai-intro"><div className="ai-intro-copy"><p className="large-copy">LERENG sedang mengembangkan teknologi kecerdasan buatan untuk membantu memperkirakan potensi longsor berdasarkan kondisi lingkungan dan data historis.</p><p>Tujuannya membantu memahami potensi kejadian, bukan menentukan bahwa longsor pasti terjadi atau menggantikan penilaian petugas.</p><Link className="button button-primary" href="/peta">Telusuri informasi yang sudah ada<ArrowRight size={17} /></Link></div><section className="ai-status-card"><BrainCircuit size={32} /><DataStatus value="not_ingested" /><h2>Prediksi AI Belum Tersedia</h2><p>Model belum selesai dilatih dan divalidasi. Karena itu, LERENG belum menampilkan skor, tingkat keyakinan, atau peta prediksi.</p><DataState loading={ai.isLoading} error={ai.error}>{ai.data && <p className="small muted">Status layanan: belum ada model tervalidasi.</p>}</DataState></section></div>
          <section className="content-section ai-explainer"><h2>Apa yang dimaksud prediksi AI?</h2><div className="reading-columns"><p>AI dapat mempelajari pola dalam data kejadian dan kondisi lingkungan. Hasilnya harus diuji dengan data lain sebelum dapat digunakan. Riwayat yang tidak lengkap juga dapat membuat perkiraan keliru.</p><p>Jika kelak tersedia, hasil perlu menjelaskan lokasi, periode perkiraan, kondisi pendukung, waktu pembaruan, dan keterbatasannya. Saat ini belum ada hasil prediksi yang bisa digunakan.</p></div></section><div className="notice"><ShieldCheck size={26} /><div><h2>Bukan peringatan resmi bencana</h2><p>Jangan menunggu hasil AI untuk mengikuti arahan keselamatan. Gunakan informasi dan instruksi dari BPBD, BNPB, serta instansi berwenang.</p></div></div>
          <details id="metodologi" className="methodology-disclosure"><summary>Pelajari metode & kesiapan penelitian</summary><div className="reading-columns"><section><h2>Data dan model belum memadai</h2><p>Belum ada artefak model, wilayah cakupan tervalidasi, kalibrasi probabilitas, maupun inferensi yang berhasil. Pengamatan hujan dan bukti wilayah tanpa kejadian belum memadai untuk pelatihan.</p><label className="control-label">Periode target penelitian<select aria-label="Horizon penelitian" value={horizon} onChange={event => setHorizon(Number(event.target.value))}><option value={24}>24 jam mendatang</option><option value={72}>72 jam mendatang</option></select></label><p>Pilihan {horizon} jam adalah konfigurasi target penelitian, bukan hasil prakiraan yang tersedia.</p></section><section><h2>Bagaimana model akan diperiksa?</h2><ul><li>Memisahkan wilayah dan waktu pengujian agar data masa depan tidak bocor ke pelatihan.</li><li>Membandingkan model sederhana dengan regresi logistik, Random Forest dan XGBoost.</li><li>Memeriksa precision, recall, F1, PR-AUC, ROC-AUC dan kalibrasi pada data terpisah.</li><li>Menilai bias pelaporan, ketidakpastian lokasi dan kinerja antarwilayah.</li></ul><p>Belum ada hasil evaluasi model LERENG pada data nyata.</p></section></div><Link className="text-link" href="/sumber-data">Periksa kesiapan sumber data<ArrowRight size={16} /></Link></details>
        </>}

        {view === 'sumber-data' && <>
          <div className="notice"><ShieldCheck size={27} /><div><h2>Kenali sumbernya, pahami batasnya</h2><p>Sumber resmi tidak sama dengan laporan media. Tersedianya satu sumber juga tidak berarti seluruh wilayah dan waktu sudah tercakup.</p><p>Impor berhasil terakhir: {date(latestSource?.last_success_at, true)}.</p></div></div>{sources.data?.meta.availability === 'unavailable' && <p role="status" className="inline-message">{sources.data.meta.message}</p>}<DataState loading={sources.isLoading} error={sources.error} empty={!sources.data?.data.length}><div className="source-registry">{sources.data?.data.map(source => <article className="source-row" key={source.id}><div className="section-heading"><h2>{source.name}</h2><DataStatus value={source.freshness || source.status} /></div><DataStatus value={source.kind} /><p>{source.limitations}</p>{source.freshness === 'stale' && <p className="stale-note">Data tersimpan melewati jadwal pembaruan. Periksa waktu pengambilan sebelum menggunakannya.</p>}<a className="text-link" href={source.url} target="_blank" rel="noreferrer">Buka sumber<ExternalLink size={16} /></a><details><summary>Izin penggunaan & waktu pembaruan</summary><dl className="detail-list"><div><dt>Izin penggunaan</dt><dd>{source.license}</dd></div><div><dt>Impor berhasil</dt><dd>{date(source.last_success_at, true)}</dd></div><div><dt>Jadwal pemeriksaan</dt><dd>{source.frequency_hours < 1 ? `${source.frequency_hours * 60} menit` : `${source.frequency_hours} jam`}</dd></div><div><dt>Pemeriksaan terakhir</dt><dd>{date(source.last_attempt_at, true)}</dd></div></dl>{source.error && <p className="source-error">Kendala akses: {source.error}</p>}</details></article>)}</div></DataState><section className="content-section"><h2>Rincian informasi peta</h2><p className="section-lead">Untuk pembaca yang ingin memeriksa cakupan, resolusi, dan metadata lebih lanjut.</p><DataState loading={layerMetadata.isLoading} error={layerMetadata.error} empty={!layerMetadata.data?.data.length}>{layerMetadata.data?.data.map(layer => <details className="layer-metadata" key={layer.id}><summary>{layer.name}<DataStatus value={layer.availability === 'available' ? 'available' : 'not_ingested'} /></summary><p>Sumber: {layer.source || 'Belum ditetapkan'}. Resolusi: {layer.resolution || 'Belum diketahui'}. Pembaruan: {date(layer.last_updated, true)}.</p><p>{layer.limitations}</p></details>)}</DataState></section>
        </>}

        {view === 'pengaturan' && <section className="settings-panel"><div className="setting-row"><div><h2>Tema tampilan</h2><p>Pilih tampilan yang nyaman. Preferensi disimpan di peramban ini.</p></div><Button variant="outline" onClick={changeTheme}>Gunakan tema {dark ? 'terang' : 'gelap'}</Button></div><div className="setting-row"><div><h2>Peta dasar</h2><p>Pilihan ini juga digunakan ketika Anda kembali ke peta.</p></div><select aria-label="Peta dasar pengaturan" value={basemap} onChange={event => changeBasemap(event.target.value)}><option value="streets">OpenStreetMap</option><option value="topographic">OpenTopoMap</option></select></div><div className="setting-row"><div><h2>Privasi lokasi</h2><p>LERENG hanya meminta izin lokasi ketika Anda menekan Lokasi saya. Lokasi tidak disimpan sebagai profil pengguna.</p></div><ShieldCheck size={26} /></div><details><summary>Konfigurasi teknis layanan</summary><p>Koneksi basis data dan layanan AI diatur oleh pengelola melalui variabel lingkungan. Pengaturan ini tidak dapat diubah lewat peramban.</p></details><Link className="button button-primary" href="/peta">Kembali ke peta<ArrowRight size={17} /></Link></section>}

        {view === 'tentang' && <><section className="about-intro"><p className="large-copy">Mengenali suatu tempat dimulai dari informasi yang bisa dipahami, bukan dari banyaknya angka di layar.</p><div><p>LERENG adalah situs informasi longsor Indonesia. Anda dapat memeriksa peta Zona Kerentanan Gerakan Tanah resmi PVMBG, menelusuri ribuan riwayat kejadian, melihat informasi lingkungan yang tersedia, dan mengetahui dari mana data berasal.</p><p>LERENG bukan layanan peringatan dini resmi. Prediksi AI belum tersedia. Data yang belum ada tidak diartikan sebagai kondisi aman.</p><Link className="button button-primary" href="/peta">Cek Lokasi di Peta<ArrowRight size={17} /></Link></div></section><HowItWorks /><section className="content-section distinctions"><h2>Tiga informasi yang berbeda</h2><dl><div><dt>Kerawanan wilayah (PVMBG)</dt><dd>Kondisi jangka panjang yang membuat lereng lebih rentan terhadap gerakan tanah (Tinggi, Menengah, Rendah, Sangat Rendah) berdasarkan peta Zona Kerentanan Gerakan Tanah PVMBG Badan Geologi ESDM.</dd></div><div><dt>Riwayat kejadian</dt><dd>Laporan tentang longsor yang telah terjadi dari penyelidikan PVMBG, catatan BNPB, dan katalog NASA GLC. Catatan dapat tidak lengkap dan titiknya dapat berupa perkiraan.</dd></div><div><dt>Prakiraan & peringatan cuaca</dt><dd>Informasi cuaca BMKG untuk waktu tertentu. Bukan prediksi atau peringatan longsor langsung di lokasi Anda.</dd></div></dl></section><EducationalSection /><TrustedSources /><section className="safety-section"><ShieldCheck size={30} /><div><h2>Utamakan arahan setempat</h2><p>Untuk keputusan keselamatan, ikuti BPBD dan instansi berwenang. Jangan memakai ketiadaan titik kejadian sebagai satu-satunya alasan untuk menyimpulkan suatu tempat aman.</p><a className="text-link" href="https://www.bnpb.go.id/" target="_blank" rel="noreferrer">Kunjungi BNPB<ExternalLink size={16} /></a></div></section></>}
      </div>}
    </main><PublicFooter />
  </div>;
}
