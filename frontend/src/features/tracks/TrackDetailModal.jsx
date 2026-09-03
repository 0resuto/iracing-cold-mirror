import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTrackQuery } from '../../api/queries';
import { getPathBounds } from './trackGeometry';
import {
  TrackAsphaltRibbon,
  TrackStartFinish,
  TrackTurnLabels,
  TrackTurnBadges,
} from './TrackElements';
import { Button, Badge, ProgressBar } from '@0resuto/ui-kit';
import { X, Tag, Compass } from 'lucide-react';
import * as d3Selection from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

export const TrackDetailModal = React.memo(function TrackDetailModal({ trackName, onClose }) {
  const { data: trackDef, isLoading } = useTrackQuery(trackName);

  const svgRef = useRef(null);
  const gRef = useRef(null);
  const [selectedTurn, setSelectedTurn] = useState(null);
  const turnRefs = useRef({});

  // Auto-scroll the sidebar list to the selected turn
  useEffect(() => {
    if (selectedTurn && turnRefs.current[selectedTurn.turn_number]) {
      turnRefs.current[selectedTurn.turn_number].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedTurn]);

  // Official iRacing SVG geometry with pixel-perfect coordinates
  const activeScene = useMemo(() => {
    if (!trackDef?.svg_path) return null;
    const bounds = getPathBounds(trackDef.svg_path);

    const markers = (trackDef.turns || []).map(turn => ({
      ...turn,
      x: turn.x,
      y: turn.y,
    }));

    return {
      viewBox: bounds.viewBox,
      vbWidth: bounds.vbWidth,
      vbHeight: bounds.vbHeight,
      vbX: bounds.vbX,
      vbY: bounds.vbY,
      pathD: trackDef.svg_path,
      trackWidthVbUnits: bounds.trackWidthVbUnits,
      turnMarkers: markers,
    };
  }, [trackDef]);

  const turnMarkers = activeScene?.turnMarkers || [];

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
  }, [activeScene]);

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
            ) : activeScene ? (
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                shapeRendering="geometricPrecision"
                viewBox={activeScene.viewBox}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
              >
                <g ref={gRef}>
                  <rect
                    x={activeScene.vbX}
                    y={activeScene.vbY}
                    width={activeScene.vbWidth}
                    height={activeScene.vbHeight}
                    fill="transparent"
                  />

                  {/* Real 2D Asphalt Track Ribbon */}
                  <TrackAsphaltRibbon
                    trackDef={trackDef}
                    trackWidthVbUnits={activeScene.trackWidthVbUnits}
                  />

                  {/* Official Start/Finish Line & Direction Arrow */}
                  <TrackStartFinish startFinish={trackDef?.start_finish} />

                  {/* Official Turn Name Labels */}
                  <TrackTurnLabels turnLabels={trackDef?.turn_labels} />

                  {/* Official Turn Badges */}
                  <TrackTurnBadges
                    turnMarkers={turnMarkers}
                    selectedTurnNumber={selectedTurn?.turn_number}
                    onSelectTurn={setSelectedTurn}
                  />
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
                      ref={(el) => {
                        turnRefs.current[turn.turn_number] = el;
                      }}
                      onClick={() => setSelectedTurn(turn)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-brand-30/15 border-brand-30/50 shadow-sm ring-1 ring-brand-30/30'
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-mono text-brand-30">
                            {turn.label || turn.turn_number}
                          </span>
                          {turn.name}
                        </span>
                        <span className="text-[10px] font-mono text-brand-30/80 px-1.5 py-0.5 rounded bg-brand-30/10 border border-brand-30/20">
                          #{turn.label || turn.turn_number}
                        </span>
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
