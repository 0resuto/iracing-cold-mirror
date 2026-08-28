import { useMemo } from 'react';

const EMPTY = { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };

function projectPoint(lat, lon, svgData) {
  const px = lon * svgData.lonScale;
  const py = lat;
  return {
    x: (px - svgData.minX) * svgData.scale + svgData.xOffset,
    y: svgData.vbHeight - ((py - svgData.minY) * svgData.scale + svgData.yOffset)
  };
}

/**
 * Project a single telemetry point onto the track scene and derive
 * travel/heading angles. Handles fallback to reference GPS points when
 * the current point has no lat/lon but only a lap_dist_pct.
 *
 * @param {object|null} currentData Point with { lat, lon } or { lap_dist_pct }.
 * @param {object|null} prevData Previous point (for travel angle), may be null.
 * @param {object|null} svgData Projection metadata from buildTrackScene().
 * @param {Array|null} refGpsPoints Reference points for fallback projection.
 * @returns {{x, y, travelAngle, headingAngle, speed, isValid}}
 */
export function useCarPosition(currentData, prevData, svgData, refGpsPoints) {
  return useMemo(() => {
    if (!svgData) return EMPTY;
    if (!currentData || (currentData.lat == null && currentData.lap_dist_pct == null)) {
      return EMPTY;
    }

    let px, py;
    if (currentData.lat != null && currentData.lon != null) {
      px = currentData.lon * svgData.lonScale;
      py = currentData.lat;
    } else if (currentData.lap_dist_pct != null && refGpsPoints && refGpsPoints.length > 0) {
      let closest = refGpsPoints[0];
      let minDiff = Infinity;
      for (const rp of refGpsPoints) {
        const diff = Math.abs(rp.lap_dist_pct - currentData.lap_dist_pct);
        if (diff < minDiff) { minDiff = diff; closest = rp; }
      }
      px = closest.lon * svgData.lonScale;
      py = closest.lat;
    } else {
      return EMPTY;
    }

    const pos = {
      x: (px - svgData.minX) * svgData.scale + svgData.xOffset,
      y: svgData.vbHeight - ((py - svgData.minY) * svgData.scale + svgData.yOffset)
    };

    let travelAngle = 0;
    if (prevData && prevData.lat !== null && prevData.lon !== null) {
      const prev = projectPoint(prevData.lat, prevData.lon, svgData);
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        travelAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      }
    }

    const headingAngle = travelAngle + (currentData.slip_angle || 0);

    return { x: pos.x, y: pos.y, travelAngle, headingAngle, speed: currentData.speed || 0, isValid: true };
  }, [currentData, prevData, svgData, refGpsPoints]);
}
