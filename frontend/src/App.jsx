import React, { useState, useMemo, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './store/useAppStore';
import { useLiveTelemetryWS } from './features/live/useLiveTelemetryWS';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MapPin, Settings, Clock, Menu, Activity, Map, BarChart2, User, CarFront, Calendar } from 'lucide-react';
import { useTelemetryData } from './features/telemetry/useTelemetryData';
import { useLiveStore } from './store/useLiveStore';
import { Button, Checkbox, NumberStepper, SegmentedTabs, ProgressBar } from '@0resuto/ui-kit';

const TelemetryChart = React.lazy(() => import('./components/TelemetryChart').then(m => ({ default: m.TelemetryChart })));
const TrackMap = React.lazy(() => import('./components/TrackMap').then(m => ({ default: m.TrackMap })));
const StatsWidget = React.lazy(() => import('./components/StatsWidget').then(m => ({ default: m.StatsWidget })));
const LiveDashboard = React.lazy(() => import('./features/live/LiveDashboard').then(m => ({ default: m.LiveDashboard })));

const PanelFallback = () => (
  <div className="flex-1 flex items-center justify-center p-4">
    <ProgressBar value={100} pulse size="sm" className="w-40" />
  </div>
);

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
  const showOutlaps = useAppStore(state => state.showOutlaps);

  const { players } = useTelemetryData();

  const liveTrackName = useLiveStore(state => state.liveTrackName);
  const livePlayerName = useLiveStore(state => state.livePlayerName);
  const liveCarName = useLiveStore(state => state.liveCarName);

  const trackName = isLive ? liveTrackName : selectedLap?.track_name;
  
  let playerName = isLive ? livePlayerName : null;
  if (!isLive && selectedLap) {
    playerName = players?.find(p => p.id === selectedLap.player_id)?.name;
  }
  const carName = isLive ? liveCarName : selectedLap?.car_name;

  let sessionDateTime = null;
  if (!isLive && selectedLap && players) {
    const player = players.find(p => p.id === selectedLap.player_id);
    if (player) {
      const session = player.sessions?.find(s => s.laps?.some(l => l.id === selectedLap.id));
      if (session?.start_time) {
        const d = new Date(session.start_time);
        sessionDateTime = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
  }

  // Mobile View Tab state
  const [mobileView, setMobileView] = useState('charts'); // 'charts' | 'map' | 'stats'

  const mobileViewTabs = useMemo(() => [
    { id: 'charts', label: 'Charts', icon: Activity },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'stats', label: 'Stats', icon: BarChart2 },
  ], []);

  // Initialize live telemetry websocket when on '/live' route
  useLiveTelemetryWS(isLive);

  return (
    <div className="w-full h-screen flex overflow-hidden bg-brand-bg text-brand-10 relative font-sans">
      
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
            : 'w-0 md:w-11 border-none md:border-r border-brand-60'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-brand-bg min-w-0">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-none px-4 pt-1.5 pb-1 border-b border-brand-60/30 gap-3 w-full min-w-0">
          
          {/* Session Info (Desktop) */}
          <div className="hidden md:flex items-center gap-4 text-[11px] text-brand-10/70 flex-1 truncate">
            {trackName && (
              <div className="flex items-center gap-1.5 text-brand-10/90 truncate">
                <MapPin size={12} className="text-brand-30 flex-none" />
                <span className="font-semibold truncate">{trackName}</span>
              </div>
            )}
            {playerName && (
              <div className="flex items-center gap-1.5 text-brand-10/70 truncate">
                <User size={12} className="text-brand-30/70 flex-none" />
                <span className="truncate">{playerName}</span>
              </div>
            )}
            {carName && (
              <div className="flex items-center gap-1.5 text-brand-10/70 truncate">
                <CarFront size={12} className="text-brand-30/70 flex-none" />
                <span className="truncate">{carName}</span>
              </div>
            )}
            {sessionDateTime && (
              <div className="flex items-center gap-1.5 text-brand-10/70 truncate">
                <Calendar size={12} className="text-brand-30/70 flex-none" />
                <span className="truncate">{sessionDateTime}</span>
              </div>
            )}
            {(!trackName && !playerName && !carName) && (
              <span className="text-brand-10/40 text-[11px] italic">Waiting for telemetry...</span>
            )}
          </div>

          {/* View Switcher on Mobile (Charts, Map, Stats) */}
          {isHistory && (
            <div className="md:hidden flex-1 min-w-0">
              <SegmentedTabs
                tabs={mobileViewTabs}
                activeTab={mobileView}
                onChange={setMobileView}
              />
            </div>
          )}

          {/* Menu Toggle Button (Mobile Only) */}
          <Button 
            variant="secondary"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden flex-none"
            title="Toggle Menu"
          >
            <Menu size={18} />
          </Button>
        </div>

        {/* Main Content Body */}
        {isSystem ? (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-10/60 gap-4 glass rounded-xl border border-brand-60/60 p-6 m-4 overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-brand-60 border border-brand-60 flex items-center justify-center text-2xl">
              <Settings size={28} className="text-brand-10/40" />
            </div>
            <div className="text-center max-w-md w-full">
              <p className="text-base tracking-wide font-semibold text-brand-10">System Parameters Panel</p>
              <div className="mt-6 flex flex-col gap-4">
                {/* Steering Lock Parameter */}
                <div className="p-4 border border-brand-10/10 glass-card rounded-xl flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-xs font-bold text-brand-10 uppercase tracking-widest">Steering Lock</label>
                    <p className="text-[10px] text-brand-10/50">Total wheel rotation (e.g. 900 = 450° each way)</p>
                  </div>
                  <NumberStepper
                    value={steeringMax * 2}
                    onChange={(val) => {
                      const num = typeof val === 'number' ? val : parseInt(val, 10);
                      if (!isNaN(num) && num > 0) useAppStore.getState().setSteeringMax(num / 2);
                    }}
                    step={10}
                    min={90}
                    max={1080}
                    unit="°"
                    size="md"
                    className="w-36"
                  />
                </div>

                {/* Display Preferences Card */}
                <div className="p-4 border border-brand-10/10 glass-card rounded-xl flex flex-col items-start gap-2 text-left">
                  <span className="text-xs font-bold text-brand-10 uppercase tracking-widest">Display Preferences</span>
                  <div className="mt-1 flex items-center justify-between w-full">
                    <div className="flex flex-col pr-3">
                      <span className="text-xs font-semibold text-brand-10">Show Outlaps in Sessions</span>
                      <span className="text-[10px] text-brand-10/40 leading-tight">Display outlap (lap 0) and incomplete laps in history</span>
                    </div>
                    <Checkbox
                      checked={showOutlaps}
                      onChange={(val) => useAppStore.getState().setShowOutlaps(typeof val === 'boolean' ? val : val.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isLive ? (
          <Suspense fallback={<PanelFallback />}>
            <LiveDashboard />
          </Suspense>
        ) : !selectedLap ? (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-10/40 gap-4 glass rounded-xl border border-brand-60/60 p-6 m-4">
            <div className="w-14 h-14 rounded-full bg-brand-60 border border-brand-60 flex items-center justify-center">
              <svg className="w-7 h-7 text-brand-30/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base tracking-wide font-medium text-brand-10/90">No Lap Selected</p>
              <p className="text-xs text-brand-10/60 mt-1 max-w-xs">Select a lap from the menu to analyze telemetry curves and track lines.</p>
            </div>
            <Button 
              variant="primary"
              size="md"
              leftIcon={<Clock size={16} />}
              onClick={() => {
                if (!isSidebarOpen) toggleSidebar();
              }}
              className="mt-2"
            >
              Open Telemetry Menu
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 gap-2 md:gap-3 min-h-0 w-full overflow-hidden flex-col md:flex-row p-2 md:p-3">
              {/* Telemetry Charts (Visible on desktop or when mobileView === 'charts') */}
              <div className={`flex-[2] min-w-0 flex flex-col h-full overflow-y-scroll custom-scrollbar ${mobileView === 'charts' ? 'flex' : 'hidden'} md:flex`}>
                <Suspense fallback={<PanelFallback />}>
                  <TelemetryChart />
                </Suspense>
              </div>
              
              {/* Track Map & Stats Column (Visible on desktop or when mobileView === 'map' / 'stats') */}
              <div className={`flex-1 min-w-0 md:min-w-[320px] flex flex-col gap-2 overflow-x-hidden overflow-y-scroll h-full pl-1 custom-scrollbar ${
                mobileView !== 'charts' ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Track Map */}
                <div className={`flex-1 flex-col min-h-[260px] overflow-hidden relative ${
                  mobileView === 'map' ? 'flex' : 'hidden'
                } md:flex`}>
                  <Suspense fallback={<PanelFallback />}>
                    <TrackMap />
                  </Suspense>
                </div>

                {/* Stats & Sectors */}
                <div className={`flex-none p-0 overflow-visible ${
                  mobileView === 'stats' ? 'block' : 'hidden'
                } md:block`}>
                  <Suspense fallback={<PanelFallback />}>
                    <StatsWidget />
                  </Suspense>
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
