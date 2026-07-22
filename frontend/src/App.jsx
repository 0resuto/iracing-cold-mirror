import React from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';
import { StatsWidget } from './components/StatsWidget';
import { useAppStore } from './store/useAppStore';
import { useLiveTelemetryWS } from './features/live/useLiveTelemetryWS';

function App() {
  const selectedLap = useAppStore(state => state.selectedLap);
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);

  // Initialize live telemetry websocket if a live lap is selected
  useLiveTelemetryWS(selectedLap);

  return (
    <div className="w-full h-screen flex overflow-hidden bg-zinc-950 text-zinc-100">
      
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
            <div className="text-zinc-400 text-sm mt-1 font-medium tracking-wide">
              {selectedLap ? `Viewing Lap ${selectedLap.lap_number} (${selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Live'})` : 'Select a lap to begin'}
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
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

      </div>
    </div>
  );
}

export default App;
