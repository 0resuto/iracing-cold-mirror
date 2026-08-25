import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronRight, Car, Clock } from 'lucide-react';
import { formatSessionTime } from './utils';
import { LapItem } from './LapItem';

export const SessionItem = React.memo(function SessionItem({ session, player, trackName, isOpen, onToggle, selectedLapId, setSelectedLap, onSelectLap }) {
  const [showAllLaps, setShowAllLaps] = useState(false);

  const bestLapId = useMemo(() => {
    let best = null;
    let minTime = Infinity;
    (session.laps || []).forEach(l => {
      if (l.lap_number > 0 && l.lap_time > 0 && l.lap_time < minTime) {
        minTime = l.lap_time;
        best = l.id;
      }
    });
    return best;
  }, [session.laps]);

  const laps = session.laps || [];
  const visibleLaps = showAllLaps ? laps : laps.slice(0, 15);
  const hiddenCount = laps.length - visibleLaps.length;

  const { date, timeRange, duration } = formatSessionTime(session.start_time, session.duration_seconds, session.created_at);
  const carName = session.car_name || 'Unknown Car';

  return (
    <div className="flex flex-col relative min-w-0">
      {/* Session Header Card */}
      <div
        onClick={onToggle}
        className={`px-2.5 py-2 flex flex-col gap-1 cursor-pointer rounded-xl overflow-hidden border-l-4 border-emerald-500 border-y border-r border-emerald-500/30 transition-all active:scale-[0.99] min-h-[36px] relative z-10 ${
          isOpen
            ? 'bg-brand-60 text-brand-10 shadow-md'
            : 'glass hover:glass text-brand-10/80'
        }`}
      >
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold min-w-0">
          <div className="flex items-center gap-2 min-w-0 truncate pr-2">
            <Calendar size={15} className="text-emerald-400 flex-none" />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-brand-10 font-bold text-[11px] leading-tight">{date}</span>
              {timeRange && <span className="text-[10px] font-mono text-brand-10/60 font-normal truncate leading-tight">{timeRange}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none ml-1">
            <span className="text-[11px] font-mono font-bold text-brand-10/60">
              {laps.length} laps
            </span>
            {isOpen ? <ChevronDown size={18} className="text-emerald-400" /> : <ChevronRight size={18} className="text-brand-10/60" />}
          </div>
        </div>

        {/* Sub-info: Car & Duration */}
        <div className="flex items-center justify-between text-xs min-w-0 gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1.5 text-brand-10/80 font-mono text-xs truncate flex-1 min-w-0 font-semibold">
            <Car size={13} className="flex-none text-emerald-400" />
            <span className="truncate">{carName}</span>
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-10/60 flex-none font-medium">
              <Clock size={12} className="text-brand-10/40" />
              {duration}
            </span>
          )}
        </div>
      </div>

      {/* Laps List Level 4 */}
      {isOpen && (
        <div className="relative flex flex-col my-1 bg-black/40 rounded-r-xl min-w-0 ml-1">
          {/* Vertical Guide Line extending 10px UP under Session Header */}
          <div 
            className="absolute top-[-10px] bottom-1 w-1 bg-emerald-500/70 rounded-full pointer-events-none" 
            style={{ left: '-4px', zIndex: 0 }}
          />
          <div className="flex flex-col gap-1 relative z-10 min-w-0 py-1 px-1">
            {laps.length === 0 ? (
              <div className="px-4 py-2 text-xs text-brand-10/40 italic">No laps recorded.</div>
            ) : (
              <>
                {visibleLaps.map(lap => (
                  <LapItem 
                    key={lap.id} 
                    lap={lap} 
                    player={player} 
                    trackName={trackName} 
                    selectedLapId={selectedLapId} 
                    bestLapId={bestLapId} 
                    setSelectedLap={setSelectedLap} 
                    onSelectLap={onSelectLap}
                    carName={session.car_name}
                  />
                ))}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllLaps(true)}
                    className="px-4 py-2 mt-1 text-xs text-brand-30/80 hover:text-brand-30/90 font-mono text-left cursor-pointer transition-colors font-bold min-h-[38px]"
                  >
                    + Show {hiddenCount} more laps
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
