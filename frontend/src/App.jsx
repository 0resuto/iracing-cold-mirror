import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';
import { StatsWidget } from './components/StatsWidget';

import { useTelemetry } from './useTelemetry';

function App() {
  const [selectedLap, setSelectedLap] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { 
    lapData, 
    referenceData,
    hoveredData, 
    setHoveredData, 
    setIsUserHovering, 
    refreshTrigger 
  } = useTelemetry(selectedLap);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      
      {/* Left Sidebar */}
      <div style={{ 
        width: isSidebarOpen ? '280px' : '0px', 
        transition: 'width 0.3s ease',
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        <Sidebar 
          selectedLapId={selectedLap ? selectedLap.id : null} 
          onSelectLap={(lap) => setSelectedLap(lap)} 
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', gap: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--card-border)', 
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '0.5px' }}>Telemetry Analysis</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              {selectedLap ? `Viewing Lap ${selectedLap.lap_number} (${selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Live'})` : 'Select a lap to begin'}
            </div>
          </div>
        </div>

        {/* Top Row: Track Map & Future Widgets */}
        <div style={{ display: 'flex', gap: '24px', height: '240px' }}>
          <div className="panel" style={{ flex: '0 0 300px', padding: '16px' }}>
            <TrackMap 
              lapTime={selectedLap ? selectedLap.lap_time : 0} 
              hoveredData={hoveredData} 
              lapData={lapData}
              referenceData={referenceData}
            />
          </div>
          <div className="panel" style={{ flex: 1, overflow: 'hidden' }}>
            <StatsWidget data={hoveredData || (lapData.length > 0 ? lapData[lapData.length - 1] : null)} />
          </div>
        </div>

        {/* Bottom Row: Chart */}
        <div className="panel" style={{ flex: 1, minHeight: '400px', display: 'flex', padding: '16px' }}>
          <TelemetryChart 
            lapData={lapData} 
            referenceData={referenceData}
            onHoverData={setHoveredData} 
            onHoverStateChange={setIsUserHovering}
          />
        </div>

      </div>
    </div>
  );
}

export default App;
