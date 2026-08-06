import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import trackPaths from '../assets/track_paths.json';

export const TrackMap = React.memo(function TrackMap() {
  const [colorMode, setColorMode] = useState('default');
  const [mapMode, setMapMode] = useState('gps'); // 'gps' | 'schematic'
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, referenceData, deltaData, selectedLap, isLive } = useTelemetryData();
  const lapTime = selectedLap ? selectedLap.lap_time : null;

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
    const basePath = scaledBase.length > 0 ? scaledBase.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z' : null;

    let lapPath = null;
    if (lapGpsPoints) {
      const scaledLap = lapGpsPoints.map(p => projectToScreen(p.lon, p.lat));
      lapPath = scaledLap.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    }

    return { 
      basePath, 
      lapPath, 
      points: lapGpsPoints ? lapGpsPoints.map(p => projectToScreen(p.lon, p.lat)) : scaledBase, 
      vbWidth, 
      vbHeight, 
      scale, 
      xOffset, 
      yOffset, 
      minX, 
      minY, 
      lonScale 
    };
  }, [refGpsPoints, lapGpsPoints]);

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
  }, [svgData, hoveredData, lapData]);

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
    for (let i = 0; i < lapGpsPoints.length - 1; i++) {
      const p1 = lapGpsPoints[i];
      const p2 = lapGpsPoints[i+1];
      
      const px1 = p1.lon * svgData.lonScale;
      const py1 = p1.lat;
      const x1 = (px1 - svgData.minX) * svgData.scale + svgData.xOffset;
      const y1 = svgData.vbHeight - ((py1 - svgData.minY) * svgData.scale + svgData.yOffset);

      const px2 = p2.lon * svgData.lonScale;
      const py2 = p2.lat;
      const x2 = (px2 - svgData.minX) * svgData.scale + svgData.xOffset;
      const y2 = svgData.vbHeight - ((py2 - svgData.minY) * svgData.scale + svgData.yOffset);

      const color = getColor(p1, p2);
      if (!pathsByColor[color]) {
        pathsByColor[color] = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        pathsByColor[color] += ` M ${x1} ${y1} L ${x2} ${y2}`;
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
      } catch (e) {
        setFallbackCarPos({ x: 0, y: 0, travelAngle: 0, isValid: false });
      }
    }
  }, [progress, fallbackBBox, fallbackPathD]);

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomKRef = useRef(1);
  const zoomBehaviorRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !gRef.current || !svgData) return;

    const BASE_THICKNESS = 4; // Общая базовая толщина для простой настройки
    const svg = d3Selection.select(svgRef.current);

    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3Zoom()
      .scaleExtent([0.5, 20])
      .wheelDelta((event) => {
        // Default d3 wheelDelta formula multiplied by 2 for doubled sensitivity
        return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * 2;
      })
      .on('zoom', (event) => {
        const { transform } = event;
        zoomKRef.current = transform.k;
        d3Selection.select(gRef.current).attr('transform', transform);
        
        // Чем больше зум (transform.k), тем тоньше визуальная линия:
        const visualThickness = BASE_THICKNESS / Math.sqrt(transform.k);
        const svgStrokeWidth = visualThickness / transform.k;
        
        const visualRadius = (BASE_THICKNESS * 2) / Math.sqrt(transform.k);
        const svgRadius = visualRadius / transform.k;

        d3Selection.select(gRef.current).selectAll('.adaptive-path')
          .attr('stroke-width', svgStrokeWidth);
        d3Selection.select(gRef.current).selectAll('.adaptive-circle')
          .attr('stroke-width', (visualThickness / 2) / transform.k)
          .attr('r', svgRadius);
        d3Selection.select(gRef.current).select('.car-scale')
          .attr('transform', `scale(${1 / transform.k})`);
      });

      svg.call(zoomBehaviorRef.current);
    }

    // Initial center is handled by viewBox, reset zoom when track layout changes
    svg.call(zoomBehaviorRef.current.transform, zoomIdentity);
    
    // Cleanup on unmount
    return () => {
      svg.on('.zoom', null);
      zoomBehaviorRef.current = null;
    };
  }, [svgData?.basePath]);

  const getStrokeWidth = () => {
    const BASE_THICKNESS = 4;
    const k = zoomKRef.current;
    const visualThickness = BASE_THICKNESS / Math.sqrt(k);
    return visualThickness / k;
  };

  return (
    <div className="flex flex-col items-center h-full">
      <div className="w-full flex justify-between items-center px-4 pt-3 pb-1">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/60 font-extrabold m-0">Track Position (Scroll to Zoom)</h2>
        <div className="flex items-center gap-2">
          <select 
            value={mapMode}
            onChange={(e) => setMapMode(e.target.value)}
            className="bg-brand-60 text-brand-10 border border-brand-60 px-2 py-1 rounded-md text-xs cursor-pointer outline-none focus:border-accent-blue font-mono font-semibold"
          >
            <option value="gps">GPS</option>
            <option value="schematic">Schematic</option>
          </select>
          <select 
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            className="bg-brand-60 text-brand-10 border border-brand-60 px-2 py-1 rounded-md text-xs cursor-pointer outline-none focus:border-accent-blue font-mono font-semibold"
          >
            <option value="default">Default</option>
            <option value="speed">Speed</option>
            <option value="delta">Delta</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 w-full relative overflow-hidden bg-brand-60/60 backdrop-blur-md rounded-xl border border-white/5 mt-2 shadow-lg">
        {isLive && (!lapData || lapData.length === 0) ? (
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
            {colorMode !== 'default' && (
              <div className="absolute bottom-3 left-3 bg-brand-bg/90 backdrop-blur-md border border-brand-60 px-3 py-1.5 rounded-md text-[10px] text-brand-10/80 flex items-center gap-2 font-mono shadow-md z-10 pointer-events-none">
                {colorMode === 'speed' ? (
                  <>
                    <span className="text-red-400 font-bold">Slow</span>
                    <div className="w-16 h-2 rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                    <span className="text-green-400 font-bold">Fast</span>
                  </>
                ) : (
                  <>
                    <span className="text-red-400 font-bold">+ Δ (Loss)</span>
                    <div className="w-16 h-2 rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                    <span className="text-green-400 font-bold">- Δ (Gain)</span>
                  </>
                )}
              </div>
            )}
            <svg ref={svgRef} width="100%" height="100%" style={{ minHeight: '300px', cursor: 'grab' }} viewBox={`0 0 ${svgData.vbWidth} ${svgData.vbHeight}`} preserveAspectRatio="xMidYMid meet">
              <g ref={gRef}>
                {/* Background rect to catch pointer events for panning everywhere */}
                <rect width={svgData.vbWidth} height={svgData.vbHeight} fill="transparent" />
                
                {/* Reference Lap Trajectory */}
                <path 
                  className="adaptive-path"
                  d={svgData.basePath} 
                  fill="none" 
                  stroke="var(--color-text-muted)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Current Lap Trajectory */}
                {colorMode !== 'default' && lapSegments ? (
                  <g>
                    {lapSegments.map((seg, i) => (
                      <path 
                        key={`seg-${i}`}
                        className="adaptive-path"
                        d={seg.d}
                        stroke={seg.color}
                        strokeWidth={getStrokeWidth()}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </g>
                ) : (
                  <path 
                    className="adaptive-path"
                    d={svgData.lapPath} 
                    fill="none" 
                    stroke="var(--color-accent-red)" 
                    strokeWidth={getStrokeWidth()}
                    strokeLinecap="round"
                    strokeLinejoin="round" 
                  />
                )}
                
                {/* Sector Boundaries */}
                {sectorBoundaries.map((boundary, i) => (
                  <circle 
                    key={`sector-${i}`}
                    className="adaptive-circle" 
                    cx={boundary.x} 
                    cy={boundary.y} 
                    r="5" 
                    fill="var(--color-brand-60)" 
                    stroke="var(--color-accent-blue)" 
                    strokeWidth="3" 
                  />
                ))}

                {/* Car Position and Vectors */}
                {carState.isValid && (
                  <g transform={`translate(${carState.x}, ${carState.y})`}>
                    <g className="car-scale">
                      {/* Velocity Vector (shows true direction of travel) */}
                      {carState.speed > 5 && (
                        <g transform={`rotate(${carState.travelAngle})`}>
                          <line x1="0" y1="0" x2="40" y2="0" stroke="var(--color-accent-blue)" strokeWidth="3" strokeDasharray="4 4" />
                          <polygon points="40,-4 48,0 40,4" fill="var(--color-accent-blue)" />
                        </g>
                      )}

                      {/* Car Body (rotated by heading) */}
                      <g transform={`rotate(${carState.headingAngle})`}>
                        {/* Car shape */}
                        <path 
                          d="M -12 -7 L 6 -7 L 12 -2 L 12 2 L 6 7 L -12 7 Z" 
                          fill="var(--color-accent-red)" 
                          stroke="white" 
                          strokeWidth="2" 
                        />
                        {/* Windshield to indicate front clearly */}
                        <path d="M 0 -5 L 4 -4 L 4 4 L 0 5 Z" fill="rgba(255,255,255,0.5)" />
                      </g>
                    </g>
                  </g>
                )}
              </g>
            </svg>
          </div>
        ) : fallbackPathD ? (
          <div className="w-full h-full absolute top-0 left-0">
            <svg width="100%" height="100%" viewBox={fallbackBBox ? `${fallbackBBox.x - 50} ${fallbackBBox.y - 50} ${fallbackBBox.width + 100} ${fallbackBBox.height + 100}` : "0 0 1000 1000"} preserveAspectRatio="xMidYMid meet">
              <g>
                <path
                  ref={fallbackPathRef}
                  d={fallbackPathD}
                  fill="none"
                  stroke="var(--color-text-muted)"
                  strokeWidth={fallbackBBox ? Math.max(1, fallbackBBox.width / 200) : 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {fallbackCarPos.isValid && (
                  <g transform={`translate(${fallbackCarPos.x}, ${fallbackCarPos.y}) rotate(${fallbackCarPos.travelAngle})`}>
                    <path 
                      d="M -12 -7 L 6 -7 L 12 -2 L 12 2 L 6 7 L -12 7 Z" 
                      fill="var(--color-accent-red)" 
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
      
      <div className="mt-4 text-sm text-brand-10/60 text-center font-mono font-bold bg-brand-60/50 border border-white/5 px-4 py-1.5 rounded-full shadow-sm">
        Progress: {(progress * 100).toFixed(1)}% <span className="mx-2 text-border-strong">|</span> <span className="text-xs">Time: {displayTime.toFixed(1)}s / {lapTime ? lapTime.toFixed(1) : '0.0'}s</span>
      </div>
    </div>
  );
});
