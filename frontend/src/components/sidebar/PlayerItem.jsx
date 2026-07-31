import React, { useState, useEffect, useMemo } from 'react';
import { User, ChevronDown, ChevronRight } from 'lucide-react';
import { TrackItem } from './TrackItem';

export const PlayerItem = React.memo(function PlayerItem({ player, selectedLapId, setSelectedLap, onSelectLap }) {
  const hasSelected = useMemo(() => {
    return player.sessions?.some(s => s.laps?.some(l => l.id === selectedLapId)) ?? false;
  }, [player.sessions, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);

  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  // Group sessions by Track Name for this player
  const trackGroups = useMemo(() => {
    const groups = {};
    (player.sessions || []).forEach(s => {
      const track = s.track_name || 'Unknown Track';
      if (!groups[track]) groups[track] = [];
      groups[track].push(s);
    });
    return groups;
  }, [player.sessions]);

  const sessionsCount = player.sessions?.length || 0;
  const tracksCount = Object.keys(trackGroups).length;

  return (
    <div className="flex flex-col bg-zinc-950 border-l-4 border-sky-500 border-y border-zinc-800/80 w-full min-w-0">
      {/* Player Header Card */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '8px 14px' }}
        className={`flex justify-between items-center cursor-pointer font-extrabold text-xs sm:text-sm transition-colors min-w-0 active:scale-[0.99] min-h-[38px] ${
          isOpen ? 'bg-zinc-800/90 text-zinc-100' : 'hover:bg-zinc-800/60 text-zinc-100'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0 truncate pr-2">
          <User size={18} className="text-sky-400 flex-none" />
          <span className="text-sky-100 font-extrabold text-xs sm:text-sm truncate">{player.name}</span>
        </span>
        <div className="flex items-center gap-2 flex-none ml-1">
          <span className="text-[11px] font-mono text-sky-300 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-500/25 font-bold truncate max-w-[150px]">
            {tracksCount} tracks · {sessionsCount} sess
          </span>
          {isOpen ? <ChevronDown size={18} className="text-sky-400" /> : <ChevronRight size={18} className="text-zinc-400" />}
        </div>
      </div>
      
      {/* Tracks List Level 2 */}
      {isOpen && (
        <div className="flex flex-col bg-black/60 min-w-0 gap-2" style={{ padding: '8px 8px 8px 8px' }}>
          {sessionsCount === 0 ? (
            <div className="px-4 py-2 text-xs text-zinc-500 italic">No sessions yet.</div>
          ) : (
            Object.entries(trackGroups).map(([trackName, sessions]) => (
              <TrackItem 
                key={trackName} 
                trackName={trackName} 
                sessions={sessions} 
                player={player} 
                selectedLapId={selectedLapId} 
                setSelectedLap={setSelectedLap} 
                onSelectLap={onSelectLap}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});
