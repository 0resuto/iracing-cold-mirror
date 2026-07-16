import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { FrictionCircle } from './FrictionCircle';

export function StatsWidget() {
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, deltaData } = useTelemetryData();

  const data = hoveredData || (lapData.length > 0 ? lapData[lapData.length - 1] : null);

  const currentDelta = useMemo(() => {
    if (!data) return null;
    if (data.delta !== undefined && data.delta !== null) return data.delta;
    if (deltaData && deltaData.length > 0 && data.lap_dist_pct !== undefined) {
      const targetPct = data.lap_dist_pct;
      let left = 0;
      let right = deltaData.length - 1;
      let bestIdx = 0;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (deltaData[mid].lap_dist_pct < targetPct) {
          bestIdx = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      let closest = deltaData[bestIdx];
      if (bestIdx + 1 < deltaData.length) {
        const diff1 = Math.abs(deltaData[bestIdx].lap_dist_pct - targetPct);
        const diff2 = Math.abs(deltaData[bestIdx + 1].lap_dist_pct - targetPct);
        if (diff2 < diff1) closest = deltaData[bestIdx + 1];
      }
      return closest.delta;
    }
    return null;
  }, [data, deltaData]);

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No Data Available
      </div>
    );
  }

  // Handle data ranges (assuming throttle/brake are 0-1 or 0-100, let's assume 0-1 for now, adjust if needed)
  const throttlePct = data.throttle <= 1 ? data.throttle * 100 : data.throttle;
  const brakePct = data.brake <= 1 ? data.brake * 100 : data.brake;
  
  // RPM bar (let's assume max RPM is around 8000 for a generic car)
  const maxRpm = 8500;
  const rpmPct = Math.min((data.rpm / maxRpm) * 100, 100);

  // Steering angle (iRacing gives wheel_angle in radians. Positive = Left, Negative = Right)
  // We negate it so Positive = Right (clockwise), Negative = Left, which matches CSS rotate and standard expectations.
  const steeringRotation = -(data.wheel_angle || 0) * (180 / Math.PI);

  const formatGear = (g) => {
    if (g === 0) return 'N';
    if (g < 0) return 'R';
    return g;
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', gap: '24px', padding: '16px', justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Gear & Speed Block */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gear</div>
            <div className="digital-number" style={{ fontSize: '48px', lineHeight: '1', color: 'var(--accent-blue)', minWidth: '40px' }}>
              {formatGear(data.gear)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Speed</div>
            <div className="digital-number" style={{ fontSize: '32px', lineHeight: '1', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
              <span style={{ width: '3ch', textAlign: 'right', display: 'inline-block' }}>{Math.round(data.speed)}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px' }}>km/h</span>
            </div>
          </div>
        </div>

        {/* RPM Bar */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>RPM</span>
            <span className="digital-number" style={{ fontSize: '14px' }}>{Math.round(data.rpm)}</span>
          </div>
          <div style={{ height: '8px', background: 'var(--card-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${rpmPct}%`, 
              background: rpmPct > 90 ? 'var(--accent-red)' : 'var(--text-main)',
              transition: 'width 0.1s linear, background 0.1s'
            }}></div>
          </div>
        </div>
      </div>

      {/* Delta Block */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '130px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}>Delta</div>
        <div className="digital-number" style={{ 
          fontSize: '32px', 
          color: currentDelta === null ? 'var(--text-muted)' : (currentDelta <= 0 ? '#22c55e' : 'var(--accent-red)')
        }}>
          {currentDelta !== null ? `${currentDelta > 0 ? '+' : ''}${currentDelta.toFixed(2)}s` : '---'}
        </div>
        
        {/* Simple Delta Bar */}
        <div style={{ height: '8px', width: '100%', background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '2px', marginTop: '12px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'var(--text-muted)', zIndex: 2 }}></div>
            {currentDelta !== null && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: currentDelta <= 0 ? `${Math.max(0, 50 - (Math.abs(currentDelta) / 2) * 50)}%` : '50%',
                    right: currentDelta > 0 ? `${Math.max(0, 50 - (currentDelta / 2) * 50)}%` : '50%',
                    background: currentDelta <= 0 ? '#22c55e' : 'var(--accent-red)',
                    transition: 'all 0.1s linear'
                }}></div>
            )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>-2s</span>
          <span>+2s</span>
        </div>
      </div>

      {/* Inputs (Pedals) Block */}
      <div style={{ display: 'flex', gap: '16px' }}>
        
        {/* Throttle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ height: '100px', width: '24px', background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '2px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column-reverse' }}>
            <div style={{ 
              width: '100%', 
              height: `${throttlePct}%`, 
              background: '#22c55e', // Green for throttle
              transition: 'height 0.1s linear'
            }}></div>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '8px', textTransform: 'uppercase' }}>THR</div>
        </div>

        {/* Brake */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ height: '100px', width: '24px', background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '2px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column-reverse' }}>
            <div style={{ 
              width: '100%', 
              height: `${brakePct}%`, 
              background: 'var(--accent-red)',
              transition: 'height 0.1s linear'
            }}></div>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '8px', textTransform: 'uppercase' }}>BRK</div>
        </div>
      </div>

      {/* Steering Block */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '90px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}>Steering</div>
        
        {/* Simple steering wheel visualizer */}
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '2px solid var(--card-border)', 
          borderRadius: '50%',
          position: 'relative'
        }}>
          {/* Steering marker */}
          <div style={{
            position: 'absolute',
            top: '2px',
            left: 'calc(50% - 2px)',
            width: '4px',
            height: '10px',
            background: 'var(--accent-blue)',
            transformOrigin: '2px 21px', // 21 = 25 - 4 (radius - marker_y)
            transform: `rotate(${steeringRotation}deg)`,
            transition: 'transform 0.1s linear'
          }}></div>
        </div>
        <div className="digital-number" style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>
          {Math.round(steeringRotation)}°
        </div>
      </div>

      {/* G-Force Friction Circle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FrictionCircle latAccel={data.lat_accel} longAccel={data.long_accel} maxG={2.5} />
      </div>

    </div>
  );
}
