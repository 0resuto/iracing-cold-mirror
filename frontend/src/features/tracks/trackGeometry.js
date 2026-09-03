/**
 * Track geometry utilities for rendering official iRacing SVG paths and sampling positions.
 */

// Extract signed numbers from an SVG path parameter substring.
// Handles concatenated tokens like "c-4,0-7.8-0.4" and exponents.
function parsePathNumbers(params) {
  const re = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  const out = [];
  let m;
  while ((m = re.exec(params)) !== null) out.push(parseFloat(m[0]));
  return out;
}

export function getPathBounds(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') {
    return { vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100, viewBox: '0 0 100 100', trackWidthVbUnits: 2 };
  }

  // Tokenize into [commandLetter, params] chunks.
  const tokens = pathStr.match(/[a-zA-Z][^a-zA-Z]*/g);
  if (!tokens || tokens.length === 0) {
    return { vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100, viewBox: '0 0 100 100', trackWidthVbUnits: 2 };
  }

  let cx = 0, cy = 0;          // current point
  let subX = 0, subY = 0;      // start of current subpath (for Z)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  const visit = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  for (const tok of tokens) {
    const rawCmd = tok[0];
    const cmd = rawCmd.toUpperCase();
    const rel = rawCmd !== cmd; // lowercase means relative
    const p = parsePathNumbers(tok.slice(1));
    let i = 0;

    while (i < p.length) {
      switch (cmd) {
        case 'M': {
          const x = rel ? cx + p[i] : p[i];
          const y = rel ? cy + p[i + 1] : p[i + 1];
          cx = x; cy = y; subX = x; subY = y;
          visit(x, y);
          i += 2;
          break;
        }
        case 'L': {
          const x = rel ? cx + p[i] : p[i];
          const y = rel ? cy + p[i + 1] : p[i + 1];
          cx = x; cy = y; visit(x, y);
          i += 2;
          break;
        }
        case 'H': {
          const x = rel ? cx + p[i] : p[i];
          cx = x; visit(x, cy);
          i += 1;
          break;
        }
        case 'V': {
          const y = rel ? cy + p[i] : p[i];
          cy = y; visit(cx, y);
          i += 1;
          break;
        }
        case 'C': {
          const x1 = rel ? cx + p[i] : p[i];
          const y1 = rel ? cy + p[i + 1] : p[i + 1];
          const x2 = rel ? cx + p[i + 2] : p[i + 2];
          const y2 = rel ? cy + p[i + 3] : p[i + 3];
          const x = rel ? cx + p[i + 4] : p[i + 4];
          const y = rel ? cy + p[i + 5] : p[i + 5];
          visit(x1, y1); visit(x2, y2); visit(x, y);
          cx = x; cy = y;
          i += 6;
          break;
        }
        case 'S': {
          const x2 = rel ? cx + p[i] : p[i];
          const y2 = rel ? cy + p[i + 1] : p[i + 1];
          const x = rel ? cx + p[i + 2] : p[i + 2];
          const y = rel ? cy + p[i + 3] : p[i + 3];
          visit(x2, y2); visit(x, y);
          cx = x; cy = y;
          i += 4;
          break;
        }
        case 'Q': {
          const x1 = rel ? cx + p[i] : p[i];
          const y1 = rel ? cy + p[i + 1] : p[i + 1];
          const x = rel ? cx + p[i + 2] : p[i + 2];
          const y = rel ? cy + p[i + 3] : p[i + 3];
          visit(x1, y1); visit(x, y);
          cx = x; cy = y;
          i += 4;
          break;
        }
        case 'A': {
          // rx, ry, rot, large-arc, sweep, x, y
          const x = rel ? cx + p[i + 5] : p[i + 5];
          const y = rel ? cy + p[i + 6] : p[i + 6];
          visit(x, y);
          cx = x; cy = y;
          i += 7;
          break;
        }
        case 'Z':
          cx = subX; cy = subY;
          i = p.length; // no params consumed
          break;
        default:
          i = p.length; // safety: skip unknown command
      }
    }
  }

  // If nothing was parsed, bail to a safe default.
  if (!isFinite(minX) || minX === Infinity) {
    return { vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100, viewBox: '0 0 100 100', trackWidthVbUnits: 2 };
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const padX = spanX * 0.07;
  const padY = spanY * 0.07;
  const vbX = minX - padX;
  const vbY = minY - padY;
  const vbWidth = spanX + 2 * padX;
  const vbHeight = spanY + 2 * padY;
  // Proportional track width for consistent visual ribbon thickness across circuits
  const trackWidthVbUnits = Math.max((vbWidth + vbHeight) * 0.009, 2);

  return {
    minX, maxX, minY, maxY,
    vbX, vbY, vbWidth, vbHeight,
    viewBox: `${vbX} ${vbY} ${vbWidth} ${vbHeight}`,
    trackWidthVbUnits,
  };
}


export function createSvgSampler(svgPath, offset = 0, direction = 1) {
  if (typeof document === 'undefined' || !svgPath) return null;

  try {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', svgPath);

    if (typeof pathEl.getTotalLength !== 'function') {
      return null;
    }

    const totalLength = pathEl.getTotalLength();
    if (!totalLength || totalLength <= 0) return null;

    const getCoordAtPct = (lapDistPct) => {
      const normalizedLapPct = ((lapDistPct % 1.0) + 1.0) % 1.0;
      const progress = ((normalizedLapPct * direction + offset) % 1.0 + 1.0) % 1.0;
      const pt = pathEl.getPointAtLength(progress * totalLength);
      return { x: pt.x, y: pt.y };
    };

    return { totalLength, getCoordAtPct };
  } catch {
    return null;
  }
}

/**
 * Creates an exact mathematical track sampler using official iRacing start/finish calibration.
 * Maps any telemetry percentage (0.0 .. 1.0) to screen coordinates {x, y} and car heading angle.
 */
export function createTrackSampler(trackDef) {
  if (typeof document === 'undefined' || !trackDef?.svg_path) return null;

  try {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', trackDef.svg_path);

    if (typeof pathEl.getTotalLength !== 'function') return null;

    const totalLength = pathEl.getTotalLength();
    if (!totalLength || totalLength <= 0) return null;

    const sfLen = trackDef.start_finish?.point?.length || 0;
    const isAnticlockwise = trackDef.start_finish?.direction === 'anticlockwise';

    const getCoordAndHeading = (lapDistPct) => {
      const p = ((lapDistPct % 1.0) + 1.0) % 1.0;
      let len;
      if (isAnticlockwise) {
        len = (sfLen + totalLength * p) % totalLength;
      } else {
        len = ((sfLen - totalLength * p) % totalLength + totalLength) % totalLength;
      }

      const pt = pathEl.getPointAtLength(len);

      const delta = 2.0;
      const lenNext = isAnticlockwise
        ? (len + delta) % totalLength
        : ((len - delta) % totalLength + totalLength) % totalLength;
      const ptNext = pathEl.getPointAtLength(lenNext);

      const dx = ptNext.x - pt.x;
      const dy = ptNext.y - pt.y;
      const headingDeg = Math.atan2(dy, dx) * (180 / Math.PI);

      return { x: pt.x, y: pt.y, headingDeg };
    };

    const getCoordAtPct = (lapDistPct) => {
      const res = getCoordAndHeading(lapDistPct);
      return { x: res.x, y: res.y };
    };

    return { totalLength, getCoordAtPct, getCoordAndHeading };
  } catch {
    return null;
  }
}

/**
 * Computes optimal 2D similarity transform (scale, rotation, translation)
 * mapping srcPts to dstPts using closed-form Umeyama formulation.
 * Returns SVG transform string: "matrix(a, c, b, d, tx, ty)"
 */
export function computeSimilarityTransform(srcPts, dstPts) {
  if (!srcPts || !dstPts) return null;
  const n = Math.min(srcPts.length, dstPts.length);
  if (n < 3) return null;

  let meanSrcX = 0, meanSrcY = 0;
  let meanDstX = 0, meanDstY = 0;

  for (let i = 0; i < n; i++) {
    meanSrcX += srcPts[i].x;
    meanSrcY += srcPts[i].y;
    meanDstX += dstPts[i].x;
    meanDstY += dstPts[i].y;
  }
  meanSrcX /= n;
  meanSrcY /= n;
  meanDstX /= n;
  meanDstY /= n;

  let varSrc = 0;
  let sxx = 0, sxy = 0, syx = 0, syy = 0;

  for (let i = 0; i < n; i++) {
    const ax = srcPts[i].x - meanSrcX;
    const ay = srcPts[i].y - meanSrcY;
    const bx = dstPts[i].x - meanDstX;
    const by = dstPts[i].y - meanDstY;

    varSrc += ax * ax + ay * ay;
    sxx += bx * ax;
    sxy += bx * ay;
    syx += by * ax;
    syy += by * ay;
  }

  if (varSrc < 1e-6) return null;

  const c1 = sxx + syy;
  const c2 = syx - sxy;
  const theta = Math.atan2(c2, c1);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const scale = (c1 * cosT + c2 * sinT) / varSrc;
  if (scale <= 0) return null;

  const a = scale * cosT;
  const b = -scale * sinT;
  const c = scale * sinT;
  const d = scale * cosT;

  const tx = meanDstX - (a * meanSrcX + b * meanSrcY);
  const ty = meanDstY - (c * meanSrcX + d * meanSrcY);

  return `matrix(${a.toFixed(6)}, ${c.toFixed(6)}, ${b.toFixed(6)}, ${d.toFixed(6)}, ${tx.toFixed(3)}, ${ty.toFixed(3)})`;
}
