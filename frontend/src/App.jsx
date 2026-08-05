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
        <div className="flex items-center justify-between flex-none pb-2.5 border-b border-brand-60/80 gap-2.5 w-full min-w-0">
          
          {/* View Switcher Buttons on Mobile (Charts, Map, Stats) - Takes flex-1 width */}
          {selectedLap && activeTab === 'history' && (
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
        {activeTab === 'system' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-10/60 gap-4 glass rounded-xl border border-brand-60/60 p-6">
            <div className="w-14 h-14 rounded-full bg-brand-60 border border-brand-60 flex items-center justify-center text-2xl">
              <Settings size={28} className="text-brand-10/40" />
            </div>
            <div className="text-center max-w-md">
              <p className="text-base tracking-wide font-semibold text-brand-10">System Parameters Panel</p>
              <p className="text-xs text-brand-10/60 mt-2 leading-relaxed">
                Use the left menu to view live server metrics, database records, API auth status, and last uploaded session details.
              </p>
            </div>
          </div>
        ) : (!selectedLap && activeTab !== 'live') ? (
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
              {/* Telemetry Charts (Visible on desktop or when mobileView === 'charts') */}
              <div className={`flex-[2] min-w-0 flex flex-col h-full ${mobileView === 'charts' ? 'flex' : 'hidden'} md:flex`}>
                <TelemetryChart />
              </div>
              
              {/* Track Map & Stats Column (Visible on desktop or when mobileView === 'map' / 'stats') */}
              <div className={`flex-1 min-w-0 md:min-w-[320px] flex flex-col gap-4 overflow-x-hidden overflow-y-auto h-full pr-1 custom-scrollbar ${
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

export default App;
