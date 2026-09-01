import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTrackQuery } from '../../api/queries';
import { buildTrackScene } from '../../utils/trackScene';
import { Button, Badge, ProgressBar } from '@0resuto/ui-kit';
import { X, Tag, Compass } from 'lucide-react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

export const TrackDetailModal = React.memo(function TrackDetailModal({ trackName, onClose }) {
  const { data: trackDef, isLoading } = useTrackQuery(trackName);

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const [selectedTurn, setSelectedTurn] = useState(null);

  // Build SVG Scene projection from official centerline
  const svgData = useMemo(() => {
    if (!trackDef?.centerline || trackDef.centerline.length < 3) return null;
    return buildTrackScene({
      refGpsPoints: null,
      lapGpsPoints: null,
      centerlinePoints: trackDef.centerline,
      trackWidthM: trackDef.track_width_m || 12.0,
      isLive: false,
    });
  }, [trackDef]);

  // Project turn apexes
  const turnMarkers = useMemo(() => {
    if (!trackDef?.turns || !trackDef.centerline || !svgData) return [];
    const n = trackDef.centerline.length;
    return trackDef.turns.map(turn => {
      // Map apex_pct to node index in centerline
      const idx = Math.min(Math.floor(turn.apex_pct * n), n - 1);
      const node = trackDef.centerline[idx];
      if (!node) return null;
      const pt = svgData.projectToScreen(node.lon, node.lat);
      return { ...turn, x: pt.x, y: pt.y };
    }).filter(Boolean);
  }, [trackDef, svgData]);

  // Setup D3 Zoom & Pan
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svgEl = d3Selection.select(svgRef.current);
    const gEl = d3Selection.select(gRef.current);

    const zoom = d3Zoom()
      .scaleExtent([0.8, 12])
      .on('zoom', (event) => {
        gEl.attr('transform', event.transform);
      });

    svgEl.call(zoom);
    svgEl.call(zoom.transform, zoomIdentity);

    return () => {
      svgEl.on('.zoom', null);
    };
  }, [svgData]);

  if (!trackName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-brand-bg-deep border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-brand-bg/80 flex-none gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-30/10 border border-brand-30/30 flex items-center justify-center text-brand-30 flex-none">
              <Compass size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-bold text-slate-100 truncate">
                {trackDef?.display_name || trackName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-brand-10/60 font-mono mt-0.5">
                <span className="text-brand-30 font-semibold">{trackDef?.track_name}</span>
                {trackDef?.length_m && (
                  <>
                    <span>•</span>
                    <span>{(trackDef.length_m / 1000).toFixed(3)} km ({trackDef.length_m.toLocaleString()} m)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            title="Close"
            className="rounded-full w-9 h-9"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Main Map Viewport */}
          <div className="flex-1 h-full relative bg-black/40 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center p-4">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-brand-10/40">
                <ProgressBar value={100} pulse size="sm" className="w-40" />
                <span className="text-xs font-mono">Loading geometry...</span>
              </div>
            ) : svgData ? (
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                shapeRendering="geometricPrecision"
                viewBox={`0 0 ${svgData.vbWidth} ${svgData.vbHeight}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
              >
                <g ref={gRef}>
                  <rect width={svgData.vbWidth} height={svgData.vbHeight} fill="transparent" />

                  {/* Asphalt Outer Border */}
                  <path
                    d={svgData.centerlinePath}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.25)"
                    strokeWidth={svgData.trackWidthVbUnits + 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* 12m Asphalt Ribbon */}
                  <path
                    d={svgData.centerlinePath}
                    fill="none"
                    stroke="rgba(30, 41, 59, 0.9)"
                    strokeWidth={svgData.trackWidthVbUnits}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Geometric Road Centerline */}
                  <path
                    d={svgData.centerlinePath}
                    fill="none"
                    stroke="rgba(226, 232, 240, 0.5)"
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Turn Badges */}
                  {turnMarkers.map((turn, i) => {
                    const isHovered = selectedTurn?.turn_number === turn.turn_number;
                    return (
                      <g
                        key={`turn-${i}`}
                        transform={`translate(${turn.x}, ${turn.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTurn(turn);
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          r={isHovered ? 9 : 7}
                          fill={isHovered ? "var(--color-brand-30)" : "rgba(15, 23, 42, 0.95)"}
                          stroke={isHovered ? "white" : "var(--color-slate-400)"}
                          strokeWidth={isHovered ? 1.5 : 0.8}
                          vectorEffect="non-scaling-stroke"
                          className="transition-all duration-150"
                        />
                        <text
                          y="2.5"
                          textAnchor="middle"
                          fontSize="6"
                          fontWeight="bold"
                          fill={isHovered ? "#0f172a" : "#f8fafc"}
                          className="font-mono select-none pointer-events-none"
                        >
                          {turn.turn_number}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            ) : (
              <div className="text-brand-10/40 text-xs font-mono">No vector geometry available</div>
            )}

            {/* Map Controls Hint */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-brand-bg/80 border border-white/10 text-[10px] text-brand-10/60 font-mono pointer-events-none select-none">
              Scroll to zoom • Drag to pan • Click turns
            </div>
          </div>

          {/* Right Sidebar: Turns & Layout Metadata */}
          <div className="w-full md:w-80 h-auto md:h-full border-t md:border-t-0 md:border-l border-white/10 bg-brand-bg/95 flex flex-col overflow-hidden">
            
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-10/80">
                Official Turns ({trackDef?.turns?.length || 0})
              </span>
              <Badge variant="secondary" size="sm" className="font-mono text-[10px]">
                {trackDef?.track_width_m || 12}m width
              </Badge>
            </div>

            {/* Turns Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {trackDef?.turns && trackDef.turns.length > 0 ? (
                trackDef.turns.map((turn) => {
                  const isSelected = selectedTurn?.turn_number === turn.turn_number;
                  return (
                    <div
                      key={turn.turn_number}
                      onClick={() => setSelectedTurn(turn)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-brand-30/15 border-brand-30/50 shadow-sm'
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-mono text-brand-30">
                            {turn.turn_number}
                          </span>
                          {turn.name}
                        </span>
                        <Badge variant="outline" size="sm" className="text-[9px] uppercase font-mono px-1.5 py-0.5">
                          {turn.turn_type}
                        </Badge>
                      </div>
                      <div className="mt-1.5 text-[10px] font-mono text-brand-10/50 flex items-center justify-between">
                        <span>Entry: {(turn.start_pct * 100).toFixed(1)}%</span>
                        <span>Apex: {(turn.apex_pct * 100).toFixed(1)}%</span>
                        <span>Exit: {(turn.end_pct * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-brand-10/40 font-mono">
                  No turn segments defined
                </div>
              )}
            </div>

            {/* Aliases Footer */}
            {trackDef?.aliases && trackDef.aliases.length > 0 && (
              <div className="p-3 border-t border-white/10 bg-black/20 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-brand-10/40 uppercase tracking-widest flex items-center gap-1">
                  <Tag size={10} /> Aliases & iRacing Slugs
                </span>
                <div className="flex flex-wrap gap-1">
                  {trackDef.aliases.map((alias, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-brand-10/70 border border-white/5">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
});
