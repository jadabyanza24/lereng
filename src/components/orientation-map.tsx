import Link from 'next/link';
import provinces from '@/lib/overview.json';
import { provinceLabel } from '@/lib/presentation';

export function OrientationMap({ search }: { search: string }) {
  const match = provinces.find(province => provinceLabel(province.name).toLowerCase() === search.trim().toLowerCase());
  const selected = match;
  return <section className="orientation-map" aria-label="Peta indeks Indonesia">
    <div className="orientation-map-heading"><div><h2>Peta Longsor Indonesia</h2><p>Buka peta interaktif untuk memilih wilayah.</p></div><Link href="/peta">Buka peta interaktif</Link></div>
    <svg className="orientation-geography" viewBox="0 0 980 420" role="img" aria-label={selected ? `Indeks provinsi Indonesia. ${provinceLabel(selected.name)} ditandai sebagai pilihan, bukan kelas bahaya.` : 'Indeks provinsi Indonesia. Cari atau fokuskan pilihan cepat untuk menandai wilayah, bukan kelas bahaya.'}>
      {provinces.map(province => <path key={province.name} d={province.path} className={province === selected ? 'index-province is-selected' : 'index-province'} />)}
      {selected && <path key={selected.name} className="orientation-trace" pathLength={1} d={selected.path} />}
      <g className="island-labels"><text x="85" y="150">Sumatera</text><text x="400" y="135">Kalimantan</text><text x="575" y="175">Sulawesi</text><text x="835" y="160">Papua</text></g>
    </svg>
    <div className="orientation-map-foot"><p aria-live="polite">{selected && <span className="index-key" />}{selected ? `${provinceLabel(selected.name)}: pilihan, bukan kelas bahaya.` : 'Indeks orientasi, bukan peta kerentanan.'}</p><p>geoBoundaries · 34 provinsi, representasi 2017. Bukan batas hukum.</p></div>
  </section>;
}
