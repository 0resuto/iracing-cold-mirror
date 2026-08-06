import React from 'react';
import {
  ComposedChart, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useLiveStore } from '../store/useLiveStore';
import { useAppStore } from '../store/useAppStore';

export const LiveTelemetryChart = React.memo(function LiveTelemetryChart() {
  const liveLapData = useLiveStore(state => state.liveLapData);
  const isStreaming = useLiveStore(state => state.isStreaming);
  const steeringMaxDeg = useAppStore(state => state.steeringMax);
  const maxRef = React.useRef({ speed: 50 });

  if (!liveLapData || liveLapData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-bg h-full">
        <p className="text-brand-10/40 font-mono text-xs tracking-widest animate-pulse">
          {isStreaming ? "WAITING FOR LIVE DATA..." : "LIVE TELEMETRY DISCONNECTED"}
        </p>
      </div>
    );
  }

  let { speed } = maxRef.current;
  for (const d of liveLapData) {
    if (d.speed && d.speed > speed) speed = d.speed;
  }
  
  if (speed > maxRef.current.speed) maxRef.current.speed = speed;

  const steeringDomain = [-steeringMaxDeg, steeringMaxDeg];
  const speedDomain = [0, Math.ceil(speed * 1.1 / 10) * 10];

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-bg p-2 sm:p-4 min-w-0">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-brand-60 flex-none gap-2">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/80 font-extrabold m-0 flex-none flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
          Live Dashboard
        </h2>
      </div>

      <div className="w-full flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        
        {/* Speed Chart */}
        <div className="flex-1 min-h-[150px] flex flex-col relative group min-w-0">
          <div className="absolute left-10 top-0 text-[9px] text-[#a1a1aa] font-bold tracking-widest z-10">SPEED (km/h)</div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liveLapData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.15)" vertical={false} />
                <XAxis dataKey="session_time" hide type="number" domain={['dataMin', 'dataMax']} />
                <YAxis domain={speedDomain} stroke="#a1a1aa" fontSize={9} tickCount={5} width={35} />
                <Line type="step" dataKey="speed" stroke="var(--color-accent-red)" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Combined Inputs Chart */}
        <div className="flex-[2] min-h-[220px] flex flex-col relative group min-w-0">
          <div className="absolute left-10 top-0 text-[9px] text-[#a1a1aa] font-bold tracking-widest z-10 flex gap-4">
            <span>INPUTS</span>
            <span className="text-green-500">THR</span>
            <span className="text-red-500">BRK</span>
            <span className="text-brand-10">STR</span>
          </div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={liveLapData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.15)" vertical={false} yAxisId="left" />
                <XAxis dataKey="session_time" hide type="number" domain={['dataMin', 'dataMax']} />
                
                {/* Left Y-Axis for Pedals (0-1) */}
                <YAxis yAxisId="left" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} stroke="#a1a1aa" fontSize={9} tickFormatter={v => (v*100).toFixed(0)} width={35} />
                
                {/* Right Y-Axis for Steering (-deg to deg) */}
                <YAxis yAxisId="right" orientation="right" domain={steeringDomain} stroke="var(--color-brand-10)" fontSize={9} tickCount={3} width={35} />
                
                {/* Throttle */}
                <Area yAxisId="left" type="step" dataKey="throttle" stroke="var(--color-accent-green)" fill="var(--color-accent-green)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} activeDot={false} />
                
                {/* Brake */}
                <Area yAxisId="left" type="step" dataKey="brake" stroke="var(--color-accent-red)" fill="var(--color-accent-red)" fillOpacity={0.25} strokeWidth={1.5} isAnimationActive={false} activeDot={false} />
                
                {/* Steering */}
                <Line yAxisId="right" type="step" dataKey="wheel_angle_deg" stroke="var(--color-brand-10)" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
});
