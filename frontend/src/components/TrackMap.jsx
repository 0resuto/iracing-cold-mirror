import React, { useMemo, useRef, useEffect } from 'react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';

export const TrackMap = React.memo(function TrackMap() {
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, referenceData, selectedLap } = useTelemetryData();
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
    const basePath = scaledBase.length > 0 ? scaledBase.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : null;

    let lapPath = null;
    if (lapGpsPoints) {
      const scaledLap = lapGpsPoints.map(p => projectToScreen(p.lon, p.lat));
      lapPath = scaledLap.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
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

  const dotPos = useMemo(() => {
    if (!svgData) return { x: 0, y: 0 };
    if (hoveredData && hoveredData.lat !== null && hoveredData.lon !== null) {
      const px = hoveredData.lon * svgData.lonScale;
      const py = hoveredData.lat;
      const x = (px - svgData.minX) * svgData.scale + svgData.xOffset;
      const y = svgData.vbHeight - ((py - svgData.minY) * svgData.scale + svgData.yOffset);
      return { x, y };
    }
    return svgData.points.length > 0 ? svgData.points[0] : { x: 0, y: 0 };
  }, [svgData, hoveredData]);

  const svgRef = useRef(null);
  const gRef = useRef(null);

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
        d3Selection.select(gRef.current).attr('transform', transform);
        
        // Чем больше зум (transform.k), тем тоньше визуальная линия:
        const visualThickness = BASE_THICKNESS / Math.sqrt(transform.k);
        const svgStrokeWidth = visualThickness / transform.k;
        
        const visualRadius = (BASE_THICKNESS * 2) / Math.sqrt(transform.k);
        const svgRadius = visualRadius / transform.k;

        d3Selection.select(gRef.current).selectAll('.adaptive-path')
          .attr('stroke-width', svgStrokeWidth);
        d3Selection.select(gRef.current).select('.adaptive-circle')
          .attr('stroke-width', (visualThickness / 2) / transform.k)
          .attr('r', svgRadius);
      });

    const svg = d3Selection.select(svgRef.current);
    svg.call(zoomBehavior);

    // Initial center is handled by viewBox, but we can reset zoom if lap changes
    svg.call(zoomBehavior.transform, zoomIdentity);
  }, [svgData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Track Position (Scroll to Zoom)</h2>
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
                <path 
                  className="adaptive-path"
                  d={svgData.lapPath} 
                  fill="none" 
                  stroke="var(--accent-red)" 
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round" 
                />
                
                {/* Car Position */}
                <circle className="adaptive-circle" cx={dotPos.x} cy={dotPos.y} r="8" fill="var(--accent-red)" stroke="white" strokeWidth="2" />
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
