import React, { useEffect } from 'react';
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
    <div style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      
      {/* Left Sidebar */}
      <div style={{ 
        width: isSidebarOpen ? '320px' : '64px', 
        transition: 'width 0.3s ease',
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', gap: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              {selectedLap ? `Viewing Lap ${selectedLap.lap_number} (${selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Live'})` : 'Select a lap to begin'}
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0, width: '100%' }}>
            {/* Left Column: Charts */}
            <div className="panel" style={{ flex: 2, minWidth: 0, display: 'flex', padding: '16px' }}>
              <TelemetryChart />
            </div>
            
            {/* Right Column: Track & Stats */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden', minHeight: '600px' }}>
                <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
                  <TrackMap />
                </div>
                <div className="panel" style={{ flex: '0 0 auto', padding: '0', overflow: 'hidden' }}>
                  <StatsWidget />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default App;
