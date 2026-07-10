import React, { useRef, useEffect, useState } from 'react';
import trackPaths from '../assets/track_paths.json';

export function TrackMap({ trackName, lapTime, hoveredData, lapData }) {
  if (lapTime === undefined || lapTime === null) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Select a lap to view map</div>
      </div>
    );
  }

  // Extract track ID from the first telemetry point
  const actualTrackId = (lapData && lapData.length > 0 && lapData[0].track_id) ? String(lapData[0].track_id) : "165";
  // Fallback to Spa (165) if the track ID doesn't exist in our downloaded JSON
  const svgPathData = trackPaths[actualTrackId] || trackPaths["165"];

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

  const width = 400;
  const height = 300;

  const pathRef = useRef(null);
  const [dotPos, setDotPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (pathRef.current) {
      const totalLength = pathRef.current.getTotalLength();
      if (totalLength > 0) {
        // Lap distance percentage (0.0 to 1.0)
        // Some tracks might be drawn clockwise or counter-clockwise, we can just use progress.
        const point = pathRef.current.getPointAtLength(totalLength * progress);
        setDotPos({ x: point.x, y: point.y });
      }
    }
  }, [progress, svgPathData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Track Position</h2>
      </div>
      
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ backgroundColor: 'var(--card-bg)' }}>
          {svgPathData ? (
            <>
              {/* Track Path */}
              <path 
                ref={pathRef}
                d={svgPathData} 
                fill="none" 
                stroke="var(--card-border)" 
                strokeWidth="30" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path 
                d={svgPathData} 
                fill="none" 
                stroke="var(--text-muted)" 
                strokeWidth="2" 
              />
              
              {/* Car Position Dot */}
              <circle cx={dotPos.x} cy={dotPos.y} r="15" fill="var(--accent-red)" stroke="white" strokeWidth="3" />
            </>
          ) : (
            <text x="50%" y="50%" fill="white" textAnchor="middle">Track Map Not Found</text>
          )}
        </svg>
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Progress: {(progress * 100).toFixed(1)}% <br/>
        <span style={{ fontSize: '12px' }}>Time: {displayTime.toFixed(1)}s / {lapTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}
