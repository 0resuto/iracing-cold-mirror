// Largest Triangle Three Buckets (LTTB) algorithm
// Adapted for downsampling telemetry data

export function lttb(data, threshold) {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data;
  }

  const sampled = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0;
  let maxAreaPoint;
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

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += data[avgRangeStart].lap_dist_pct * 100; // use dist pct as X
      avgY += data[avgRangeStart].speed; // using speed as main Y for LTTB area calculation
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAx = data[a].lap_dist_pct * 100;
    const pointAy = data[a].speed;

    maxArea = -1;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      area = Math.abs(
        (pointAx - avgX) * (data[rangeOffs].speed - pointAy) -
        (pointAx - data[rangeOffs].lap_dist_pct * 100) * (avgY - pointAy)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA;
  }

  sampled[sampledIndex++] = data[dataLength - 1]; // Always add last

  return sampled;
}
