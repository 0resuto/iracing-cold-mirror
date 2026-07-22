// Largest Triangle Three Buckets (LTTB) algorithm
// Adapted for downsampling telemetry data with defensive safety guards

export function lttb(data, threshold) {
  if (!data || !Array.isArray(data)) return [];
  const dataLength = data.length;
  if (dataLength === 0) return [];
  if (threshold >= dataLength || threshold <= 2) {
    return data;
  }

  const getX = (p) => (p?.lap_dist_pct ?? 0) * 100;
  const getY = (p) => (p?.speed ?? 0);

  const sampled = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0;
  let maxAreaPoint = data[0];
  let maxArea;
  let area;
  let nextA;

  sampled[sampledIndex++] = data[a]; // Always add the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = Math.max(1, avgRangeEnd - avgRangeStart);

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += getX(data[avgRangeStart]);
      avgY += getY(data[avgRangeStart]);
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.min(Math.floor((i + 1) * every) + 1, dataLength);

    // Point a
    const pointAx = getX(data[a]);
    const pointAy = getY(data[a]);

    maxArea = -1;
    maxAreaPoint = data[rangeOffs] || data[a];

    for (; rangeOffs < rangeTo; rangeOffs++) {
      const p = data[rangeOffs];
      if (!p) continue;

      // Calculate triangle area over three buckets
      area = Math.abs(
        (pointAx - avgX) * (getY(p) - pointAy) -
        (pointAx - getX(p)) * (avgY - pointAy)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = p;
        nextA = rangeOffs;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA ?? (a + 1);
  }

  sampled[sampledIndex++] = data[dataLength - 1]; // Always add last

  return sampled.filter(Boolean);
}
