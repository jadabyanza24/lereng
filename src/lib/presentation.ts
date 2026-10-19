const provinceNames: Record<string, string> = {
  'Bangka-Belitung Islands': 'Kepulauan Bangka Belitung',
  'Central Java': 'Jawa Tengah', 'Central Kalimantan': 'Kalimantan Tengah', 'Central Sulawesi': 'Sulawesi Tengah',
  'East Java': 'Jawa Timur', 'East Kalimantan': 'Kalimantan Timur', 'East Nusa Tenggara': 'Nusa Tenggara Timur',
  'Jakarta Special Capital Region': 'Jakarta Raya', 'North Kalimantan': 'Kalimantan Utara', 'North Maluku': 'Maluku Utara',
  'North Sulawesi': 'Sulawesi Utara', 'North Sumatra': 'Sumatera Utara', 'Riau Islands': 'Kepulauan Riau',
  'South Kalimantan': 'Kalimantan Selatan', 'South Sulawesi': 'Sulawesi Selatan', 'South Sumatra': 'Sumatera Selatan',
  'Southeast Sulawesi': 'Sulawesi Tenggara', 'Special Region of Yogyakarta': 'Daerah Istimewa Yogyakarta',
  'West Java': 'Jawa Barat', 'West Kalimantan': 'Kalimantan Barat', 'West Nusa Tenggara': 'Nusa Tenggara Barat',
  'West Papua': 'Papua Barat', 'West Sulawesi': 'Sulawesi Barat', 'West Sumatra': 'Sumatera Barat',
};

export const provinceLabel = (name: string) => provinceNames[name] || name;
export function precisionLabel(value: string) {
  return value.replace(/exact/gi, 'disebut tepat oleh sumber, belum diverifikasi di lapangan').replace(/unknown/gi, 'belum diketahui').replace(/(\d)km\b/g, '$1 km');
}
