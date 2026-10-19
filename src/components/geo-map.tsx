'use client';
import { useEffect,useRef,useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {type Map as MapType,type GeoJSONSource,type StyleSpecification} from 'maplibre-gl';
import { LocateFixed,Maximize,Minus,Plus,RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import type { Incident } from '@/lib/types';
export type MapTarget={lng:number;lat:number;bounds?:[number,number,number,number]};
type Props={incidents:Incident[];target:MapTarget|null;onViewport:(bbox:string)=>void;onSelect:(point:{lng:number;lat:number},incident?:Incident)=>void;showIncidents:boolean;showBoundaries:boolean;opacity:number;basemap:string;dark:boolean};
function style(basemap:string,dark:boolean):StyleSpecification {
 const topo=basemap==='topographic';
 return {version:8,sources:{base:{type:'raster',tiles:[topo?'https://tile.opentopomap.org/{z}/{x}/{y}.png':'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:topo?17:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | Topografi: © OpenTopoMap, SRTM (CC-BY-SA)'}},layers:[{id:'background',type:'background',paint:{'background-color':dark?'#21383f':'#e6eef0'}},{id:'basemap',type:'raster',source:'base',paint:{'raster-saturation':-0.65,'raster-brightness-max':dark?0.5:1,'raster-brightness-min':dark?0.08:0,'raster-opacity':0.9}}]};
}
export default function GeoMap(props:Props) {
 const container=useRef<HTMLDivElement>(null),map=useRef<MapType|null>(null),latest=useRef(props);
 const [message,setMessage]=useState('Menyiapkan peta Indonesia…');const [ready,setReady]=useState(false);
 useEffect(()=>{latest.current=props;});
 useEffect(()=>{
  if(!container.current)return;
  maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
  let m:MapType;
  try {m=new maplibregl.Map({container:container.current,style:style(latest.current.basemap,latest.current.dark),center:[118,-2.5],zoom:4.1,minZoom:3,maxZoom:17,maxBounds:[[90,-18],[148,13]],attributionControl:{compact:true},locale:{'AttributionControl.ToggleAttribution':'Tampilkan atribusi','Map.Title':'Peta Indonesia'}});}catch{queueMicrotask(()=>setMessage('WebGL tidak tersedia. Gunakan daftar kejadian untuk mengakses data.'));return;}
  map.current=m;
  const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
  m.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
  const emit=()=>{const b=m.getBounds();latest.current.onViewport([Math.max(94,b.getWest()),Math.max(-12,b.getSouth()),Math.min(142,b.getEast()),Math.min(7,b.getNorth())].map(v=>v.toFixed(4)).join(','));};
  let timer:ReturnType<typeof setTimeout>;
  m.on('moveend',()=>{clearTimeout(timer);timer=setTimeout(emit,350);});
  m.on('load',()=>{setReady(true);setMessage('');m.fitBounds([[94,-11],[141,6]],{padding:32,duration:0});emit();});
  m.on('idle',()=>{if(container.current)container.current.dataset.mapLoaded='true';});
  m.on('error',()=>setMessage('Sebagian data peta gagal dimuat. Periksa koneksi atau gunakan daftar kejadian.'));
  m.on('click',async e=>{
   if(m.getLayer('clusters')) {
    const features=m.queryRenderedFeatures(e.point,{layers:['clusters']});
    if(features.length){const f=features[0],id=Number(f.properties?.cluster_id);const zoom=await (m.getSource('incidents') as GeoJSONSource).getClusterExpansionZoom(id);const g=f.geometry as GeoJSON.Point;m.easeTo({center:g.coordinates as [number,number],zoom,duration:300});return;}
   }
   if(m.getLayer('incident-points')) {
    const feature=m.queryRenderedFeatures(e.point,{layers:['incident-points']})[0];
    if(feature){const incident=latest.current.incidents.find(i=>i.id===feature.properties?.id);if(incident){latest.current.onSelect({lng:incident.longitude!,lat:incident.latitude!},incident);return;}}
   }
   latest.current.onSelect({lng:e.lngLat.lng,lat:e.lngLat.lat});
  });
  return()=>{clearTimeout(timer);resize.disconnect();m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  const data:GeoJSON.FeatureCollection={type:'FeatureCollection',features:props.incidents.filter(i=>i.longitude!==null&&i.latitude!==null).map(i=>({type:'Feature',geometry:{type:'Point',coordinates:[i.longitude!,i.latitude!]},properties:{id:i.id}}))};
  if(m.getSource('incidents'))(m.getSource('incidents') as GeoJSONSource).setData(data);
  else {
   m.addSource('incidents',{type:'geojson',data,cluster:true,clusterRadius:35,clusterMaxZoom:10});
   m.addLayer({id:'clusters',type:'circle',source:'incidents',filter:['has','point_count'],paint:{'circle-color':'#b34a1b','circle-radius':['step',['get','point_count'],14,10,19,50,25],'circle-stroke-color':'#ffffff','circle-stroke-width':2}});
   m.addLayer({id:'incident-points',type:'circle',source:'incidents',filter:['!',['has','point_count']],paint:{'circle-color':'#b34a1b','circle-radius':5,'circle-stroke-color':'#ffffff','circle-stroke-width':1.5}});
  }
  for(const id of ['clusters','incident-points']){m.setLayoutProperty(id,'visibility',props.showIncidents?'visible':'none');m.setPaintProperty(id,'circle-opacity',props.opacity);}
 },[props.incidents,props.showIncidents,props.opacity,ready]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  let cancelled=false;
  if(!m.getSource('regions'))fetch('/geodata/provinces.geojson').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
   if(cancelled||m.getSource('regions'))return;
   m.addSource('regions',{type:'geojson',data});
   m.addLayer({id:'region-lines',type:'line',source:'regions',layout:{visibility:latest.current.showBoundaries?'visible':'none'},paint:{'line-color':'#405c60','line-width':1,'line-opacity':0.6}},m.getLayer('clusters')?'clusters':undefined);
  }).catch(()=>setMessage('Batas provinsi belum diimpor. Peta dasar tetap dapat digunakan.'));
  else m.setLayoutProperty('region-lines','visibility',props.showBoundaries?'visible':'none');
  return()=>{cancelled=true;};
 },[ready,props.showBoundaries]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  const source=m.getSource('base') as maplibregl.RasterTileSource;
  source.setTiles([props.basemap==='topographic'?'https://tile.opentopomap.org/{z}/{x}/{y}.png':'https://tile.openstreetmap.org/{z}/{x}/{y}.png']);
  m.setPaintProperty('basemap','raster-brightness-max',props.dark?0.5:1);
  m.setPaintProperty('basemap','raster-brightness-min',props.dark?0.08:0);
 },[props.basemap,props.dark,ready]);
  useEffect(()=>{const m=map.current,t=props.target;if(!m||!t||!ready)return;const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;if(t.bounds)m.fitBounds([[t.bounds[0],t.bounds[1]],[t.bounds[2],t.bounds[3]]],{padding:40,duration});else m.flyTo({center:[t.lng,t.lat],zoom:10,duration});},[props.target,ready]);
 useEffect(()=>{const m=map.current;if(!m||!props.target||!ready)return;const marker=new maplibregl.Marker({color:'#22604b'}).setLngLat([props.target.lng,props.target.lat]).addTo(m);return()=>{marker.remove();};},[props.target,ready]);
  function geolocate(){if(!navigator.geolocation){setMessage('Peramban tidak mendukung lokasi perangkat.');return;}navigator.geolocation.getCurrentPosition(pos=>{const {longitude:lng,latitude:lat}=pos.coords;if(lng<94||lng>142||lat<-12||lat>7){setMessage('Lokasi perangkat berada di luar cakupan Indonesia.');return;}map.current?.flyTo({center:[lng,lat],zoom:10,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:500});latest.current.onSelect({lng,lat});setMessage('');},()=>setMessage('Izin lokasi ditolak atau lokasi perangkat tidak tersedia.'));}
 return <div className="map-frame" aria-label="Peta interaktif Indonesia">
  <div ref={container} className="map-canvas" data-testid="map"/>
  {message&&<div className="map-message" role="status">{message}</div>}
   <div className="map-tools"><Button variant="outline" size="icon" aria-label="Perbesar peta" onClick={()=>map.current?.zoomIn()}><Plus size={18}/></Button><Button variant="outline" size="icon" aria-label="Perkecil peta" onClick={()=>map.current?.zoomOut()}><Minus size={18}/></Button><Button variant="outline" size="icon" aria-label="Lokasi saya" onClick={geolocate}><LocateFixed size={18}/></Button><Button variant="outline" size="icon" aria-label="Kembali ke Indonesia" onClick={()=>map.current?.fitBounds([[94,-11],[141,6]],{padding:35,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:500})}><RotateCcw size={17}/></Button><Button variant="outline" size="icon" aria-label="Layar penuh peta" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else {const frame=container.current?.closest('.map-stage')||container.current?.parentElement;if(frame?.requestFullscreen)void frame.requestFullscreen().catch(()=>setMessage('Layar penuh tidak didukung peramban ini.'));else setMessage('Layar penuh tidak didukung peramban ini.');}}}><Maximize size={17}/></Button></div>
  <div className="map-caption">Klik lokasi untuk analisis wilayah</div>
   <div className="map-legend" aria-label="Keterangan peta">{props.showIncidents&&<><span className="legend-point"/>Riwayat laporan media</>}{props.showBoundaries&&<><span className="legend-line"/>Batas provinsi 2017</>}</div>
 </div>;
}
