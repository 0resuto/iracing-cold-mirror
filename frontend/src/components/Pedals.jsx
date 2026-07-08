import React from 'react';

export function Pedals({ throttle, brake }) {
  // Convert 0.0 - 1.0 to percentage
  const throttlePct = Math.min(throttle * 100, 100);
  const brakePct = Math.min(brake * 100, 100);

  const renderBar = (label, pct, color) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <div style={{ 
        width: '40px', 
        height: '200px', 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '8px',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '100%',
          height: `${pct}%`,
          background: color,
          transition: 'height 0.1s linear',
          boxShadow: `0 0 15px ${color}`
        }} />
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
      <span style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }} className="digital-number">{Math.floor(pct)}%</span>
    </div>
  );

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'row', gap: '40px' }}>
      {renderBar('Brake', brakePct, 'var(--accent-red)')}
      {renderBar('Throttle', throttlePct, 'var(--accent-green)')}
    </div>
  );
}
