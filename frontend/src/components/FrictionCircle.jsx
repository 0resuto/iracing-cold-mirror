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
    <div className="flex flex-col items-center justify-center">
      <div className="text-[10px] uppercase text-brand-10/40 font-bold tracking-widest mb-2">G-Force</div>
      <svg 
        width={size} 
        height={size} 
        className="glass rounded-full border-2 border-brand-60 shadow-inner"
      >
        {/* Crosshairs */}
        <line x1={radius} y1="0" x2={radius} y2={size} stroke="#3f3f46" strokeWidth="1" />
        <line x1="0" y1={radius} x2={size} y2={radius} stroke="#3f3f46" strokeWidth="1" />
        
        {/* 1G reference circle */}
        {maxG > 1 && (
          <circle cx={radius} cy={radius} r={innerRadius * (1 / maxG)} fill="none" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
        )}
        
        {/* The G-Force dot */}
        <circle cx={dotX} cy={dotY} r="5" fill="#ef4444" />
      </svg>
      <div className="font-mono text-xs mt-2 text-brand-10/60 font-bold tracking-wider">
        {Math.abs(renderLat).toFixed(2)}G | {Math.abs(renderLong).toFixed(2)}G
      </div>
    </div>
  );
}
