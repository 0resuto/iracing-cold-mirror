import React from 'react';

export function SteeringWheel({ angle }) {
  // Angle is in radians, convert to degrees for CSS rotation
  const degrees = angle * (180 / Math.PI);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 className="panel-title" style={{ marginBottom: '40px' }}>Steering</h2>
      
      <div style={{
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        border: '12px solid #1e293b',
        position: 'relative',
        transform: `rotate(${degrees}deg)`,
        transition: 'transform 0.1s linear',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 10px 25px rgba(0,0,0,0.3)',
        background: 'radial-gradient(circle, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)'
      }}>
        {/* Top mark to clearly see rotation */}
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '12px',
          height: '20px',
          backgroundColor: 'var(--accent-red)',
          borderRadius: '4px'
        }} />
        
        {/* Horizontal spokes */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '0',
          right: '0',
          height: '24px',
          transform: 'translateY(-50%)',
          backgroundColor: '#0f172a',
          borderTop: '2px solid rgba(255,255,255,0.1)',
          borderBottom: '2px solid rgba(0,0,0,0.5)'
        }} />
      </div>

      <div style={{ marginTop: '40px', fontSize: '18px', fontWeight: 'bold' }} className="digital-number">
        {Math.floor(degrees)}°
      </div>
    </div>
  );
}
