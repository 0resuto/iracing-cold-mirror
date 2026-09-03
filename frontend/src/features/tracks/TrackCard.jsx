import React from 'react';
import { TrackMiniPreview } from './TrackMiniPreview';
import { Badge } from '@0resuto/ui-kit';
import { MapPin, Milestone, Maximize2 } from 'lucide-react';

export const TrackCard = React.memo(function TrackCard({ track, onSelect, displayName, hideSlug = false }) {
  const lengthKm = (track.length_m / 1000).toFixed(2);
  const title = displayName ?? track.display_name;

  return (
    <div
      onClick={() => onSelect(track)}
      className="group relative flex flex-col justify-between p-4 rounded-xl glass-card border border-white/10 hover:border-brand-30/50 bg-brand-bg/60 hover:bg-brand-bg-deep/90 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-brand-30/10 hover:-translate-y-1 overflow-hidden select-none"
    >
      {/* Top Details & Badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-col min-w-0">
          {!hideSlug && (
            <div className="flex items-center gap-1.5 text-xs text-brand-10/50 font-mono">
              <MapPin size={12} className="text-brand-30 flex-none" />
              <span className="truncate">{track.track_name}</span>
            </div>
          )}
          <h3 className="text-sm font-bold text-slate-100 group-hover:text-brand-30 transition-colors line-clamp-1 mt-0.5">
            {title}
          </h3>
        </div>

        <button
          className="p-1.5 rounded-lg bg-white/5 group-hover:bg-brand-30/20 text-brand-10/40 group-hover:text-brand-30 transition-colors flex-none"
          title="Inspect Circuit"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Interactive Vector Preview */}
      <div className="w-full h-36 my-2 px-3 py-2 flex items-center justify-center bg-black/20 rounded-lg border border-white/5 group-hover:border-brand-30/20 transition-all relative overflow-hidden">
        <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <TrackMiniPreview
            svgPath={track.svg_path}
            strokeWidth={Math.max(1.8, Math.min(3.8, ((track.track_width_m || 12.0) / 12.0) * 2.5))}
          />
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5 text-[11px] font-mono text-brand-10/70">
        <div className="flex items-center gap-1">
          <Milestone size={12} className="text-slate-400" />
          <span>{lengthKm} km</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" size="sm" className="font-mono text-[10px] px-2 py-0.5">
            {track.turn_count} Turns
          </Badge>
          <Badge variant="outline" size="sm" className="font-mono text-[10px] px-1.5 py-0.5 text-brand-10/50">
            {track.track_width_m || 12}m
          </Badge>
        </div>
      </div>
    </div>
  );
});
