import React from 'react';

export function Speedometer({ speed, gear, rpm }) {
  // Simple RPM color logic
  let rpmColor = 'var(--text-main)';
  if (rpm > 6500) rpmColor = 'var(--accent-red)';
  else if (rpm > 5000) rpmColor = 'orange';
  else if (rpm > 3000) rpmColor = 'var(--accent-green)';

  return (
    <div className="glass-panel" style={{ position: 'relative' }}>
      <h2 className="panel-title">Dashboard</h2>
      
      {/* Gear */}
      <div style={{
        fontSize: '72px',
        fontWeight: '800',
        color: 'var(--accent-blue)',
        marginBottom: '10px',
        lineHeight: '1'
      }} className="digital-number">
        {gear === 0 ? 'R' : gear}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '24px' }}>Gear</div>

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '48px', fontWeight: '600' }} className="digital-number">
          {Math.floor(speed)}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>km/h</span>
      </div>

      {/* RPM Bar */}
      <div style={{ width: '100%', marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>RPM</span>
          <span style={{ color: rpmColor, fontWeight: 'bold' }}>{Math.floor(rpm)}</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${Math.min((rpm / 8000) * 100, 100)}%`, 
            height: '100%', 
            background: rpmColor,
            transition: 'width 0.1s linear, background 0.2s ease'
          }} />
        </div>
      </div>
    </div>
  );
}
