import React, { useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Time: {Number(label).toFixed(2)}s</p>
        <p style={{ margin: 0, color: 'var(--accent-blue)' }}>Speed: {data.speed.toFixed(1)} km/h</p>
        <p style={{ margin: 0, color: 'var(--accent-green)' }}>Throttle: {data.throttle.toFixed(2)}</p>
        <p style={{ margin: 0, color: 'var(--accent-red)' }}>Brake: {data.brake.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export function TelemetryChart({ lapData, onHoverData, onHoverStateChange }) {
  if (!lapData || lapData.length === 0) {
    return (
      <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 className="panel-title">Lap Telemetry Analysis</h2>
      
      <div style={{ width: '100%', flex: 1, minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={lapData} 
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="session_time" 
              stroke="var(--text-muted)" 
              tickFormatter={(val) => val.toFixed(1) + 's'}
              fontSize={12}
            />
            {/* Speed Y Axis */}
            <YAxis yAxisId="speed" stroke="var(--accent-blue)" fontSize={12} domain={[0, 350]} />
            {/* Pedals Y Axis (0 to 1) */}
            <YAxis yAxisId="pedals" orientation="right" stroke="var(--text-muted)" fontSize={12} domain={[0, 1]} hide />
            
            <Tooltip 
              isAnimationActive={false}
              content={<CustomTooltip onHoverData={onHoverData} />}
            />
            
            <Line yAxisId="speed" type="monotone" dataKey="speed" stroke="var(--accent-blue)" strokeWidth={3} dot={false} name="Speed (km/h)" />
            <Line yAxisId="pedals" type="step" dataKey="throttle" stroke="var(--accent-green)" strokeWidth={2} dot={false} name="Throttle" />
            <Line yAxisId="pedals" type="step" dataKey="brake" stroke="var(--accent-red)" strokeWidth={2} dot={false} name="Brake" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
