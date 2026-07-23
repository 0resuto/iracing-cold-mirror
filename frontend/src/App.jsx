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
        <div className="flex items-center gap-4 flex-none">
          <div>
            <div className="text-zinc-400 text-sm mt-1 font-medium tracking-wide flex items-center gap-2">
              {activeTab === 'live' ? (
                <span className="flex items-center gap-2 text-red-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block"></span>
                  Streaming Live Telemetry
                </span>
              ) : selectedLap ? (
                `Viewing Lap ${selectedLap.lap_number} (${selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Historical Lap'})`
              ) : (
                'Select a lap from history to begin'
              )}
            </div>
          </div>
        </div>

        {/* Main Content or Empty State */}
        {(!selectedLap && activeTab !== 'live') ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <svg className="w-16 h-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-lg tracking-wide font-medium">Select a lap from history to begin analysis</p>
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
