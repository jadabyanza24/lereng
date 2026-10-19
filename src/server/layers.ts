export const layers = [
 {id:'susceptibility',name:'Kerentanan gerakan tanah resmi',source:'pvmbg',kind:'official',resolution:null,availability:'unavailable',legend:[],limitations:'Belum ada peta berlisensi yang diimpor. Klasifikasi sumber tidak boleh diganti dengan skor rekaan.'},
 {id:'historical',name:'Catatan kejadian historis',source:'nasa-glc',kind:'media_reported',resolution:'Bervariasi, ketelitian per catatan',availability:'database',legend:[{label:'Laporan media, lokasi perkiraan',color:'#b34a1b'}],limitations:'Salinan historis GLC, bukan inventaris BNPB dan tidak lengkap.'},
 {id:'recent',name:'Kejadian resmi terbaru',source:'bnpb',kind:'official',resolution:null,availability:'unavailable',legend:[],limitations:'Endpoint dan izin redistribusi belum tersedia.'},
 {id:'media',name:'Laporan media',source:'news',kind:'media_reported',resolution:null,availability:'database',legend:[],limitations:'Artikel tidak secara otomatis dikonversi menjadi kejadian terverifikasi.'},
 {id:'rainfall',name:'Pengamatan hujan',source:null,kind:'observational',resolution:null,availability:'unavailable',legend:[],limitations:'Prakiraan bukan pengamatan. Tidak ada akumulasi hujan yang dihitung.'},
 {id:'forecast',name:'Prakiraan cuaca',source:'bmkg-forecast',kind:'official',resolution:'Desa, 3 jam; hanya desa yang diimpor',availability:'database',legend:[],limitations:'Prakiraan 3 hari. Tidak ditafsirkan sebagai probabilitas longsor.'},
 {id:'warnings',name:'Peringatan cuaca CAP',source:'bmkg-cap',kind:'official',resolution:'Poligon CAP sesuai sumber',availability:'database',legend:[],limitations:'Peringatan meteorologi resmi, bukan peringatan longsor.'},
 {id:'slope',name:'Kemiringan lereng',source:'big',kind:'observational',resolution:null,availability:'unavailable',legend:[],limitations:'DEM berlisensi dan metode turunan belum diimpor.'},
 {id:'elevation',name:'Elevasi',source:'big',kind:'observational',resolution:null,availability:'unavailable',legend:[],limitations:'DEM belum diimpor; peta topografi dasar bukan analisis elevasi titik.'},
 {id:'geology',name:'Geologi',source:'pvmbg',kind:'official',resolution:null,availability:'unavailable',legend:[],limitations:'Dataset geologi berlisensi belum diimpor.'},
 {id:'landcover',name:'Tutupan lahan',source:'big',kind:'observational',resolution:null,availability:'unavailable',legend:[],limitations:'Dataset tutupan lahan belum diimpor.'},
 {id:'administration',name:'Batas provinsi',source:'geoboundaries',kind:'observational',resolution:'ADM1, representasi 2017; geometri disederhanakan',availability:'database',legend:[{label:'Batas provinsi',color:'#405c60'}],limitations:'34 provinsi historis, bukan batas resmi BIG terkini. ADM2 belum diimpor.'},
 {id:'ai',name:'Prediksi AI',source:null,kind:'experimental',resolution:null,availability:'unavailable',legend:[],limitations:'Model prediksi belum tersedia. Tidak ada probabilitas yang dihasilkan.'}
] as const;
