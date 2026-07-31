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
        style={{ padding: '6px 12px' }}
        className={`flex justify-between items-center cursor-pointer font-bold text-xs sm:text-sm transition-all min-w-0 rounded-xl border-l-4 border-purple-500 border-y border-r border-purple-500/30 active:scale-[0.99] min-h-[34px] relative z-10 ${
          isOpen 
            ? 'bg-purple-950/90 text-purple-100 shadow-sm' 
            : 'bg-zinc-900/80 hover:bg-zinc-800/70 text-zinc-200'
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
        <div className="relative flex flex-col my-1 min-w-0" style={{ marginLeft: '4px' }}>
          {/* Vertical Guide Line extending 10px UP under Track Header */}
          <div 
            className="absolute top-[-10px] bottom-1 w-1 bg-purple-500/70 rounded-full pointer-events-none" 
            style={{ left: '-4px', zIndex: 0 }}
          />
          <div className="flex flex-col gap-1.5 relative z-10 min-w-0" style={{ paddingLeft: '4px' }}>
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
        </div>
      )}
    </div>
  );
});
