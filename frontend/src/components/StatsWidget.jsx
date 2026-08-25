import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { FrictionCircle } from './FrictionCircle';

export const StatsWidget = React.memo(function StatsWidget() {
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, deltaData, players, selectedLap } = useTelemetryData();

  const data = hoveredData || (lapData.length > 0 ? lapData[lapData.length - 1] : null);

  const maxRpm = useMemo(() => {
    if (!selectedLap || !players?.length) return 8500;
    const player = players.find(p => p.id === selectedLap.player_id);
    if (!player) return 8500;
    const session = player.sessions?.find(s => s.track_name === selectedLap.track_name);
    return session?.redline_rpm || 8500;
  }, [selectedLap, players]);

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
      <div className="flex h-full items-center justify-center text-brand-10/40">
        No Data Available
      </div>
    );
  }

  // Handle data ranges (assuming throttle/brake are 0-1 or 0-100, let's assume 0-1 for now, adjust if needed)
  const throttlePct = data.throttle <= 1 ? data.throttle * 100 : data.throttle;
  const brakePct = data.brake <= 1 ? data.brake * 100 : data.brake;
  
  // RPM bar
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
      <div className="flex-1 flex flex-col justify-between min-w-[120px] bg-brand-60/60 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-brand-10/60 text-xs uppercase tracking-widest font-semibold">Gear</div>
            <div className="font-mono text-[48px] leading-none text-accent-blue min-w-[40px] font-bold">
              {formatGear(data.gear)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-brand-10/60 text-xs uppercase tracking-widest font-semibold">Speed</div>
            <div className="font-mono text-[32px] leading-none flex items-baseline justify-end font-bold">
              <span className="w-[3ch] text-right inline-block text-brand-10">{Math.round(data.speed)}</span>
              <span className="text-sm text-brand-10/60 ml-1.5 font-sans font-normal">km/h</span>
            </div>
          </div>
        </div>

        {/* RPM Bar */}
        <div className="mt-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-brand-10/60 text-[10px] uppercase font-bold tracking-widest">RPM</span>
            <span className="font-mono text-sm font-bold text-brand-10">{Math.round(data.rpm)}</span>
          </div>
          <div className="h-2 bg-brand-60/80 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full transition-all duration-100 ease-linear rounded-full"
              style={{ 
                width: `${rpmPct}%`, 
                backgroundColor: rpmPct > 90 ? 'var(--color-accent-red)' : 'var(--color-text-main)'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Delta Block */}
      <div className="flex flex-col justify-center min-w-[130px] bg-brand-60/60 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-lg">
        <div className="text-brand-10/60 text-[10px] uppercase font-bold tracking-widest mb-1 text-center">Delta</div>
        <div className={`font-mono text-[32px] font-bold text-center ${
          currentDelta === null ? 'text-brand-10/60' : (currentDelta <= 0 ? 'text-accent-green' : 'text-accent-red')
        }`}>
          {currentDelta !== null ? `${currentDelta > 0 ? '+' : ''}${currentDelta.toFixed(2)}s` : '---'}
        </div>
        
        {/* Simple Delta Bar */}
        <div className="h-2 w-full bg-brand-60/80 border border-white/5 rounded-full mt-3 relative overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-text-muted z-10"></div>
            {currentDelta !== null && (
                <div 
                    className="absolute top-0 bottom-0 transition-all duration-100 ease-linear"
                    style={{
                        left: currentDelta <= 0 ? `${Math.max(0, 50 - (Math.abs(currentDelta) / 2) * 50)}%` : '50%',
                        right: currentDelta > 0 ? `${Math.max(0, 50 - (currentDelta / 2) * 50)}%` : '50%',
                        backgroundColor: currentDelta <= 0 ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
                    }}
                ></div>
            )}
        </div>
        <div className="flex justify-between text-[10px] text-brand-10/60 mt-1.5 font-mono">
          <span>-2s</span>
          <span>+2s</span>
        </div>
      </div>

      {/* Inputs (Pedals) Block */}
      <div className="flex gap-4 bg-brand-60/60 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-lg">
        
        {/* Throttle */}
        <div className="flex flex-col items-center">
          <div className="h-[100px] w-6 bg-brand-60/80 border border-white/5 rounded-md overflow-hidden relative flex flex-col-reverse shadow-inner">
            <div 
              className="w-full bg-accent-green transition-all duration-100 ease-linear"
              style={{ height: `${throttlePct}%` }}
            ></div>
          </div>
          <div className="text-brand-10/60 text-[10px] mt-2 uppercase font-bold tracking-widest">THR</div>
        </div>

        {/* Brake */}
        <div className="flex flex-col items-center">
          <div className="h-[100px] w-6 bg-brand-60/80 border border-white/5 rounded-md overflow-hidden relative flex flex-col-reverse shadow-inner">
            <div 
              className="w-full bg-accent-red transition-all duration-100 ease-linear"
              style={{ height: `${brakePct}%` }}
            ></div>
          </div>
          <div className="text-brand-10/60 text-[10px] mt-2 uppercase font-bold tracking-widest">BRK</div>
        </div>
      </div>

      {/* Steering Block */}
      <div className="flex flex-col items-center justify-center min-w-[90px] bg-brand-60/60 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-lg">
        <div className="text-brand-10/60 text-[10px] uppercase font-bold tracking-widest mb-3">Steering</div>
        
        {/* Simple steering wheel visualizer */}
        <div className="w-[50px] h-[50px] border-2 border-text-muted/30 rounded-full relative bg-brand-60/80/50 shadow-inner">
          {/* Steering marker */}
          <div 
            className="absolute top-[2px] w-1 h-2.5 bg-accent-blue rounded-full transition-transform duration-100 ease-linear"
            style={{
              left: 'calc(50% - 2px)',
              transformOrigin: '2px 21px',
              transform: `rotate(${steeringRotation}deg)`
            }}
          ></div>
        </div>
        <div className="font-mono text-xs mt-3 text-brand-10 font-bold">
          {Math.round(steeringRotation)}°
        </div>
      </div>

      {/* G-Force Friction Circle */}
      <div className="flex items-center justify-center">
        <FrictionCircle latAccel={data.lat_accel ?? data.g_lat ?? 0} longAccel={data.long_accel ?? data.g_lon ?? 0} maxG={2.5} />
      </div>

    </div>
  );
});
