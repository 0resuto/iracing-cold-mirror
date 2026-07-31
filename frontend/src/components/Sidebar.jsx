import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useLiveStore } from '../store/useLiveStore';
import { useHistoryQuery, useIdealLapQuery, useSystemInfoQuery } from '../api/queries';
import { Flag, User, Timer, Radio, Settings } from 'lucide-react';

// --- Subcomponents with React.memo for Performance ---

const LapItem = React.memo(function LapItem({ lap, player, session, selectedLapId, bestLapId, setSelectedLap }) {
  const isSelected = selectedLapId === lap.id;
  const isBest = lap.id === bestLapId;
  const timeText = lap.lap_time > 0 ? `${lap.lap_time.toFixed(2)}s` : 'Outlap';
  const lapLabel = lap.lap_number === 0 ? 'Outlap' : `Lap ${lap.lap_number}`;

  return (
    <div
      onClick={() => setSelectedLap({ ...lap, player_id: player.id, track_name: session.track_name })}
      className={`flex justify-between items-center px-3 py-1.5 my-0.5 text-xs cursor-pointer border-l-2 rounded-r transition-colors ${
        isSelected
          ? 'border-sky-400 bg-sky-400/10 text-zinc-100 font-medium'
          : 'border-transparent hover:bg-white/5 text-zinc-400'
      }`}
    >
      <span>{lapLabel}</span>
      <span className={`font-mono font-bold ${isBest ? 'text-purple-400' : 'text-inherit'}`}>
        {timeText}
      </span>
    </div>
  );
});

const SessionItem = React.memo(function SessionItem({ session, player, selectedLapId, setSelectedLap }) {
  const hasSelected = useMemo(() => {
    return session.laps?.some(l => l.id === selectedLapId) ?? false;
  }, [session.laps, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);
  const [showAllLaps, setShowAllLaps] = useState(false);

  // Expand if user selects a lap in this session
  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  const bestLapId = useMemo(() => {
    let best = null;
    let minTime = Infinity;
    (session.laps || []).forEach(l => {
      if (l.lap_time > 0 && l.lap_time < minTime) {
        minTime = l.lap_time;
        best = l.id;
      }
    });
    return best;
  }, [session.laps]);

  const laps = session.laps || [];
  const visibleLaps = showAllLaps ? laps : laps.slice(0, 15);
  const hiddenCount = laps.length - visibleLaps.length;

  return (
    <div className="flex flex-col border-t border-zinc-800/80">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center px-3.5 py-2 cursor-pointer transition-colors ${
          isOpen ? 'bg-white/5 text-zinc-200' : 'hover:bg-white/5 text-zinc-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Flag size={14} className="text-zinc-500" />
          <span className="text-xs font-medium truncate">{session.track_name}</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <span className="text-[10px] font-mono text-zinc-500">
            {laps.length} {laps.length === 1 ? 'lap' : 'laps'}
          </span>
          <span className="text-[10px] text-zinc-500">{isOpen ? '▼' : '▶'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col bg-black/20 py-1 pl-3 border-l border-zinc-800/50 my-0.5">
          {laps.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">No laps recorded yet.</div>
          ) : (
            <>
              {visibleLaps.map(lap => (
                <LapItem 
                  key={lap.id} 
                  lap={lap} 
                  player={player} 
                  session={session} 
                  selectedLapId={selectedLapId} 
                  bestLapId={bestLapId} 
                  setSelectedLap={setSelectedLap} 
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllLaps(true)}
                  className="mt-1 text-[11px] text-sky-400 hover:text-sky-300 font-mono py-1 px-3 text-left cursor-pointer transition-colors"
                >
                  + Show {hiddenCount} more laps
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

const PlayerItem = React.memo(function PlayerItem({ player, selectedLapId, setSelectedLap }) {
  const hasSelected = useMemo(() => {
    return player.sessions?.some(s => s.laps?.some(l => l.id === selectedLapId)) ?? false;
  }, [player.sessions, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);

  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  const sessionsCount = player.sessions?.length || 0;

  return (
    <div className="flex flex-col bg-zinc-950/60 border border-zinc-800/80 rounded-md overflow-hidden shadow-sm">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center px-3.5 py-2 cursor-pointer font-medium text-xs transition-colors ${
          isOpen ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800/50 text-zinc-300'
        }`}
      >
        <span className="flex items-center gap-2">
          <User size={14} className="text-zinc-500" /> {player.name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">{sessionsCount} sess</span>
          <span className="text-[10px] text-zinc-500">{isOpen ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {isOpen && (
        <div className="flex flex-col">
          {sessionsCount === 0 ? (
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
});

const SectorsWidget = React.memo(function SectorsWidget({ selectedLap, players }) {
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
    <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex-none flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">Sectors</h3>
        <div className="flex gap-1 text-[10px]">
          <button 
            onClick={() => setSortBy('order')} 
            className={`px-1.5 py-0.5 rounded cursor-pointer ${sortBy === 'order' ? 'bg-zinc-800 text-zinc-200 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            #
          </button>
          <button 
            onClick={() => setSortBy('time')} 
            className={`px-1.5 py-0.5 rounded cursor-pointer ${sortBy === 'time' ? 'bg-zinc-800 text-zinc-200 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Time
          </button>
          <button 
            onClick={() => setSortBy('delta')} 
            className={`px-1.5 py-0.5 rounded cursor-pointer ${sortBy === 'delta' ? 'bg-zinc-800 text-zinc-200 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Δ
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
        {displaySectors.map(s => (
          <div key={s.id || s.sector_number} className="flex justify-between items-center text-xs bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800/80">
            <span className="text-zinc-400 font-medium">Sector {s.sector_number}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-zinc-200">{s.sector_time.toFixed(2)}s</span>
              {s.delta !== null && (
                <span className={`font-mono text-[11px] ${s.delta <= 0 ? 'text-green-400' : 'text-red-400'}`}>
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

// --- Live Telemetry Panel ---

const LiveStreamPanel = () => {
  const liveLapData = useLiveStore(state => state.liveLapData);
  const isStreaming = useLiveStore(state => state.isStreaming);
  const latestPoint = liveLapData[liveLapData.length - 1];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">Live Stream</h2>
        {isStreaming ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            LIVE
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-medium">
            OFFLINE
          </span>
        )}
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
        <div className="text-xs text-zinc-400 flex justify-between items-center">
          <span>Collector Status</span>
          <span className={`font-semibold flex items-center gap-1.5 ${isStreaming ? 'text-green-400' : 'text-zinc-500'}`}>
            {isStreaming ? '🟢 iRacing Streaming' : '⚪ Waiting for iRacing...'}
          </span>
        </div>
        <div className="text-xs text-zinc-400 flex justify-between items-center">
          <span>Buffered Points</span>
          <span className="font-mono text-zinc-100 font-bold">{liveLapData.length}</span>
        </div>
        {isStreaming && latestPoint && (
          <>
            <div className="text-xs text-zinc-400 flex justify-between items-center">
              <span>Live Speed</span>
              <span className="font-mono text-red-400 font-bold">{latestPoint.speed?.toFixed(1)} km/h</span>
            </div>
            <div className="text-xs text-zinc-400 flex justify-between items-center">
              <span>Track Position</span>
              <span className="font-mono text-sky-400 font-bold">{((latestPoint.lap_dist_pct || 0) * 100).toFixed(1)}%</span>
            </div>
          </>
        )}
      </div>

      {!isStreaming && (
        <div className="text-xs text-amber-400/90 leading-relaxed bg-amber-500/10 p-3 rounded border border-amber-500/20">
          ⚠️ <strong>iRacing isn't running or collector is idle.</strong><br/>
          Start iRacing live collector script (<code>run.bat</code> or <code>dev/run_dev.bat</code>) to view live telemetry stream.
        </div>
      )}
    </div>
  );
};

// --- System & Parameters Panel ---

const SystemPanel = () => {
  const { data: systemInfo, isLoading, isError } = useSystemInfoQuery();

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">System & Parameters</h2>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold">
          v0.1.0
        </span>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500 animate-pulse">Loading system statistics...</div>
      ) : isError || !systemInfo ? (
        <div className="text-xs text-red-500">Failed to connect to server</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Server Connection Card */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Server Infrastructure</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Backend API</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Database</span>
              <span className="font-mono text-zinc-300">{systemInfo.database}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">API Key Security</span>
              <span className={`font-semibold ${systemInfo.auth_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {systemInfo.auth_enabled ? '🔒 Active' : '🔓 Dev Mode'}
              </span>
            </div>
          </div>

          {/* Last Uploaded Session Card */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Last Session Upload</span>
            {systemInfo.last_upload ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Track</span>
                  <span className="font-semibold text-zinc-200">{systemInfo.last_upload.track_name}</span>
                </div>
                {systemInfo.last_upload.created_at && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Uploaded</span>
                    <span className="text-zinc-300">
                      {new Date(systemInfo.last_upload.created_at).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Driver</span>
                  <span className="text-zinc-300">{systemInfo.last_upload.player_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Laps Uploaded</span>
                  <span className="font-mono text-sky-400 font-bold">{systemInfo.last_upload.total_laps} laps</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-500 italic">No telemetry sessions uploaded yet</div>
            )}
          </div>

          {/* Database Stats Card */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Storage Metrics</span>
            <div className="grid grid-cols-3 gap-2 text-center mt-1">
              <div className="bg-zinc-900 p-2 rounded border border-zinc-800/80">
                <div className="text-xs text-zinc-500">Drivers</div>
                <div className="text-base font-bold font-mono text-zinc-200">{systemInfo.total_players}</div>
              </div>
              <div className="bg-zinc-900 p-2 rounded border border-zinc-800/80">
                <div className="text-xs text-zinc-500">Sessions</div>
                <div className="text-base font-bold font-mono text-sky-400">{systemInfo.total_sessions}</div>
              </div>
              <div className="bg-zinc-900 p-2 rounded border border-zinc-800/80">
                <div className="text-xs text-zinc-500">Laps</div>
                <div className="text-base font-bold font-mono text-purple-400">{systemInfo.total_laps}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



// --- Main Sidebar Component ---

export const Sidebar = React.memo(function Sidebar() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const selectedLap = useAppStore(state => state.selectedLap);
  const setSelectedLap = useAppStore(state => state.setSelectedLap);
  const isOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const selectedLapId = selectedLap?.id || null;

  // Filter & Sort State
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [filterTrack, setFilterTrack] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'fastest'

  const { data: rawPlayers = [], isLoading, isError } = useHistoryQuery();
  const { data: idealLap } = useIdealLapQuery(selectedLap?.player_id, selectedLap?.track_name);

  // Extract unique players and tracks
  const { uniquePlayers, uniqueTracks } = useMemo(() => {
    const playersList = [];
    const tracksSet = new Set();

    (rawPlayers || []).forEach(p => {
      playersList.push({ id: p.id, name: p.name });
      (p.sessions || []).forEach(s => {
        if (s.track_name) tracksSet.add(s.track_name);
      });
    });

    return {
      uniquePlayers: playersList,
      uniqueTracks: Array.from(tracksSet).sort()
    };
  }, [rawPlayers]);

  // Filter and Sort Data
  const processedPlayers = useMemo(() => {
    if (!rawPlayers || rawPlayers.length === 0) return [];

    let filtered = rawPlayers.map(p => {
      // Filter by player
      if (filterPlayer !== 'all' && String(p.id) !== String(filterPlayer)) {
        return null;
      }

      // Filter sessions by track
      let sessions = (p.sessions || []).filter(s => {
        if (filterTrack !== 'all' && s.track_name !== filterTrack) return false;
        return true;
      });

      if (sessions.length === 0 && filterTrack !== 'all') return null;

      // Helper to compute best lap time of session
      const getBestTime = (session) => {
        let best = Infinity;
        (session.laps || []).forEach(l => {
          if (l.lap_time > 0 && l.lap_time < best) best = l.lap_time;
        });
        return best;
      };

      // Sort sessions
      sessions = [...sessions].sort((a, b) => {
        if (sortBy === 'fastest') {
          return getBestTime(a) - getBestTime(b);
        }
        if (sortBy === 'oldest') {
          return (a.id || 0) - (b.id || 0);
        }
        // Newest (default)
        return (b.id || 0) - (a.id || 0);
      });

      return {
        ...p,
        sessions
      };
    }).filter(Boolean);

    // Sort players if sorting by fastest
    if (sortBy === 'fastest') {
      filtered.sort((a, b) => {
        const bestA = Math.min(...a.sessions.map(s => Math.min(...(s.laps || []).map(l => l.lap_time > 0 ? l.lap_time : Infinity))));
        const bestB = Math.min(...b.sessions.map(s => Math.min(...(s.laps || []).map(l => l.lap_time > 0 ? l.lap_time : Infinity))));
        return bestA - bestB;
      });
    }

    return filtered;
  }, [rawPlayers, filterPlayer, filterTrack, sortBy]);

  // Auto-select latest session on load
  useEffect(() => {
    if (rawPlayers.length > 0 && !selectedLapId) {
      const latestPlayer = rawPlayers[rawPlayers.length - 1];
      const latestSession = (latestPlayer.sessions || [])[latestPlayer.sessions?.length - 1];
      if (latestSession?.laps?.length > 0) {
        setSelectedLap({ ...latestSession.laps[0], player_id: latestPlayer.id, track_name: latestSession.track_name });
      }
    }
  }, [rawPlayers, selectedLapId, setSelectedLap]);

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
          {/* History Tab */}
          <div 
            title="History" 
            onClick={() => {
              setActiveTab('history');
              if (!isOpen) toggleSidebar();
            }} 
            className={`cursor-pointer text-xl flex justify-center border-l-2 py-1 transition-colors ${
              activeTab === 'history' ? 'border-sky-400 text-sky-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Timer size={20} />
          </div>

          {/* Live Telemetry Tab */}
          <div 
            title="Live Telemetry" 
            onClick={() => {
              setActiveTab('live');
              if (!isOpen) toggleSidebar();
            }} 
            className={`cursor-pointer text-xl flex justify-center border-l-2 py-1 transition-colors ${
              activeTab === 'live' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Radio size={20} />
          </div>

          {/* System & Parameters Tab */}
          <div 
            title="System & Parameters" 
            onClick={() => {
              setActiveTab('system');
              if (!isOpen) toggleSidebar();
            }} 
            className={`cursor-pointer text-xl flex justify-center border-l-2 py-1 transition-colors ${
              activeTab === 'system' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Settings size={20} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`flex-1 flex-col min-w-[256px] overflow-hidden ${isOpen ? 'flex' : 'hidden'}`}>
        
        {activeTab === 'history' ? (
          <>
            {/* Filter & Sort Controls */}
            <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex-none flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">History</h2>
                <span className="text-[10px] font-mono text-zinc-500">
                  {processedPlayers.reduce((acc, p) => acc + (p.sessions?.length || 0), 0)} sessions
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {/* Driver Filter */}
                <select
                  value={filterPlayer}
                  onChange={(e) => setFilterPlayer(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded px-2 py-1 outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Drivers</option>
                  {uniquePlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Track Filter */}
                <select
                  value={filterTrack}
                  onChange={(e) => setFilterTrack(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded px-2 py-1 outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Tracks</option>
                  {uniqueTracks.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Sort Pills */}
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className="text-zinc-500 font-medium">Sort by:</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setSortBy('newest')} 
                    className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      sortBy === 'newest' ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Newest
                  </button>
                  <button 
                    onClick={() => setSortBy('oldest')} 
                    className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      sortBy === 'oldest' ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Oldest
                  </button>
                  <button 
                    onClick={() => setSortBy('fastest')} 
                    className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      sortBy === 'fastest' ? 'bg-zinc-800 text-purple-400 font-bold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Fastest
                  </button>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {isLoading ? (
                <div className="text-xs text-zinc-500 animate-pulse">Loading history...</div>
              ) : isError ? (
                <div className="text-xs text-red-500">Failed to load history</div>
              ) : processedPlayers.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-4">No matching sessions found</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {processedPlayers.map(player => (
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
              <div className="p-3 border-t border-zinc-800 bg-black/10 flex-none">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0">Theoretical Best</h3>
                    <span className="font-mono font-bold text-sky-400 text-base">
                      {idealLap.ideal_lap_time.toFixed(2)}s
                    </span>
                 </div>
              </div>
            )}

            {/* Sectors Widget */}
            <SectorsWidget selectedLap={selectedLap} players={rawPlayers} />
          </>
        ) : activeTab === 'live' ? (
          <LiveStreamPanel />
        ) : (
          <SystemPanel />
        )}

      </div>
    </div>
  );
});
