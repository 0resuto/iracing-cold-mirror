import React, { useState, useEffect, useMemo } from 'react';
import { User, ChevronDown, ChevronRight } from 'lucide-react';
import { TrackItem } from './TrackItem';

export const PlayerItem = React.memo(function PlayerItem({ player, isOpen, onToggle, selectedLapId, setSelectedLap, onSelectLap }) {
  // Accordion state for tracks within this player
  const [openTrackName, setOpenTrackName] = useState(null);

  useEffect(() => {
    if (selectedLapId && player.sessions) {
      const trackWithLap = player.sessions.find(s => s.laps?.some(l => l.id === selectedLapId))?.track_name;
      if (trackWithLap) {
        setOpenTrackName(trackWithLap);
      }
    }
  }, [selectedLapId, player.sessions]);

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
    <div className="flex flex-col bg-brand-bg border-l-4 border-brand-30 border-y border-brand-60/80 w-full min-w-0">
      {/* Player Header Card */}
      <div
        onClick={onToggle}
        className={`px-3.5 py-2 flex justify-between items-center cursor-pointer font-extrabold text-xs sm:text-sm transition-colors min-w-0 active:scale-[0.99] min-h-[38px] ${
          isOpen ? 'bg-brand-60/90 text-brand-10' : 'hover:bg-brand-60/60 text-brand-10'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 truncate pr-2">
          <User size={18} className="text-brand-30/80 flex-none" />
          <div className="flex flex-col min-w-0">
            <span className="text-sky-100 font-extrabold text-xs sm:text-sm truncate">{player.name}</span>
            <span className="text-[10px] font-mono text-brand-10/50 font-normal truncate leading-tight">
              {tracksCount} tracks · {sessionsCount} sess
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none ml-1">
          {isOpen ? <ChevronDown size={18} className="text-brand-30/80" /> : <ChevronRight size={18} className="text-brand-10/60" />}
        </div>
      </div>
      
      {/* Tracks List Level 2 */}
      {isOpen && (
        <div className="flex flex-col min-w-0">
          {sessionsCount === 0 ? (
            <div className="px-4 py-2 text-xs text-brand-10/40 italic">No sessions yet.</div>
          ) : (
            Object.entries(trackGroups).map(([trackName, sessions]) => (
              <TrackItem 
                key={trackName} 
                trackName={trackName} 
                sessions={sessions} 
                player={player} 
                isOpen={openTrackName === trackName}
                onToggle={() => setOpenTrackName(openTrackName === trackName ? null : trackName)}
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
