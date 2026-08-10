import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { LiveTelemetryChart } from './components/LiveTelemetryChart';
import { LiveStandings } from './components/LiveStandings';
import { TrackMap } from './components/TrackMap';
import { StatsWidget } from './components/StatsWidget';
import { useAppStore } from './store/useAppStore';
import { useLiveTelemetryWS } from './features/live/useLiveTelemetryWS';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MapPin, Settings, Clock, Menu, Activity, Map, BarChart2, User, CarFront } from 'lucide-react';
import { useTelemetryData } from './features/telemetry/useTelemetryData';
import { useLiveStore } from './store/useLiveStore';

const HeaderLiveStats = ({ isStreaming }) => {
  const [stats, setStats] = useState({ speed: 0, pct: 0 });

  useEffect(() => {
    if (!isStreaming) return;
    
    let lastUpdateTime = 0;
    const unsubscribe = useLiveStore.subscribe((state) => {
      const now = performance.now();
      if (now - lastUpdateTime < 500) return; // Throttle to 2Hz
      lastUpdateTime = now;

      const data = state.liveLapData;
      const latest = data[data.length - 1];
      if (latest) {
        setStats({
          speed: latest.speed || 0,
          pct: latest.lap_dist_pct || 0
        });
      }
    });
    return unsubscribe;
  }, [isStreaming]);

  if (!isStreaming) return null;

  return (
    <div className="flex items-center gap-4 text-xs bg-brand-60/20 px-4 py-1.5 rounded-lg border border-brand-60 shadow-sm ml-2">
      <div className="flex items-center gap-1.5 text-brand-10/80">
        <span className="text-brand-10/40">Speed</span>
        <span className="font-mono text-red-400 font-bold w-12 text-right">{stats.speed.toFixed(0)}</span>
      </div>
      <div className="w-px h-3 bg-brand-60/80 mx-1"></div>
      <div className="flex items-center gap-1.5 text-brand-10/80">
        <span className="text-brand-10/40">Track</span>
        <span className="font-mono text-brand-30/90 font-bold w-12 text-right">{(stats.pct * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

function AppContent() {
  const location = useLocation();
  const pathname = location.pathname;
  
  const isLive = pathname === '/live';
  const isSystem = pathname === '/system';
  const isHistory = pathname === '/history';

  const selectedLap = useAppStore(state => state.selectedLap);
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const steeringMax = useAppStore(state => state.steeringMax);

  const { lapData, players } = useTelemetryData();

  const liveTrackName = useLiveStore(state => state.liveTrackName);
  const livePlayerName = useLiveStore(state => state.livePlayerName);
  const liveCarName = useLiveStore(state => state.liveCarName);
  const isStreaming = useLiveStore(state => state.isStreaming);

  const trackName = isLive ? liveTrackName : selectedLap?.track_name;
  
  let playerName = isLive ? livePlayerName : null;
  if (!isLive && selectedLap) {
    playerName = players?.find(p => p.id === selectedLap.player_id)?.name;
  }
  const carName = isLive ? liveCarName : selectedLap?.car_name;

  // Mobile View Tab state
  const [mobileView, setMobileView] = useState('charts'); // 'charts' | 'map' | 'stats'

  // Initialize live telemetry websocket when on '/live' route
  useLiveTelemetryWS(isLive);

  return (
    <div className="w-full h-screen flex overflow-hidden bg-brand-bg text-brand-10 relative font-sans">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' },
          success: { iconTheme: { primary: '#10b981', secondary: '#18181b' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }} 
      />
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 md:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar (Desktop + Mobile 100% Full-Width Drawer) */}
      <div 
        className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r border-brand-60 ${
          isSidebarOpen 
            ? 'fixed md:relative inset-y-0 left-0 right-0 w-full md:w-[380px] z-50 md:z-auto shadow-2xl md:shadow-none bg-brand-60' 
            : 'w-0 md:w-[64px] border-none md:border-r border-brand-60'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden gap-3 sm:gap-4 md:gap-6 bg-brand-bg min-w-0 px-4 py-3">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-none pb-2.5 border-b border-brand-60/80 gap-2.5 w-full min-w-0 h-[52px]">
          
          {/* Session Info (Desktop) */}
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-brand-10/80 flex-1 truncate">
            {trackName && (
              <div className="flex items-center gap-1.5 bg-brand-60/40 px-3 py-1.5 rounded-lg border border-brand-60 shadow-sm truncate">
                <MapPin size={14} className="text-brand-30/80 flex-none" />
                <span className="truncate">{trackName}</span>
              </div>
            )}
            {playerName && (
              <div className="flex items-center gap-1.5 bg-brand-60/40 px-3 py-1.5 rounded-lg border border-brand-60 shadow-sm truncate">
                <User size={14} className="text-brand-30/80 flex-none" />
                <span className="truncate">{playerName}</span>
              </div>
            )}
            {carName && (
              <div className="flex items-center gap-1.5 bg-brand-60/40 px-3 py-1.5 rounded-lg border border-brand-60 shadow-sm truncate">
                <CarFront size={14} className="text-brand-30/80 flex-none" />
                <span className="truncate">{carName}</span>
              </div>
            )}
            {(!trackName && !playerName && !carName) && (
              <span className="text-brand-10/40 italic">Waiting for telemetry...</span>
            )}
            
            {isLive && <HeaderLiveStats isStreaming={isStreaming} />}
          </div>

          {/* View Switcher Buttons on Mobile (Charts, Map, Stats) - Takes flex-1 width */}
          {(isHistory || isLive) && (
            <div className="grid grid-cols-3 gap-1 glass p-1 rounded-xl border border-brand-60/90 md:hidden flex-1 shadow-inner min-w-0">
              <button
                onClick={() => setMobileView('charts')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] active:scale-95 min-w-0 ${
                  mobileView === 'charts' 
                    ? 'bg-brand-30/20 text-brand-30/90 border border-brand-30/40 shadow-sm font-extrabold' 
                    : 'text-brand-10/60 hover:text-brand-10/90'
                }`}
                title="Charts View"
              >
                <Activity size={15} className="flex-none" />
                <span className="truncate">Charts</span>
              </button>
              <button
                onClick={() => setMobileView('map')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] active:scale-95 min-w-0 ${
                  mobileView === 'map' 
                    ? 'bg-brand-30/20 text-brand-10 border border-brand-30/40 shadow-sm font-extrabold' 
                    : 'text-brand-10/60 hover:text-brand-10/90'
                }`}
                title="Track Map View"
              >
                <Map size={15} className="flex-none" />
                <span className="truncate">Map</span>
              </button>
              <button
                onClick={() => setMobileView('stats')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] active:scale-95 min-w-0 ${
                  mobileView === 'stats' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-extrabold' 
                    : 'text-brand-10/60 hover:text-brand-10/90'
                }`}
                title="Sectors & Stats View"
              >
                <BarChart2 size={15} className="flex-none" />
                <span className="truncate">Stats</span>
              </button>
            </div>
          )}

          {/* Gray Icon-Only Menu Toggle Button (Mobile Only) */}
          <button 
            onClick={toggleSidebar}
            className="md:hidden p-2.5 rounded-xl bg-brand-60 border border-brand-60 hover:border-brand-60 active:bg-brand-60 text-brand-10/80 hover:text-brand-10 transition-all flex items-center justify-center cursor-pointer flex-none min-w-[42px] min-h-[42px] shadow-sm active:scale-95"
            title="Toggle Menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Main Content Body */}
        {isSystem ? (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-10/60 gap-4 glass rounded-xl border border-brand-60/60 p-6">
            <div className="w-14 h-14 rounded-full bg-brand-60 border border-brand-60 flex items-center justify-center text-2xl">
              <Settings size={28} className="text-brand-10/40" />
            </div>
            <div className="text-center max-w-md">
              <p className="text-base tracking-wide font-semibold text-brand-10">System Parameters Panel</p>
              <div className="mt-8 p-4 border border-brand-60/80 bg-brand-60/20 rounded-xl flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <label className="text-xs font-bold text-brand-10/80 uppercase tracking-widest">Steering Lock (Degrees)</label>
                  <p className="text-[10px] text-brand-10/40 -mt-1 mb-2">Total wheel rotation (e.g. 900 = 450° each way)</p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      value={steeringMax * 2} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) useAppStore.getState().setSteeringMax(val / 2);
                      }}
                      className="bg-brand-bg border border-brand-60 text-brand-10 px-3 py-2 rounded-lg w-24 text-center font-mono font-bold focus:outline-none focus:border-brand-30 transition-colors shadow-inner"
                      step="10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (!selectedLap && !isLive) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-10/40 gap-4 glass rounded-xl border border-brand-60/60 p-6">
            <div className="w-14 h-14 rounded-full bg-brand-60 border border-brand-60 flex items-center justify-center">
              <svg className="w-7 h-7 text-brand-30/80/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base tracking-wide font-medium text-brand-10/90">No Lap Selected</p>
              <p className="text-xs text-brand-10/60 mt-1 max-w-xs">Select a lap from the menu to analyze telemetry curves and track lines.</p>
            </div>
            <button 
              onClick={() => {
                if (!isSidebarOpen) toggleSidebar();
              }}
              className="mt-2 bg-brand-30 hover:bg-brand-30/80 text-zinc-950 font-bold px-4 py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-brand-30/10 cursor-pointer flex items-center gap-2 min-h-[40px] active:scale-95"
            >
              <Clock size={16} /> Open Telemetry Menu
            </button>
          </div>
        ) : (
          <div className="flex flex-1 gap-4 md:gap-6 min-h-0 w-full overflow-hidden flex-col md:flex-row">
              {/* Telemetry Charts & Standings (Visible on desktop or when mobileView === 'charts') */}
              <div className={`flex-[2] min-w-0 flex flex-col h-full overflow-y-scroll custom-scrollbar pb-20 ${mobileView === 'charts' ? 'flex' : 'hidden'} md:flex`}>
                {isLive ? (
                  <>
                    <LiveTelemetryChart />
                    <div className="px-2 sm:px-4 pb-4">
                      <LiveStandings />
                    </div>
                  </>
                ) : (
                  <TelemetryChart />
                )}
              </div>
              
              {/* Track Map & Stats Column (Visible on desktop or when mobileView === 'map' / 'stats') */}
              <div className={`flex-1 min-w-0 md:min-w-[320px] flex flex-col gap-4 overflow-x-hidden overflow-y-scroll h-full pr-1 custom-scrollbar pb-20 ${
                mobileView !== 'charts' ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Track Map */}
                <div className={`flex-1 flex-col min-h-[260px] bg-brand-60 rounded-lg border border-brand-60 shadow-xl overflow-hidden relative ${
                  mobileView === 'map' ? 'flex' : 'hidden'
                } md:flex`}>
                  <TrackMap />
                </div>

                {/* Stats & Sectors */}
                <div className={`flex-none p-0 overflow-visible ${
                  mobileView === 'stats' ? 'block' : 'hidden'
                } md:block`}>
                  <StatsWidget />
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/history" replace />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
