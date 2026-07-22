import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useHistoryQuery, useIdealLapQuery } from '../api/queries';

// --- Subcomponents for clarity ---

const LapItem = ({ lap, player, session, selectedLapId, bestLapId, setSelectedLap }) => {
  const isSelected = selectedLapId === lap.id;
  const isBest = lap.id === bestLapId;
  const timeText = lap.lap_time > 0 ? `${lap.lap_time.toFixed(1)}s` : (lap.lap_time < 0 ? 'Outlap' : 'Live');

  return (
    <div
      onClick={() => setSelectedLap({ ...lap, player_id: player.id, track_name: session.track_name })}
      className={`flex justify-between items-center px-3 py-1.5 my-0.5 text-xs cursor-pointer border-l-2 transition-colors ${
        isSelected
          ? 'border-sky-400 bg-sky-400/10 text-zinc-100'
          : 'border-transparent hover:bg-white/5 text-zinc-400'
      }`}
    >
      <span>Lap {lap.lap_number}</span>
      <span className={`font-mono font-bold ${isBest ? 'text-purple-500' : 'text-inherit'}`}>
        {timeText}
      </span>
    </div>
  );
};

const SessionItem = ({ session, player, selectedLapId, setSelectedLap }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-expand if the selected lap is in this session
  useEffect(() => {
    if (session.laps.some(l => l.id === selectedLapId)) setIsOpen(true);
  }, [selectedLapId, session.laps]);

  const bestLapId = useMemo(() => {
    let best = null;
    let minTime = Infinity;
    session.laps.forEach(l => {
      if (l.lap_time > 0 && l.lap_time < minTime) {
        minTime = l.lap_time;
        best = l.id;
      }
    });
    return best;
  }, [session.laps]);

  return (
    <div className="flex flex-col">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center px-3.5 py-2 pl-6 cursor-pointer border-t border-zinc-800 transition-colors ${
          isOpen ? 'bg-white/5' : 'hover:bg-white/5'
        }`}
      >
        <span className="text-sm">🏁 {session.track_name}</span>
        <span className="text-[10px] text-zinc-500">{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div className="flex flex-col bg-black/20 py-1 pl-4">
          {session.laps.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">No laps recorded yet.</div>
          ) : (
            session.laps.map(lap => (
              <LapItem 
                key={lap.id} 
                lap={lap} 
                player={player} 
                session={session} 
                selectedLapId={selectedLapId} 
                bestLapId={bestLapId} 
                setSelectedLap={setSelectedLap} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const PlayerItem = ({ player, selectedLapId, setSelectedLap }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (player.sessions.some(s => s.laps.some(l => l.id === selectedLapId))) setIsOpen(true);
  }, [selectedLapId, player.sessions]);

  return (
    <div className="flex flex-col bg-transparent border border-zinc-800 rounded-md overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center px-3.5 py-2.5 cursor-pointer font-medium text-sm transition-colors ${
          isOpen ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800/50 text-zinc-300'
        }`}
      >
        <span>👤 {player.name}</span>
        <span className="text-xs text-zinc-500">{isOpen ? '▼' : '▶'}</span>
      </div>
      
      {isOpen && (
        <div className="flex flex-col">
          {player.sessions.length === 0 ? (
            <div className="px-6 py-2 text-xs text-zinc-500 border-t border-zinc-800">No sessions yet.</div>
          ) : (
            player.sessions.map(session => (
              <SessionItem 
                key={session.id} 
                session={session} 
                player={player} 
                selectedLapId={selectedLapId} 
                setSelectedLap={setSelectedLap} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const SectorsWidget = ({ selectedLap, players }) => {
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
      if (sortBy === 'delta') {
        if (a.delta === null && b.delta === null) return a.sector_number - b.sector_number;
        if (a.delta === null) return 1;
        if (b.delta === null) return -1;
        return b.delta - a.delta;
      }
      return a.sector_number - b.sector_number;
    });
  }, [selectedLap, players, sortBy]);

  if (!selectedLap?.sectors?.length) return null;

  return (
    <div className="p-4 border-t border-zinc-800 bg-black/10">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">Lap Sectors</h3>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)}
          className="bg-zinc-900 text-zinc-100 border border-zinc-700 px-2 py-1 rounded text-xs cursor-pointer outline-none focus:border-sky-500"
        >
          <option value="order">By Order</option>
          <option value="delta">By Time Loss</option>
        </select>
      </div>
      
      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
        {displaySectors.map((sector) => {
          const isSlower = sector.delta > 0;
          const isFaster = sector.delta <= 0;
          return (
            <div 
              key={sector.id} 
              className={`flex justify-between text-xs px-2 py-1.5 bg-white/5 rounded border-l-2 ${
                isSlower ? 'border-red-500' : (isFaster ? 'border-green-500' : 'border-transparent')
              }`}
            >
              <span className="text-zinc-400">Sec {sector.sector_number + 1}</span>
              <div className="flex gap-2 font-mono">
                <span className="text-zinc-100">{sector.sector_time.toFixed(2)}s</span>
                <span className={`w-11 text-right inline-block ${isFaster ? 'text-green-500' : 'text-red-500'}`}>
                  {sector.delta !== null ? (sector.delta > 0 ? '+' : '') + sector.delta.toFixed(2) : '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- Main Sidebar Component ---

export const Sidebar = React.memo(function Sidebar() {
  const selectedLap = useAppStore(state => state.selectedLap);
  const setSelectedLap = useAppStore(state => state.setSelectedLap);
  const isOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const selectedLapId = selectedLap?.id || null;

  const { data: players = [], isLoading, isError } = useHistoryQuery();
  const { data: idealLap } = useIdealLapQuery(selectedLap?.player_id, selectedLap?.track_name);

  // Auto-select latest session on load
  useEffect(() => {
    if (players.length > 0 && !selectedLapId) {
      const latestPlayer = players[players.length - 1];
      const latestSession = (latestPlayer.sessions || [])[latestPlayer.sessions?.length - 1];
      if (latestSession?.laps?.length > 0) {
        setSelectedLap({ ...latestSession.laps[0], player_id: latestPlayer.id, track_name: latestSession.track_name });
      }
    }
  }, [players, selectedLapId, setSelectedLap]);

  return (
    <div className="flex h-full w-full bg-zinc-900">
      
      {/* Icon Nav Bar */}
      <div className="w-16 min-w-[64px] border-r border-zinc-800 flex flex-col items-center py-4 bg-zinc-950">
        <button 
          onClick={toggleSidebar} 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none cursor-pointer text-xs p-2 mb-8 rounded w-8 h-8 flex items-center justify-center transition-colors"
        >
          {isOpen ? '◀' : '▶'}
        </button>
        <div className="flex flex-col gap-6 w-full">
          <div 
            title="History" 
            onClick={() => { if (!isOpen) toggleSidebar(); }} 
            className="cursor-pointer text-sky-400 text-xl flex justify-center border-l-2 border-sky-400 py-1"
          >
            ⏱️
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`flex-1 flex-col min-w-[256px] overflow-hidden ${isOpen ? 'flex' : 'hidden'}`}>
        
        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">History</h2>
          </div>
      
          {isLoading ? (
            <div className="text-xs text-zinc-500 animate-pulse">Loading history...</div>
          ) : isError ? (
            <div className="text-xs text-red-500">Failed to load history</div>
          ) : (players || []).length === 0 ? (
            <div className="text-xs text-zinc-500">No history found</div>
          ) : (
            <div className="flex flex-col gap-2">
              {(players || []).map(player => (
                <PlayerItem 
                  key={player.id} 
                  player={player} 
                  selectedLapId={selectedLapId} 
                  setSelectedLap={setSelectedLap} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Ideal Lap Section */}
        {idealLap && (
          <div className="p-4 border-t border-zinc-800 bg-black/10">
             <div className="flex justify-between items-center">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">Theoretical Best</h3>
                <span className="font-mono font-bold text-sky-400 text-base">
                  {idealLap.ideal_lap_time.toFixed(2)}s
                </span>
             </div>
          </div>
        )}

        {/* Sectors Widget */}
        <SectorsWidget selectedLap={selectedLap} players={players} />

      </div>
    </div>
  );
});
