import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { sqlClient } from '../src/server/db';
import { provinceLabel } from '../src/lib/presentation';
import type { Place } from '../src/lib/types';

const url = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/IDN/ADM2/geoBoundaries-IDN-ADM2_simplified.geojson';
const buffer = process.argv[2] ? await readFile(process.argv[2]) : Buffer.from(await (await fetch(url)).arrayBuffer());
assert.equal(createHash('sha256').update(buffer).digest('hex'), '146653d488331086ddc43d159a261b01ea6dd08c7ed422e34a9886c3c690430c');
const collection = JSON.parse(buffer.toString());
const sql = sqlClient();
const places: Place[] = [];
try {
  const provinces = await sql`SELECT id,name,ST_X(ST_PointOnSurface(geom)) AS lng,ST_Y(ST_PointOnSurface(geom)) AS lat,ST_XMin(Box3D(geom)) AS west,ST_YMin(Box3D(geom)) AS south,ST_XMax(Box3D(geom)) AS east,ST_YMax(Box3D(geom)) AS north FROM administrative_regions WHERE level=1 ORDER BY name`;
  assert.equal(provinces.length, 34, 'Use the existing geoBoundaries ADM1 reference.');
  for (const row of provinces) places.push({ id: String(row.id), name: provinceLabel(row.name), kind: 'province', province: provinceLabel(row.name), lng: Number(row.lng), lat: Number(row.lat), bounds: [row.west, row.south, row.east, row.north].map(Number) as Place['bounds'] });
  for (const feature of collection.features) {
    const [row] = await sql`WITH area AS (SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}),4326)) AS geom), point AS (SELECT geom,ST_PointOnSurface(geom) AS center FROM area) SELECT ST_X(center) AS lng,ST_Y(center) AS lat,ST_XMin(Box3D(point.geom)) AS west,ST_YMin(Box3D(point.geom)) AS south,ST_XMax(Box3D(point.geom)) AS east,ST_YMax(Box3D(point.geom)) AS north,r.name AS province FROM point LEFT JOIN LATERAL (SELECT name FROM administrative_regions WHERE level=1 ORDER BY geom <-> point.center LIMIT 1) r ON true`;
    assert(row?.province && typeof feature.properties.shapeName === 'string');
    const name = feature.properties.shapeName;
    const city = /^Kota\b/i.test(name);
    places.push({ id: `adm2:${feature.properties.shapeID}`, name: city ? name : `Kabupaten ${name}`, kind: city ? 'city' : 'regency', province: provinceLabel(row.province), lng: Number(row.lng), lat: Number(row.lat), bounds: [row.west, row.south, row.east, row.north].map(Number) as Place['bounds'] });
  }
  assert.equal(places.length, 553);
  assert.equal(new Set(places.map(place => place.id)).size, places.length);
  await writeFile('src/server/places.json', JSON.stringify(places));
  console.log(`Wrote ${places.length} province, regency and city references.`);
} finally { await sql.end(); }
