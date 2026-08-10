import React, { useState, useEffect, useMemo } from 'react';
import { Flag, ChevronDown, ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';

export const TrackItem = React.memo(function TrackItem({ trackName, sessions, player, isOpen, onToggle, selectedLapId, setSelectedLap, onSelectLap }) {
  // Accordion state for sessions within this track
  const [openSessionId, setOpenSessionId] = useState(null);

  useEffect(() => {
    if (selectedLapId && sessions) {
      const sessionWithLap = sessions.find(s => s.laps?.some(l => l.id === selectedLapId));
      if (sessionWithLap) {
        setOpenSessionId(sessionWithLap.id);
      }
    }
  }, [selectedLapId, sessions]);

  const totalLaps = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.laps?.length || 0), 0);
  }, [sessions]);

  return (
    <div className="flex flex-col min-w-0">
      {/* Track Header */}
      <div
        onClick={onToggle}
        className={`px-3 py-1.5 flex justify-between items-center cursor-pointer font-bold text-xs sm:text-sm transition-all min-w-0 rounded-xl overflow-hidden border-l-4 border-brand-30 border-y border-r border-brand-30/30 active:scale-[0.99] min-h-[34px] relative z-10 ${
          isOpen 
            ? 'bg-brand-60 text-brand-10 border border-brand-30/40 shadow-sm' 
            : 'glass hover:bg-brand-60/70 text-brand-10/90'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0 truncate pr-2">
          <Flag size={16} className="text-brand-30/80 flex-none" />
          <span className="truncate text-xs sm:text-sm font-extrabold">{trackName}</span>
        </span>
        <div className="flex items-center gap-2 flex-none ml-1">
          <span className="text-[11px] font-mono text-brand-10 bg-brand-30 px-2.5 py-0.5 rounded-full border border-brand-30/30 font-bold truncate max-w-[150px]">
            {sessions.length} sess · {totalLaps} laps
          </span>
          {isOpen ? <ChevronDown size={18} className="text-brand-30/80" /> : <ChevronRight size={18} className="text-brand-10/60" />}
        </div>
      </div>

      {/* Sessions List Level 3 */}
      {isOpen && (
        <div className="relative flex flex-col my-1 min-w-0 ml-1">
          {/* Vertical Guide Line extending 10px UP under Track Header */}
          <div 
            className="absolute top-[-10px] bottom-1 w-1 bg-brand-30/70 rounded-full pointer-events-none" 
            style={{ left: '-4px', zIndex: 0 }}
          />
          <div className="flex flex-col relative z-10 min-w-0 pl-1">
            {sessions.map(session => (
              <SessionItem 
                key={session.id} 
                session={session} 
                player={player} 
                trackName={trackName}
                isOpen={openSessionId === session.id}
                onToggle={() => setOpenSessionId(openSessionId === session.id ? null : session.id)}
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
