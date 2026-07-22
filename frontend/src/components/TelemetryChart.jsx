import React, { useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { lttb } from '../utils/lttb';

const FastDot = (props) => {
  const { cx, cy, stroke, fill } = props;
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={4} fill={stroke || fill || '#fff'} stroke="none" className="pointer-events-none" />;
};

const CustomTooltip = ({ active, payload, chartId, activeChartRef }) => {
  const setHoveredData = useAppStore(state => state.setHoveredData);
  const rafIdRef = React.useRef(null);
  const latestPayloadRef = React.useRef(null);

  const isVisible = activeChartRef?.current === chartId;

  useEffect(() => {
    if (isVisible && active && payload?.length > 0) {
      latestPayloadRef.current = payload[0].payload;
      
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (latestPayloadRef.current) {
            setHoveredData(latestPayloadRef.current);
          }
          rafIdRef.current = null;
        });
      }
    }
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [active, payload, setHoveredData, isVisible]);

  if (!isVisible || !active || !payload?.length) return null;

  const data = payload[0].payload;
  const hasRef = data.ref_elapsed_time !== null && data.ref_elapsed_time !== undefined;
  const timeDelta = data.delta !== null && data.delta !== undefined ? data.delta : (hasRef ? (data.elapsed_time - data.ref_elapsed_time) : 0);
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-2 text-xs z-[100] rounded-md shadow-xl backdrop-blur-md bg-opacity-90">
      <p className="m-0 font-bold text-zinc-100 mb-1.5 flex justify-between">
        <span>Dist: {(data.lap_dist_pct * 100).toFixed(1)}%</span>
        {hasRef && (
          <span className={`ml-3 ${timeDelta <= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Δ {timeDelta > 0 ? '+' : ''}{timeDelta.toFixed(2)}s
          </span>
        )}
      </p>
      <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
        <span className="text-red-500 font-mono">Speed: {data.speed?.toFixed(1)}</span>
        <span className="text-zinc-500 font-mono">Ref: {data.ref_speed?.toFixed(1)}</span>
        
        <span className="text-green-500 font-mono">Thr: {data.throttle?.toFixed(2)}</span>
        <span className="text-zinc-500 font-mono">Ref: {data.ref_throttle?.toFixed(2)}</span>
        
        <span className="text-red-500 font-mono">Brk: {data.brake?.toFixed(2)}</span>
        <span className="text-zinc-500 font-mono">Ref: {data.ref_brake?.toFixed(2)}</span>

        <span className="text-zinc-100 font-mono">Str: {data.wheel_angle?.toFixed(2)}</span>
        <span className="text-zinc-500 font-mono">Ref: {data.ref_wheel_angle?.toFixed(2)}</span>

        <span className="text-sky-400 font-mono">Slip: {data.slip_angle?.toFixed(2)}</span>
        <span className="text-zinc-500 font-mono">Ref: {data.ref_slip_angle?.toFixed(2)}</span>
      </div>
      
      {/* Flags */}
      {(data.abs_active > 0 || data.tc_active > 0 || data.wheel_lock > 0) && (
        <div className="mt-2.5 flex gap-1.5">
          {data.abs_active > 0 && <span className="bg-sky-500 text-white px-1.5 py-0.5 rounded-sm font-bold text-[9px] tracking-wider">ABS</span>}
          {data.tc_active > 0 && <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded-sm font-bold text-[9px] tracking-wider">TC</span>}
          {data.wheel_lock > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-sm font-bold text-[9px] tracking-wider">LOCK</span>}
        </div>
      )}
    </div>
  );
};

export const TelemetryChart = React.memo(function TelemetryChart() {
  const activeChartRef = React.useRef('speed');
  const setIsUserHovering = useAppStore(state => state.setIsUserHovering);
  const setReferenceLapId = useAppStore(state => state.setReferenceLapId);
  const { lapData, referenceData, deltaData, selectedLap, activeRefId, players } = useTelemetryData();

  const availableLaps = useMemo(() => {
      if (!selectedLap || !players) return [];
      const player = players.find(p => p.id === selectedLap.player_id);
      if (!player) return [];
      const laps = [];
      (player.sessions || []).forEach(s => {
          if (s.track_name === selectedLap.track_name) laps.push(...(s.laps || []));
      });
      return laps.filter(l => l.lap_time > 0).sort((a,b) => a.lap_number - b.lap_number);
  }, [selectedLap, players]);

  const processLap = (data) => {
    if (!data || data.length === 0) return { data: [], lapTime: 0 };
    
    let unwrapped = [];
    let baseOffset = data[0].lap_dist_pct > 0.5 ? -1.0 : 0.0;
    let lastPct = data[0].lap_dist_pct;
    let offset = baseOffset;
    for (let p of data) {
      let pct = p.lap_dist_pct;
      if (pct < lastPct - 0.5) offset += 1.0;
      else if (pct > lastPct + 0.5) offset -= 1.0;
      unwrapped.push({ ...p, lap_dist_pct: pct + offset });
      lastPct = pct;
    }

    let totalDist = unwrapped[unwrapped.length-1].lap_dist_pct - unwrapped[0].lap_dist_pct;
    let totalTime = unwrapped[unwrapped.length-1].session_time - unwrapped[0].session_time;
    let lapTime = totalDist > 0 ? totalTime / totalDist : 0;

    let p0 = unwrapped[0];
    let p5 = unwrapped[Math.min(5, unwrapped.length - 1)];
    let localSpeed = 0;
    if (p5 && p0 && p5.session_time !== p0.session_time) {
      localSpeed = (p5.lap_dist_pct - p0.lap_dist_pct) / (p5.session_time - p0.session_time);
    }
    if (!localSpeed || localSpeed <= 0) {
      localSpeed = totalDist > 0 ? totalDist / totalTime : 1;
    }

    let rawLttb = lttb(unwrapped, 1500);

    let finalData = [];
    for (let i = 0; i < rawLttb.length; i++) {
      let cur = rawLttb[i];
      finalData.push(cur);

      if (i < rawLttb.length - 1) {
        let nxt = rawLttb[i+1];
        let gapDist = nxt.lap_dist_pct - cur.lap_dist_pct;
        let gapTime = nxt.session_time - cur.session_time;
        if (gapDist > 0.005 || gapTime > 0.3) {
          let stepCount = Math.min(10, Math.floor(gapTime / 0.05));
          for (let s = 1; s < stepCount; s++) {
            let t = s / stepCount;
            finalData.push({
              session_time: cur.session_time + gapTime * t,
              lap_dist_pct: cur.lap_dist_pct + gapDist * t,
              speed: cur.speed + (nxt.speed - cur.speed) * t,
              throttle: cur.throttle + (nxt.throttle - cur.throttle) * t,
              brake: cur.brake + (nxt.brake - cur.brake) * t,
              steering_angle: cur.steering_angle + (nxt.steering_angle - cur.steering_angle) * t,
              wheel_angle: cur.wheel_angle + (nxt.wheel_angle - cur.wheel_angle) * t,
              slip_angle: cur.slip_angle + (nxt.slip_angle - cur.slip_angle) * t,
              tc_active: cur.tc_active,
              abs_active: cur.abs_active,
              wheel_lock: cur.wheel_lock,
            });
          }
        }
      }
    }

    let trueStartTime = p0.session_time - (p0.lap_dist_pct / localSpeed);
    let normalized = finalData
      .filter(p => p.lap_dist_pct >= 0.0 && p.lap_dist_pct <= 1.0)
      .map(p => ({ ...p, elapsed_time: p.session_time - trueStartTime }));
    
    return { data: normalized, lapTime, localSpeed };
  };

  const { data: processedLap, lapTime: currentLapTime } = useMemo(() => processLap(lapData), [lapData]);
  const { data: processedRef, lapTime: refLapTime } = useMemo(() => processLap(referenceData), [referenceData]);

  const sectorBoundaries = useMemo(() => {
    if (!selectedLap || !selectedLap.sectors || selectedLap.sectors.length === 0) return [];
    let cumulative = 0;
    const sorted = [...selectedLap.sectors].sort((a, b) => a.sector_number - b.sector_number);
    const result = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      cumulative += sorted[i].sector_time;
      if (currentLapTime > 0) {
        result.push(cumulative / currentLapTime);
      }
    }
    return result;
  }, [selectedLap, currentLapTime]);

  const mergedData = useMemo(() => {
    if (!processedLap || processedLap.length === 0) return [];

    let extendedRef = processedRef;
    if (processedRef && processedRef.length > 0 && refLapTime > 0 && currentLapTime > 0) {
      let timeRatio = currentLapTime / refLapTime;
      extendedRef = processedRef.map(p => ({
        ...p,
        lap_dist_pct: p.lap_dist_pct * timeRatio
      }));
    }

    let rIdx = 0;
    let dIdx = 0;

    return processedLap.map((point) => {
      const targetPct = point.lap_dist_pct;
      
      let refPoint = null;
      if (extendedRef && extendedRef.length > 0) {
        while (rIdx < extendedRef.length - 1 && extendedRef[rIdx + 1].lap_dist_pct <= targetPct) {
          rIdx++;
        }
        refPoint = extendedRef[rIdx];
      }

      let delta = null;
      if (deltaData && deltaData.length > 0) {
        while (dIdx < deltaData.length - 1 && deltaData[dIdx + 1].lap_dist_pct <= targetPct) {
          dIdx++;
        }
        delta = deltaData[dIdx].delta;
      }

      return {
        ...point,
        ref_speed: refPoint?.speed ?? null,
        ref_throttle: refPoint?.throttle ?? null,
        ref_brake: refPoint?.brake ?? null,
        ref_wheel_angle: refPoint?.wheel_angle ?? null,
        ref_slip_angle: refPoint?.slip_angle ?? null,
        ref_elapsed_time: refPoint?.elapsed_time ?? null,
        delta: delta
      };
    });
  }, [processedLap, processedRef, deltaData, refLapTime, currentLapTime]);

  if (!lapData?.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Select a lap from history to view telemetry</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-900 rounded-lg p-4 border border-zinc-800 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800 flex-none">
        <div className="flex items-center gap-4">
            <h2 className="text-sm uppercase tracking-widest text-zinc-300 font-semibold m-0">Telemetry Analysis</h2>
            {availableLaps.length > 0 && (() => {
                let bestLapId = null;
                let bestTime = Infinity;
                availableLaps.forEach(l => {
                    if (l.lap_time > 0 && l.lap_time < bestTime) {
                        bestTime = l.lap_time;
                        bestLapId = l.id;
                    }
                });
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Ref Lap</span>
                        <select 
                            value={activeRefId || ''} 
                            onChange={e => setReferenceLapId(parseInt(e.target.value))}
                            className="bg-zinc-950 text-zinc-100 border border-zinc-700 px-2.5 py-1 rounded-md text-xs cursor-pointer outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                        >
                            {availableLaps.map(l => (
                                <option 
                                    key={l.id} 
                                    value={l.id}
                                    className={l.id === bestLapId ? 'text-purple-400' : 'text-inherit'}
                                >
                                    Lap {l.lap_number} ({l.lap_time.toFixed(2)}s)
                                </option>
                            ))}
                        </select>
                    </div>
                );
            })()}
        </div>
        {referenceData?.length > 0 && (
          <div className="text-xs text-zinc-500 flex gap-4 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-sky-400"></div>
              <span className="text-zinc-300">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t border-dashed border-zinc-500"></div>
              <span className="text-zinc-500">Reference</span>
            </div>
          </div>
        )}
      </div>
      
      <div 
        className="w-full flex-1 flex flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable] pr-2 custom-scrollbar"
        onMouseEnter={() => setIsUserHovering(true)}
        onMouseLeave={() => setIsUserHovering(false)}
      >
        
        {/* Delta Chart */}
        {deltaData?.length > 0 && (
          <div className="flex-none h-24 flex flex-col relative group">
            <div className="absolute left-10 top-0 text-[9px] text-zinc-500 font-bold tracking-widest z-10 group-hover:text-zinc-300 transition-colors">DELTA (s)</div>
            <div className="flex-1 mt-3">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={mergedData} 
                syncId="telemetry"
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                onMouseEnter={() => { activeChartRef.current = 'delta'; }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
                <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={10} tickCount={3} tickFormatter={v => v.toFixed(1)} />
                <Tooltip isAnimationActive={false} content={<CustomTooltip chartId="delta" activeChartRef={activeChartRef} />} />
                <ReferenceLine y={0} stroke="#a1a1aa" opacity={0.5} />
                <Area type="linear" dataKey="delta" stroke="#f4f4f5" fillOpacity={0} strokeWidth={1.5} isAnimationActive={false} activeDot={<FastDot />} />
                {sectorBoundaries.map((pct, i) => (
                  <ReferenceLine key={`sector-${i}`} x={pct} stroke="#52525b" strokeDasharray="3 3" opacity={0.4} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Speed Chart */}
        <div className="flex-1 min-h-[140px] flex flex-col relative group">
          <div className="absolute left-10 top-0 text-[9px] text-zinc-500 font-bold tracking-widest z-10 group-hover:text-zinc-300 transition-colors">SPEED (km/h)</div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => { activeChartRef.current = 'speed'; }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={[0, 350]} stroke="#a1a1aa" fontSize={10} tickCount={5} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip chartId="speed" activeChartRef={activeChartRef} />} />
              <Line type="linear" dataKey="speed" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey="ref_speed" stroke="#71717a" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="#52525b" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Throttle Chart */}
        <div className="flex-1 min-h-[100px] flex flex-col relative group">
          <div className="absolute left-10 top-0 text-[9px] text-zinc-500 font-bold tracking-widest z-10 group-hover:text-zinc-300 transition-colors">THROTTLE (%)</div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => { activeChartRef.current = 'throttle'; }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={[0, 1]} stroke="#a1a1aa" fontSize={10} tickCount={3} tickFormatter={v => (v*100).toFixed(0)} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip chartId="throttle" activeChartRef={activeChartRef} />} />
              <Area type="linear" dataKey="throttle" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey="ref_throttle" stroke="#71717a" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} activeDot={false} />
              <Area type="step" dataKey="tc_active" stroke="none" fill="#eab308" fillOpacity={0.15} isAnimationActive={false} activeDot={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="#52525b" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Brake Chart */}
        <div className="flex-1 min-h-[100px] flex flex-col relative group">
          <div className="absolute left-10 top-0 text-[9px] text-zinc-500 font-bold tracking-widest z-10 group-hover:text-zinc-300 transition-colors">BRAKE (%)</div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => { activeChartRef.current = 'brake'; }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={[0, 1]} stroke="#a1a1aa" fontSize={10} tickCount={3} tickFormatter={v => (v*100).toFixed(0)} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip chartId="brake" activeChartRef={activeChartRef} />} />
              <Area type="linear" dataKey="brake" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey="ref_brake" stroke="#71717a" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} activeDot={false} />
              <Area type="step" dataKey="abs_active" stroke="none" fill="#38bdf8" fillOpacity={0.2} isAnimationActive={false} activeDot={false} />
              <Area type="step" dataKey="wheel_lock" stroke="none" fill="#ef4444" fillOpacity={0.3} isAnimationActive={false} activeDot={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="#52525b" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Steering Chart */}
        <div className="flex-1 min-h-[100px] flex flex-col relative group">
          <div className="absolute left-10 top-0 text-[9px] text-zinc-500 font-bold tracking-widest z-10 group-hover:text-zinc-300 transition-colors">STEERING (deg)</div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => { activeChartRef.current = 'wheel'; }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={10} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip chartId="wheel" activeChartRef={activeChartRef} />} />
              <Line type="linear" dataKey="wheel_angle" stroke="#f4f4f5" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey="ref_wheel_angle" stroke="#71717a" strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="#52525b" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Slip Angle Chart */}
        <div className="flex-1 min-h-[100px] flex flex-col relative group">
          <div className="absolute left-10 top-0 text-[9px] text-zinc-500 font-bold tracking-widest z-10 group-hover:text-zinc-300 transition-colors">SLIP ANGLE (deg)</div>
          <div className="flex-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => { activeChartRef.current = 'slip'; }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="lap_dist_pct" 
                stroke="#a1a1aa" 
                type="number"
                domain={[0, 1]}
                tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                fontSize={10}
                minTickGap={30}
              />
              <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={10} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip chartId="slip" activeChartRef={activeChartRef} />} />
              <Area type="linear" dataKey="slip_angle" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey="ref_slip_angle" stroke="#71717a" strokeWidth={1} dot={false} isAnimationActive={false} activeDot={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="#52525b" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
});
