const provinceNames: Record<string, string> = {
  'Bangka-Belitung Islands': 'Kepulauan Bangka Belitung',
  'Bangka Belitung': 'Kepulauan Bangka Belitung',
  'Kep. Bangka Belitung': 'Kepulauan Bangka Belitung',
  'Central Java': 'Jawa Tengah', 'Central Kalimantan': 'Kalimantan Tengah', 'Central Sulawesi': 'Sulawesi Tengah',
  'East Java': 'Jawa Timur', 'East Kalimantan': 'Kalimantan Timur', 'East Nusa Tenggara': 'Nusa Tenggara Timur',
  'Jakarta Special Capital Region': 'Jakarta Raya', 'DKI Jakarta': 'Jakarta Raya', 'D.K.I. Jakarta': 'Jakarta Raya', 'Jakarta': 'Jakarta Raya',
  'North Kalimantan': 'Kalimantan Utara', 'North Maluku': 'Maluku Utara',
  'North Sulawesi': 'Sulawesi Utara', 'North Sumatra': 'Sumatera Utara', 'Sumatra Utara': 'Sumatera Utara',
  'Riau Islands': 'Kepulauan Riau', 'Kep. Riau': 'Kepulauan Riau',
  'South Kalimantan': 'Kalimantan Selatan', 'South Sulawesi': 'Sulawesi Selatan', 'South Sumatra': 'Sumatera Selatan', 'Sumatra Selatan': 'Sumatera Selatan',
  'Southeast Sulawesi': 'Sulawesi Tenggara',
  'Special Region of Yogyakarta': 'Daerah Istimewa Yogyakarta', 'DI Yogyakarta': 'Daerah Istimewa Yogyakarta', 'D.I. Yogyakarta': 'Daerah Istimewa Yogyakarta', 'D.I Yogyakarta': 'Daerah Istimewa Yogyakarta', 'Yogyakarta': 'Daerah Istimewa Yogyakarta',
  'West Java': 'Jawa Barat', 'West Kalimantan': 'Kalimantan Barat', 'West Nusa Tenggara': 'Nusa Tenggara Barat',
  'West Papua': 'Papua Barat', 'Papua Barat Daya': 'Papua Barat',
  'West Sulawesi': 'Sulawesi Barat', 'West Sumatra': 'Sumatera Barat', 'Sumatra Barat': 'Sumatera Barat',
  'Nanggroe Aceh Darussalam': 'Aceh', 'NAD': 'Aceh', 'Daerah Istimewa Aceh': 'Aceh',
  'NTB': 'Nusa Tenggara Barat', 'NTT': 'Nusa Tenggara Timur',
  'Papua Pegunungan': 'Papua', 'Papua Tengah': 'Papua', 'Papua Selatan': 'Papua',
};

export const provinceLabel = (name: string) => provinceNames[name] || name;

const canonicalProvinces = [
  'Aceh', 'Bali', 'Banten', 'Bengkulu', 'Daerah Istimewa Yogyakarta', 'Gorontalo', 'Jakarta Raya', 'Jambi',
  'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah',
  'Kalimantan Timur', 'Kalimantan Utara', 'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung', 'Maluku',
  'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Papua Barat', 'Riau',
  'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara',
  'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara',
];

export function normalizeProvince(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.replace(/^(?:Provinsi|Prov\.?)\s+/i, '').replace(/\s+/g, ' ').trim();
  if (!cleaned || /^(?:unknown|tidak diketahui|-|indonesia)$/i.test(cleaned)) return null;
  if (provinceNames[cleaned]) return provinceNames[cleaned];
  for (const [key, target] of Object.entries(provinceNames)) {
    if (key.toLowerCase() === cleaned.toLowerCase()) return target;
  }
  for (const canonical of canonicalProvinces) {
    if (canonical.toLowerCase() === cleaned.toLowerCase()) return canonical;
  }
  for (const [key, target] of Object.entries(provinceNames).sort((a, b) => b[0].length - a[0].length)) {
    if (cleaned.toLowerCase().includes(key.toLowerCase())) return target;
  }
  for (const canonical of [...canonicalProvinces].sort((a, b) => b.length - a.length)) {
    if (cleaned.toLowerCase().includes(canonical.toLowerCase())) return canonical;
  }
  return null;
}

export function precisionLabel(value: string) {
  return value.replace(/exact/gi, 'disebut tepat oleh sumber, belum diverifikasi di lapangan').replace(/unknown/gi, 'belum diketahui').replace(/(\d)km\b/g, '$1 km');
}
