import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useHistoryQuery, useIdealLapQuery } from '../api/queries';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timer, Radio, Settings, X, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Button, SegmentedTabs } from '@0resuto/ui-kit';

import { LiveStreamPanel } from './sidebar/LiveStreamPanel';
import { SystemPanel } from './sidebar/SystemPanel';
import { FilterControls } from './sidebar/FilterControls';
import { PlayerItem } from './sidebar/PlayerItem';
import { SectorsWidget } from './sidebar/SectorsWidget';

export const Sidebar = React.memo(function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  
  const isHistory = pathname === '/history';
  const isLive = pathname === '/live';
  const isSystem = pathname === '/system';
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

  const { data: rawPlayers = [], isLoading, isError, error, refetch, isFetching } = useHistoryQuery();
  const { data: idealLap } = useIdealLapQuery(selectedLap?.player_id, selectedLap?.track_name);

  // Accordion state for players: null = auto-follow selected lap; else { selectedLapId, value } override
  const [playerOverride, setPlayerOverride] = useState(null);

  const activePlayerId = useMemo(() => {
    if (selectedLapId && rawPlayers.length > 0) {
      const playerWithLap = rawPlayers.find(p => p.sessions?.some(s => s.laps?.some(l => l.id === selectedLapId)));
      return playerWithLap ? playerWithLap.id : null;
    }
    return null;
  }, [selectedLapId, rawPlayers]);

  const effectiveOpenPlayerId =
    playerOverride && playerOverride.selectedLapId === selectedLapId
      ? (playerOverride.value === 'closed' ? null : playerOverride.value)
      : activePlayerId;

  // Auto-close sidebar on mobile when selecting a lap
  const handleSelectLapMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && isOpen) {
      toggleSidebar();
    }
  };

  // Extract unique players, tracks, and cars (only from valid sessions with complete laps)
  const { uniquePlayers, uniqueTracks, uniqueCars } = useMemo(() => {
    const playersList = [];
    const tracksSet = new Set();
    const carsSet = new Set();

    (rawPlayers || []).forEach(p => {
      const validSessions = (p.sessions || []).filter(s => (s.laps || []).some(l => l.lap_number > 0 && l.lap_time > 0));
      if (validSessions.length > 0) {
        playersList.push({ id: p.id, name: p.name });
        validSessions.forEach(s => {
          if (s.track_name) tracksSet.add(s.track_name);
          if (s.car_name) carsSet.add(s.car_name);
        });
      }
    });

    return {
      uniquePlayers: playersList,
      uniqueTracks: Array.from(tracksSet).sort(),
      uniqueCars: Array.from(carsSet).sort()
    };
  }, [rawPlayers]);

  // Filter and Sort Data (excludes garbage sessions with no complete laps)
  const processedPlayers = useMemo(() => {
    if (!rawPlayers || rawPlayers.length === 0) return [];

    const q = searchQuery.trim().toLowerCase();

    let filtered = rawPlayers.map(p => {
      // Filter by player dropdown
      if (filterPlayer !== 'all' && String(p.id) !== String(filterPlayer)) {
        return null;
      }

      // Filter sessions: only valid sessions with complete laps, matching track, car, and text search
      let sessions = (p.sessions || []).filter(s => {
        const hasValidLaps = (s.laps || []).some(l => l.lap_number > 0 && l.lap_time > 0);
        if (!hasValidLaps) return false;

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

      if (sessions.length === 0) return null;

      // Helper to compute best lap time of session
      const getBestTime = (session) => {
        let best = Infinity;
        (session.laps || []).forEach(l => {
          if (l.lap_number > 0 && l.lap_time > 0 && l.lap_time < best) best = l.lap_time;
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
        const bestA = Math.min(...a.sessions.map(s => Math.min(...(s.laps || []).map(l => (l.lap_number > 0 && l.lap_time > 0) ? l.lap_time : Infinity))));
        const bestB = Math.min(...b.sessions.map(s => Math.min(...(s.laps || []).map(l => (l.lap_number > 0 && l.lap_time > 0) ? l.lap_time : Infinity))));
        return bestA - bestB;
      });
    }

    return filtered;
  }, [rawPlayers, filterPlayer, filterTrack, filterCar, sortBy, searchQuery]);

  // Auto-select first complete lap of the latest uploaded session on load
  useEffect(() => {
    if (rawPlayers.length > 0 && !selectedLapId) {
      let latestSession = null;
      let targetPlayer = null;

      // Find the session with the maximum ID that has valid complete laps
      for (const player of rawPlayers) {
        for (const session of (player.sessions || [])) {
          const validLaps = (session.laps || []).filter(l => l.lap_number > 0 && l.lap_time > 0);
          if (validLaps.length > 0) {
            if (!latestSession || (session.id || 0) > (latestSession.id || 0)) {
              latestSession = session;
              targetPlayer = player;
            }
          }
        }
      }

      if (latestSession && targetPlayer) {
        const validLaps = (latestSession.laps || [])
          .filter(l => l.lap_number > 0 && l.lap_time > 0)
          .sort((a, b) => a.lap_number - b.lap_number);

        if (validLaps.length > 0) {
          setSelectedLap({
            ...validLaps[0],
            player_id: targetPlayer.id,
            track_name: latestSession.track_name,
            car_name: latestSession.car_name
          });
        }
      }
    }
  }, [rawPlayers, selectedLapId, setSelectedLap]);

  return (
    <div className="flex h-full w-full bg-brand-60 min-w-0">
      
      {/* Left Icon Navigation Bar (DESKTOP ONLY) */}
      <div className="hidden md:flex w-11 min-w-[44px] border-r border-brand-60 flex-col items-center py-4 bg-brand-bg flex-none z-10">
        {/* Toggle Sidebar Arrow Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          className="mt-1 mb-10"
        >
          {isOpen ? <ChevronLeft size={20} strokeWidth={2.5} /> : <ChevronRight size={20} strokeWidth={2.5} />}
        </Button>

        <div className="flex flex-col gap-4 w-full">
          {/* History Tab */}
          <div 
            title="History" 
            onClick={() => {
              navigate('/history');
              if (!isOpen) toggleSidebar();
            }} 
            className={`cursor-pointer flex justify-center border-l-2 py-2 transition-colors ${
              isHistory ? 'border-accent-blue text-accent-blue font-bold' : 'border-transparent text-brand-10/60 hover:text-brand-10'
            }`}
          >
            <Timer size={20} />
          </div>

          {/* Live Telemetry Tab */}
          <div 
            title="Live Telemetry" 
            onClick={() => {
              navigate('/live');
              if (!isOpen) toggleSidebar();
            }} 
            className={`cursor-pointer flex justify-center border-l-2 py-2 transition-colors ${
              isLive ? 'border-accent-red text-accent-red font-bold' : 'border-transparent text-brand-10/60 hover:text-brand-10'
            }`}
          >
            <Radio size={20} />
          </div>

          {/* System & Parameters Tab */}
          <div 
            title="System & Parameters" 
            onClick={() => {
              navigate('/system');
              if (!isOpen) toggleSidebar();
            }} 
            className={`cursor-pointer flex justify-center border-l-2 py-2 transition-colors ${
              isSystem ? 'border-accent-green text-accent-green font-bold' : 'border-transparent text-brand-10/60 hover:text-brand-10'
            }`}
          >
            <Settings size={20} />
          </div>
        </div>
      </div>

      {/* Expanded Content Area (Full width on Mobile) */}
      <div className={`flex-1 flex-col overflow-hidden min-w-0 ${isOpen ? 'flex' : 'hidden'}`}>
        
        {/* MOBILE TOP BAR (Segmented Tabs + Close Button) */}
        <div className="flex md:hidden items-center justify-between bg-brand-bg border-b border-brand-60 flex-none gap-3 min-h-[60px] px-5 py-4">
          <div className="flex-1 min-w-0">
            <SegmentedTabs
              tabs={[
                { id: 'history', label: 'History', icon: Timer },
                { id: 'live', label: 'Live', icon: Radio },
                { id: 'system', label: 'System', icon: Settings },
              ]}
              activeTab={isHistory ? 'history' : isLive ? 'live' : 'system'}
              onChange={(id) => navigate('/' + id)}
            />
          </div>

          {/* Close Drawer Button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleSidebar}
            className="min-w-[44px] min-h-[44px]"
            title="Close Drawer"
          >
            <X size={22} />
          </Button>
        </div>

        {isHistory ? (
          <>
            <FilterControls
              processedPlayers={processedPlayers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterPlayer={filterPlayer}
              setFilterPlayer={setFilterPlayer}
              filterTrack={filterTrack}
              setFilterTrack={setFilterTrack}
              filterCar={filterCar}
              setFilterCar={setFilterCar}
              sortBy={sortBy}
              setSortBy={setSortBy}
              uniquePlayers={uniquePlayers}
              uniqueTracks={uniqueTracks}
              uniqueCars={uniqueCars}
            />

            {/* History Tree List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-w-0 py-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 space-y-2 text-center">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-brand-10/50 animate-pulse">Loading history tree...</span>
                </div>
              ) : isError ? (
                <div className="p-3.5 mx-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-accent-red font-semibold text-xs">
                    <AlertCircle size={15} />
                    <span>Failed to load history</span>
                  </div>
                  <p className="text-[11px] text-brand-10/70 line-clamp-2">
                    {error?.message || 'Could not connect to backend server'}
                  </p>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => refetch()}
                    isLoading={isFetching}
                    leftIcon={<RefreshCw size={12} />}
                    className="mt-1"
                  >
                    Retry Connection
                  </Button>
                </div>
              ) : processedPlayers.length === 0 ? (
                <div className="text-xs text-brand-10/40 text-center py-6 border border-dashed border-brand-60 rounded-lg">
                  No matching sessions found
                </div>
              ) : (
                <div className="flex flex-col gap-3.5 min-w-0">
                  {processedPlayers.map(player => (
                    <PlayerItem 
                      key={player.id} 
                      player={player} 
                      isOpen={effectiveOpenPlayerId === player.id}
                      onToggle={() => setPlayerOverride({ selectedLapId, value: effectiveOpenPlayerId === player.id ? 'closed' : player.id })}
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
              <div className="border-t border-brand-60 bg-black/10 flex-none min-w-0 px-5 py-1.5">
                 <div className="flex justify-between items-center min-w-0">
                    <h3 className="text-xs uppercase tracking-wider text-brand-10/60 font-semibold m-0 truncate">Theoretical Best</h3>
                    <span className="font-mono font-bold text-purple-400 text-xs flex-none">
                      {idealLap.ideal_lap_time.toFixed(2)}s
                    </span>
                 </div>
              </div>
            )}

            {/* Sectors Widget */}
            <SectorsWidget selectedLap={selectedLap} players={rawPlayers} />
          </>
        ) : isLive ? (
          <LiveStreamPanel />
        ) : isSystem ? (
          <SystemPanel />
        ) : null}

      </div>
    </div>
  );
});
