import React, { useState, useMemo } from 'react';

export const SectorsWidget = React.memo(function SectorsWidget({ selectedLap, players }) {
  const [sortBy, setSortBy] = useState('order');

  const displaySectors = useMemo(() => {
    if (!selectedLap?.sectors?.length) return [];
    
    let bestLap = null;
    const safePlayers = players || [];
    const player = safePlayers.find(p => p.id === selectedLap.player_id);
    if (player) {
      (player.sessions || []).filter(s => s.track_name === selectedLap.track_name).forEach(s => {
        (s.laps || []).filter(l => l.lap_time > 0).forEach(l => {
          if (!bestLap || l.lap_time < bestLap.lap_time) bestLap = l;
        });
      });
    }
    
    const mapped = selectedLap.sectors.map(sector => {
      let delta = null;
      if (bestLap && bestLap.id !== selectedLap.id) {
        const bestSec = bestLap.sectors.find(s => s.sector_number === sector.sector_number);
        if (bestSec) delta = sector.sector_time - bestSec.sector_time;
      }
      return { ...sector, delta };
    });

    return mapped.sort((a, b) => {
      if (sortBy === 'time') return a.sector_time - b.sector_time;
      if (sortBy === 'delta') return (a.delta ?? Infinity) - (b.delta ?? Infinity);
      return a.sector_number - b.sector_number;
    });
  }, [selectedLap, players, sortBy]);

  if (!selectedLap?.sectors?.length) return null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 flex-none flex flex-col min-w-0" style={{ padding: '16px 20px' }}>
      <div className="flex justify-between items-center mb-2.5 min-w-0">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold m-0">Sectors</h3>
        <div className="flex gap-1.5 text-xs">
          <button 
            onClick={() => setSortBy('order')} 
            className={`px-3 py-1 rounded-md cursor-pointer font-bold ${sortBy === 'order' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            #
          </button>
          <button 
            onClick={() => setSortBy('time')} 
            className={`px-3 py-1 rounded-md cursor-pointer font-bold ${sortBy === 'time' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Time
          </button>
          <button 
            onClick={() => setSortBy('delta')} 
            className={`px-3 py-1 rounded-md cursor-pointer font-bold ${sortBy === 'delta' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Δ
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
        {displaySectors.map(s => (
          <div key={s.id || s.sector_number} className="flex justify-between items-center text-xs bg-zinc-900 px-3.5 py-2 rounded-lg border border-zinc-800/80 min-w-0">
            <span className="text-zinc-400 font-bold">Sector {s.sector_number}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-zinc-200 font-bold">{s.sector_time.toFixed(2)}s</span>
              {s.delta !== null && (
                <span className={`font-mono text-xs font-bold ${s.delta <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}s
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
