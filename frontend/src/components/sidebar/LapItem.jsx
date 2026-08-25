import React from 'react';
import { Timer, Award } from 'lucide-react';

export const LapItem = React.memo(function LapItem({ lap, player, trackName, selectedLapId, bestLapId, setSelectedLap, onSelectLap, carName }) {
  const isSelected = selectedLapId === lap.id;
  const isBest = lap.id === bestLapId;
  const isOutlap = lap.lap_time <= 0 || lap.lap_number === 0;
  const timeText = lap.lap_time > 0 ? `${lap.lap_time.toFixed(2)}s` : 'Outlap';
  const lapLabel = lap.lap_number === 0 ? 'Outlap' : `Lap ${lap.lap_number}`;

  const handleClick = () => {
    setSelectedLap({ ...lap, player_id: player.id, track_name: trackName, car_name: carName });
    if (onSelectLap) onSelectLap();
  };

  return (
    <div
      onClick={handleClick}
      className={`px-2.5 py-1 group flex justify-between items-center my-0.5 text-xs cursor-pointer rounded-lg transition-all min-h-[32px] active:scale-[0.98] ${
        isOutlap && !isSelected
          ? 'bg-transparent text-brand-10/40 font-normal border-l-2 border-transparent opacity-50 hover:opacity-80 hover:bg-brand-60/40 hover:text-brand-10/60'
          : isSelected
            ? 'bg-brand-30/25 text-brand-10 font-bold border-l-4 border-brand-30/80 shadow-md'
            : 'hover:bg-brand-60/70 text-brand-10/80 hover:text-brand-10 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <Timer size={16} className={isSelected ? 'text-brand-30/80 flex-none' : 'text-brand-10/40 group-hover:text-brand-10/60 flex-none'} />
        <span className="truncate font-semibold text-xs sm:text-sm">{lapLabel}</span>
        {isBest && (
          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-500/40 flex-none">
            BEST
          </span>
        )}
      </div>
      <span className={`font-mono font-bold text-xs sm:text-sm flex-none ml-2 pr-1 ${isBest ? 'text-purple-400' : 'text-brand-10/80'}`}>
        {timeText}
      </span>
    </div>
  );
});
