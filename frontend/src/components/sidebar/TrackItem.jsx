import React, { useState, useMemo } from 'react';
import { Flag, ChevronDown, ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import { useAppStore } from '../../store/useAppStore';

export const TrackItem = React.memo(function TrackItem({ trackName, sessions, player, isOpen, onToggle, selectedLapId, setSelectedLap, onSelectLap }) {
  // Session accordion: null = auto-follow selected lap; else { selectedLapId, value } override
  const [sessionOverride, setSessionOverride] = useState(null);
  const showOutlaps = useAppStore(state => state.showOutlaps);

  const activeSessionId = useMemo(() => {
    if (selectedLapId && sessions) {
      return sessions.find(s => s.laps?.some(l => l.id === selectedLapId))?.id ?? null;
    }
    return null;
  }, [selectedLapId, sessions]);

  const effectiveOpenSessionId =
    sessionOverride && sessionOverride.selectedLapId === selectedLapId
      ? (sessionOverride.value === 'closed' ? null : sessionOverride.value)
      : activeSessionId;

  const totalLaps = useMemo(() => {
    return sessions.reduce((sum, s) => {
      const sLaps = showOutlaps ? (s.laps || []) : (s.laps || []).filter(l => l.lap_number > 0 && l.lap_time > 0);
      return sum + sLaps.length;
    }, 0);
  }, [sessions, showOutlaps]);

  return (
    <div className="flex flex-col min-w-0">
      {/* Track Header */}
      <div
        onClick={onToggle}
        className={`px-3 py-1.5 flex justify-between items-center cursor-pointer font-bold text-xs sm:text-sm transition-all min-w-0 rounded-xl overflow-hidden border-l-4 border-brand-30 border-y border-r border-brand-30/30 active:scale-[0.99] min-h-[34px] relative z-10 ${
          isOpen 
            ? 'bg-brand-60 text-brand-10 border border-brand-30/40 shadow-sm' 
            : 'glass-card hover:bg-brand-60/50 text-brand-10/90'
        }`}
      >
        <span className="flex items-start gap-2.5 min-w-0 pr-2">
          <Flag size={16} className="text-brand-30/80 flex-none mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs sm:text-sm font-extrabold">{trackName}</span>
            <span className="text-[10px] text-brand-10/50 font-mono digital-number truncate mt-0.5">
              {sessions.length} sess · {totalLaps} laps
            </span>
          </div>
        </span>
        <div className="flex items-center gap-2 flex-none ml-1">
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
                isOpen={effectiveOpenSessionId === session.id}
                onToggle={() => setSessionOverride({ selectedLapId, value: effectiveOpenSessionId === session.id ? 'closed' : session.id })}
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
