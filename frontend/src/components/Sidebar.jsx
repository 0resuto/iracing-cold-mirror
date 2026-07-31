import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useLiveStore } from '../store/useLiveStore';
import { useHistoryQuery, useIdealLapQuery, useSystemInfoQuery } from '../api/queries';
import { Flag, User, Timer, Radio, Settings, Car, Calendar, Clock, ChevronDown, ChevronRight, Award, Search, X } from 'lucide-react';

// --- Helper Functions ---

const formatSessionTime = (startTimeStr, durationSec, createdAtStr) => {
  const dateObj = startTimeStr ? new Date(startTimeStr) : (createdAtStr ? new Date(createdAtStr) : null);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return { date: 'Session Date N/A', timeRange: '', duration: '' };
  }

  const date = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const startTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let timeRange = startTime;
  let duration = '';

  if (durationSec && durationSec > 0) {
    const endDateObj = new Date(dateObj.getTime() + durationSec * 1000);
    const endTime = endDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeRange = `${startTime} – ${endTime}`;

    const mins = Math.floor(durationSec / 60);
    const secs = Math.floor(durationSec % 60);
    duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  return { date, timeRange, duration };
};

// --- Tree Level 4: Lap Item ---

const LapItem = React.memo(function LapItem({ lap, player, trackName, selectedLapId, bestLapId, setSelectedLap, onSelectLap }) {
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
      className={`group flex justify-between items-center px-3 py-1.5 my-0.5 text-xs cursor-pointer rounded-md transition-all ${
        isSelected
          ? 'bg-sky-500/20 text-sky-200 font-semibold border-l-4 border-sky-400 shadow-sm'
          : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Timer size={13} className={isSelected ? 'text-sky-400 flex-none' : 'text-zinc-500 group-hover:text-zinc-400 flex-none'} />
        <span className="truncate">{lapLabel}</span>
        {isBest && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-none">
            <Award size={10} /> BEST
          </span>
        )}
      </div>
      <span className={`font-mono font-bold text-xs flex-none ml-2 ${isBest ? 'text-purple-400' : isSelected ? 'text-sky-300' : 'text-zinc-300'}`}>
        {timeText}
      </span>
    </div>
  );
});

// --- Tree Level 3: Session Item ---

const SessionItem = React.memo(function SessionItem({ session, player, trackName, selectedLapId, setSelectedLap, onSelectLap }) {
  const hasSelected = useMemo(() => {
    return session.laps?.some(l => l.id === selectedLapId) ?? false;
  }, [session.laps, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);
  const [showAllLaps, setShowAllLaps] = useState(false);

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

  const { date, timeRange, duration } = formatSessionTime(session.start_time, session.duration_seconds, session.created_at);
  const carName = session.car_name || 'Unknown Car';

  return (
    <div className="flex flex-col my-1 relative min-w-0">
      {/* Session Header Card */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col gap-1 p-2.5 rounded-lg cursor-pointer border transition-all ${
          isOpen
            ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-md'
            : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:bg-zinc-900/70'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-semibold min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Calendar size={13} className="text-emerald-400 flex-none" />
            <span className="truncate text-zinc-200">{date}</span>
            {timeRange && <span className="text-[10px] font-mono text-zinc-500 font-normal truncate">({timeRange})</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-none ml-1">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {laps.length} laps
            </span>
            {isOpen ? <ChevronDown size={14} className="text-emerald-400" /> : <ChevronRight size={14} className="text-zinc-500" />}
          </div>
        </div>

        {/* Sub-info: Car & Duration */}
        <div className="flex items-center justify-between text-[11px] min-w-0 gap-1 mt-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px] truncate flex-1 min-w-0">
            <Car size={11} className="flex-none text-emerald-400" />
            <span className="truncate">{carName}</span>
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 flex-none">
              <Clock size={10} className="text-zinc-500" />
              {duration}
            </span>
          )}
        </div>
      </div>

      {/* Laps List Level 4 */}
      {isOpen && (
        <div className="flex flex-col ml-3 pl-2 border-l-2 border-amber-500/40 my-1 py-1 bg-black/40 rounded-r min-w-0">
          {laps.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500 italic">No laps recorded.</div>
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

// --- Tree Level 2: Track Item ---

const TrackItem = React.memo(function TrackItem({ trackName, sessions, player, selectedLapId, setSelectedLap, onSelectLap }) {
  const hasSelected = useMemo(() => {
    return sessions.some(s => s.laps?.some(l => l.id === selectedLapId));
  }, [sessions, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);

  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  const totalLaps = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.laps?.length || 0), 0);
  }, [sessions]);

  return (
    <div className="flex flex-col my-1 min-w-0">
      {/* Track Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer font-semibold text-xs transition-all min-w-0 border ${
          isOpen 
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-200 shadow-sm' 
            : 'bg-zinc-900/70 border-zinc-800 hover:bg-zinc-800/60 text-zinc-300'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <Flag size={14} className="text-purple-400 flex-none" />
          <span className="truncate font-bold">{trackName}</span>
        </span>
        <div className="flex items-center gap-1.5 flex-none ml-1">
          <span className="text-[10px] font-mono text-purple-300/90 bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/20 font-bold">
            {sessions.length} sess · {totalLaps} laps
          </span>
          {isOpen ? <ChevronDown size={14} className="text-purple-400" /> : <ChevronRight size={14} className="text-zinc-500" />}
        </div>
      </div>

      {/* Sessions List Level 3 */}
      {isOpen && (
        <div className="flex flex-col ml-3 pl-2 border-l-2 border-purple-500/30 my-1 min-w-0">
          {sessions.map(session => (
            <SessionItem 
              key={session.id} 
              session={session} 
              player={player} 
              trackName={trackName}
              selectedLapId={selectedLapId} 
              setSelectedLap={setSelectedLap} 
              onSelectLap={onSelectLap}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// --- Tree Level 1: Driver / Player Item ---

const PlayerItem = React.memo(function PlayerItem({ player, selectedLapId, setSelectedLap, onSelectLap }) {
  const hasSelected = useMemo(() => {
    return player.sessions?.some(s => s.laps?.some(l => l.id === selectedLapId)) ?? false;
  }, [player.sessions, selectedLapId]);

  const [isOpen, setIsOpen] = useState(hasSelected);

  useEffect(() => {
    if (hasSelected) setIsOpen(true);
  }, [hasSelected]);

  // Group sessions by Track Name for this player
  const trackGroups = useMemo(() => {
    const groups = {};
    (player.sessions || []).forEach(s => {
      const track = s.track_name || 'Unknown Track';
      if (!groups[track]) groups[track] = [];
      groups[track].push(s);
    });
    return groups;
  }, [player.sessions]);

  const sessionsCount = player.sessions?.length || 0;
  const tracksCount = Object.keys(trackGroups).length;

  return (
    <div className="flex flex-col bg-zinc-950 border-l-4 border-sky-500 border-y border-r border-zinc-800 rounded-xl overflow-hidden shadow-lg min-w-0">
      {/* Player Header Card */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex justify-between items-center px-3.5 py-2.5 cursor-pointer font-bold text-xs transition-colors min-w-0 ${
          isOpen ? 'bg-zinc-800/90 text-zinc-100' : 'hover:bg-zinc-800/50 text-zinc-200'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <User size={15} className="text-sky-400 flex-none" />
          <span className="text-sky-100 font-bold truncate">{player.name}</span>
        </span>
        <div className="flex items-center gap-1.5 flex-none ml-1">
          <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 font-bold">
            {tracksCount} tracks · {sessionsCount} sess
          </span>
          {isOpen ? <ChevronDown size={14} className="text-sky-400" /> : <ChevronRight size={14} className="text-zinc-500" />}
        </div>
      </div>
      
      {/* Tracks List Level 2 */}
      {isOpen && (
        <div className="flex flex-col p-2 bg-black/60 min-w-0 gap-1">
          {sessionsCount === 0 ? (
            <div className="px-4 py-2 text-xs text-zinc-500 italic">No sessions yet.</div>
          ) : (
            Object.entries(trackGroups).map(([trackName, sessions]) => (
              <TrackItem 
                key={trackName} 
                trackName={trackName} 
                sessions={sessions} 
                player={player} 
                selectedLapId={selectedLapId} 
                setSelectedLap={setSelectedLap} 
                onSelectLap={onSelectLap}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

// --- Sectors Widget Component ---

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
    <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex-none flex flex-col min-w-0">
      <div className="flex justify-between items-center mb-2 min-w-0">
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
      
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[130px] custom-scrollbar pr-1">
        {displaySectors.map(s => (
          <div key={s.id || s.sector_number} className="flex justify-between items-center text-xs bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800/80 min-w-0">
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
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar min-w-0">
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
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar min-w-0">
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

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [filterTrack, setFilterTrack] = useState('all');
  const [filterCar, setFilterCar] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'fastest'

  const { data: rawPlayers = [], isLoading, isError } = useHistoryQuery();
  const { data: idealLap } = useIdealLapQuery(selectedLap?.player_id, selectedLap?.track_name);

  // Auto-close sidebar on mobile when selecting a lap
  const handleSelectLapMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && isOpen) {
      toggleSidebar();
    }
  };

  // Extract unique players, tracks, and cars
  const { uniquePlayers, uniqueTracks, uniqueCars } = useMemo(() => {
    const playersList = [];
    const tracksSet = new Set();
    const carsSet = new Set();

    (rawPlayers || []).forEach(p => {
      playersList.push({ id: p.id, name: p.name });
      (p.sessions || []).forEach(s => {
        if (s.track_name) tracksSet.add(s.track_name);
        if (s.car_name) carsSet.add(s.car_name);
      });
    });

    return {
      uniquePlayers: playersList,
      uniqueTracks: Array.from(tracksSet).sort(),
      uniqueCars: Array.from(carsSet).sort()
    };
  }, [rawPlayers]);

  // Filter and Sort Data
  const processedPlayers = useMemo(() => {
    if (!rawPlayers || rawPlayers.length === 0) return [];

    const q = searchQuery.trim().toLowerCase();

    let filtered = rawPlayers.map(p => {
      // Filter by player dropdown
      if (filterPlayer !== 'all' && String(p.id) !== String(filterPlayer)) {
        return null;
      }

      // Filter sessions by track, car, and text search
      let sessions = (p.sessions || []).filter(s => {
        if (filterTrack !== 'all' && s.track_name !== filterTrack) return false;
        if (filterCar !== 'all' && (s.car_name || 'Unknown Car') !== filterCar) return false;
        
        if (q) {
          const matchDriver = p.name.toLowerCase().includes(q);
          const matchTrack = (s.track_name || '').toLowerCase().includes(q);
          const matchCar = (s.car_name || '').toLowerCase().includes(q);
          if (!matchDriver && !matchTrack && !matchCar) return false;
        }

        return true;
      });

      if (sessions.length === 0 && (filterTrack !== 'all' || filterCar !== 'all' || q)) return null;

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
  }, [rawPlayers, filterPlayer, filterTrack, filterCar, sortBy, searchQuery]);

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
    <div className="flex h-full w-full bg-zinc-900 min-w-0">
      
      {/* Left Icon Navigation Bar (DESKTOP ONLY - Hidden on Mobile to save space) */}
      <div className="hidden md:flex w-16 min-w-[64px] border-r border-zinc-800 flex-col items-center py-4 bg-zinc-950 flex-none z-10">
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

      {/* Expanded Content Area (Takes 100% width on Mobile, Flex-1 on Desktop) */}
      <div className={`flex-1 flex-col overflow-hidden min-w-0 ${isOpen ? 'flex' : 'hidden'}`}>
        
        {/* MOBILE TOP BAR (Top Tabs + Close Button) */}
        <div className="flex md:hidden items-center justify-between p-3 bg-zinc-950 border-b border-zinc-800 flex-none gap-2">
          {/* Segmented Top Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex-1">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'history' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-zinc-500'
              }`}
            >
              <Timer size={14} /> History
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-1 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-500'
              }`}
            >
              <Radio size={14} /> Live
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 py-1 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'system' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500'
              }`}
            >
              <Settings size={14} /> System
            </button>
          </div>

          {/* Close Drawer Button */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex-none"
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {activeTab === 'history' ? (
          <>
            {/* Filter & Search Header Controls */}
            <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex-none flex flex-col gap-2 min-w-0">
              <div className="flex justify-between items-center min-w-0">
                <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-bold m-0 truncate">Telemetry Explorer</h2>
                <span className="text-[10px] font-mono text-zinc-500 flex-none">
                  {processedPlayers.reduce((acc, p) => acc + (p.sessions?.length || 0), 0)} sessions
                </span>
              </div>

              {/* Instant Search Bar */}
              <div className="relative flex items-center min-w-0">
                <Search size={13} className="absolute left-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search driver, track, car..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg pl-8 pr-7 py-1.5 outline-none focus:border-sky-500 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Dropdown Filters (3 Columns: Driver, Track, Car) */}
              <div className="grid grid-cols-3 gap-1 min-w-0">
                {/* Driver Filter */}
                <select
                  value={filterPlayer}
                  onChange={(e) => setFilterPlayer(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1 py-1 outline-none focus:border-sky-500 cursor-pointer truncate"
                  title="Filter by Driver"
                >
                  <option value="all">Drivers ({uniquePlayers.length})</option>
                  {uniquePlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Track Filter */}
                <select
                  value={filterTrack}
                  onChange={(e) => setFilterTrack(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1 py-1 outline-none focus:border-sky-500 cursor-pointer truncate"
                  title="Filter by Track"
                >
                  <option value="all">Tracks ({uniqueTracks.length})</option>
                  {uniqueTracks.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Car Filter */}
                <select
                  value={filterCar}
                  onChange={(e) => setFilterCar(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1 py-1 outline-none focus:border-sky-500 cursor-pointer truncate"
                  title="Filter by Car"
                >
                  <option value="all">Cars ({uniqueCars.length})</option>
                  {uniqueCars.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sort Pills */}
              <div className="flex items-center justify-between text-[10px] mt-0.5 min-w-0">
                <span className="text-zinc-500 font-medium flex-none">Sort:</span>
                <div className="flex gap-1 flex-none">
                  <button 
                    onClick={() => setSortBy('newest')} 
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      sortBy === 'newest' ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Newest
                  </button>
                  <button 
                    onClick={() => setSortBy('oldest')} 
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      sortBy === 'oldest' ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Oldest
                  </button>
                  <button 
                    onClick={() => setSortBy('fastest')} 
                    className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      sortBy === 'fastest' ? 'bg-zinc-800 text-purple-400 font-bold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Fastest
                  </button>
                </div>
              </div>
            </div>

            {/* History Tree List */}
            <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar min-w-0">
              {isLoading ? (
                <div className="text-xs text-zinc-500 animate-pulse">Loading history tree...</div>
              ) : isError ? (
                <div className="text-xs text-red-500">Failed to load history</div>
              ) : processedPlayers.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                  No matching sessions found
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 min-w-0">
                  {processedPlayers.map(player => (
                    <PlayerItem 
                      key={player.id} 
                      player={player} 
                      selectedLapId={selectedLapId} 
                      setSelectedLap={setSelectedLap} 
                      onSelectLap={handleSelectLapMobile}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Ideal Lap Section */}
            {idealLap && (
              <div className="p-3 border-t border-zinc-800 bg-black/10 flex-none min-w-0">
                 <div className="flex justify-between items-center min-w-0">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold m-0 truncate">Theoretical Best</h3>
                    <span className="font-mono font-bold text-sky-400 text-base flex-none">
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
