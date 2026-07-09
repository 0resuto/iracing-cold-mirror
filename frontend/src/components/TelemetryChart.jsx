import React, { useEffect } from 'react';
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
    return (
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '8px', fontSize: '12px', zIndex: 100 }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>Time: {Number(label).toFixed(2)}s</p>
        <p style={{ margin: 0, color: 'var(--accent-blue)' }}>Speed: {data.speed.toFixed(1)} km/h</p>
        <p style={{ margin: 0, color: 'var(--text-main)' }}>Throttle: {data.throttle.toFixed(2)}</p>
        <p style={{ margin: 0, color: 'var(--accent-red)' }}>Brake: {data.brake.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export function TelemetryChart({ lapData, onHoverData, onHoverStateChange }) {
  if (!lapData || lapData.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Select a lap from history to view telemetry</div>
      </div>
    );
  }

  const handleMouseEnter = () => {
    if (onHoverStateChange) onHoverStateChange(true);
  };

  const handleMouseLeave = () => {
    if (onHoverStateChange) onHoverStateChange(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 className="panel-title" style={{ margin: '0 0 16px 0' }}>Telemetry Analysis</h2>
      
      <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Speed Chart */}
        <div style={{ flex: 1, minHeight: '150px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={lapData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="session_time" hide />
              <YAxis domain={[0, 350]} stroke="var(--text-muted)" fontSize={11} tickCount={5} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} />} />
              <Line type="linear" dataKey="speed" stroke="var(--accent-blue)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inputs (Throttle / Brake) Chart */}
        <div style={{ flex: 1, minHeight: '150px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={lapData} 
              syncId="telemetry"
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis 
                dataKey="session_time" 
                stroke="var(--text-muted)" 
                tickFormatter={(val) => val.toFixed(1) + 's'}
                fontSize={11}
                minTickGap={30}
              />
              <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickCount={3} />
              <Tooltip isAnimationActive={false} content={<CustomTooltip onHoverData={onHoverData} />} />
              <Area type="step" dataKey="throttle" stroke="var(--text-main)" fill="var(--text-main)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
              <Area type="step" dataKey="brake" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
