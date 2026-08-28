/**
 * Build color-coded track segments. The lap trajectory is drawn as a series of
 * short Catmull-Rom segments, each colored by speed or delta progress.
 * Returns null for the default mode or when there are not enough points.
 */
export function buildColorSegments({ colorMode, lapGpsPoints, svgData, deltaData }) {
  if (colorMode === 'default' || !lapGpsPoints || lapGpsPoints.length < 2 || !svgData) return null;

  let minVal = Infinity, maxVal = -Infinity;

  if (colorMode === 'speed') {
    lapGpsPoints.forEach(p => {
      const s = p.speed || 0;
      if (s < minVal) minVal = s;
      if (s > maxVal) maxVal = s;
    });
  } else if (colorMode === 'delta' && deltaData) {
    deltaData.forEach(d => {
      if (d.delta < minVal) minVal = d.delta;
      if (d.delta > maxVal) maxVal = d.delta;
    });
  }

  const absMaxDelta = Math.max(Math.abs(minVal === Infinity ? 0 : minVal), Math.abs(maxVal === -Infinity ? 0 : maxVal), 0.1);

  const getColor = (p1, p2) => {
    if (colorMode === 'speed') {
      const speed = (p1.speed + p2.speed) / 2 || 0;
      const t = maxVal > minVal ? (speed - minVal) / (maxVal - minVal) : 0.5;
      const hue = t * 120; // 0 is Red (slow), 120 is Green (fast)
      return `hsl(${hue}, 100%, 45%)`;
    } else {
      // Delta mode
      if (!deltaData || deltaData.length === 0) return 'gray';
      const pct = (p1.lap_dist_pct + p2.lap_dist_pct) / 2;

      // Binary search for closest delta
      let low = 0, high = deltaData.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (deltaData[mid].lap_dist_pct < pct) low = mid + 1;
        else high = mid;
      }

      const delta = deltaData[low]?.delta || 0;
      const normalized = Math.max(-1, Math.min(1, delta / absMaxDelta));
      // delta > 0 (slower) -> Red (hue 0). delta < 0 (faster) -> Green (hue 120)
      const t = (1 - normalized) / 2;
      const hue = t * 120;
      return `hsl(${hue}, 100%, 45%)`;
    }
  };

  const pathsByColor = {};
  const pts = [lapGpsPoints[lapGpsPoints.length - 1], ...lapGpsPoints, lapGpsPoints[0], lapGpsPoints[1]];

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    const s0 = svgData.projectToScreen(p0.lon, p0.lat);
    const s1 = svgData.projectToScreen(p1.lon, p1.lat);
    const s2 = svgData.projectToScreen(p2.lon, p2.lat);
    const s3 = svgData.projectToScreen(p3.lon, p3.lat);

    const cp1x = s1.x + (s2.x - s0.x) / 6;
    const cp1y = s1.y + (s2.y - s0.y) / 6;
    const cp2x = s2.x - (s3.x - s1.x) / 6;
    const cp2y = s2.y - (s3.y - s1.y) / 6;

    const color = getColor(p1, p2);
    const segCmd = `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`;

    if (!pathsByColor[color]) {
      pathsByColor[color] = segCmd;
    } else {
      pathsByColor[color] += ` ${segCmd}`;
    }
  }

  return Object.entries(pathsByColor).map(([color, d]) => ({ color, d }));
}
