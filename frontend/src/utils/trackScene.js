import { getCatmullRomSpline } from './catmullRomSpline';

export const VB_WIDTH = 1000;
export const VB_HEIGHT = 1000;
export const VB_PADDING = 50;

const METERS_PER_DEGREE_LAT = 111139;
const REAL_CAR_LENGTH_METERS = 4.8;
const BASE_CAR_PATH_LENGTH = 20;

/**
 * Build the complete SVG scene data from GPS reference + lap points.
 * Computes a lon/lat -> viewBox projection and every derived path/scale.
 */
export function buildTrackScene({ refGpsPoints, lapGpsPoints, isLive }) {
  // Use the current lap as the scaling basis, but only for historical mode
  const boundsSource = (lapGpsPoints && lapGpsPoints.length > 0 && !isLive) ? lapGpsPoints : refGpsPoints;
  if (!boundsSource || boundsSource.length === 0) return null;

  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  boundsSource.forEach(p => {
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  });

  const avgLat = (minLat + maxLat) / 2;
  const latRads = avgLat * Math.PI / 180;
  const lonScale = Math.cos(latRads);

  const projectedBase = boundsSource.map(p => ({
    x: p.lon * lonScale,
    y: p.lat
  }));

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  projectedBase.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;

  const innerWidth = VB_WIDTH - VB_PADDING * 2;
  const innerHeight = VB_HEIGHT - VB_PADDING * 2;

  const scale = Math.min(innerWidth / (width || 1), innerHeight / (height || 1));
  const xOffset = (VB_WIDTH - width * scale) / 2;
  const yOffset = (VB_HEIGHT - height * scale) / 2;

  const projectToScreen = (lon, lat) => ({
    x: ((lon * lonScale) - minX) * scale + xOffset,
    y: VB_HEIGHT - ((lat - minY) * scale + yOffset)
  });

  const scaledBase = refGpsPoints ? refGpsPoints.map(p => projectToScreen(p.lon, p.lat)) : [];
  const basePath = scaledBase.length >= 2 ? getCatmullRomSpline(scaledBase, true) : null;

  let lapPath = null;
  if (lapGpsPoints && lapGpsPoints.length >= 2) {
    const scaledLap = lapGpsPoints.map(p => projectToScreen(p.lon, p.lat));
    lapPath = getCatmullRomSpline(scaledLap, true);
  }

  const metersPerVbUnit = METERS_PER_DEGREE_LAT / (scale || 1);
  const realisticCarScale = (REAL_CAR_LENGTH_METERS * (scale / METERS_PER_DEGREE_LAT)) / BASE_CAR_PATH_LENGTH;

  return {
    basePath,
    lapPath,
    projectToScreen,
    points: lapGpsPoints ? lapGpsPoints.map(p => projectToScreen(p.lon, p.lat)) : scaledBase,
    vbWidth: VB_WIDTH,
    vbHeight: VB_HEIGHT,
    scale,
    xOffset,
    yOffset,
    minX,
    minY,
    lonScale,
    realisticCarScale,
    metersPerVbUnit
  };
}
