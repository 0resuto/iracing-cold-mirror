import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useHistoryQuery, useIdealLapQuery } from '../api/queries';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timer, Radio, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="flex h-full w-full bg-brand-60 min-w-0">
      
      {/* Left Icon Navigation Bar (DESKTOP ONLY) */}
      <div className="hidden md:flex w-16 min-w-[64px] border-r border-brand-60 flex-col items-center py-4 bg-brand-bg flex-none z-10">
        {/* Toggle Sidebar Arrow Button */}
        <button 
          onClick={toggleSidebar} 
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          className="p-3 rounded-xl hover:bg-brand-60 text-brand-10/60 hover:text-brand-10 transition-all flex items-center justify-center cursor-pointer mt-1 mb-10 w-12 h-12 border border-transparent hover:border-brand-60 active:scale-95"
        >
          {isOpen ? <ChevronLeft size={26} strokeWidth={2.5} /> : <ChevronRight size={26} strokeWidth={2.5} />}
        </button>

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
            <Timer size={24} />
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
            <Radio size={24} />
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
            <Settings size={24} />
          </div>
        </div>
      </div>

      {/* Expanded Content Area (Full width on Mobile) */}
      <div className={`flex-1 flex-col overflow-hidden min-w-0 ${isOpen ? 'flex' : 'hidden'}`}>
        
        {/* MOBILE TOP BAR (Segmented Tabs + Close Button) */}
        <div className="flex md:hidden items-center justify-between bg-brand-bg border-b border-brand-60 flex-none gap-3 min-h-[60px] px-5 py-4">
          <div className="flex items-center gap-2 bg-brand-60 p-1.5 rounded-xl border border-brand-60 flex-1">
            <button
              onClick={() => navigate('/history')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] active:scale-95 ${
                isHistory ? 'bg-transparent text-accent-blue border border-accent-blue/40 shadow-sm font-extrabold' : 'text-brand-10/60'
              }`}
            >
              <Timer size={16} /> History
            </button>
            <button
              onClick={() => navigate('/live')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] active:scale-95 ${
                isLive ? 'bg-transparent text-accent-red border border-accent-red/40 shadow-sm font-extrabold' : 'text-brand-10/60'
              }`}
            >
              <Radio size={16} /> Live
            </button>
            <button
              onClick={() => navigate('/system')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] active:scale-95 ${
                isSystem ? 'bg-transparent text-accent-green border border-accent-green/40 shadow-sm font-extrabold' : 'text-brand-10/60'
              }`}
            >
              <Settings size={16} /> System
            </button>
          </div>

          {/* Close Drawer Button */}
          <button
            onClick={toggleSidebar}
            className="p-2.5 rounded-xl bg-brand-60 border border-brand-60 text-brand-10/60 hover:text-brand-10 flex-none min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            title="Close Drawer"
          >
            <X size={22} />
          </button>
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
                <div className="text-xs text-brand-10/40 animate-pulse">Loading history tree...</div>
              ) : isError ? (
                <div className="text-xs text-red-500">Failed to load history</div>
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
                    <span className="font-mono font-bold text-brand-30/80 text-xs flex-none">
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
