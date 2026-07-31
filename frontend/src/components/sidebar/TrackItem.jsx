import React, { useState, useEffect, useMemo } from 'react';
import { Flag, ChevronDown, ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';

export const TrackItem = React.memo(function TrackItem({ trackName, sessions, player, selectedLapId, setSelectedLap, onSelectLap }) {
  const hasSelected = useMemo(() => {
    return sessions.some(s => s.laps?.some(l => l.id === selectedLapId));
  }, [sessions, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);

  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  const totalLaps = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.laps?.length || 0), 0);
  }, [sessions]);

  return (
    <div className="flex flex-col my-1 min-w-0">
      {/* Track Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '12px 14px' }}
        className={`flex justify-between items-center rounded-xl cursor-pointer font-bold text-xs sm:text-sm transition-all min-w-0 border active:scale-[0.99] min-h-[46px] ${
          isOpen 
            ? 'bg-purple-500/15 border-purple-500/40 text-purple-100 shadow-sm' 
            : 'bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800/70 text-zinc-200'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0 truncate pr-2">
          <Flag size={16} className="text-purple-400 flex-none" />
          <span className="truncate text-xs sm:text-sm font-extrabold">{trackName}</span>
        </span>
        <div className="flex items-center gap-2 flex-none ml-1">
          <span className="text-[11px] font-mono text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold truncate max-w-[150px]">
            {sessions.length} sess · {totalLaps} laps
          </span>
          {isOpen ? <ChevronDown size={18} className="text-purple-400" /> : <ChevronRight size={18} className="text-zinc-400" />}
        </div>
      </div>

      {/* Sessions List Level 3 */}
      {isOpen && (
        <div className="flex flex-col ml-3 pl-3 border-l-2 border-purple-500/40 my-1 min-w-0">
          {sessions.map(session => (
            <SessionItem 
              key={session.id} 
              session={session} 
              player={player} 
              trackName={trackName}
              selectedLapId={selectedLapId} 
              setSelectedLap={setSelectedLap} 
              onSelectLap={onSelectLap}
            />
          ))}
        </div>
      )}
    </div>
  );
});
