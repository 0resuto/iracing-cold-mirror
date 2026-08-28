import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { useAppStore } from '../../store/useAppStore';
import { useTelemetryData } from '../../features/telemetry/useTelemetryData';
import { Select, ProgressBar } from '@0resuto/ui-kit';
import trackPaths from '../../assets/track_paths.json';
import { buildTrackScene } from '../../utils/trackScene';
import { buildColorSegments } from './colorSegments';
import { useCarPosition } from './useCarPosition';

const MIN_CAR_SCREEN_PX = 18;
const BASE_CAR_PATH_LENGTH = 20;

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
    return buildTrackScene({ refGpsPoints, lapGpsPoints, isLive });
  }, [refGpsPoints, lapGpsPoints, isLive]);

  // Resolve current + previous lap point for the primary car
  const resolvedCar = useMemo(() => {
    if (!lapData || lapData.length === 0 || !svgData) return null;
    let currentData = null;
    let prevData = null;

    if (hoveredData && hoveredData.lat != null && hoveredData.lon != null) {
      currentData = hoveredData;
      for (let i = 0; i < lapData.length; i++) {
        if (lapData[i].session_time === hoveredData.session_time || Math.abs((lapData[i].lap_dist_pct || 0) - (hoveredData.lap_dist_pct || 0)) < 0.001) {
          if (i > 0) prevData = lapData[i - 1];
          break;
        }
      }
    } else if (hoveredData && hoveredData.lap_dist_pct != null) {
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
    } else {
      currentData = lapData[0];
    }

    return { currentData, prevData };
  }, [hoveredData, lapData, svgData]);

  const carState = useCarPosition(resolvedCar?.currentData, resolvedCar?.prevData, svgData, refGpsPoints);

  // Resolve current + previous reference point for the ghost car
  const resolvedRefCar = useMemo(() => {
    if (!referenceData || referenceData.length === 0 || !svgData) return null;
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

    return { currentData, prevData };
  }, [hoveredData, referenceData, svgData]);

  const refCarState = useCarPosition(resolvedRefCar?.currentData, resolvedRefCar?.prevData, svgData, refGpsPoints);

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
    return buildColorSegments({ colorMode, lapGpsPoints, svgData, deltaData });
  }, [colorMode, lapGpsPoints, svgData, deltaData]);

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
      } catch {
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

  const getAdaptiveCarScale = useCallback((k, svgDataObj, contWidth) => {
    if (!svgDataObj) return 1;
    const vbToScreen = (contWidth || 500) / svgDataObj.vbWidth;
    const minScaleForZoom = MIN_CAR_SCREEN_PX / (BASE_CAR_PATH_LENGTH * (vbToScreen || 0.5) * (k || 1));
    return Math.max(svgDataObj.realisticCarScale, minScaleForZoom);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !gRef.current || !svgData) return;

    const BASE_THICKNESS = 4; // Общая базовая толщина для простой настройки
    const svg = d3Selection.select(svgRef.current);

    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3Zoom()
        .scaleExtent([0.1, 30])
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
  }, [svgData, isLive, containerWidth, getAdaptiveCarScale]);

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

  const renderCar = (state, bodyFill, opacity = 0.5) => {
    if (!state.isValid) return null;
    return (
      <g transform={`translate(${state.x}, ${state.y})`}>
        <g className="car-scale" style={{ transform: 'scale(var(--car-scale, 1))', opacity }}>
          {state.speed > 5 && (
            <g transform={`rotate(${state.travelAngle})`}>
              <line x1="0" y1="0" x2="32" y2="0" stroke={bodyFill} strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              <polygon points="32,-3 38,0 32,3" fill={bodyFill} />
            </g>
          )}
          <g transform={`rotate(${state.headingAngle})`}>
            {/* Construction axis: white semi-transparent centerline in front of the car */}
            <line x1="0" y1="0" x2="32" y2="0" stroke="rgba(255,255,255,0.35)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
            <path
              d="M -10 -4 L 4 -4 L 10 -1.5 L 10 1.5 L 4 4 L -10 4 Z"
              fill={bodyFill}
              stroke="white"
              strokeWidth="0.4"
            />
            <path d="M -1 -3 L 3 -2.5 L 3 2.5 L -1 3 Z" fill={bodyFill === 'var(--color-accent-red)' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.6)'} />
          </g>
        </g>
      </g>
    );
  };

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

      <div ref={containerRef} className="flex-1 w-full relative overflow-hidden mt-1 bg-brand-bg-deep rounded-xl border border-white/10 shadow-inner">
        {isLive && (!lapData || lapData.length === 0) && !fallbackPathD ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-brand-10/40 gap-4">
            <ProgressBar value={100} pulse size="sm" className="w-40" />
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
              <div className="absolute top-1 left-2 pointer-events-none flex flex-col items-start select-none z-10">
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
                    stroke="var(--color-accent-red)"
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
                    fill="var(--color-brand-bg-deep)"
                    stroke="var(--color-accent-blue)"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* Car Position and Vectors */}
                {renderCar(carState, 'var(--color-accent-red)')}

                {/* Ghost Reference Car */}
                {renderCar(refCarState, 'var(--color-slate-500)')}
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
                  stroke="var(--color-slate-400)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {fallbackCarPos.isValid && (
                  <g transform={`translate(${fallbackCarPos.x}, ${fallbackCarPos.y}) rotate(${fallbackCarPos.travelAngle})`}>
                    <path
                      d="M -10 -4 L 4 -4 L 10 -1.5 L 10 1.5 L 4 4 L -10 4 Z"
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

      <div className="mt-2 text-xs text-brand-10/60 text-center font-mono font-bold px-3 py-1 rounded-full">
        Progress: {(progress * 100).toFixed(1)}% <span className="mx-2 text-brand-10/40">|</span> <span className="text-xs">Time: {displayTime.toFixed(1)}s / {lapTime ? lapTime.toFixed(1) : '0.0'}s</span>
      </div>
    </div>
  );
});
