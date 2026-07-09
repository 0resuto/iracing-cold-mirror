import React from 'react';

export function TrackMap({ lapTime, hoveredData, lapData }) {
  // If no lap is selected at all, show empty state
  if (lapTime === undefined || lapTime === null) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Track Map</div>
      </div>
    );
  }

  let progress = 0;
  let displayTime = 0;

  if (hoveredData) {
    const startTime = lapData && lapData.length > 0 ? lapData[0].session_time : 0;
    displayTime = Math.max(0, hoveredData.session_time - startTime);

    if (typeof hoveredData.lap_dist_pct === 'number' || typeof hoveredData.lap_dist_pct === 'string') {
      progress = parseFloat(hoveredData.lap_dist_pct) || 0;
    } else if (lapTime > 0) {
      // Fallback for old data without lap_dist_pct
      progress = Math.min(displayTime / lapTime, 1.0);
    }
  }

  // Track Dimensions
  const width = 300;
  const height = 200;
  const cx = width / 2;
  const cy = height / 2;
  const rx = 120;
  const ry = 60;
  const trackWidth = 10;

  // Calculate dot position based on progress
  // Start at top (270 degrees or -PI/2) and go clockwise
  const angle = (progress * 2 * Math.PI) - (Math.PI / 2);
  const dotX = cx + rx * Math.cos(angle);
  const dotY = cy + ry * Math.sin(angle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Track Position</h2>
      </div>
      
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Track Outline (Outer Edge) */}
        <ellipse 
          cx={cx} 
          cy={cy} 
          rx={rx + trackWidth} 
          ry={ry + trackWidth} 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.2)" 
          strokeWidth="1" 
        />
        
        {/* Track Outline (Inner Edge) */}
        <ellipse 
          cx={cx} 
          cy={cy} 
          rx={rx - trackWidth} 
          ry={ry - trackWidth} 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.2)" 
          strokeWidth="1" 
        />

        {/* Start/Finish Line */}
        <line 
          x1={cx} 
          y1={cy - ry - trackWidth} 
          x2={cx} 
          y2={cy - ry + trackWidth} 
          stroke="rgba(255, 255, 255, 0.5)" 
          strokeWidth="2" 
        />

        {/* Car Position Dot */}
        <circle cx={dotX} cy={dotY} r="4" fill="var(--accent-red)" />
      </svg>
      
      <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Progress: {(progress * 100).toFixed(1)}% <br/>
        <span style={{ fontSize: '12px' }}>Time: {displayTime.toFixed(1)}s / {lapTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}
