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
    <div className="flex flex-wrap w-full gap-6 p-4 justify-center items-center">
      
      {/* Gear & Speed Block */}
      <div className="flex-1 flex flex-col justify-between min-w-[120px]">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Gear</div>
            <div className="font-mono text-[48px] leading-none text-sky-400 min-w-[40px] font-bold">
              {formatGear(data.gear)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Speed</div>
            <div className="font-mono text-[32px] leading-none flex items-baseline justify-end font-bold">
              <span className="w-[3ch] text-right inline-block text-zinc-100">{Math.round(data.speed)}</span>
              <span className="text-sm text-zinc-500 ml-1.5 font-sans font-normal">km/h</span>
            </div>
          </div>
        </div>

        {/* RPM Bar */}
        <div className="mt-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">RPM</span>
            <span className="font-mono text-sm font-bold text-zinc-300">{Math.round(data.rpm)}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-sm overflow-hidden">
            <div 
              className="h-full transition-all duration-100 ease-linear"
              style={{ 
                width: `${rpmPct}%`, 
                backgroundColor: rpmPct > 90 ? '#ef4444' : '#f4f4f5'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Delta Block */}
      <div className="flex flex-col justify-center min-w-[130px]">
        <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Delta</div>
        <div className={`font-mono text-[32px] font-bold ${
          currentDelta === null ? 'text-zinc-600' : (currentDelta <= 0 ? 'text-green-500' : 'text-red-500')
        }`}>
          {currentDelta !== null ? `${currentDelta > 0 ? '+' : ''}${currentDelta.toFixed(2)}s` : '---'}
        </div>
        
        {/* Simple Delta Bar */}
        <div className="h-2 w-full bg-zinc-950 border border-zinc-800 rounded-sm mt-3 relative overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-600 z-10"></div>
            {currentDelta !== null && (
                <div 
                    className="absolute top-0 bottom-0 transition-all duration-100 ease-linear"
                    style={{
                        left: currentDelta <= 0 ? `${Math.max(0, 50 - (Math.abs(currentDelta) / 2) * 50)}%` : '50%',
                        right: currentDelta > 0 ? `${Math.max(0, 50 - (currentDelta / 2) * 50)}%` : '50%',
                        backgroundColor: currentDelta <= 0 ? '#22c55e' : '#ef4444',
                    }}
                ></div>
            )}
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5 font-mono">
          <span>-2s</span>
          <span>+2s</span>
        </div>
      </div>

      {/* Inputs (Pedals) Block */}
      <div className="flex gap-4">
        
        {/* Throttle */}
        <div className="flex flex-col items-center">
          <div className="h-[100px] w-6 bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden relative flex flex-col-reverse">
            <div 
              className="w-full bg-green-500 transition-all duration-100 ease-linear"
              style={{ height: `${throttlePct}%` }}
            ></div>
          </div>
          <div className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-widest">THR</div>
        </div>

        {/* Brake */}
        <div className="flex flex-col items-center">
          <div className="h-[100px] w-6 bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden relative flex flex-col-reverse">
            <div 
              className="w-full bg-red-500 transition-all duration-100 ease-linear"
              style={{ height: `${brakePct}%` }}
            ></div>
          </div>
          <div className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-widest">BRK</div>
        </div>
      </div>

      {/* Steering Block */}
      <div className="flex flex-col items-center justify-center min-w-[90px]">
        <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-3">Steering</div>
        
        {/* Simple steering wheel visualizer */}
        <div className="w-[50px] h-[50px] border-2 border-zinc-700 rounded-full relative bg-zinc-900/50">
          {/* Steering marker */}
          <div 
            className="absolute top-[2px] w-1 h-2.5 bg-sky-400 rounded-sm transition-transform duration-100 ease-linear"
            style={{
              left: 'calc(50% - 2px)',
              transformOrigin: '2px 21px',
              transform: `rotate(${steeringRotation}deg)`
            }}
          ></div>
        </div>
        <div className="font-mono text-xs mt-3 text-zinc-400 font-bold">
          {Math.round(steeringRotation)}°
        </div>
      </div>

      {/* G-Force Friction Circle */}
      <div className="flex items-center justify-center">
        <FrictionCircle latAccel={data.lat_accel} longAccel={data.long_accel} maxG={2.5} />
      </div>

    </div>
  );
}
