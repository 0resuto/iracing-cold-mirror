import React from 'react';
import { Timer, Award } from 'lucide-react';

export const LapItem = React.memo(function LapItem({ lap, player, trackName, selectedLapId, bestLapId, setSelectedLap, onSelectLap }) {
  const isSelected = selectedLapId === lap.id;
  const isBest = lap.id === bestLapId;
  const timeText = lap.lap_time > 0 ? `${lap.lap_time.toFixed(2)}s` : 'Outlap';
  const lapLabel = lap.lap_number === 0 ? 'Outlap' : `Lap ${lap.lap_number}`;

  const handleClick = () => {
    setSelectedLap({ ...lap, player_id: player.id, track_name: trackName });
    if (onSelectLap) onSelectLap();
  };

  return (
    <div
      onClick={handleClick}
      style={{ padding: '4px 10px' }}
      className={`group flex justify-between items-center my-0.5 text-xs cursor-pointer rounded-lg transition-all min-h-[32px] active:scale-[0.98] ${
        isSelected
          ? 'bg-sky-500/25 text-sky-200 font-bold border-l-4 border-sky-400 shadow-md'
          : 'hover:bg-zinc-800/70 text-zinc-300 hover:text-zinc-100 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <Timer size={16} className={isSelected ? 'text-sky-400 flex-none' : 'text-zinc-500 group-hover:text-zinc-400 flex-none'} />
        <span className="truncate font-semibold text-xs sm:text-sm">{lapLabel}</span>
        {isBest && (
          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/40 flex-none">
            <Award size={11} /> BEST
          </span>
        )}
      </div>
      <span className={`font-mono font-bold text-xs sm:text-sm flex-none ml-2 pr-1 ${isBest ? 'text-purple-400' : isSelected ? 'text-sky-300' : 'text-zinc-300'}`}>
        {timeText}
      </span>
    </div>
  );
});
