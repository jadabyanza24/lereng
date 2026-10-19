'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import * as maplibregl from 'maplibre-gl';
import {type Map as MapType,type GeoJSONSource,type StyleSpecification} from 'maplibre-gl';
import { LocateFixed,Maximize,Minus,Plus,RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import type { Incident } from '@/lib/types';
import { formatDate } from './public-ui';
export type MapTarget={lng:number;lat:number;bounds?:[number,number,number,number]};
type Props={incidents:Incident[];target:MapTarget|null;selectedPoint:{lng:number;lat:number}|null;onViewport:(bbox:string)=>void;onSelect:(point:{lng:number;lat:number},incident?:Incident)=>void;showIncidents:boolean;showBoundaries:boolean;showSusceptibility?:boolean;opacity:number;basemap:string;dark:boolean};
function style(basemap:string,dark:boolean):StyleSpecification {
 const topo=basemap==='topographic';
  return {version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{base:{type:'raster',tiles:[topo?'https://tile.opentopomap.org/{z}/{x}/{y}.png':'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:topo?17:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | PVMBG Badan Geologi ESDM | Topografi: © OpenTopoMap'},labels:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'OpenFreeMap | © OpenMapTiles | © OpenStreetMap contributors'}},layers:[{id:'background',type:'background',paint:{'background-color':dark?'#182b24':'#e6eef0'}},{id:'basemap',type:'raster',source:'base',paint:{'raster-saturation':-0.55,'raster-brightness-max':dark?0.52:1,'raster-brightness-min':dark?0.08:0,'raster-opacity':0.92}},{id:'place-labels',type:'symbol',source:'labels','source-layer':'place',minzoom:3,filter:['match',['get','class'],['country','state','city','town','village','suburb','neighbourhood'],true,false],layout:{'text-field':['coalesce',['get','name:id'],['get','name:latin'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],4,11,10,['match',['get','class'],'city',17,'state',15,13]],'text-max-width':9,'text-padding':8,'symbol-sort-key':['coalesce',['get','rank'],100]},paint:{'text-color':dark?'#ffffff':'#172e41','text-halo-color':dark?'#172e41':'#ffffff','text-halo-width':2}}]};
}
function fitIndonesia(map:MapType,duration=0) {
 const padding=map.getContainer().clientWidth>700?{top:200,right:90,bottom:100,left:80}:{top:160,right:52,bottom:150,left:24};
 map.fitBounds([[94,-11],[141,6]],{padding,duration});
}
export default function GeoMap(props:Props) {
 const showSusceptibility=props.showSusceptibility??true;
 const container=useRef<HTMLDivElement>(null),map=useRef<MapType|null>(null),latest=useRef(props),resetHover=useRef<(()=>void)|null>(null);
 const [message,setMessage]=useState('Menyiapkan peta Indonesia…');const [ready,setReady]=useState(false);
 useEffect(()=>{latest.current=props;});
 useEffect(()=>{
  if(!container.current)return;
  maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
  let m:MapType;
   try {m=new maplibregl.Map({container:container.current,style:style(latest.current.basemap,latest.current.dark),center:[118,-2.5],zoom:4.1,minZoom:1.5,maxZoom:17,attributionControl:false,locale:{'Map.Title':'Peta Indonesia'}});}catch{queueMicrotask(()=>setMessage('WebGL tidak tersedia. Gunakan daftar kejadian untuk mengakses data.'));return;}
  map.current=m;
  const popup=new maplibregl.Popup({closeButton:false,closeOnClick:false,offset:20,maxWidth:'300px',className:'incident-hover-popup'});
   let hoveredKey='',dragging=false;
   const clearHover=()=>{hoveredKey='';popup.remove();m.getCanvas().style.cursor=dragging?'grabbing':'default';if(m.getLayer('incident-hover'))m.setFilter('incident-hover',['==',['get','id'],'']);if(m.getLayer('cluster-hover'))m.setFilter('cluster-hover',['==',['get','cluster_id'],-1]);};
   clearHover();
   m.on('dragstart',()=>{dragging=true;clearHover();});
   m.on('dragend',()=>{dragging=false;clearHover();});
  resetHover.current=clearHover;
  m.on('mousemove',e=>{
   if(e.originalEvent.buttons)return;
   const layers=['clusters','incident-points'].filter(id=>m.getLayer(id));
   const feature=layers.length?m.queryRenderedFeatures(e.point,{layers})[0]:undefined;
   if(!feature){if(hoveredKey)clearHover();return;}
   const cluster=feature.layer.id==='clusters';
   const key=cluster?`cluster-${feature.properties.cluster_id}`:`incident-${feature.properties.id}`;
   m.getCanvas().style.cursor='pointer';
   if(key===hoveredKey&&popup.isOpen())return;
   clearHover();hoveredKey=key;m.getCanvas().style.cursor='pointer';
   const content=document.createElement('div');content.setAttribute('role','tooltip');
   const label=document.createElement('span');label.className='map-tooltip-label';label.textContent=cluster?'Kumpulan catatan':'Catatan kejadian';
   const title=document.createElement('strong');
   const description=document.createElement('p');
   if(cluster){title.textContent=`${new Intl.NumberFormat('id-ID').format(Number(feature.properties.point_count))} catatan di area ini`;description.textContent='Klik untuk memperbesar dan melihat titik kejadian.';m.setFilter('cluster-hover',['==',['get','cluster_id'],feature.properties.cluster_id]);}
   else {const incident=latest.current.incidents.find(item=>item.id===feature.properties.id);if(!incident){clearHover();return;}title.textContent=incident.title;description.textContent=`${formatDate(incident.occurred_at)} · ${incident.verification_status==='official'?'Sumber resmi':'Laporan media'}. Klik untuk membaca detail.`;m.setFilter('incident-hover',['==',['get','id'],incident.id]);}
   content.append(label,title,description);
   popup.setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number,number]).setDOMContent(content).addTo(m);
  });
  m.getCanvas().addEventListener('mouseleave',clearHover);
  const escapeHover=(event:KeyboardEvent)=>{if(event.key==='Escape')clearHover();};
  document.addEventListener('keydown',escapeHover);
  m.on('movestart',clearHover);m.on('click',clearHover);
  const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
  m.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
   const emit=()=>{const b=m.getBounds();const bounds=[Math.max(94,b.getWest()),Math.max(-12,b.getSouth()),Math.min(142,b.getEast()),Math.min(7,b.getNorth())];if(bounds[0]>=bounds[2]||bounds[1]>=bounds[3])return;latest.current.onViewport(bounds.map(v=>v.toFixed(4)).join(','));};
  let timer:ReturnType<typeof setTimeout>;
  m.on('moveend',()=>{clearTimeout(timer);timer=setTimeout(emit,350);});
   m.on('load',()=>{setReady(true);setMessage('');fitIndonesia(m);emit();});
  m.on('idle',()=>{if(container.current)container.current.dataset.mapLoaded='true';});
  m.on('error',e=>{if(String((e as {error?:{message?:string}})?.error?.message||'').includes('susceptibility'))return;setMessage('Sebagian data peta gagal dimuat. Periksa koneksi atau gunakan daftar kejadian.');});
  m.on('click',async e=>{
   if(m.getLayer('clusters')) {
    const features=m.queryRenderedFeatures(e.point,{layers:['clusters']});
    if(features.length){const f=features[0],id=Number(f.properties?.cluster_id);const zoom=await (m.getSource('incidents') as GeoJSONSource).getClusterExpansionZoom(id);const g=f.geometry as GeoJSON.Point;m.easeTo({center:g.coordinates as [number,number],zoom,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:450});return;}
   }
   if(m.getLayer('incident-points')) {
    const feature=m.queryRenderedFeatures(e.point,{layers:['incident-points']})[0];
    if(feature){const incident=latest.current.incidents.find(i=>i.id===feature.properties?.id);if(incident){latest.current.onSelect({lng:incident.longitude!,lat:incident.latitude!},incident);return;}}
   }
   latest.current.onSelect({lng:e.lngLat.lng,lat:e.lngLat.lat});
  });
   return()=>{clearTimeout(timer);document.removeEventListener('keydown',escapeHover);m.getCanvas().removeEventListener('mouseleave',clearHover);popup.remove();resetHover.current=null;resize.disconnect();m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  let cancelled=false;
   const beforeLayer=m.getLayer('region-lines')?'region-lines':'place-labels';
  if(!m.getSource('zkgt-wms')) {
   m.addSource('zkgt-wms',{type:'raster',tiles:['/api/susceptibility/tile?bbox={bbox-epsg-3857}'],tileSize:256,minzoom:5,maxzoom:17});
   m.addLayer({id:'zkgt-wms-layer',type:'raster',source:'zkgt-wms',layout:{visibility:showSusceptibility?'visible':'none'},paint:{'raster-opacity':Math.min(0.65,props.opacity*0.65)}},beforeLayer);
  } else if(m.getLayer('zkgt-wms-layer')) {
   m.setLayoutProperty('zkgt-wms-layer','visibility',showSusceptibility?'visible':'none');
   m.setPaintProperty('zkgt-wms-layer','raster-opacity',Math.min(0.65,props.opacity*0.65));
  }
  if(!m.getSource('susceptibility')) {
   fetch('/geodata/susceptibility.geojson').then(r=>r.ok?r.json():fetch('/api/susceptibility?format=geojson').then(res=>res.json().then(j=>j.data))).then(data=>{
    if(cancelled||!data||m.getSource('susceptibility'))return;
     const targetBefore=m.getLayer('region-lines')?'region-lines':'place-labels';
    m.addSource('susceptibility',{type:'geojson',data});
    m.addLayer({
     id:'susceptibility-fill',
     type:'fill',
     source:'susceptibility',
     layout:{visibility:(latest.current.showSusceptibility??true)?'visible':'none'},
     paint:{
      'fill-color':['match',['get','level'],'Tinggi','#dc2626','Menengah','#f59e0b','Sangat Rendah','#0284c7','#16a34a'],
      'fill-opacity':Math.min(0.38,latest.current.opacity*0.36)
     }
    },targetBefore);
    m.addLayer({
     id:'susceptibility-line',
     type:'line',
     source:'susceptibility',
     layout:{visibility:(latest.current.showSusceptibility??true)?'visible':'none'},
     paint:{
      'line-color':['match',['get','level'],'Tinggi','#b91c1c','Menengah','#d97706','Sangat Rendah','#0369a1','#15803d'],
      'line-width':1.1,
      'line-opacity':Math.min(0.7,latest.current.opacity*0.65)
     }
    },targetBefore);
   }).catch(()=>{});
  } else {
   for(const id of ['susceptibility-fill','susceptibility-line']) {
    if(m.getLayer(id)) m.setLayoutProperty(id,'visibility',showSusceptibility?'visible':'none');
   }
   if(m.getLayer('susceptibility-fill')) m.setPaintProperty('susceptibility-fill','fill-opacity',Math.min(0.38,props.opacity*0.36));
   if(m.getLayer('susceptibility-line')) m.setPaintProperty('susceptibility-line','line-opacity',Math.min(0.7,props.opacity*0.65));
  }
  return()=>{cancelled=true;};
 },[ready,showSusceptibility,props.opacity]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  const data:GeoJSON.FeatureCollection={type:'FeatureCollection',features:props.incidents.filter(i=>i.longitude!==null&&i.latitude!==null).map(i=>({type:'Feature',geometry:{type:'Point',coordinates:[i.longitude!,i.latitude!]},properties:{id:i.id,status:i.verification_status}}))};
  if(m.getSource('incidents'))(m.getSource('incidents') as GeoJSONSource).setData(data);
  else {
   m.addSource('incidents',{type:'geojson',data,cluster:true,clusterRadius:35,clusterMaxZoom:10});
    m.addLayer({id:'clusters',type:'circle',source:'incidents',filter:['has','point_count'],paint:{'circle-color':['step',['get','point_count'],'#0f766e',15,'#d97706',60,'#b34a1b'],'circle-radius':['step',['get','point_count'],14,10,16,50,18],'circle-stroke-color':'#ffffff','circle-stroke-width':2.2}});
   m.addLayer({id:'incident-points',type:'circle',source:'incidents',filter:['!',['has','point_count']],paint:{'circle-color':['match',['get','status'],'official','#0f766e','#b34a1b'],'circle-radius':5.5,'circle-stroke-color':'#ffffff','circle-stroke-width':1.6}});
   m.addLayer({id:'cluster-hover',type:'circle',source:'incidents',filter:['==',['get','cluster_id'],-1],paint:{'circle-radius':23,'circle-color':'#ffffff','circle-opacity':0.16,'circle-stroke-width':2,'circle-stroke-color':'#172e41'}});
   m.addLayer({id:'incident-hover',type:'circle',source:'incidents',filter:['==',['get','id'],''],paint:{'circle-radius':11,'circle-color':'#ffffff','circle-opacity':0.2,'circle-stroke-width':2,'circle-stroke-color':'#172e41'}});
  }
   for(const id of ['clusters','incident-points']){m.setLayoutProperty(id,'visibility',props.showIncidents?'visible':'none');m.setPaintProperty(id,'circle-opacity',props.opacity);}
   for(const id of ['cluster-hover','incident-hover']){m.setLayoutProperty(id,'visibility',props.showIncidents?'visible':'none');m.setFilter(id,['==',['get',id==='cluster-hover'?'cluster_id':'id'],id==='cluster-hover'?-1:'']);}
   resetHover.current?.();
 },[props.incidents,props.showIncidents,props.opacity,ready]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  let cancelled=false;
  if(!m.getSource('regions'))fetch('/geodata/provinces.geojson').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
   if(cancelled||m.getSource('regions'))return;
   m.addSource('regions',{type:'geojson',data});
    m.addLayer({id:'region-lines',type:'line',source:'regions',layout:{visibility:latest.current.showBoundaries?'visible':'none'},paint:{'line-color':'#405c60','line-width':1.1,'line-opacity':0.65}},'place-labels');
  }).catch(()=>setMessage('Batas provinsi belum diimpor. Peta dasar tetap dapat digunakan.'));
  else m.setLayoutProperty('region-lines','visibility',props.showBoundaries?'visible':'none');
  return()=>{cancelled=true;};
 },[ready,props.showBoundaries]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  const source=m.getSource('base') as maplibregl.RasterTileSource;
   source.setTiles([props.basemap==='topographic'?'https://tile.opentopomap.org/{z}/{x}/{y}.png':'https://tile.openstreetmap.org/{z}/{x}/{y}.png']);
   m.setPaintProperty('place-labels','text-color',props.dark?'#ffffff':'#172e41');
   m.setPaintProperty('place-labels','text-halo-color',props.dark?'#172e41':'#ffffff');
  m.setPaintProperty('basemap','raster-brightness-max',props.dark?0.52:1);
  m.setPaintProperty('basemap','raster-brightness-min',props.dark?0.08:0);
 },[props.basemap,props.dark,ready]);
 useEffect(()=>{const m=map.current,t=props.target;if(!m||!t||!ready)return;const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;if(t.bounds)m.fitBounds([[t.bounds[0],t.bounds[1]],[t.bounds[2],t.bounds[3]]],{padding:40,duration});else m.flyTo({center:[t.lng,t.lat],zoom:10,duration});},[props.target,ready]);
  useEffect(()=>{const m=map.current,point=props.selectedPoint;if(!m||!point||!ready)return;const element=document.createElement('div');element.className='selected-map-point';element.setAttribute('role','img');element.setAttribute('aria-label',`Titik dipilih: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);const marker=new maplibregl.Marker({element,anchor:'center'}).setLngLat([point.lng,point.lat]).addTo(m);return()=>{marker.remove();};},[props.selectedPoint,ready]);
 function geolocate(){if(!navigator.geolocation){setMessage('Peramban tidak mendukung lokasi perangkat.');return;}navigator.geolocation.getCurrentPosition(pos=>{const {longitude:lng,latitude:lat}=pos.coords;if(lng<94||lng>142||lat<-12||lat>7){setMessage('Lokasi perangkat berada di luar cakupan Indonesia.');return;}map.current?.flyTo({center:[lng,lat],zoom:10,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:500});latest.current.onSelect({lng,lat});setMessage('');},()=>setMessage('Izin lokasi ditolak atau lokasi perangkat tidak tersedia.'));}
 return <div className="map-frame" aria-label="Peta interaktif Indonesia">
  <div ref={container} className="map-canvas" data-testid="map"/>
  {message&&<div className="map-message" role="status">{message}</div>}
  <div className="map-tools"><Button variant="outline" size="icon" aria-label="Perbesar peta" onClick={()=>map.current?.zoomIn()}><Plus size={18}/></Button><Button variant="outline" size="icon" aria-label="Perkecil peta" onClick={()=>map.current?.zoomOut()}><Minus size={18}/></Button><Button variant="outline" size="icon" aria-label="Lokasi saya" onClick={geolocate}><LocateFixed size={18}/></Button><Button variant="outline" size="icon" aria-label="Kembali ke Indonesia" onClick={()=>{if(map.current)fitIndonesia(map.current,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:500);}}><RotateCcw size={17}/></Button><Button variant="outline" size="icon" aria-label="Layar penuh peta" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else {const frame=container.current?.closest('.map-stage')||container.current?.parentElement;if(frame?.requestFullscreen)void frame.requestFullscreen().catch(()=>setMessage('Layar penuh tidak didukung peramban ini.'));else setMessage('Layar penuh tidak didukung peramban ini.');}}}><Maximize size={17}/></Button></div>
  <div className="map-caption">Klik lokasi untuk analisis kerawanan & riwayat</div>
   <div className="map-legend" role="group" aria-label="Keterangan peta"><div className="map-legend-items">
     {showSusceptibility&&<><span className="map-legend-item" title="Kerentanan tinggi"><span className="legend-zone legend-zone-high"/>Tinggi</span><span className="map-legend-item" title="Kerentanan menengah"><span className="legend-zone legend-zone-med"/>Menengah</span><span className="map-legend-item" title="Kerentanan rendah"><span className="legend-zone legend-zone-low"/>Rendah</span><span className="map-legend-item" title="Kerentanan sangat rendah"><span className="legend-zone" style={{background:'#0284c7'}}/>Sangat rendah</span></>}
     {props.showIncidents&&<><span className="map-legend-item" title="Catatan dari sumber resmi"><span className="legend-point legend-point-official"/>Resmi</span><span className="map-legend-item" title="Catatan dari laporan media"><span className="legend-point"/>Media</span><span className="map-legend-item" title="Kelompok catatan; warna menunjukkan jumlah, bukan kerentanan"><span className="legend-cluster"/>Cluster</span></>}
     {props.showBoundaries&&<span className="map-legend-item" title="Batas provinsi referensi 2017"><span className="legend-line"/>Batas</span>}
     {!showSusceptibility&&!props.showIncidents&&!props.showBoundaries&&<span>Semua lapisan disembunyikan</span>}
   </div></div>
  <details className="map-attribution"><summary>Atribusi</summary><div>
    <p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</p>
    <p>Label daerah: <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>, © <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> dan OpenStreetMap.</p>
   {props.basemap==='topographic'&&<p>Topografi: © <a href="https://opentopomap.org/about" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC BY-SA).</p>}
   {showSusceptibility&&<p>Kerentanan: PVMBG, Badan Geologi ESDM.</p>}
   {props.showBoundaries&&<p>Batas: geoBoundaries (2017), ODbL.</p>}
   {props.showIncidents&&<p>Catatan: PVMBG, BNPB, NASA GLC. Lokasi tidak selalu presisi.</p>}
   <Link href="/sumber-data">Rincian sumber dan lisensi</Link>
  </div></details>
 </div>;
}
