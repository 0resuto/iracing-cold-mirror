import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';

export const TrackMap = React.memo(function TrackMap() {
  const [colorMode, setColorMode] = useState('default');
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, referenceData, deltaData, selectedLap } = useTelemetryData();
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
    // Используем текущий круг как основу для масштабирования
    const boundsSource = lapGpsPoints && lapGpsPoints.length > 0 ? lapGpsPoints : refGpsPoints;
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

    if (hoveredData && hoveredData.lat !== null && hoveredData.lon !== null) {
      currentData = hoveredData;
      if (lapData) {
        for (let i = 0; i < lapData.length; i++) {
          if (lapData[i].session_time === hoveredData.session_time) {
            if (i > 0) prevData = lapData[i - 1];
            break;
          }
        }
      }
    } else if (lapData && lapData.length > 0) {
      currentData = lapData[0];
    }

    if (!currentData || currentData.lat === null || currentData.lon === null) {
      return { x: 0, y: 0, travelAngle: 0, headingAngle: 0, isValid: false };
    }

    const px = currentData.lon * svgData.lonScale;
    const py = currentData.lat;
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

    const segments = [];
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

      segments.push({
        x1, y1, x2, y2,
        color: getColor(p1, p2)
      });
    }
    
    return segments;
  }, [lapGpsPoints, svgData, colorMode, deltaData]);

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomKRef = useRef(1);

  useEffect(() => {
    if (!svgRef.current || !gRef.current || !svgData) return;

    const BASE_THICKNESS = 4; // Общая базовая толщина для простой настройки

    const zoomBehavior = d3Zoom()
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

    const svg = d3Selection.select(svgRef.current);
    svg.call(zoomBehavior);

    // Initial center is handled by viewBox, but we can reset zoom if lap changes
    svg.call(zoomBehavior.transform, zoomIdentity);
  }, [svgData]);

  const getStrokeWidth = () => {
    const BASE_THICKNESS = 4;
    const k = zoomKRef.current;
    const visualThickness = BASE_THICKNESS / Math.sqrt(k);
    return visualThickness / k;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Track Position (Scroll to Zoom)</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--card-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="default">Default</option>
            <option value="speed">Speed</option>
            <option value="delta">Delta</option>
          </select>
        </div>
      </div>
      
      <div style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)', marginTop: '8px' }}>
        {lapTime === undefined || lapTime === null ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a lap to view map
          </div>
        ) : svgData ? (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <svg ref={svgRef} width="100%" height="100%" style={{ minHeight: '300px', cursor: 'grab' }} viewBox={`0 0 ${svgData.vbWidth} ${svgData.vbHeight}`} preserveAspectRatio="xMidYMid meet">
              <g ref={gRef}>
                {/* Background rect to catch pointer events for panning everywhere */}
                <rect width={svgData.vbWidth} height={svgData.vbHeight} fill="transparent" />
                
                {/* Reference Lap Trajectory */}
                <path 
                  className="adaptive-path"
                  d={svgData.basePath} 
                  fill="none" 
                  stroke="var(--text-muted)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Current Lap Trajectory */}
                {colorMode !== 'default' && lapSegments ? (
                  <g>
                    {lapSegments.map((seg, i) => (
                      <line 
                        key={`seg-${i}`}
                        className="adaptive-path"
                        x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                        stroke={seg.color}
                        strokeWidth={getStrokeWidth()}
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                ) : (
                  <path 
                    className="adaptive-path"
                    d={svgData.lapPath} 
                    fill="none" 
                    stroke="var(--accent-red)" 
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
                    fill="var(--card-bg)" 
                    stroke="var(--accent-blue)" 
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
                          <line x1="0" y1="0" x2="40" y2="0" stroke="var(--accent-blue)" strokeWidth="3" strokeDasharray="4 4" />
                          <polygon points="40,-4 48,0 40,4" fill="var(--accent-blue)" />
                        </g>
                      )}

                      {/* Car Body (rotated by heading) */}
                      <g transform={`rotate(${carState.headingAngle})`}>
                        {/* Car shape */}
                        <path 
                          d="M -12 -7 L 6 -7 L 12 -2 L 12 2 L 6 7 L -12 7 Z" 
                          fill="var(--accent-red)" 
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
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No GPS data available for this lap
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Progress: {(progress * 100).toFixed(1)}% <br/>
        <span style={{ fontSize: '12px' }}>Time: {displayTime.toFixed(1)}s / {lapTime ? lapTime.toFixed(1) : '0.0'}s</span>
      </div>
    </div>
  );
});
