import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { Select } from '@0resuto/ui-kit';
import trackPaths from '../assets/track_paths.json';

// Catmull-Rom cubic Bezier spline generator for 100% smooth trajectory curvature
function getCatmullRomSpline(points, closed = false) {
  if (!points || points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }
  
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  const pts = closed ? [points[points.length - 1], ...points, points[0], points[1]] : points;
  const start = closed ? 1 : 0;
  const end = closed ? pts.length - 2 : pts.length - 1;

  for (let i = start; i < end; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1] || p1;
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + (closed ? ' Z' : '');
}

export const TrackMap = React.memo(function TrackMap() {
  const [colorMode, setColorMode] = useState('default');
  const [mapMode, setMapMode] = useState('gps'); // 'gps' | 'schematic'
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, referenceData, deltaData, selectedLap, isLive } = useTelemetryData();
  const lapTime = selectedLap ? selectedLap.lap_time : null;

  const isLiveRef = useRef(isLive);
  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  let progress = 0;
  let displayTime = 0;

  if (hoveredData) {
    const startTime = lapData && lapData.length > 0 ? lapData[0].session_time : 0;
    displayTime = Math.max(0, hoveredData.session_time - startTime);

    if (typeof hoveredData.lap_dist_pct === 'number' || typeof hoveredData.lap_dist_pct === 'string') {
      progress = parseFloat(hoveredData.lap_dist_pct) || 0;
    } else if (lapTime > 0) {
      progress = Math.min(displayTime / lapTime, 1.0);
    }
  }

  const refGpsPoints = useMemo(() => {
    if (!referenceData || referenceData.length === 0) return null;
    const points = referenceData
      .filter(p => p.lat !== null && p.lon !== null && typeof p.lap_dist_pct === 'number' && p.lap_dist_pct >= 0.005 && p.lap_dist_pct <= 0.995)
      .sort((a, b) => a.lap_dist_pct - b.lap_dist_pct);
    return points.length >= 2 ? points : null;
  }, [referenceData]);

  const lapGpsPoints = useMemo(() => {
    if (!lapData || lapData.length === 0) return null;
    const points = lapData
      .filter(p => p.lat !== null && p.lon !== null && typeof p.lap_dist_pct === 'number' && p.lap_dist_pct >= 0.005 && p.lap_dist_pct <= 0.995)
      .sort((a, b) => a.lap_dist_pct - b.lap_dist_pct);
    return points.length >= 2 ? points : null;
  }, [lapData]);

  const svgData = useMemo(() => {
    // Используем текущий круг как основу для масштабирования, но только для исторического режима
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

    const vbWidth = 1000;
    const vbHeight = 1000;
    const padding = 50;
    const innerWidth = vbWidth - padding * 2;
    const innerHeight = vbHeight - padding * 2;

    const scale = Math.min(innerWidth / (width || 1), innerHeight / (height || 1));
    const xOffset = (vbWidth - width * scale) / 2;
    const yOffset = (vbHeight - height * scale) / 2;

    const projectToScreen = (lon, lat) => ({
      x: ((lon * lonScale) - minX) * scale + xOffset,
      y: vbHeight - ((lat - minY) * scale + yOffset)
    });

    const scaledBase = refGpsPoints ? refGpsPoints.map(p => projectToScreen(p.lon, p.lat)) : [];
    const basePath = scaledBase.length >= 2 ? getCatmullRomSpline(scaledBase, true) : null;

    let lapPath = null;
    if (lapGpsPoints && lapGpsPoints.length >= 2) {
      const scaledLap = lapGpsPoints.map(p => projectToScreen(p.lon, p.lat));
      lapPath = getCatmullRomSpline(scaledLap, true);
    }

    const METERS_PER_DEGREE_LAT = 111139;
    const metersPerVbUnit = METERS_PER_DEGREE_LAT / (scale || 1);
    const REAL_CAR_LENGTH_METERS = 4.8; // Real GT/Formula car length (~4.8m)
    const BASE_CAR_PATH_LENGTH = 20; // Length of SVG car path
    const realisticCarScale = (REAL_CAR_LENGTH_METERS * (scale / METERS_PER_DEGREE_LAT)) / BASE_CAR_PATH_LENGTH;

    return { 
      basePath, 
      lapPath, 
      projectToScreen,
      points: lapGpsPoints ? lapGpsPoints.map(p => projectToScreen(p.lon, p.lat)) : scaledBase, 
      vbWidth, 
      vbHeight, 
      scale, 
      xOffset, 
      yOffset, 
      minX, 
      minY, 
      lonScale,
      realisticCarScale,
      metersPerVbUnit
    };
  }, [refGpsPoints, lapGpsPoints, isLive]);

  const carState = useMemo(() => {
    if (!svgData) return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    
    let currentData = null;
    let prevData = null;

    if (hoveredData && hoveredData.lat != null && hoveredData.lon != null) {
      currentData = hoveredData;
      if (lapData) {
        for (let i = 0; i < lapData.length; i++) {
          if (lapData[i].session_time === hoveredData.session_time || Math.abs((lapData[i].lap_dist_pct || 0) - (hoveredData.lap_dist_pct || 0)) < 0.001) {
            if (i > 0) prevData = lapData[i - 1];
            break;
          }
        }
      }
    } else if (hoveredData && hoveredData.lap_dist_pct != null && lapData && lapData.length > 0) {
      const targetPct = hoveredData.lap_dist_pct;
      let minDiff = Infinity;
      for (let i = 0; i < lapData.length; i++) {
        if (lapData[i].lat == null || lapData[i].lon == null) continue;
        const diff = Math.abs((lapData[i].lap_dist_pct || 0) - targetPct);
        if (diff < minDiff) {
          minDiff = diff;
          currentData = lapData[i];
          if (i > 0) prevData = lapData[i - 1];
        }
      }
    } else if (lapData && lapData.length > 0) {
      currentData = lapData[0];
    }

    if (!currentData || (currentData.lat == null && currentData.lap_dist_pct == null)) {
      return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    }

    let px, py;
    if (currentData.lat != null && currentData.lon != null) {
      px = currentData.lon * svgData.lonScale;
      py = currentData.lat;
    } else if (currentData.lap_dist_pct != null && refGpsPoints && refGpsPoints.length > 0) {
      // Fallback: estimate GPS from reference lap distance when live telemetry lacks GPS coordinates
      let closest = refGpsPoints[0];
      let minDiff = Infinity;
      for (const rp of refGpsPoints) {
        const diff = Math.abs(rp.lap_dist_pct - currentData.lap_dist_pct);
        if (diff < minDiff) { minDiff = diff; closest = rp; }
      }
      px = closest.lon * svgData.lonScale;
      py = closest.lat;
    } else {
      return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    }

    const x = (px - svgData.minX) * svgData.scale + svgData.xOffset;
    const y = svgData.vbHeight - ((py - svgData.minY) * svgData.scale + svgData.yOffset);

    let travelAngle = 0;

    if (prevData && prevData.lat !== null && prevData.lon !== null) {
      const pxPrev = prevData.lon * svgData.lonScale;
      const pyPrev = prevData.lat;
      const xPrev = (pxPrev - svgData.minX) * svgData.scale + svgData.xOffset;
      const yPrev = svgData.vbHeight - ((pyPrev - svgData.minY) * svgData.scale + svgData.yOffset);
      
      const dx = x - xPrev;
      const dy = y - yPrev;
      
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        travelAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      }
    }

    // slip_angle is already in degrees from the backend
    const slipAngleDeg = currentData.slip_angle || 0;
    
    // Depending on iRacing sign convention, we might need to add or subtract.
    // Plus seems to correct the nose direction
    const headingAngle = travelAngle + slipAngleDeg;

    return { 
      x, 
      y, 
      travelAngle, 
      headingAngle,
      speed: currentData.speed || 0,
      isValid: true 
    };
  }, [svgData, hoveredData, lapData, refGpsPoints]);

  const refCarState = useMemo(() => {
    if (!svgData || !referenceData || referenceData.length === 0) return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    
    let currentData = null;
    let prevData = null;

    if (hoveredData && hoveredData.lap_dist_pct != null) {
      const targetPct = hoveredData.lap_dist_pct;
      let minDiff = Infinity;
      for (let i = 0; i < referenceData.length; i++) {
        if (referenceData[i].lat == null || referenceData[i].lon == null) continue;
        const diff = Math.abs((referenceData[i].lap_dist_pct || 0) - targetPct);
        if (diff < minDiff) {
          minDiff = diff;
          currentData = referenceData[i];
          if (i > 0) prevData = referenceData[i - 1];
        }
      }
    } else {
      currentData = referenceData[0];
    }

    if (!currentData || (currentData.lat == null && currentData.lap_dist_pct == null)) {
      return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    }

    let px, py;
    if (currentData.lat != null && currentData.lon != null) {
      px = currentData.lon * svgData.lonScale;
      py = currentData.lat;
    } else {
      return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    }

    const x = (px - svgData.minX) * svgData.scale + svgData.xOffset;
    const y = svgData.vbHeight - ((py - svgData.minY) * svgData.scale + svgData.yOffset);

    let travelAngle = 0;
    if (prevData && prevData.lat !== null && prevData.lon !== null) {
      const pxPrev = prevData.lon * svgData.lonScale;
      const pyPrev = prevData.lat;
      const xPrev = (pxPrev - svgData.minX) * svgData.scale + svgData.xOffset;
      const yPrev = svgData.vbHeight - ((pyPrev - svgData.minY) * svgData.scale + svgData.yOffset);
      
      const dx = x - xPrev;
      const dy = y - yPrev;
      
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        travelAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      }
    }

    const slipAngleDeg = currentData.slip_angle || 0;
    const headingAngle = travelAngle + slipAngleDeg;

    return { 
      x, 
      y, 
      travelAngle, 
      headingAngle,
      isValid: true 
    };
  }, [svgData, hoveredData, referenceData]);

  const sectorBoundaries = useMemo(() => {
    if (!selectedLap || !selectedLap.sectors || selectedLap.sectors.length === 0 || !lapData || lapData.length === 0 || !svgData) return [];
    
    const lapStartTime = Math.min(...lapData.map(p => p.session_time));
    const boundaries = [];
    let cumulativeTime = 0;
    
    const sortedSectors = [...selectedLap.sectors].sort((a, b) => a.sector_number - b.sector_number);
    
    for (let i = 0; i < sortedSectors.length - 1; i++) {
      cumulativeTime += sortedSectors[i].sector_time;
      
      let closestPoint = null;
      let minDiff = Infinity;
      
      for (const point of lapData) {
        if (point.lat === null || point.lon === null) continue;
        const elapsed = point.session_time - lapStartTime;
        const diff = Math.abs(elapsed - cumulativeTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = point;
        }
      }
      
      if (closestPoint) {
        const px = closestPoint.lon * svgData.lonScale;
        const py = closestPoint.lat;
        const x = (px - svgData.minX) * svgData.scale + svgData.xOffset;
        const y = svgData.vbHeight - ((py - svgData.minY) * svgData.scale + svgData.yOffset);
        boundaries.push({ x, y, sector_number: sortedSectors[i].sector_number });
      }
    }
    
    return boundaries;
  }, [selectedLap, lapData, svgData]);

  const lapSegments = useMemo(() => {
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
  }, [lapGpsPoints, svgData, colorMode, deltaData]);

  const trackId = useMemo(() => {
    if (isLive && lapData && lapData.length > 0 && lapData[0].track_id) return String(lapData[0].track_id);
    if (hoveredData && hoveredData.track_id) return String(hoveredData.track_id);
    if (selectedLap && selectedLap.track_id) return String(selectedLap.track_id);
    return null;
  }, [isLive, lapData, hoveredData, selectedLap]);

  const fallbackPathD = (trackId && trackPaths[trackId]) ? trackPaths[trackId] : null;

  const fallbackPathRef = useRef(null);
  const [fallbackBBox, setFallbackBBox] = useState(null);
  const [fallbackCarPos, setFallbackCarPos] = useState({ x: 0, y: 0, travelAngle: 0, isValid: false });

  // Update bounding box for SVG viewbox calculation
  useEffect(() => {
    if (fallbackPathRef.current && fallbackPathD) {
      setFallbackBBox(fallbackPathRef.current.getBBox());
    } else {
      setFallbackBBox(null);
    }
  }, [fallbackPathD]);

  // Update car position on fallback path
  useEffect(() => {
    if (fallbackPathRef.current && fallbackBBox && fallbackPathD) {
      try {
        const len = fallbackPathRef.current.getTotalLength();
        if (len > 0) {
          const pt = fallbackPathRef.current.getPointAtLength(progress * len);
          const pt2 = fallbackPathRef.current.getPointAtLength(Math.min((progress + 0.001) * len, len));
          const dx = pt2.x - pt.x;
          const dy = pt2.y - pt.y;
          const travelAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          setFallbackCarPos({ x: pt.x, y: pt.y, travelAngle, isValid: true });
        }
      } catch (_e) {
        setFallbackCarPos({ x: 0, y: 0, travelAngle: 0, isValid: false });
      }
    }
  }, [progress, fallbackBBox, fallbackPathD]);

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const containerRef = useRef(null);
  const zoomKRef = useRef(1);
  const [zoomK, setZoomK] = useState(1);
  const [containerWidth, setContainerWidth] = useState(500);
  const zoomBehaviorRef = useRef(null);

  // Measure actual container pixel width for accurate physical map scale
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute dynamic scale bar (e.g. 25m, 50m, 100m, 250m) based on current zoom and track projection
  const scaleBarInfo = useMemo(() => {
    if (!svgData || !svgData.metersPerVbUnit) return null;
    
    // 1 screen pixel in real-world meters:
    const vbToScreen = (containerWidth || 500) / svgData.vbWidth;
    const metersPerScreenPx = (svgData.metersPerVbUnit / (zoomK || 1)) / (vbToScreen || 0.5);

    // Target scale bar width ~ 65-85px
    const targetPx = 75;
    const approxMeters = metersPerScreenPx * targetPx;

    const SCALE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
    let chosenDist = SCALE_STEPS[0];
    for (const step of SCALE_STEPS) {
      if (step <= approxMeters * 1.25) {
        chosenDist = step;
      } else {
        break;
      }
    }

    const widthPx = Math.max(30, Math.min(130, Math.round(chosenDist / metersPerScreenPx)));
    const label = chosenDist >= 1000 ? `${chosenDist / 1000} km` : `${chosenDist} m`;

    return { widthPx, label };
  }, [svgData, zoomK, containerWidth]);

  const MIN_CAR_SCREEN_PX = 18;
  const BASE_CAR_PATH_LENGTH = 20;

  const getAdaptiveCarScale = (k, svgDataObj, contWidth) => {
    if (!svgDataObj) return 1;
    const vbToScreen = (contWidth || 500) / svgDataObj.vbWidth;
    const minScaleForZoom = MIN_CAR_SCREEN_PX / (BASE_CAR_PATH_LENGTH * (vbToScreen || 0.5) * (k || 1));
    return Math.max(svgDataObj.realisticCarScale, minScaleForZoom);
  };

  useEffect(() => {
    if (!svgRef.current || !gRef.current || !svgData) return;

    const BASE_THICKNESS = 4; // Общая базовая толщина для простой настройки
    const svg = d3Selection.select(svgRef.current);

    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3Zoom()
      .scaleExtent([0.1, 20])
      .filter((event) => {
        if (event.type === 'wheel') return true;
        if (isLiveRef.current) return false; // Disable panning in live mode
        return !event.ctrlKey && event.button !== 2; // Default D3 behavior
      })
      .wheelDelta((event) => {
        // Default d3 wheelDelta formula multiplied by 2 for doubled sensitivity
        return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * 2;
      })
      .on('zoom', (event) => {
        const { transform } = event;
        zoomKRef.current = transform.k;
        setZoomK(transform.k);
        d3Selection.select(gRef.current).attr('transform', transform);
        
        const visualThickness = BASE_THICKNESS / Math.sqrt(transform.k);
        const svgStrokeWidth = visualThickness / transform.k;
        const visualRadius = (BASE_THICKNESS * 2) / Math.sqrt(transform.k);
        const svgRadius = visualRadius / transform.k;

        if (gRef.current) {
          gRef.current.style.setProperty('--path-stroke', svgStrokeWidth);
          gRef.current.style.setProperty('--circle-stroke', (visualThickness / 2) / transform.k);
          gRef.current.style.setProperty('--circle-r', svgRadius);
          
          const carScale = getAdaptiveCarScale(transform.k, svgData, containerWidth);
          gRef.current.style.setProperty('--car-scale', carScale);
        }
      });

      svg.call(zoomBehaviorRef.current);
    }

    // Set initial scale properties based on current zoom level
    if (gRef.current && svgData) {
      const k = zoomKRef.current || 1;
      const visualThickness = BASE_THICKNESS / Math.sqrt(k);
      const svgStrokeWidth = visualThickness / k;
      const visualRadius = (BASE_THICKNESS * 2) / Math.sqrt(k);
      const svgRadius = visualRadius / k;
      const carScale = getAdaptiveCarScale(k, svgData, containerWidth);

      gRef.current.style.setProperty('--path-stroke', svgStrokeWidth);
      gRef.current.style.setProperty('--circle-stroke', (visualThickness / 2) / k);
      gRef.current.style.setProperty('--circle-r', svgRadius);
      gRef.current.style.setProperty('--car-scale', carScale);
    }

    // Initial center is handled by viewBox, reset zoom when track layout changes or leaving live mode
    if (!isLive) {
      svg.call(zoomBehaviorRef.current.transform, zoomIdentity);
    }
    
    // Cleanup on unmount
    return () => {
      svg.on('.zoom', null);
      zoomBehaviorRef.current = null;
    };
  }, [svgData, isLive, containerWidth]);

  // Auto-center map on car during live telemetry
  useEffect(() => {
    if (isLive && carState.isValid && svgRef.current && zoomBehaviorRef.current && svgData) {
      const svg = d3Selection.select(svgRef.current);
      const k = zoomKRef.current;
      const tx = svgData.vbWidth / 2 - carState.x * k;
      const ty = svgData.vbHeight / 2 - carState.y * k;
      
      svg.call(zoomBehaviorRef.current.transform, zoomIdentity.translate(tx, ty).scale(k));
    }
  }, [carState.x, carState.y, carState.isValid, isLive, svgData]);

  return (
    <div className="flex flex-col items-center h-full">
      <div className="w-full flex justify-between items-center px-2 pt-1 pb-0.5">
        <div className="flex items-center gap-2">
          <Select 
            size="sm"
            value={mapMode}
            onChange={setMapMode}
            options={[
              { value: 'gps', label: 'GPS' },
              { value: 'schematic', label: 'Schematic' }
            ]}
            className="w-28"
          />
          <Select 
            size="sm"
            value={colorMode}
            onChange={setColorMode}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'speed', label: 'Speed' },
              { value: 'delta', label: 'Delta' }
            ]}
            className="w-28"
          />
        </div>
        {colorMode !== 'default' && (
          <div className="flex items-center gap-2 text-[10px] text-brand-10/80 font-mono">
            {colorMode === 'speed' ? (
              <>
                <span className="text-red-400 font-bold">Slow</span>
                <div className="w-16 h-2 rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                <span className="text-green-400 font-bold">Fast</span>
              </>
            ) : (
              <>
                <span className="text-red-400 font-bold">+ Δ</span>
                <div className="w-16 h-2 rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                <span className="text-green-400 font-bold">- Δ</span>
              </>
            )}
          </div>
        )}
      </div>
      
      <div ref={containerRef} className="flex-1 w-full relative overflow-hidden mt-1 bg-[#09090b] rounded-xl border border-white/10 shadow-inner">
        {isLive && (!lapData || lapData.length === 0) && !fallbackPathD ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-brand-10/40 gap-3">
            <span className="w-6 h-6 border-2 border-brand-60 border-t-zinc-400 rounded-full animate-spin"></span>
            <span>Waiting for live GPS data...</span>
          </div>
        ) : (!isLive && (lapTime === undefined || lapTime === null)) ? (
          <div className="w-full h-full flex items-center justify-center text-brand-10/60 text-sm font-mono tracking-widest">
            Select a lap to view map
          </div>
        ) : svgData && mapMode === 'gps' ? (
          <div className="w-full h-full cursor-grab active:cursor-grabbing absolute top-0 left-0">
            {/* Dynamic Map Scale Bar (Top-Left HUD) */}
            {scaleBarInfo && (
              <div className="absolute top-3 left-3 pointer-events-none flex flex-col items-start bg-black/80 backdrop-blur-md border border-white/15 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-brand-10 shadow-xl select-none z-10">
                <span className="text-[10px] font-bold text-slate-200 leading-none mb-1">{scaleBarInfo.label}</span>
                <div 
                  className="h-1 bg-white/40 rounded-xs flex items-center justify-between"
                  style={{ width: `${scaleBarInfo.widthPx}px` }}
                >
                  <div className="w-0.5 h-2.5 bg-brand-30 -ml-0.5 rounded-full"></div>
                  <div className="w-0.5 h-2.5 bg-brand-30 -mr-0.5 rounded-full"></div>
                </div>
              </div>
            )}

            <svg 
              ref={svgRef} 
              width="100%" 
              height="100%" 
              shapeRendering="geometricPrecision"
              style={{ minHeight: '300px', cursor: 'grab' }} 
              viewBox={`0 0 ${svgData.vbWidth} ${svgData.vbHeight}`} 
              preserveAspectRatio="xMidYMid meet"
            >
              <g ref={gRef}>
                {/* Background rect to catch pointer events for panning everywhere */}
                <rect width={svgData.vbWidth} height={svgData.vbHeight} fill="transparent" />
                
                {/* Reference Lap Trajectory */}
                <path 
                  d={svgData.basePath} 
                  fill="none" 
                  stroke="rgba(56, 189, 248, 0.45)" 
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Current Lap Trajectory */}
                {colorMode !== 'default' && lapSegments ? (
                  <g>
                    {lapSegments.map((seg, i) => (
                      <path 
                        key={`seg-${i}`}
                        d={seg.d}
                        stroke={seg.color}
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </g>
                ) : (
                  <path 
                    d={svgData.lapPath} 
                    fill="none" 
                    stroke="#ef4444" 
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round" 
                  />
                )}
                
                {/* Sector Boundaries */}
                {sectorBoundaries.map((boundary, i) => (
                  <circle 
                    key={`sector-${i}`}
                    cx={boundary.x} 
                    cy={boundary.y} 
                    r="4"
                    fill="#09090b" 
                    stroke="#38bdf8" 
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* Car Position and Vectors */}
                {carState.isValid && (
                  <g transform={`translate(${carState.x}, ${carState.y})`}>
                    <g className="car-scale" style={{ transform: 'scale(var(--car-scale, 1))' }}>
                      {/* Velocity Vector (shows true direction of travel) */}
                      {carState.speed > 5 && (
                        <g transform={`rotate(${carState.travelAngle})`}>
                          <line x1="0" y1="0" x2="40" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                          <polygon points="40,-4 48,0 40,4" fill="#38bdf8" />
                        </g>
                      )}

                      {/* Car Body (rotated by heading) */}
                      <g transform={`rotate(${carState.headingAngle})`}>
                        {/* Car shape: 20 units long, 8 units wide */}
                        <path 
                          d="M -10 -4 L 4 -4 L 10 -1.5 L 10 1.5 L 4 4 L -10 4 Z" 
                          fill="#ef4444" 
                          stroke="white" 
                          strokeWidth="1" 
                        />
                        {/* Windshield */}
                        <path d="M -1 -3 L 3 -2.5 L 3 2.5 L -1 3 Z" fill="rgba(255,255,255,0.75)" />
                      </g>
                    </g>
                  </g>
                )}

                {/* Ghost Reference Car */}
                {refCarState.isValid && (
                  <g transform={`translate(${refCarState.x}, ${refCarState.y})`}>
                    <g className="car-scale" style={{ transform: 'scale(var(--car-scale, 1))', opacity: 0.6 }}>
                      <g transform={`rotate(${refCarState.headingAngle})`}>
                        <path 
                          d="M -10 -4 L 4 -4 L 10 -1.5 L 10 1.5 L 4 4 L -10 4 Z" 
                          fill="#64748b" 
                          stroke="white" 
                          strokeWidth="1" 
                        />
                        <path d="M -1 -3 L 3 -2.5 L 3 2.5 L -1 3 Z" fill="rgba(255,255,255,0.6)" />
                      </g>
                    </g>
                  </g>
                )}
              </g>
            </svg>
          </div>
        ) : fallbackPathD ? (
          <div className="w-full h-full absolute top-0 left-0">
            <svg 
              width="100%" 
              height="100%" 
              shapeRendering="geometricPrecision"
              viewBox={fallbackBBox ? `${fallbackBBox.x - 50} ${fallbackBBox.y - 50} ${fallbackBBox.width + 100} ${fallbackBBox.height + 100}` : "0 0 1000 1000"} 
              preserveAspectRatio="xMidYMid meet"
            >
              <g>
                <path
                  ref={fallbackPathRef}
                  d={fallbackPathD}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {fallbackCarPos.isValid && (
                  <g transform={`translate(${fallbackCarPos.x}, ${fallbackCarPos.y}) rotate(${fallbackCarPos.travelAngle})`}>
                    <path 
                      d="M -10 -4 L 4 -4 L 10 -1.5 L 10 1.5 L 4 4 L -10 4 Z" 
                      fill="#ef4444" 
                      stroke="white" 
                      strokeWidth={fallbackBBox ? Math.max(1, fallbackBBox.width / 800) : 2} 
                      transform={fallbackBBox ? `scale(${Math.max(1, fallbackBBox.width / 500)})` : "scale(1)"}
                    />
                  </g>
                )}
              </g>
            </svg>
            <div className="absolute top-3 left-3 bg-brand-bg/90 backdrop-blur-md border border-brand-60 px-3 py-1.5 rounded-md text-[10px] text-brand-10/80 font-mono shadow-md pointer-events-none">
              {mapMode === 'schematic' ? 'Schematic Map' : 'SVG Map (No GPS)'}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-brand-10/60 text-sm font-mono tracking-widest text-center px-4">
            <span className="text-accent-red mb-2">Track data is missing</span>
            <span className="text-xs">No GPS or SVG map available for this track</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-brand-10/60 text-center font-mono font-bold px-3 py-1 rounded-full">
        Progress: {(progress * 100).toFixed(1)}% <span className="mx-2 text-border-strong">|</span> <span className="text-xs">Time: {displayTime.toFixed(1)}s / {lapTime ? lapTime.toFixed(1) : '0.0'}s</span>
      </div>
    </div>
  );
});
