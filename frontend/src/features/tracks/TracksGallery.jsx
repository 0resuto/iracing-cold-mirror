import React, { useState, useMemo } from 'react';
import { useTracksListQuery } from '../../api/queries';
import { TrackCard } from './TrackCard';
import { TrackDetailModal } from './TrackDetailModal';
import { computeTrackGroups } from './trackGrouping';
import { Search, Map, ChevronRight, Layers } from 'lucide-react';
import { ProgressBar, Badge } from '@0resuto/ui-kit';

export const TracksGallery = React.memo(function TracksGallery() {
  const { data: tracks, isLoading, error } = useTracksListQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLength, setFilterLength] = useState('all'); // 'all' | 'short' | 'medium' | 'long' | 'turns'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'len_desc' | 'len_asc' | 'turns_desc'
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [collapsedParents, setCollapsedParents] = useState(() => new Set());

  // Filter & Sort Pipeline
  const filteredTracks = useMemo(() => {
    if (!tracks || tracks.length === 0) return [];

    const q = searchQuery.trim().toLowerCase();

    return tracks
      .filter((t) => {
        // Search filter
        if (q) {
          const matchesName = t.display_name.toLowerCase().includes(q);
          const matchesSlug = t.track_name.toLowerCase().includes(q);
          if (!matchesName && !matchesSlug) return false;
        }

        // Length Category filter
        const km = t.length_m / 1000;
        if (filterLength === 'short' && km >= 3.5) return false;
        if (filterLength === 'medium' && (km < 3.5 || km > 5.2)) return false;
        if (filterLength === 'long' && km <= 5.2) return false;
        if (filterLength === 'turns' && t.turn_count < 14) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.display_name.localeCompare(b.display_name);
        if (sortBy === 'len_desc') return b.length_m - a.length_m;
        if (sortBy === 'len_asc') return a.length_m - b.length_m;
        if (sortBy === 'turns_desc') return b.turn_count - a.turn_count;
        return 0;
      });
  }, [tracks, searchQuery, filterLength, sortBy]);

  // Group configurations under their parent circuit
  const groupedTracks = useMemo(() => computeTrackGroups(filteredTracks), [filteredTracks]);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-brand-bg text-brand-10 overflow-hidden select-none">
      
      {/* Top Header & Search Controls */}
      <div className="p-6 border-b border-white/10 bg-brand-bg-deep/60 flex-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Title & Count Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-30/10 border border-brand-30/30 flex items-center justify-center text-brand-30">
            <Map size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-100">
                Circuit Registry
              </h1>
              <Badge variant="secondary" size="sm" className="font-mono text-xs px-2 py-0.5">
                {tracks ? `${filteredTracks.length} / ${tracks.length}` : '0'} Circuits
              </Badge>
            </div>
            <p className="text-xs text-brand-10/50 mt-0.5">
              Authentic survey geometries and official FIA sector definitions
            </p>
          </div>
        </div>

        {/* Search & Sort Filters */}
        <div className="w-full md:w-auto flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-10/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circuits..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 focus:border-brand-30 text-slate-200 placeholder-brand-10/30 outline-none transition-colors font-mono"
            />
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 focus:border-brand-30 text-slate-200 outline-none font-mono cursor-pointer"
          >
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="len_desc">Sort: Longest First</option>
            <option value="len_asc">Sort: Shortest First</option>
            <option value="turns_desc">Sort: Most Turns</option>
          </select>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-6 py-2.5 border-b border-white/5 bg-black/20 flex items-center gap-2 overflow-x-auto custom-scrollbar flex-none">
        {[
          { id: 'all', label: 'All Circuits' },
          { id: 'short', label: 'Short (<3.5 km)' },
          { id: 'medium', label: 'Medium (3.5 - 5.2 km)' },
          { id: 'long', label: 'Long (>5.2 km)' },
          { id: 'turns', label: 'Technical (14+ Turns)' },
        ].map((chip) => {
          const isActive = filterLength === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilterLength(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-30 text-slate-900 font-bold shadow-sm shadow-brand-30/20'
                  : 'bg-white/5 text-brand-10/60 hover:text-brand-10 hover:bg-white/10'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-brand-10/40">
            <ProgressBar value={100} pulse size="sm" className="w-48" />
            <span className="text-xs font-mono">Loading circuit registry...</span>
          </div>
        ) : error ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-accent-red text-sm font-mono">
            Failed to load circuit registry: {error.message}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-brand-10/40 text-sm font-mono">
            No circuits matching "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupedTracks.map((group) => {
              const isMulti = group.items.length > 1;
              const isCollapsed = isMulti && collapsedParents.has(group.parent);

              if (!isMulti) {
                return (
                  <TrackCard
                    key={group.parent}
                    track={group.items[0]}
                    onSelect={(t) => setSelectedTrack(t.track_name)}
                  />
                );
              }

              return (
                <div
                  key={group.parent}
                  className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col gap-2"
                >
                  {/* Group Header */}
                  <button
                    onClick={() =>
                      setCollapsedParents((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.parent)) next.delete(group.parent);
                        else next.add(group.parent);
                        return next;
                      })
                    }
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/10 bg-brand-bg-deep/70 hover:border-brand-30/40 hover:bg-brand-bg-deep/90 transition-all cursor-pointer text-left group/acc"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-30/10 border border-brand-30/30 text-brand-30 flex-none">
                      <Layers size={15} />
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-bold text-slate-100 truncate group-hover/acc:text-brand-30 transition-colors">
                      {group.parent}
                    </span>
                    <Badge variant="secondary" size="sm" className="font-mono text-[10px] flex-none">
                      {group.items.length} configs
                    </Badge>
                    <ChevronRight
                      size={16}
                      className={`text-brand-10/50 transition-transform duration-200 flex-none ${
                        isCollapsed ? 'rotate-0' : 'rotate-90'
                      }`}
                    />
                  </button>

                  {/* Group Body */}
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {group.items.map((track) => (
                        <TrackCard
                          key={track.track_name}
                          track={track}
                          displayName={track.display_name.replace(group.parent + ' - ', '')}
                          hideSlug
                          onSelect={(t) => setSelectedTrack(t.track_name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedTrack && (
        <TrackDetailModal
          trackName={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
      )}

    </div>
  );
});
