import React from 'react';

export function FrictionCircle({ latAccel = 0, longAccel = 0, maxG = 2 }) {
  // Clamp values to maxG to keep the dot inside (or near) the circle
  const lat = latAccel || 0;
  const long = longAccel || 0;
  const magnitude = Math.sqrt(lat * lat + long * long);
  let renderLat = lat;
  let renderLong = long;

  if (magnitude > maxG) {
    const scale = maxG / magnitude;
    renderLat *= scale;
    renderLong *= scale;
  }

  // SVG dimensions
  const size = 90;
  const radius = size / 2;
  const innerRadius = radius - 8; // Leave some padding
  
  // Scale G values to SVG coordinates
  // X: latAccel (positive = left turn in iRacing -> Driver thrown Right -> positive X)
  // Y: longAccel (positive = accelerating -> Driver thrown Back -> positive Y in SVG)
  const dotX = radius + (renderLat / maxG) * innerRadius;
  const dotY = radius + (renderLong / maxG) * innerRadius;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}>G-Force</div>
      <svg width={size} height={size} style={{ background: 'var(--bg-color)', borderRadius: '50%', border: '2px solid var(--card-border)' }}>
        {/* Crosshairs */}
        <line x1={radius} y1="0" x2={radius} y2={size} stroke="var(--card-border)" strokeWidth="1" />
        <line x1="0" y1={radius} x2={size} y2={radius} stroke="var(--card-border)" strokeWidth="1" />
        
        {/* 1G reference circle */}
        {maxG > 1 && (
          <circle cx={radius} cy={radius} r={innerRadius * (1 / maxG)} fill="none" stroke="var(--card-border)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        
        {/* The G-Force dot */}
        <circle cx={dotX} cy={dotY} r="5" fill="var(--accent-red)" />
      </svg>
      <div className="digital-number" style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>
        {Math.abs(renderLat).toFixed(2)}G | {Math.abs(renderLong).toFixed(2)}G
      </div>
    </div>
  );
}
