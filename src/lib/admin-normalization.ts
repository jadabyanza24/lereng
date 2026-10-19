import { normalizeProvince } from './presentation';

export interface CoordinateOverride {
 latitude: number;
 longitude: number;
}

export interface AdminOverride {
 province?: string;
 regency?: string;
 district?: string;
 village?: string;
 title?: string;
}

export const COORDINATE_OVERRIDES: Record<string, CoordinateOverride> = {
 'pvmbg-penyelidikan:169': { latitude: -7.30377778, longitude: 108.94272222 },
 'pvmbg-penyelidikan:56': { latitude: -6.841388, longitude: 107.98834 },
 'pvmbg-penyelidikan:59': { latitude: -6.94038889, longitude: 107.25666111 },
 'pvmbg-penyelidikan:240': { latitude: -0.59291667, longitude: 100.48538889 },
 'pvmbg-penyelidikan:2476': { latitude: 0.17369722, longitude: 99.96144167 },
 'pvmbg-penyelidikan:2477': { latitude: 0.17399167, longitude: 99.96175278 },
 'pvmbg-penyelidikan:2478': { latitude: 0.17511944, longitude: 99.96286111 },
 'pvmbg-penyelidikan:2479': { latitude: 0.18700833, longitude: 99.97627222 },
 'pvmbg-penyelidikan:2480': { latitude: 0.18748056, longitude: 99.97646389 },
 'pvmbg-penyelidikan:2481': { latitude: 0.1883, longitude: 99.97779722 },
 'pvmbg-penyelidikan:2482': { latitude: 0.18844722, longitude: 99.97779444 },
 'pvmbg-penyelidikan:2781': { latitude: -7.4475, longitude: 108.0678 },
 'pvmbg-tanggapan:fb81242c-a4b5-45f5-be43-d6f8bf1bf615': { latitude: -8.064377, longitude: 112.417316 },
 'pvmbg-tanggapan:d1e30adf-1167-490e-9602-0012dbe077c4': { latitude: -6.639134, longitude: 107.434646 },
 'pvmbg-tanggapan:9289c758-5b9a-436a-a594-62af86585622': { latitude: -6.615, longitude: 107.339 },
 'pvmbg-tanggapan:bde8b5a8-469a-4344-a042-7c1b3d1b9986': { latitude: -6.911375, longitude: 107.524483 },
 'pvmbg-tanggapan:0474938d-cb5b-4761-bb46-de2a599238a7': { latitude: 0.105, longitude: 100.045 },
 'pvmbg-magma:CRS20170915102231': { latitude: -1.179652, longitude: 116.851236 },
 'pvmbg-magma:CRS20170804154826': { latitude: -2.1420306, longitude: 121.5023 },
 'pvmbg-magma:CRS20210808085414': { latitude: -8.18259, longitude: 112.91917 },
 'pvmbg-magma:CRS20180525084705': { latitude: -7.40277778, longitude: 109.28166667 },
 'pvmbg-magma:CRS20200804163731': { latitude: -4.16, longitude: 137.08 },
 'pvmbg-magma:CRS20180525084121': { latitude: -2.18, longitude: 101.66722222 },
 'pvmbg-magma:CRS20200406124523': { latitude: -3.05795278, longitude: 119.87084444 },
};

export const ADMIN_OVERRIDES: Record<string, AdminOverride> = {
 'pvmbg-magma:CRS20210602103202': {
  province: 'Jawa Timur',
  regency: 'Kabupaten Bangkalan',
  district: 'Tanah Merah',
  village: 'Kendaban',
  title: 'Laporan Tanggapan Gerakan Tanah di Kendaban, Tanah Merah, Kabupaten Bangkalan, Jawa Timur',
 },
 'pvmbg-magma:CRS20210119200113': {
  province: 'Jawa Barat',
  regency: 'Kabupaten Bandung Barat',
  district: 'Cisarua',
  village: 'Tugumukti',
  title: 'Laporan Tanggapan Gerakan Tanah di Tugumukti, Cisarua, Kabupaten Bandung Barat, Jawa Barat',
 },
 'pvmbg-magma:CRS20191218135700': {
  province: 'Banten',
  regency: 'Kabupaten Pandeglang',
  district: 'Cimanggu',
  village: 'Batuhideung',
  title: 'Laporan Tanggapan Gerakan Tanah di Batuhideung, Cimanggu, Kabupaten Pandeglang, Banten',
 },
 'pvmbg-magma:CRS20200519112409': {
  province: 'Jawa Timur',
  regency: 'Kota Surabaya',
  district: 'Sukolilo',
  village: 'Semolowaru',
  title: 'Laporan Tanggapan Gerakan Tanah di Semolowaru, Sukolilo, Kota Surabaya, Jawa Timur',
 },
 'pvmbg-magma:CRS20210124051952': {
  province: 'Sulawesi Utara',
  regency: 'Kota Manado',
  district: 'Sario',
  village: 'Ranotana',
 },
 'pvmbg-tanggapan:0474938d-cb5b-4761-bb46-de2a599238a7': {
  province: 'Sumatera Barat',
  regency: 'Kabupaten Pasaman',
  district: 'Tigo Nagari',
  village: 'Malampah',
  title: 'Tanggapan Bencana Gerakan Tanah / Tanah Longsor di Kecamatan Tigo Nagari, Kabupaten Pasaman, Sumatera Barat',
 },
};

const TRUNCATED_REGENCY_MAP: Record<string, string> = {
 bandu: 'Kabupaten Bandung',
 bandun: 'Kabupaten Bandung',
 'bandung b': 'Kabupaten Bandung Barat',
 'bandung ba': 'Kabupaten Bandung Barat',
 'bandung bar': 'Kabupaten Bandung Barat',
 banj: 'Kabupaten Banjarnegara',
 banjar: 'Kabupaten Banjarnegara',
 banjarn: 'Kabupaten Banjarnegara',
 banjarne: 'Kabupaten Banjarnegara',
 'banjarnegara jawa tengah': 'Kabupaten Banjarnegara',
 bany: 'Kabupaten Banyumas',
 banyu: 'Kabupaten Banyumas',
 banyum: 'Kabupaten Banyumas',
 bo: 'Kabupaten Bogor',
 bog: 'Kabupaten Bogor',
 bogo: 'Kabupaten Bogor',
 'bogor j': 'Kabupaten Bogor',
 'bogor jaw': 'Kabupaten Bogor',
 'bogor jawa': 'Kabupaten Bogor',
 'brebes jawa tengah': 'Kabupaten Brebes',
 'cianjur. j': 'Kabupaten Cianjur',
 'cianjur jawa ba': 'Kabupaten Cianjur',
 'dairi pr': 'Kabupaten Dairi',
 garu: 'Kabupaten Garut',
 'garut ja': 'Kabupaten Garut',
 kebu: 'Kabupaten Kebumen',
 kebume: 'Kabupaten Kebumen',
 'kebumen j': 'Kabupaten Kebumen',
 'kebumen. ja': 'Kabupaten Kebumen',
 'kebumen jaw': 'Kabupaten Kebumen',
 kun: 'Kabupaten Kuningan',
 maj: 'Kabupaten Majalengka',
 'maluku t': 'Kabupaten Maluku Tengah',
 mandi: 'Kabupaten Mandailing Natal',
 'manggarai.ntt': 'Kabupaten Manggarai',
 nganj: 'Kabupaten Nganjuk',
 'nganjuk jawa timur': 'Kabupaten Nganjuk',
 pandegla: 'Kabupaten Pandeglang',
 'pasaman ba': 'Kabupaten Pasaman Barat',
 'pasuruan jaw': 'Kabupaten Pasuruan',
 pu: 'Kabupaten Purbalingga',
 purbaling: 'Kabupaten Purbalingga',
 'purbalingga jawa tengah': 'Kabupaten Purbalingga',
 purwa: 'Kabupaten Purwakarta',
 se: 'Kabupaten Seram Bagian Barat',
 suban: 'Kabupaten Subang',
 sukab: 'Kabupaten Sukabumi',
 sukabu: 'Kabupaten Sukabumi',
 'sukabumi jabar': 'Kabupaten Sukabumi',
 sum: 'Kabupaten Sumedang',
 sumed: 'Kabupaten Sumedang',
 sumedan: 'Kabupaten Sumedang',
 'tana toraja sulsel april 2024': 'Kabupaten Tana Toraja',
 'kab. toraja': 'Kabupaten Tana Toraja',
 'kabupaten toraja': 'Kabupaten Tana Toraja',
 tasikamalaya: 'Kabupaten Tasikmalaya',
 tasikm: 'Kabupaten Tasikmalaya',
 w: 'Kabupaten Wonosobo',
 wo: 'Kabupaten Wonosobo',
 'kabupaten pasaman sumatera barat': 'Kabupaten Pasaman',
};

const ADM2_NAME_FIXES: Record<string, string> = {
 'karang asem': 'Kabupaten Karangasem',
 karangasem: 'Kabupaten Karangasem',
 'toba samosir': 'Kabupaten Toba',
 'mamuju utara': 'Kabupaten Pasangkayu',
 'maluku tenggara barat': 'Kabupaten Kepulauan Tanimbar',
 'kota sawah lunto': 'Kota Sawahlunto',
 'kota banjar baru': 'Kota Banjarbaru',
 'kota pangkal pinang': 'Kota Pangkalpinang',
 'kota tanjung pinang': 'Kota Tanjungpinang',
 'kota tanjung balai': 'Kota Tanjungbalai',
 'kota pematang siantar': 'Kota Pematangsiantar',
 tulangbawang: 'Kabupaten Tulang Bawang',
 'labuhan batu': 'Kabupaten Labuhanbatu',
 'labuhan batu selatan': 'Kabupaten Labuhanbatu Selatan',
 'labuhan batu utara': 'Kabupaten Labuhanbatu Utara',
 'banyu asin': 'Kabupaten Banyuasin',
 'pangkajene dan kepulauan': 'Kabupaten Pangkajene dan Kepulauan',
 'tojo una-una': 'Kabupaten Tojo Una-Una',
 'toli-toli': 'Kabupaten Tolitoli',
 'siau tagulandang biaro': 'Kabupaten Kepulauan Siau Tagulandang Biaro',
 'gunung kidul': 'Kabupaten Gunungkidul',
 gunungkidul: 'Kabupaten Gunungkidul',
 'kota baru': 'Kabupaten Kotabaru',
 'waduk cirata': 'Kabupaten Cianjur',
 'wadung kedungombo': 'Kabupaten Sragen',
 'danau toba': 'Kabupaten Samosir',
 hutan: 'Kabupaten Jepara',
 danau: 'Kabupaten Ogan Komering Ulu Selatan',
};

const TRUNCATED_DISTRICT_MAP: Record<string, string> = {
 b: 'Banjarmangu',
 bad: 'Badegan',
 banjarm: 'Banjarmangu',
 banjarwa: 'Banjarwangi',
 'bantargadung dan kec. g': 'Bantargadung',
 'baregbeg ciamis jabar': 'Baregbeg',
 'bojongmangu bekasi jabar': 'Bojongmangu',
 buniaji: 'Bumiaji',
 camp: 'Campaka',
 'campaka cianjur': 'Campaka',
 'campakamulya k': 'Campakamulya',
 ci: 'Cimenyan',
 'cibadak sukabumi': 'Cibadak',
 'cibadak kab. sukabumi': 'Cibadak',
 'cihaurbeuti ciamis jabar': 'Cihaurbeuti',
 cikalon: 'Cikalongwetan',
 '-edit': 'Cisewu',
 geger: 'Gegerbitung',
 'gunung t': 'Gunungtanjung',
 ka: 'Kabandungan',
 kaban: 'Kabandungan',
 'kadipaten tasikma': 'Kadipaten',
 karangkoba: 'Karangkobar',
 'karangpucung cilac': 'Karangpucung',
 kasomala: 'Kasomalang',
 kut: 'Kutawaringin',
 leuwi: 'Leuwiliang',
 'likupang selatan minut': 'Likupang Selatan',
 manyara: 'Manyaran',
 masam: 'Masamba',
 na: 'Naringgul',
 'ngargoyoso dan jenawi ka': 'Ngargoyoso dan Jenawi',
 nyalind: 'Nyalindung',
 nyalindu: 'Nyalindung',
 nyailindung: 'Nyalindung',
 p: 'Pejawaran',
 'pagelaran ci': 'Pagelaran',
 paguyan: 'Paguyangan',
 'pandanarum banjarnegara': 'Pandanarum',
 'pandanarum banjarnegara jateng': 'Pandanarum',
 parungk: 'Parungkuda',
 pasirwan: 'Pasirwangi',
 pejawara: 'Pejawaran',
 'pintu pohan meranti kab': 'Pintu Pohan Meranti',
 'pitu riase kab.': 'Pitu Riase',
 pondo: 'Pondoksalam',
 pu: 'Punggelan',
 s: 'Sentani Barat',
 'sadananya ciamis jabar': 'Sadananya',
 'siborongborong k': 'Siborongborong',
 'sirampog brebes jateng': 'Sirampog',
 siri: 'Sirimau',
 'sruweng kabupten kebumen': 'Sruweng',
 'sukajaya bogor': 'Sukajaya',
 sukaman: 'Sukamantri',
 'sukaresmi cianjur': 'Sukaresmi',
 sukohar: 'Sukoharjo',
 'sumbang banyumas': 'Sumbang',
 ta: 'Tanjungjaya',
 tegalwar: 'Tegalwaru',
 warung: 'Warungkiara',
 'x koto s': 'X Koto Singkarak',
 'cangkuang kab. bandung': 'Cangkuang',
 'pagentan kab. banjarnegara jawa tengah': 'Pagentan',
 pagetan: 'Pagentan',
 'pasanggaran kec. songgon kab. banyuwangi': 'Songgon',
 'cigudeg kab. bogor': 'Cigudeg',
 'naggung kab. bogor': 'Nanggung',
 'cikakak kab. sukabumi jabar': 'Cikakak',
 'makale kab. tana toraja sulsel april 2024': 'Makale',
 cilongaok: 'Cilongok',
 'pasir kuda': 'Pasirkuda',
 bungbulan: 'Bungbulang',
 cismopet: 'Cisompet',
 peundey: 'Peundeuy',
 'terogong kaler': 'Tarogong Kaler',
 karangayam: 'Karanggayam',
 pelabuhanratu: 'Palabuhanratu',
 'pelabuhan ratu': 'Palabuhanratu',
 'kali bwang': 'Kalibawang',
 'wadas lintang': 'Wadaslintang',
};

const AMBIGUOUS_REGENCY_PREFIXES = new Set(['b', 'ba', 'ban', 'k', 's', 'su']);

function toTitleCaseWords(text: string): string {
 const smallWords = new Set(['dan', 'di', 'ke', 'dari']);
 const romanOrAcronym = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'DKI', 'DI', 'NAD', 'NTB', 'NTT', 'OKU', 'OKUS', 'OKUT', 'OKI', 'BMR', 'KBB', 'TTS', 'TTU']);
 return text
  .trim()
  .replace(/\s+/g, ' ')
  .split(' ')
  .map((word, index) => {
   const upper = word.toUpperCase();
   if (romanOrAcronym.has(upper)) return upper;
   const lower = word.toLowerCase();
   if (index > 0 && smallWords.has(lower)) return lower;
   return lower.replace(/(^|[-'.(])([a-z])/g, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
  })
  .join(' ');
}

export function formatAdm2AsRegency(adm2Name: string | null | undefined): string | null {
 if (!adm2Name) return null;
 const cleaned = adm2Name.trim().replace(/\s+/g, ' ');
 if (!cleaned) return null;
 const lower = cleaned.toLowerCase();
 if (ADM2_NAME_FIXES[lower]) return ADM2_NAME_FIXES[lower];
 if (/^kota\b/i.test(cleaned)) {
  const rest = cleaned.replace(/^kota\s+(?:adm\.?\s*)?/i, '');
  return `Kota ${toTitleCaseWords(rest)}`;
 }
 if (/^kab(?:upaten|\.)?\b/i.test(cleaned)) {
  const rest = cleaned.replace(/^kab(?:upaten|\.)?\s+/i, '');
  const fixed = ADM2_NAME_FIXES[rest.toLowerCase()];
  if (fixed) return fixed;
  return `Kabupaten ${toTitleCaseWords(rest)}`;
 }
 return `Kabupaten ${toTitleCaseWords(cleaned)}`;
}

export function normalizeRegencyName(
 rawRegency: string | null | undefined,
 spatialAdm2?: string | null
): string | null {
 const spatialFormatted = formatAdm2AsRegency(spatialAdm2);
 if (!rawRegency || !rawRegency.trim()) {
  return spatialFormatted;
 }
 const cleaned = rawRegency
  .trim()
  .replace(/\s+/g, ' ')
  .replace(/^kab(?:upaten|\.)?\s+kab(?:upaten|\.)?\s+/i, 'Kabupaten ');
 const lower = cleaned.toLowerCase();

 if (AMBIGUOUS_REGENCY_PREFIXES.has(lower)) {
  if (spatialFormatted) return spatialFormatted;
  if (lower === 'ba') return 'Kabupaten Banjarnegara';
  if (lower === 'ban' || lower === 'b') return 'Kabupaten Bandung';
  if (lower === 'k') return 'Kabupaten Kuningan';
  if (lower === 's' || lower === 'su') return 'Kabupaten Sumedang';
 }

 if (TRUNCATED_REGENCY_MAP[lower]) {
  // Note: In West Java, some 'Bandung' records actually lie in Kabupaten Bandung Barat
  if (lower === 'bandung' && spatialFormatted === 'Kabupaten Bandung Barat') {
   return 'Kabupaten Bandung Barat';
  }
  return TRUNCATED_REGENCY_MAP[lower];
 }

 if (lower === 'bandung' && spatialFormatted === 'Kabupaten Bandung Barat') {
  return 'Kabupaten Bandung Barat';
 }

 if (ADM2_NAME_FIXES[lower]) {
  return ADM2_NAME_FIXES[lower];
 }

 // Strip trailing province suffixes like "Kabupaten Pasaman Sumatera Barat"
 const strippedProv = cleaned.replace(/\s+(?:Provinsi\s+)?(?:Jawa\s+Barat|Jawa\s+Tengah|Jawa\s+Timur|Sumatera\s+Barat|Sumatera\s+Utara|Sulawesi\s+Selatan|Nusa\s+Tenggara\s+Timur|Banten)$/i, '').trim();
 const strippedLower = strippedProv.toLowerCase();
 if (TRUNCATED_REGENCY_MAP[strippedLower]) {
  return TRUNCATED_REGENCY_MAP[strippedLower];
 }

 if (/^kab(?:upaten|\.)?\b/i.test(strippedProv)) {
  const rest = strippedProv.replace(/^kab(?:upaten|\.)?\s+/i, '').trim();
  if (!rest) return spatialFormatted;
  const restLower = rest.toLowerCase();
  if (TRUNCATED_REGENCY_MAP[restLower]) return TRUNCATED_REGENCY_MAP[restLower];
  if (ADM2_NAME_FIXES[restLower]) return ADM2_NAME_FIXES[restLower];
  return `Kabupaten ${toTitleCaseWords(rest)}`;
 }

 if (/^kota\b/i.test(strippedProv)) {
  const rest = strippedProv.replace(/^kota\s+(?:adm\.?\s+|administrasi\s+)?/i, '').trim();
  if (!rest) return spatialFormatted;
  const fullLower = `kota ${rest.toLowerCase()}`;
  if (ADM2_NAME_FIXES[fullLower]) return ADM2_NAME_FIXES[fullLower];
  return `Kota ${toTitleCaseWords(rest)}`;
 }

 return `Kabupaten ${toTitleCaseWords(strippedProv)}`;
}

export function normalizeDistrictName(rawDistrict: string | null | undefined): string | null {
 if (!rawDistrict) return null;
 const cleaned = rawDistrict
  .trim()
  .replace(/\s+/g, ' ')
  .replace(/^(?:kecamatan|kec\.?|distrik)\s+/i, '')
  .trim();
 if (!cleaned || cleaned === '-') return null;
 const lower = cleaned.toLowerCase();
 if (TRUNCATED_DISTRICT_MAP[lower]) {
  return TRUNCATED_DISTRICT_MAP[lower];
 }
 // Remove trailing "Kab. ..." or province fragments if accidentally included in district field
 const withoutKab = cleaned
  .replace(/\s+(?:kab(?:upaten|\.)?|kota)\s+.*$/i, '')
  .replace(/\s+(?:jabar|jateng|jatim|sulsel|minut|ntt)$/i, '')
  .trim();
 const withoutKabLower = withoutKab.toLowerCase();
 if (TRUNCATED_DISTRICT_MAP[withoutKabLower]) {
  return TRUNCATED_DISTRICT_MAP[withoutKabLower];
 }
 return toTitleCaseWords(withoutKab || cleaned);
}

export function normalizeVillageName(
 rawVillage: string | null | undefined,
 rawDesaFromPenyelidikan?: string | null,
 rawDistrictField?: string | null
): string | null {
 // Special case where district field had "Pasanggaran Kec. Songgon Kab. Banyuwangi"
 if (rawDistrictField && /^pasanggaran\s+kec\.\s*songgon/i.test(rawDistrictField.trim())) {
  return 'Pasanggaran';
 }
 const cleanPart = (val: string | null | undefined) => {
  if (!val) return null;
  const c = val.trim().replace(/\s+/g, ' ');
  if (!c || c === '-') return null;
  if (/^[a-z\s.'-]+$/i.test(c) && (c === c.toUpperCase() || c === c.toLowerCase())) {
   return toTitleCaseWords(c);
  }
  return c;
 };

 const desa = cleanPart(rawDesaFromPenyelidikan);
 const dusunOrVil = cleanPart(rawVillage);

 if (desa && dusunOrVil) {
  const desaLower = desa.toLowerCase();
  const dusunLower = dusunOrVil.toLowerCase();
  if (desaLower === dusunLower || desaLower.includes(dusunLower)) return desa;
  if (dusunLower.includes(desaLower)) return dusunOrVil;
  return `${desa} (${dusunOrVil})`;
 }
 return desa || dusunOrVil || null;
}

export function parseMagmaAdminFromTitle(title: string, firstPara: string) {
 // Standard MAGMA title format: "Laporan Tanggapan Gerakan Tanah di <Village>, <District>, <Regency>, <Province>"
 const m = /^Laporan\s+Tanggapan\s+Gerakan\s+Tanah\s+di\s+([^,]+),\s*([^,]+),\s*([^,]+),\s*(.+)$/i.exec(title.trim());
 if (m) {
  const village = normalizeVillageName(m[1]);
  const district = normalizeDistrictName(m[2]);
  const regency = normalizeRegencyName(m[3]);
  const province = normalizeProvince(m[4].trim()) || normalizeProvince(title) || normalizeProvince(firstPara);
  return { province, regency, district, village };
 }
 // Fallback regex extraction
 const combined = `${title} . ${firstPara.slice(0, 1200)}`;
 const provMatch = /\bProvinsi\s+([A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:pada|yang|dengan|secara|berdasarkan))/i.exec(combined);
 const regMatch = /\b((?:Kabupaten|Kab\.|Kota)\s+[A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:Provinsi|pada|yang))/i.exec(combined);
 const distMatch = /\b(?:Kecamatan|Kec\.|Distrik)\s+([A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:Kabupaten|Kab\.|Kota|Provinsi))/i.exec(combined);
 const vilMatch = /\b(?:Desa|Kelurahan|Nagari|Kampung|Gampong|Pekon|Lembang)\s+([A-Za-z .'-]{3,35}?)(?=[,.;()\n]|$|\s+(?:Kecamatan|Kec\.|Distrik|Kabupaten))/i.exec(combined);
 return {
  province: normalizeProvince(provMatch?.[1] || title),
  regency: normalizeRegencyName(regMatch?.[1]),
  district: normalizeDistrictName(distMatch?.[1]),
  village: normalizeVillageName(vilMatch?.[1]),
 };
}

export function formatPenyelidikanTitleAndDescription(params: {
 eventTypeRaw: string | null | undefined;
 landslideTypeRaw: string | null | undefined;
 investigationYear: string | null | undefined;
 docId: string | null | undefined;
 village: string | null;
 district: string | null;
 regency: string | null;
 province: string | null;
}): { title: string; description: string } {
 const evClean = (params.eventTypeRaw || '').trim();
 let eventPrefix = 'Penyelidikan gerakan tanah PVMBG';
 let eventDescLabel = 'Gerakan Tanah';
 if (/^pasca$/i.test(evClean)) {
  eventPrefix = 'Penyelidikan pascabencana gerakan tanah PVMBG';
  eventDescLabel = 'Pascabencana Gerakan Tanah';
 } else if (/^td$/i.test(evClean)) {
  eventPrefix = 'Penyelidikan tanggap darurat gerakan tanah PVMBG';
  eventDescLabel = 'Tanggap Darurat Gerakan Tanah';
 } else if (/^tanggapan$/i.test(evClean)) {
  eventPrefix = 'Penyelidikan tanggapan gerakan tanah PVMBG';
  eventDescLabel = 'Tanggapan Gerakan Tanah';
 } else if (evClean) {
  eventDescLabel = evClean;
 }

 const shortVillage = params.village ? params.village.replace(/\s*\([^)]*\)\s*$/, '').trim() : null;
 const titleParts = [shortVillage, params.district, params.regency, params.province].filter(Boolean);
 const fallbackParts = [params.regency, params.province].filter(Boolean);
 const titleLocation = (titleParts.length >= 2 ? titleParts : fallbackParts).join(', ') || 'Indonesia';
 const title = `${eventPrefix} · ${titleLocation}`;

 const fullLocationParts = [
  params.village ? `Desa/Kelurahan ${params.village}` : null,
  params.district ? `Kecamatan ${params.district}` : null,
  params.regency,
  params.province ? `Provinsi ${params.province}` : null,
 ].filter(Boolean);
 const locationLabel = fullLocationParts.length ? fullLocationParts.join(', ') : 'Indonesia';

 const landslideType = params.landslideTypeRaw?.trim().replace(/Longsorang/gi, 'Longsoran') || null;
 const descParts = [
  `Catatan penyelidikan lapangan PVMBG (${eventDescLabel}) di ${locationLabel}.`,
  landslideType ? `Jenis gerakan tanah: ${landslideType}.` : null,
  params.investigationYear ? `Tahun penyelidikan: ${params.investigationYear}.` : null,
  params.docId ? `Dokumen referensi PVMBG: ${params.docId}.` : null,
 ].filter(Boolean);

 return {
  title,
  description: descParts.join(' '),
 };
}

export function isNonIncidentPenyelidikan(landslideType: string | null | undefined, village: string | null | undefined): boolean {
 const combined = `${landslideType || ''} ${village || ''}`;
 return /calon\s+lahan\s+relokasi|calon\s+lahan\s+sekolah\s+rakyat/i.test(combined);
}
