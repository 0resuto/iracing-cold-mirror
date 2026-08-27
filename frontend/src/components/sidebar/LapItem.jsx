import React from 'react';
import { Timer } from 'lucide-react';
import { Badge } from '@0resuto/ui-kit';

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
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <Timer size={15} className={isSelected ? 'text-brand-30/90 flex-none' : 'text-brand-10/40 group-hover:text-brand-10/60 flex-none'} />
        <span className="truncate font-semibold text-xs">{lapLabel}</span>
        {isBest && (
          <Badge color="purple" active size="sm" className="text-[9px] py-0 px-1.5 font-mono">
            BEST
          </Badge>
        )}
      </div>
      <span className={`font-mono digital-number font-bold text-xs flex-none ml-2 pr-1 ${isBest ? 'text-purple-300' : 'text-brand-10/90'}`}>
        {timeText}
      </span>
    </div>
  );
});
