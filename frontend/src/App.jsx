import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';

function App() {
  const [selectedLap, setSelectedLap] = useState(null);
  const [lapData, setLapData] = useState([]);
  const [hoveredData, setHoveredData] = useState(null);
  const [isUserHovering, setIsUserHovering] = useState(false);

  // Fetch telemetry when a lap is selected
  useEffect(() => {
    if (!selectedLap) return;

    if (selectedLap.lap_time > 0) {
      // Historical lap: fetch all telemetry once
      fetch(`http://localhost:8000/api/laps/${selectedLap.id}/telemetry`)
        .then(res => res.json())
        .then(data => {
          setLapData(data);
        })
        .catch(err => console.error("Telemetry fetch error:", err));
    } else {
      // Live lap: Clear old data and start polling
      setLapData([]);
      const interval = setInterval(() => {
        fetch('http://localhost:8000/api/telemetry/live')
          .then(res => res.json())
          .then(newData => {
            if (newData.status === 'waiting for data') return;
            
            setLapData(prevData => {
              // Avoid duplicate points based on session_time
              if (prevData.length > 0) {
                const lastPoint = prevData[prevData.length - 1];
                if (newData.session_time <= lastPoint.session_time) {
                  return prevData;
                }
              }
              return [...prevData, newData];
            });

            // Update TrackMap automatically if user is not hovering
            setIsUserHovering(hovering => {
              if (!hovering) {
                setHoveredData(newData);
              }
              return hovering;
            });
          })
          .catch(err => console.error("Live fetch error:", err));
      }, 500);

      return () => clearInterval(interval);
    }
  }, [selectedLap]);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden', padding: '24px', gap: '24px' }}>
      
      {/* Left Sidebar */}
      <div style={{ width: '300px', flexShrink: 0 }}>
        <Sidebar 
          selectedLapId={selectedLap ? selectedLap.id : null} 
          onSelectLap={(lap) => setSelectedLap(lap)} 
        />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '1px' }}>Historical Analysis</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              {selectedLap ? `Viewing Lap ${selectedLap.lap_number} (${selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Live'})` : 'Select a lap to begin'}
            </div>
          </div>
        </div>

        {/* Top Row: Track Map & Future Widgets */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <TrackMap 
              lapTime={selectedLap ? selectedLap.lap_time : 0} 
              hoveredData={hoveredData} 
              lapData={lapData}
            />
          </div>
          <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'var(--text-muted)' }}>Stats Widget (Coming Soon)</div>
          </div>
        </div>

        {/* Bottom Row: Chart */}
        <div style={{ flex: 1, minHeight: '400px', display: 'flex' }}>
          <TelemetryChart 
            lapData={lapData} 
            onHoverData={setHoveredData} 
            onHoverStateChange={setIsUserHovering}
          />
        </div>

      </div>
    </div>
  );
}

export default App;
