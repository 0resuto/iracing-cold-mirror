import React, { useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label, onHoverData }) => {
  useEffect(() => {
    if (active && payload && payload.length > 0) {
      if (onHoverData) onHoverData(payload[0].payload);
    } else {
      if (onHoverData) onHoverData(null);
    }
  }, [active, payload, onHoverData]);

  if (active && payload && payload.length > 0) {
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
        </div>
      </div>
    );
  }
  return null;
};

export function TelemetryChart({ lapData, referenceData, onHoverData, onHoverStateChange }) {
  if (!lapData || lapData.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Select a lap from history to view telemetry</div>
      </div>
    );
  }

  const mergedData = useMemo(() => {
    return lapData.map((point, index) => {
      const refPoint = referenceData && referenceData.length > index ? referenceData[index] : null;
      return {
        ...point,
        ref_speed: refPoint ? refPoint.speed : null,
        ref_throttle: refPoint ? refPoint.throttle : null,
        ref_brake: refPoint ? refPoint.brake : null,
        ref_time: refPoint ? refPoint.session_time : null
      };
    }).sort((a, b) => a.lap_dist_pct - b.lap_dist_pct);
  }, [lapData, referenceData]);

  const handleMouseEnter = () => {
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
      
      <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Speed Chart */}
        <div style={{ flex: 1, minHeight: '120px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={handleMouseEnter}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 350]} stroke="var(--text-muted)" fontSize={11} tickCount={5} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} />} />
              <Line type="linear" dataKey="speed" stroke="var(--accent-red)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="ref_speed" stroke="gray" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Throttle Chart */}
        <div style={{ flex: 1, minHeight: '100px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={handleMouseEnter}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} />} />
              <Area type="step" dataKey="throttle" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="step" dataKey="ref_throttle" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Brake Chart */}
        <div style={{ flex: 1, minHeight: '100px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={mergedData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={handleMouseEnter}
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
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} />} />
              <Area type="step" dataKey="brake" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Line type="step" dataKey="ref_brake" stroke="gray" strokeWidth={1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
