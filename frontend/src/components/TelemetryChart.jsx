import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { lttb } from '../utils/lttb';

const CustomTooltip = ({ active, payload, visible }) => {
  const setHoveredData = useAppStore(state => state.setHoveredData);

  useEffect(() => {
    if (visible && active && payload && payload.length > 0) {
      setHoveredData(payload[0].payload);
    }
  }, [active, payload, setHoveredData, visible]);

  if (!visible || !active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const hasRef = data.ref_elapsed_time !== null && data.ref_elapsed_time !== undefined;
  const timeDelta = hasRef ? (data.elapsed_time - data.ref_elapsed_time) : 0;
  
  return (
    <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '8px', fontSize: '12px', zIndex: 100 }}>
      <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>
        Dist: {(data.lap_dist_pct * 100).toFixed(1)}% 
        {hasRef && (
          <span style={{ color: timeDelta <= 0 ? '#22c55e' : 'var(--accent-red)', marginLeft: '8px' }}>
            Δ {timeDelta > 0 ? '+' : ''}{timeDelta.toFixed(2)}s
          </span>
        )}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 12px' }}>
        <span style={{ color: 'var(--accent-red)' }}>Speed: {data.speed?.toFixed(1)}</span>
        <span style={{ color: 'gray' }}>Ref: {data.ref_speed?.toFixed(1)}</span>
        
        <span style={{ color: '#22c55e' }}>Thr: {data.throttle?.toFixed(2)}</span>
        <span style={{ color: 'gray' }}>Ref: {data.ref_throttle?.toFixed(2)}</span>
        
        <span style={{ color: 'var(--accent-red)' }}>Brk: {data.brake?.toFixed(2)}</span>
        <span style={{ color: 'gray' }}>Ref: {data.ref_brake?.toFixed(2)}</span>

        <span style={{ color: 'var(--text-main)' }}>Str: {data.wheel_angle?.toFixed(2)}</span>
        <span style={{ color: 'gray' }}>Ref: {data.ref_wheel_angle?.toFixed(2)}</span>

        <span style={{ color: 'var(--accent-blue)' }}>Slip: {data.slip_angle?.toFixed(2)}</span>
        <span style={{ color: 'gray' }}>Ref: {data.ref_slip_angle?.toFixed(2)}</span>
      </div>
      
      {/* Flags */}
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
        {data.abs_active > 0 && <span style={{ background: 'var(--accent-blue)', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>ABS</span>}
        {data.tc_active > 0 && <span style={{ background: '#eab308', color: 'black', padding: '2px 4px', borderRadius: '4px' }}>TC</span>}
        {data.wheel_lock > 0 && <span style={{ background: 'var(--accent-red)', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>LOCK</span>}
      </div>
    </div>
  );
};

export const TelemetryChart = React.memo(function TelemetryChart() {
  const [activeChart, setActiveChart] = useState('speed');
  const setIsUserHovering = useAppStore(state => state.setIsUserHovering);
  const { lapData, referenceData, selectedLap } = useTelemetryData();

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

    let trueStartTime = p0.session_time - (p0.lap_dist_pct / localSpeed);

    let normalized = unwrapped
      .filter(p => p.lap_dist_pct >= 0.0 && p.lap_dist_pct <= 1.0)
      .map(p => ({
        ...p,
        elapsed_time: p.session_time - trueStartTime
      }));
    
    return { data: normalized, lapTime };
  };

  const processedLapResult = useMemo(() => processLap(lapData), [lapData]);
  const processedRefResult = useMemo(() => processLap(referenceData), [referenceData]);
  
  const processedLap = processedLapResult.data;
  const processedRef = processedRefResult.data;
  const refLapTime = processedRefResult.lapTime;

  const sectorBoundaries = useMemo(() => {
    if (!selectedLap || !selectedLap.sectors || selectedLap.sectors.length === 0 || !processedLap || processedLap.length === 0) return [];
    
    const boundaries = [];
    let cumulativeTime = 0;
    const sortedSectors = [...selectedLap.sectors].sort((a, b) => a.sector_number - b.sector_number);
    
    for (let i = 0; i < sortedSectors.length - 1; i++) {
      cumulativeTime += sortedSectors[i].sector_time;
      let closestPoint = processedLap[0];
      let minDiff = Infinity;
      
      for (const point of processedLap) {
        const diff = Math.abs(point.elapsed_time - cumulativeTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = point;
        }
      }
      boundaries.push(closestPoint.lap_dist_pct);
    }
    return boundaries;
  }, [selectedLap, processedLap]);

  const mergedData = useMemo(() => {
    if (!processedLap || processedLap.length === 0) return [];

    let extendedRef = [];
    if (processedRef.length > 0) {
      extendedRef = [
        ...processedRef.map(p => ({ ...p, lap_dist_pct: p.lap_dist_pct - 1.0, elapsed_time: p.elapsed_time - refLapTime })),
        ...processedRef,
        ...processedRef.map(p => ({ ...p, lap_dist_pct: p.lap_dist_pct + 1.0, elapsed_time: p.elapsed_time + refLapTime }))
      ];
    }

    const maxPoints = 400;
    const sampledLap = lttb(processedLap, maxPoints);

    let refIdx = 0;
    return sampledLap.map(point => {
      let refPoint = null;
      if (extendedRef.length > 0) {
        const targetPct = point.lap_dist_pct;
        while (refIdx < extendedRef.length - 1 && extendedRef[refIdx + 1].lap_dist_pct < targetPct) {
          refIdx++;
        }
        
        const currentDiff = Math.abs(extendedRef[refIdx].lap_dist_pct - targetPct);
        const nextDiff = refIdx + 1 < extendedRef.length ? Math.abs(extendedRef[refIdx + 1].lap_dist_pct - targetPct) : Infinity;
        
        refPoint = nextDiff < currentDiff ? extendedRef[refIdx + 1] : extendedRef[refIdx];
      }

      return {
        ...point,
        ref_speed: refPoint ? refPoint.speed : null,
        ref_throttle: refPoint ? refPoint.throttle : null,
        ref_brake: refPoint ? refPoint.brake : null,
        ref_wheel_angle: refPoint ? refPoint.wheel_angle : null,
        ref_slip_angle: refPoint ? refPoint.slip_angle : null,
        ref_elapsed_time: refPoint ? refPoint.elapsed_time : null
      };
    });
  }, [processedLap, processedRef]);

  if (!lapData || lapData.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Select a lap from history to view telemetry</div>
      </div>
    );
  }

  const handleMouseEnter = (id) => {
    setActiveChart(id);
    setIsUserHovering(true);
  };

  const handleMouseMove = (e) => {
    // hoverData updates are handled internally by CustomTooltip to prevent unnecessary chart renders
  };

  const handleMouseLeave = () => {
    setIsUserHovering(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 className="panel-title" style={{ margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
        Telemetry Analysis
        {referenceData && referenceData.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent-blue)' }}>── Current</span> &nbsp;
            <span style={{ color: 'gray' }}>- - - Best Lap</span>
          </span>
        )}
      </h2>
      
      <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '8px' }}>
        
        {/* Speed Chart */}
        <div style={{ flex: 1, minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', marginLeft: '40px', marginBottom: '-8px', position: 'relative', zIndex: 10 }}>SPEED</div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => handleMouseEnter('speed')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={[0, 350]} stroke="var(--text-muted)" fontSize={11} tickCount={5} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip visible={activeChart === 'speed'} />} />
              <Line type="linear" dataKey="speed" stroke="var(--accent-red)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_speed" stroke="gray" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="var(--text-muted)" strokeDasharray="3 3" opacity={0.5} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Throttle Chart */}
        <div style={{ flex: 1, minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', marginLeft: '40px', marginBottom: '-8px', position: 'relative', zIndex: 10 }}>THROTTLE</div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => handleMouseEnter('throttle')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip visible={activeChart === 'throttle'} />} />
              <Area type="linear" dataKey="throttle" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_throttle" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
              {/* TC Flag as an area */}
              <Area type="step" dataKey="tc_active" stroke="none" fill="#eab308" fillOpacity={0.3} isAnimationActive={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="var(--text-muted)" strokeDasharray="3 3" opacity={0.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Brake Chart */}
        <div style={{ flex: 1, minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', marginLeft: '40px', marginBottom: '-8px', position: 'relative', zIndex: 10 }}>BRAKE</div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => handleMouseEnter('brake')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip visible={activeChart === 'brake'} />} />
              <Area type="linear" dataKey="brake" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_brake" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
              {/* ABS and Lock Flags */}
              <Area type="step" dataKey="abs_active" stroke="none" fill="var(--accent-blue)" fillOpacity={0.3} isAnimationActive={false} />
              <Area type="step" dataKey="wheel_lock" stroke="none" fill="var(--accent-red)" fillOpacity={0.5} isAnimationActive={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="var(--text-muted)" strokeDasharray="3 3" opacity={0.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Steering Chart */}
        <div style={{ flex: 1, minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', marginLeft: '40px', marginBottom: '-8px', position: 'relative', zIndex: 10 }}>STEERING</div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => handleMouseEnter('wheel')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={[0, 1]} />
              <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip visible={activeChart === 'wheel'} />} />
              <Line type="linear" dataKey="wheel_angle" stroke="var(--text-main)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_wheel_angle" stroke="gray" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="var(--text-muted)" strokeDasharray="3 3" opacity={0.5} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Slip Angle Chart */}
        <div style={{ flex: 1, minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', marginLeft: '40px', marginBottom: '-8px', position: 'relative', zIndex: 10 }}>SLIP ANGLE</div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={() => handleMouseEnter('slip')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis 
                dataKey="lap_dist_pct" 
                stroke="var(--text-muted)" 
                type="number"
                domain={[0, 1]}
                tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                fontSize={11}
                minTickGap={30}
              />
              <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip visible={activeChart === 'slip'} />} />
              <Area type="linear" dataKey="slip_angle" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_slip_angle" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="var(--text-muted)" strokeDasharray="3 3" opacity={0.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
});
