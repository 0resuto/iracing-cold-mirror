import React, { useState, useMemo } from 'react';

export const SectorsWidget = React.memo(function SectorsWidget({ selectedLap, players }) {
  const [sortBy, setSortBy] = useState('order');

  const displaySectors = useMemo(() => {
    if (!selectedLap?.sectors?.length) return [];
    
    let bestLap = null;
    const safePlayers = players || [];
    const targetTrack = selectedLap.track_name;
    const targetCar = selectedLap.car_name || '';

    safePlayers.forEach(player => {
      (player.sessions || []).forEach(s => {
        if (s.track_name === targetTrack && (s.car_name || '') === targetCar) {
          (s.laps || []).forEach(l => {
            if (l.lap_number > 0 && l.lap_time > 0) {
              if (!bestLap || l.lap_time < bestLap.lap_time) bestLap = l;
            }
          });
        }
      });
    });
    
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
    <div className="border-t border-brand-60 bg-brand-bg flex-none flex flex-col min-w-0 px-5 py-4">
      <div className="flex justify-between items-center mb-2.5 min-w-0">
        <h3 className="text-xs uppercase tracking-wider text-brand-10/60 font-bold m-0">Sectors</h3>
        <div className="flex gap-1.5 text-xs">
          <button 
            onClick={() => setSortBy('order')} 
            className={`px-3 py-1 rounded-md cursor-pointer font-bold ${sortBy === 'order' ? 'bg-brand-60 text-brand-10 border border-brand-60' : 'text-brand-10/40 hover:text-brand-10/80'}`}
          >
            #
          </button>
          <button 
            onClick={() => setSortBy('time')} 
            className={`px-3 py-1 rounded-md cursor-pointer font-bold ${sortBy === 'time' ? 'bg-brand-60 text-brand-10 border border-brand-60' : 'text-brand-10/40 hover:text-brand-10/80'}`}
          >
            Time
          </button>
          <button 
            onClick={() => setSortBy('delta')} 
            className={`px-3 py-1 rounded-md cursor-pointer font-bold ${sortBy === 'delta' ? 'bg-brand-60 text-brand-10 border border-brand-60' : 'text-brand-10/40 hover:text-brand-10/80'}`}
          >
            Δ
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
        {displaySectors.map(s => (
          <div key={s.id || s.sector_number} className="flex justify-between items-center text-xs bg-brand-60 rounded-lg border border-brand-60/80 min-w-0 px-3.5 py-1">
            <span className="text-brand-10/60 font-bold">Sector {s.sector_number}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-brand-10/90 font-bold">{s.sector_time.toFixed(2)}s</span>
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
