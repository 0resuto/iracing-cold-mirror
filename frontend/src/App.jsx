import React from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';
import { StatsWidget } from './components/StatsWidget';
import { useAppStore } from './store/useAppStore';
import { useLiveTelemetryWS } from './features/live/useLiveTelemetryWS';
import { Toaster } from 'react-hot-toast';

function App() {
  const activeTab = useAppStore(state => state.activeTab);
  const selectedLap = useAppStore(state => state.selectedLap);
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);

  // Initialize live telemetry websocket when activeTab is 'live'
  useLiveTelemetryWS(activeTab === 'live');

  return (
    <div className="w-full h-screen flex overflow-hidden bg-zinc-950 text-zinc-100">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' },
          success: { iconTheme: { primary: '#10b981', secondary: '#18181b' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }} 
      />
      
      {/* Left Sidebar */}
      <div 
        className="flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r border-zinc-800"
        style={{ width: isSidebarOpen ? '320px' : '64px' }}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6 bg-zinc-950">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-none pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={toggleSidebar}
                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                title="Open Sidebar"
              >
                <span>▶</span>
              </button>
            )}
            <div>
              {activeTab === 'live' ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block"></span>
                    Streaming Live Telemetry
                  </span>
                </div>
              ) : activeTab === 'system' ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    System Overview & Infrastructure Parameters
                  </span>
                </div>
              ) : selectedLap ? (
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-zinc-100">
                    Lap {selectedLap.lap_number}
                  </span>
                  <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold">
                    {selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Incomplete Lap'}
                  </span>
                  {selectedLap.track_name && (
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5">
                      <span className="text-zinc-500">📍</span> {selectedLap.track_name}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-zinc-400 text-sm font-medium tracking-wide">
                  Select a lap from history to begin analysis
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content or Empty State */}
        {activeTab === 'system' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-8">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
              ⚙️
            </div>
            <div className="text-center max-w-md">
              <p className="text-lg tracking-wide font-semibold text-zinc-100">System Information Panel</p>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Use the left sidebar to view live server metrics, database record counts, API authentication status, and last uploaded session details.
              </p>
            </div>
          </div>
        ) : (!selectedLap && activeTab !== 'live') ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-8">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-sky-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg tracking-wide font-medium text-zinc-200">No Lap Selected</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">Choose a lap from the session history sidebar to view detailed telemetry curves and track position.</p>
            </div>
            <button 
              onClick={() => {
                if (!isSidebarOpen) toggleSidebar();
              }}
              className="mt-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-lg shadow-sky-500/10 cursor-pointer flex items-center gap-2"
            >
              <span>⏱️</span> Open History Sidebar
            </button>
          </div>
        ) : (
          <div className="flex flex-1 gap-6 min-h-0 w-full overflow-hidden">
              {/* Left Column: Charts */}
              <div className="flex-[2] min-w-0 flex flex-col h-full">
                <TelemetryChart />
              </div>
              
              {/* Right Column: Track & Stats */}
            <div className="flex-1 min-w-[380px] flex flex-col gap-6 overflow-y-auto [scrollbar-gutter:stable] h-full pr-2 custom-scrollbar">
                <div className="flex-1 flex flex-col min-h-[350px] bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl overflow-hidden relative">
                    <TrackMap />
                  </div>
                  <div className="flex-none p-0 overflow-visible">
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
