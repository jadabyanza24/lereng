import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// This coarse index is for orientation only; the analytical map keeps the source geometry.
const collection = JSON.parse(await readFile('public/geodata/provinces.geojson', 'utf8'));
assert(collection.type === 'FeatureCollection' && collection.features.length > 0);
const provinces = collection.features.map(({ properties, geometry }) => {
  assert(['Polygon', 'MultiPolygon'].includes(geometry.type));
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const path = polygons.map(polygon => polygon.map(ring => {
    const points = ring.map(([lng, lat]) => [Math.round(((lng - 94) * 20 + 10) * 2) / 2, Math.round(((7 - lat) * 20 + 10) * 2) / 2].join(','));
    const distinct = points.filter((point, index) => index === 0 || point !== points[index - 1]);
    return distinct.length < 4 ? '' : `M${distinct.join('L')}Z`;
  }).join('')).join('');
  assert(typeof properties.shapeName === 'string' && path.length > 0);
  return { name: properties.shapeName, path };
});
await writeFile('src/lib/overview.json', JSON.stringify(provinces));
