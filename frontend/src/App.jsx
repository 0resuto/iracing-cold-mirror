import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';
import { StatsWidget } from './components/StatsWidget';
import { useAppStore } from './store/useAppStore';
import { useLiveTelemetryWS } from './features/live/useLiveTelemetryWS';
import { Toaster } from 'react-hot-toast';
import { MapPin, Settings, Clock, Menu, Activity, Map, BarChart2 } from 'lucide-react';

function App() {
  const activeTab = useAppStore(state => state.activeTab);
  const selectedLap = useAppStore(state => state.selectedLap);
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);

  // Mobile View Tab state
  const [mobileView, setMobileView] = useState('charts'); // 'charts' | 'map' | 'stats'

  // Initialize live telemetry websocket when activeTab is 'live'
  useLiveTelemetryWS(activeTab === 'live');

  return (
    <div className="w-full h-screen flex overflow-hidden bg-zinc-950 text-zinc-100 relative font-sans">
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
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <div 
        className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r border-zinc-800 ${
          isSidebarOpen 
            ? 'fixed md:relative inset-y-0 left-0 w-[320px] sm:w-[360px] max-w-[92vw] z-50 md:z-auto shadow-2xl md:shadow-none' 
            : 'w-0 md:w-[64px] border-none md:border-r border-zinc-800'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-2.5 sm:p-4 md:p-6 gap-2.5 sm:gap-4 md:gap-6 bg-zinc-950 min-w-0">
        
        {/* Header Bar (With Finger-Friendly Touch Buttons) */}
        <div className="flex items-center justify-between flex-none pb-2 border-b border-zinc-800/80 gap-2 min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0">
            {/* Prominent Mobile Menu Button (Min 40px Height) */}
            <button 
              onClick={toggleSidebar}
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 active:bg-zinc-800 text-sky-400 hover:text-sky-300 transition-all text-xs flex items-center gap-2 cursor-pointer flex-none min-h-[40px] active:scale-95"
              title="Toggle Menu"
            >
              <Menu size={18} />
              <span className="font-bold text-xs">Menu</span>
            </button>

            <div className="min-w-0 truncate">
              {activeTab === 'live' ? null : activeTab === 'system' ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block flex-none animate-pulse"></span>
                    System Infrastructure
                  </span>
                </div>
              ) : selectedLap ? (
                <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                  <span className="text-xs sm:text-sm font-bold text-zinc-100 flex-none">
                    Lap {selectedLap.lap_number}
                  </span>
                  <span className="bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold flex-none">
                    {selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Outlap'}
                  </span>
                  {selectedLap.track_name && (
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 truncate hidden sm:flex">
                      <MapPin size={12} className="text-zinc-500 flex-none" /> 
                      <span className="truncate">{selectedLap.track_name}</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-zinc-400 text-xs sm:text-sm font-medium tracking-wide truncate">
                  Select lap from menu
                </div>
              )}
            </div>
          </div>

          {/* Mobile View Section Switchers (Large Tap Targets) */}
          {selectedLap && activeTab === 'history' && (
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 md:hidden flex-none">
              <button
                onClick={() => setMobileView('charts')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] active:scale-95 ${
                  mobileView === 'charts' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm' : 'text-zinc-400'
                }`}
                title="Charts View"
              >
                <Activity size={15} />
                <span className="hidden xs:inline">Charts</span>
              </button>
              <button
                onClick={() => setMobileView('map')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] active:scale-95 ${
                  mobileView === 'map' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm' : 'text-zinc-400'
                }`}
                title="Track Map View"
              >
                <Map size={15} />
                <span className="hidden xs:inline">Map</span>
              </button>
              <button
                onClick={() => setMobileView('stats')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] active:scale-95 ${
                  mobileView === 'stats' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-zinc-400'
                }`}
                title="Sectors & Stats View"
              >
                <BarChart2 size={15} />
                <span className="hidden xs:inline">Stats</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Body */}
        {activeTab === 'system' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-6">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
              <Settings size={28} className="text-zinc-500" />
            </div>
            <div className="text-center max-w-md">
              <p className="text-base tracking-wide font-semibold text-zinc-100">System Parameters Panel</p>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Use the left menu to view live server metrics, database records, API auth status, and last uploaded session details.
              </p>
            </div>
          </div>
        ) : (!selectedLap && activeTab !== 'live') ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-6">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-sky-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base tracking-wide font-medium text-zinc-200">No Lap Selected</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">Select a lap from the menu to analyze telemetry curves and track lines.</p>
            </div>
            <button 
              onClick={() => {
                if (!isSidebarOpen) toggleSidebar();
              }}
              className="mt-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold px-4 py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-sky-500/10 cursor-pointer flex items-center gap-2 min-h-[40px] active:scale-95"
            >
              <Clock size={16} /> Open Telemetry Menu
            </button>
          </div>
        ) : (
          <div className="flex flex-1 gap-4 md:gap-6 min-h-0 w-full overflow-hidden flex-col md:flex-row">
              {/* Telemetry Charts (Visible on desktop or when mobileView === 'charts') */}
              <div className={`flex-[2] min-w-0 flex flex-col h-full ${mobileView === 'charts' ? 'flex' : 'hidden md:flex'}`}>
                <TelemetryChart />
              </div>
              
              {/* Track Map & Stats Column (Visible on desktop or when mobileView === 'map' / 'stats') */}
              <div className={`flex-1 min-w-0 md:min-w-[320px] flex flex-col gap-4 overflow-y-auto h-full pr-1 custom-scrollbar ${
                mobileView !== 'charts' ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Track Map */}
                <div className={`flex-1 flex-col min-h-[260px] bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl overflow-hidden relative ${
                  mobileView === 'map' || window.innerWidth >= 768 ? 'flex' : 'hidden'
                }`}>
                  <TrackMap />
                </div>

                {/* Stats & Sectors */}
                <div className={`flex-none p-0 overflow-visible ${
                  mobileView === 'stats' || window.innerWidth >= 768 ? 'block' : 'hidden'
                }`}>
                  <StatsWidget />
                </div>
              </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
