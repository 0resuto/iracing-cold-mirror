import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label, onHoverData, visible }) => {
  useEffect(() => {
    if (visible && active && payload && payload.length > 0) {
      if (onHoverData) onHoverData(payload[0].payload);
    }
  }, [active, payload, onHoverData, visible]);

  if (!visible || !active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const hasRef = data.ref_time !== null && data.ref_time !== undefined;
  const timeDelta = hasRef ? (data.session_time - data.ref_time) : 0;
  
  return (
    <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '8px', fontSize: '12px', zIndex: 100 }}>
      <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>
        Dist: {(data.lap_dist_pct * 100).toFixed(1)}% 
        {hasRef && (
          <span style={{ color: timeDelta <= 0 ? 'var(--text-main)' : 'var(--accent-red)', marginLeft: '8px' }}>
            Δ {timeDelta > 0 ? '+' : ''}{timeDelta.toFixed(2)}s
          </span>
        )}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 12px' }}>
        <span style={{ color: 'var(--accent-red)' }}>Speed: {data.speed?.toFixed(1)}</span>
        <span style={{ color: 'gray' }}>Ref: {data.ref_speed?.toFixed(1)}</span>
        
        <span style={{ color: 'var(--accent-red)' }}>Thr: {data.throttle?.toFixed(2)}</span>
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

export function TelemetryChart({ lapData, referenceData, onHoverData, onHoverStateChange }) {
  const [activeChart, setActiveChart] = useState('speed');

  const mergedData = useMemo(() => {
    if (!lapData) return [];
    return lapData.map((point, index) => {
      const refPoint = referenceData && referenceData.length > index ? referenceData[index] : null;
      return {
        ...point,
        ref_speed: refPoint ? refPoint.speed : null,
        ref_throttle: refPoint ? refPoint.throttle : null,
        ref_brake: refPoint ? refPoint.brake : null,
        ref_wheel_angle: refPoint ? refPoint.wheel_angle : null,
        ref_slip_angle: refPoint ? refPoint.slip_angle : null,
        ref_time: refPoint ? refPoint.session_time : null
      };
    }).sort((a, b) => a.lap_dist_pct - b.lap_dist_pct);
  }, [lapData, referenceData]);

  if (!lapData || lapData.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Select a lap from history to view telemetry</div>
      </div>
    );
  }

  const handleMouseEnter = (id) => {
    setActiveChart(id);
    if (onHoverStateChange) onHoverStateChange(true);
  };

  const handleMouseMove = (e) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      if (onHoverData) onHoverData(e.activePayload[0].payload);
    }
  };

  const handleMouseLeave = () => {
    if (onHoverStateChange) onHoverStateChange(false);
    if (onHoverData) onHoverData(null);
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
        <div style={{ flex: 1, minHeight: '120px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 4, left: 40, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', zIndex: 1 }}>SPEED</div>
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
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 350]} stroke="var(--text-muted)" fontSize={11} tickCount={5} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} visible={activeChart === 'speed'} />} />
              <Line type="linear" dataKey="speed" stroke="var(--accent-red)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_speed" stroke="gray" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Throttle Chart */}
        <div style={{ flex: 1, minHeight: '100px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 4, left: 40, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', zIndex: 1 }}>THROTTLE</div>
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
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} visible={activeChart === 'throttle'} />} />
              <Area type="step" dataKey="throttle" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="step" dataKey="ref_throttle" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
              {/* TC Flag as an area */}
              <Area type="step" dataKey="tc_active" stroke="none" fill="#eab308" fillOpacity={0.3} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Brake Chart */}
        <div style={{ flex: 1, minHeight: '100px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 4, left: 40, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', zIndex: 1 }}>BRAKE</div>
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
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} visible={activeChart === 'brake'} />} />
              <Area type="step" dataKey="brake" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="step" dataKey="ref_brake" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
              {/* ABS and Lock Flags */}
              <Area type="step" dataKey="abs_active" stroke="none" fill="var(--accent-blue)" fillOpacity={0.3} isAnimationActive={false} />
              <Area type="step" dataKey="wheel_lock" stroke="none" fill="var(--accent-red)" fillOpacity={0.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Steering Chart */}
        <div style={{ flex: 1, minHeight: '100px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 4, left: 40, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', zIndex: 1 }}>STEERING</div>
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
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} visible={activeChart === 'wheel'} />} />
              <Line type="linear" dataKey="wheel_angle" stroke="var(--text-main)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_wheel_angle" stroke="gray" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Slip Angle Chart */}
        <div style={{ flex: 1, minHeight: '100px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 4, left: 40, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', zIndex: 1 }}>SLIP ANGLE</div>
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
                domain={['dataMin', 'dataMax']}
                tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                fontSize={11}
                minTickGap={30}
              />
              <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} visible={activeChart === 'slip'} />} />
              <Area type="linear" dataKey="slip_angle" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_slip_angle" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
