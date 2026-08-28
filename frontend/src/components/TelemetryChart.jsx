import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { Select, Button, Badge } from '@0resuto/ui-kit';
import { Search } from 'lucide-react';
import { TelemetrySubChart } from './TelemetrySubChart';

const FastDot = (props) => {
  const { cx, cy, stroke, fill } = props;
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={4} fill={stroke || fill || 'var(--color-brand-10)'} stroke="none" className="pointer-events-none" />;
};

const CustomTooltip = ({ active, payload, chartId, activeChart }) => {
  const setHoveredData = useAppStore(state => state.setHoveredData);
  const rafIdRef = React.useRef(null);
  const latestPayloadRef = React.useRef(null);
  const lastSetTimeRef = React.useRef(null);

  const isVisible = activeChart === chartId;

  useEffect(() => {
    if (isVisible && active && payload?.length > 0) {
      latestPayloadRef.current = payload[0].payload;
      
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          const item = latestPayloadRef.current;
          if (item && item.session_time !== lastSetTimeRef.current) {
            lastSetTimeRef.current = item.session_time;
            setHoveredData(item);
          }
          rafIdRef.current = null;
        });
      }
    }
  }, [active, payload, setHoveredData, isVisible]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  if (!isVisible || !active || !payload?.length) return null;

  const data = payload[0].payload;
  const hasRef = data.ref_elapsed_time !== null && data.ref_elapsed_time !== undefined;
  const timeDelta = data.delta !== null && data.delta !== undefined ? data.delta : (hasRef ? (data.elapsed_time - data.ref_elapsed_time) : 0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // On mobile, render a compact translucent summary at top of screen to avoid covering the chart
  if (isMobile) {
    return (
      <div className="glass border border-brand-60/80 p-2 text-xs z-[100] rounded-lg shadow-lg backdrop-blur-md max-w-[280px]">
        <div className="flex justify-between font-bold text-brand-10 border-b border-brand-60 pb-1 mb-1">
          <span>Dist: {(data.lap_dist_pct * 100).toFixed(1)}%</span>
          {hasRef && (
            <span className={timeDelta <= 0 ? 'text-green-400' : 'text-red-400'}>
              Δ {timeDelta > 0 ? '+' : ''}{timeDelta.toFixed(2)}s
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs font-mono">
          <span className="text-red-400">Spd: {data.speed?.toFixed(1)}</span>
          <span className="text-green-400">Thr: {data.throttle?.toFixed(2)}</span>
          <span className="text-red-500">Brk: {data.brake?.toFixed(2)}</span>
          <span className="text-brand-10/90">Str: {data.wheel_angle?.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  // Desktop floating tooltip
  return (
    <div className="bg-brand-60 border border-brand-60 p-2 text-xs z-[100] rounded-md shadow-xl backdrop-blur-md bg-opacity-90 min-w-[150px]">
      <p className="m-0 font-bold text-brand-10 mb-1.5 flex justify-between">
        <span>Dist: {(data.lap_dist_pct * 100).toFixed(1)}%</span>
        {hasRef && (
          <span className={`ml-3 ${timeDelta <= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Δ {timeDelta > 0 ? '+' : ''}{timeDelta.toFixed(2)}s
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 gap-y-1">
        <span className="text-red-500 font-mono">Speed: {data.speed?.toFixed(1)}<span className="text-brand-10/40">{hasRef && data.ref_speed != null ? ` / ${data.ref_speed.toFixed(1)}` : ''}</span></span>
        
        <span className="text-green-500 font-mono">Thr: {data.throttle?.toFixed(2)}<span className="text-brand-10/40">{hasRef && data.ref_throttle != null ? ` / ${data.ref_throttle.toFixed(2)}` : ''}</span></span>
        
        <span className="text-red-500 font-mono">Brk: {data.brake?.toFixed(2)}<span className="text-brand-10/40">{hasRef && data.ref_brake != null ? ` / ${data.ref_brake.toFixed(2)}` : ''}</span></span>

        <span className="text-brand-10 font-mono">Str: {data.wheel_angle?.toFixed(2)}<span className="text-brand-10/40">{hasRef && data.ref_wheel_angle != null ? ` / ${data.ref_wheel_angle.toFixed(2)}` : ''}</span></span>

        <span className="text-brand-30/80 font-mono">Slip: {data.slip_angle?.toFixed(2)}<span className="text-brand-10/40">{hasRef && data.ref_slip_angle != null ? ` / ${data.ref_slip_angle.toFixed(2)}` : ''}</span></span>
      </div>
      
      {/* Flags */}
      {(data.abs_active > 0 || data.tc_active > 0 || data.wheel_lock > 0) && (
        <div className="mt-2.5 flex gap-1.5">
          {data.abs_active > 0 && <Badge color="blue">ABS</Badge>}
          {data.tc_active > 0 && <Badge color="yellow">TC</Badge>}
          {data.wheel_lock > 0 && <Badge color="red">LOCK</Badge>}
        </div>
      )}
    </div>
  );
};

const DeltaMinimapChart = React.memo(({ mergedData, sectorBoundaries, activeChart, onChartActive }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart 
        data={mergedData} 
        syncId="telemetry"
        syncMethod="value"
        margin={{ top: 5, right: 10, left: 5, bottom: 0 }}
        onMouseEnter={() => { onChartActive('delta'); }}
      >
        <CartesianGrid fill="var(--color-brand-bg-deep)" strokeDasharray="3 3" stroke="var(--color-zinc-800)" vertical={false} />
        <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
        <YAxis domain={['auto', 'auto']} stroke="var(--color-zinc-400)" fontSize={9} tickCount={3} tickFormatter={v => v.toFixed(1)} width={35} />
        <Tooltip isAnimationActive={false} wrapperStyle={{ zIndex: 1000 }} content={<CustomTooltip chartId="delta" activeChart={activeChart} />} />
        <ReferenceLine y={0} stroke="var(--color-zinc-400)" opacity={0.5} />
        <Area type="linear" dataKey="delta" stroke="var(--color-brand-10)" fillOpacity={0} strokeWidth={1.5} isAnimationActive={false} activeDot={<FastDot />} />

        {sectorBoundaries.map((pct, i) => (
          <ReferenceLine key={`sector-${i}`} x={pct} stroke="var(--color-zinc-600)" strokeDasharray="3 3" opacity={0.4} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});

const DeltaBrushOverlay = React.memo(({ mergedData, setBrushRange }) => {
  const brushTimeoutRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (brushTimeoutRef.current) {
        clearTimeout(brushTimeoutRef.current);
        brushTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart 
        data={mergedData} 
        margin={{ top: 5, right: 10, left: 5, bottom: 0 }}
      >
        <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
        <Brush 
          dataKey="lap_dist_pct" 
          height={20} 
          stroke="var(--color-zinc-600)" 
          fill="var(--color-brand-bg-deep)" 
          tickFormatter={() => ''} 
          onChange={(e) => {
            if (e && typeof e.startIndex === 'number' && typeof e.endIndex === 'number') {
              if (brushTimeoutRef.current) clearTimeout(brushTimeoutRef.current);
              brushTimeoutRef.current = setTimeout(() => {
                brushTimeoutRef.current = null;
                setBrushRange([e.startIndex, e.endIndex]);
              }, 250);
            }
          }} 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const TelemetryChart = React.memo(function TelemetryChart() {
  const [activeChart, setActiveChart] = React.useState('speed');
  const setIsUserHovering = useAppStore(state => state.setIsUserHovering);
  const setReferenceLapId = useAppStore(state => state.setReferenceLapId);
  const { lapData, referenceData, deltaData, selectedLap, activeRefId, players } = useTelemetryData();

  const availableLaps = useMemo(() => {
    if (!selectedLap || !players) return [];
    const targetTrack = selectedLap.track_name;
    const targetCar = selectedLap.car_name || '';
    const laps = [];

    players.forEach(player => {
      (player.sessions || []).forEach(s => {
        if (s.track_name === targetTrack && (s.car_name || '') === targetCar) {
          const sessionDate = s.start_time ? new Date(s.start_time).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : `Session ${s.id}`;
          const sessionLabel = `${player.name} (${sessionDate})`;
          const sessionLaps = (s.laps || [])
            .filter(l => l.lap_number > 0 && l.lap_time > 0)
            .map(l => ({ ...l, sessionName: sessionLabel }));
          laps.push(...sessionLaps);
        }
      });
    });
    return laps.sort((a, b) => a.lap_time - b.lap_time);
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

    let finalData = [];
    const numPoints = 1500;
    
    let uIdx = 0;
    for (let i = 0; i < numPoints; i++) {
      let pct = i / (numPoints - 1);
      
      while (uIdx < unwrapped.length - 2 && unwrapped[uIdx + 1].lap_dist_pct < pct) {
        uIdx++;
      }
      
      let p1 = unwrapped[uIdx];
      let p2 = unwrapped[uIdx + 1] || p1;
      
      let t = 0;
      let distGap = p2.lap_dist_pct - p1.lap_dist_pct;
      if (distGap > 0) {
        t = (pct - p1.lap_dist_pct) / distGap;
      }
      t = Math.max(0, Math.min(1, t));
      
      finalData.push({
        session_time: p1.session_time + (p2.session_time - p1.session_time) * t,
        lap_dist_pct: pct,
        speed: p1.speed + (p2.speed - p1.speed) * t,
        rpm: (p1.rpm || 0) + ((p2.rpm || 0) - (p1.rpm || 0)) * t,
        gear: t < 0.5 ? (p1.gear || 0) : (p2.gear || 0),
        throttle: p1.throttle + (p2.throttle - p1.throttle) * t,
        brake: p1.brake + (p2.brake - p1.brake) * t,
        steering_angle: p1.steering_angle + (p2.steering_angle - p1.steering_angle) * t,
        wheel_angle: p1.wheel_angle + (p2.wheel_angle - p1.wheel_angle) * t,
        slip_angle: p1.slip_angle + (p2.slip_angle - p1.slip_angle) * t,
        tc_active: t < 0.5 ? p1.tc_active : p2.tc_active,
        abs_active: t < 0.5 ? p1.abs_active : p2.abs_active,
        wheel_lock: t < 0.5 ? p1.wheel_lock : p2.wheel_lock,
        lat: p1.lat != null && p2.lat != null ? p1.lat + (p2.lat - p1.lat) * t : (p1.lat ?? null),
        lon: p1.lon != null && p2.lon != null ? p1.lon + (p2.lon - p1.lon) * t : (p1.lon ?? null),
        lat_accel: p1.lat_accel != null && p2.lat_accel != null ? p1.lat_accel + (p2.lat_accel - p1.lat_accel) * t : (p1.lat_accel ?? p1.g_lat ?? null),
        long_accel: p1.long_accel != null && p2.long_accel != null ? p1.long_accel + (p2.long_accel - p1.long_accel) * t : (p1.long_accel ?? p1.g_lon ?? null),
      });
    }

    let trueStartTime = p0.session_time - (p0.lap_dist_pct / localSpeed);
    let normalized = finalData.map(p => ({ ...p, elapsed_time: p.session_time - trueStartTime }));
    
    return { data: normalized, lapTime, localSpeed };
  };

  const { data: processedLap, lapTime: currentLapTime } = useMemo(() => processLap(lapData), [lapData]);
  const { data: processedRef } = useMemo(() => processLap(referenceData), [referenceData]);

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
        wheel_angle_deg: point.wheel_angle != null ? point.wheel_angle * (180 / Math.PI) : null,
        ref_wheel_angle_deg: refPoint?.wheel_angle != null ? refPoint.wheel_angle * (180 / Math.PI) : null,
        ref_slip_angle: refPoint?.slip_angle ?? null,
        ref_elapsed_time: refPoint?.elapsed_time ?? null,
        delta: delta
      };
    });
  }, [processedLap, processedRef, deltaData]);

  const [brushRange, setBrushRange] = useState(null);
  const [visibleCharts, setVisibleCharts] = useState({
    delta: true,
    speed: true,
    throttle: true,
    brake: true,
    steering: true,
    slip: true,
  });

  const toggleChart = (key) => {
    setVisibleCharts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const zoomedData = useMemo(() => {
    if (!mergedData || mergedData.length === 0) return [];
    return brushRange ? mergedData.slice(brushRange[0], brushRange[1] + 1) : mergedData;
  }, [mergedData, brushRange]);

  if (!lapData?.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-brand-10/40 font-mono text-xs tracking-widest">NO TELEMETRY DATA AVAILABLE</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-bg min-w-0">
      {/* Controls Header (High Tap Targets for Mobile) */}
      <div className="flex flex-wrap justify-between items-center mb-0 pb-0 border-b-0 flex-none gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-h-[38px]">
            {selectedLap ? (
              <div className="flex items-center gap-2 flex-none">
                <span className="text-xs sm:text-sm font-bold text-brand-10 flex-none">
                  Lap {selectedLap.lap_number}
                </span>
                <span className="text-[11px] font-mono font-bold text-brand-10/80 flex-none">
                  {selectedLap.lap_time > 0 ? selectedLap.lap_time.toFixed(2) + 's' : 'Outlap'}
                </span>
              </div>
            ) : (
              <h2 className="text-xs uppercase tracking-wider text-brand-10/80 font-extrabold m-0 flex-none">Telemetry Analysis</h2>
            )}
            {availableLaps.length > 0 && (() => {
                let bestLapId = null;
                let bestTime = Infinity;
                availableLaps.forEach(l => {
                    if (l.lap_number > 0 && l.lap_time > 0 && l.lap_time < bestTime) {
                        bestTime = l.lap_time;
                        bestLapId = l.id;
                    }
                });
                
                const grouped = availableLaps.reduce((acc, l) => {
                    const session = l.sessionName || 'Laps';
                    if (!acc[session]) acc[session] = [];
                    acc[session].push({
                        value: l.id,
                        label: `${l.id === bestLapId ? '★ ' : ''}Lap ${l.lap_number} (${l.lap_time.toFixed(2)}s)`
                    });
                    return acc;
                }, {});

                const refOptions = Object.entries(grouped).map(([group, items]) => ({
                    group,
                    items
                }));

                return (
                    <div className="flex items-center gap-1.5 flex-none w-52">
                        <span className="text-xs text-brand-10/60 font-bold flex-none">Ref:</span>
                        <Select 
                            size="sm"
                            value={activeRefId || ''} 
                            onChange={(val) => setReferenceLapId(val ? Number(val) : null)}
                            options={refOptions}
                            placeholder="Select Ref Lap..."
                            className="flex-1 min-w-0"
                        />
                    </div>
                );
            })()}
        </div>

        {/* Buttons & High-Target Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {brushRange && (
            <Button 
              variant="glass"
              size="sm"
              leftIcon={<Search size={12} />}
              onClick={() => setBrushRange(null)}
              className="flex-none"
              title="Reset zoom"
            >
              Reset
            </Button>
          )}

          {/* Toggle Pills */}
          <div className="flex items-center gap-1 flex-none flex-wrap">
            {[
              { id: 'speed', label: 'SPD', color: 'text-red-400' },
              { id: 'throttle', label: 'THR', color: 'text-green-400' },
              { id: 'brake', label: 'BRK', color: 'text-red-500' },
              { id: 'steering', label: 'STR', color: 'text-brand-10/90' },
              { id: 'slip', label: 'SLIP', color: 'text-brand-30/80' },
              { id: 'delta', label: 'Δ', color: 'text-amber-400' }
            ].map(c => (
              <Button
                key={c.id}
                variant="ghost"
                size="sm"
                onClick={() => toggleChart(c.id)}
                className={`px-2 min-w-8 ${visibleCharts[c.id] ? 'font-extrabold' : 'opacity-40 hover:opacity-80'}`}
                title={`Toggle ${c.id} chart`}
              >
                <span className={visibleCharts[c.id] ? c.color : undefined}>{c.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Charts Scroll Container */}
      <div 
        className="w-full flex-1 flex flex-col gap-1 overflow-x-hidden overflow-y-auto custom-scrollbar pr-1 min-w-0"
        onMouseEnter={() => setIsUserHovering(true)}
        onMouseLeave={() => setIsUserHovering(false)}
        onTouchStart={() => setIsUserHovering(true)}
        onTouchEnd={() => setIsUserHovering(false)}
      >
        {/* Delta Chart */}
        {visibleCharts.delta && deltaData?.length > 0 && (
          <div className="flex-none h-28 flex flex-col relative group min-w-0">
            <div className="absolute left-10 top-0 text-[9px] text-brand-10/40 font-bold tracking-widest z-10 group-hover:text-brand-10/80 transition-colors">DELTA (s)</div>
            <div className="flex-1 mt-3 flex flex-col relative">
              <div className="flex-1 min-h-0">
                <DeltaMinimapChart 
                  mergedData={mergedData} 
                  sectorBoundaries={sectorBoundaries} 
                  activeChart={activeChart}
                  onChartActive={setActiveChart}
                />
              </div>
              <div className="h-[20px] shrink-0 mt-1 pointer-events-none [&_.recharts-brush]:pointer-events-auto">
                <DeltaBrushOverlay 
                  mergedData={mergedData} 
                  setBrushRange={setBrushRange} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Chart Configuration Array */}
        {[
          {
            id: 'speed', title: 'SPEED (km/h)', dataKey: 'speed', refDataKey: 'ref_speed',
            stroke: 'var(--color-accent-red)', type: 'line-speed', domain: [0, dataMax => Math.ceil(((dataMax || 200) * 1.05) / 10) * 10],
            minHeight: 130
          },
          {
            id: 'throttle', title: 'THROTTLE (%)', dataKey: 'throttle', refDataKey: 'ref_throttle',
            stroke: 'var(--color-accent-green)', type: 'area', domain: [0, 1], tickFormatter: v => (v*100).toFixed(0),
            minHeight: 90, extraAreas: [{ dataKey: 'tc_active', fill: 'var(--color-accent-yellow)' }]
          },
          {
            id: 'brake', title: 'BRAKE (%)', dataKey: 'brake', refDataKey: 'ref_brake',
            stroke: 'var(--color-accent-red)', type: 'area', domain: [0, 1], tickFormatter: v => (v*100).toFixed(0),
            minHeight: 90, extraAreas: [{ dataKey: 'abs_active', fill: 'var(--color-accent-blue)', opacity: 0.2 }, { dataKey: 'wheel_lock', fill: 'var(--color-accent-red)', opacity: 0.3 }]
          },
          {
            id: 'steering', title: 'STEERING (deg)', dataKey: 'wheel_angle_deg', refDataKey: 'ref_wheel_angle_deg',
            stroke: 'var(--color-brand-10)', type: 'line', domain: ['auto', 'auto'],
            minHeight: 90
          },
          {
            id: 'slip', title: 'SLIP ANGLE (deg)', dataKey: 'slip_angle', refDataKey: 'ref_slip_angle',
            stroke: 'var(--color-accent-blue)', type: 'area', domain: ['auto', 'auto'],
            minHeight: 90, showXAxis: true
          }
        ].map(chart => visibleCharts[chart.id] && (
          <TelemetrySubChart
            key={chart.id}
            title={chart.title}
            data={zoomedData}
            chartId={chart.id}
            activeChart={activeChart}
            onChartActive={setActiveChart}
            sectorBoundaries={sectorBoundaries}
            CustomTooltip={CustomTooltip}
            FastDot={FastDot}
            dataKey={chart.dataKey}
            refDataKey={chart.refDataKey}
            stroke={chart.stroke}
            type={chart.type}
            domain={chart.domain}
            tickFormatter={chart.tickFormatter}
            minHeight={chart.minHeight}
            showXAxis={chart.showXAxis}
            extraAreas={chart.extraAreas}
          />
        ))}

      </div>
    </div>
  );
});
