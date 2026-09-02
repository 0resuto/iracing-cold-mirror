import React from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

export const TelemetrySubChart = React.memo(({
  title, data, chartId, activeChart, onChartActive, sectorBoundaries, CustomTooltip, FastDot,
  dataKey, refDataKey, stroke, type = "area",
  domain = [0, 1], tickFormatter, minHeight = 110, showXAxis = false,
  extraAreas = []
}) => {
  return (
    <div className="flex-1 flex flex-col relative group min-w-0" style={{ minHeight: `${minHeight}px` }}>
      <div className="absolute left-10 top-0 text-[9px] text-zinc-400 font-bold tracking-widest z-10 group-hover:text-[var(--color-brand-10)] transition-colors">
        {title}
      </div>
      <div className="flex-1 mt-2 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart 
              data={data} 
              syncId="telemetry" 
              syncMethod="value" 
              margin={{ top: 5, right: 10, left: 5, bottom: showXAxis ? 14 : 0 }} 
              onMouseEnter={() => { onChartActive(chartId); }}
            >
              <CartesianGrid fill="var(--color-brand-bg-deep)" strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide={!showXAxis} type="number" domain={['dataMin', 'dataMax']} tickFormatter={showXAxis ? (val) => (val * 100).toFixed(0) + '%' : undefined} fontSize={9} minTickGap={30} stroke="var(--color-zinc-400)" />
              <YAxis domain={domain} stroke="var(--color-zinc-400)" fontSize={9} tickCount={3} tickFormatter={tickFormatter} width={35} />
              <Tooltip isAnimationActive={false} wrapperStyle={{ zIndex: 1000 }} content={<CustomTooltip chartId={chartId} activeChart={activeChart} />} />
              <Area type="linear" dataKey={dataKey} stroke={stroke} fill={stroke} fillOpacity={0.15} strokeWidth={1} strokeOpacity={0.92} style={{ mixBlendMode: 'screen' }} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey={refDataKey} stroke="rgba(255, 255, 255, 0.7)" strokeWidth={1} strokeOpacity={0.75} style={{ mixBlendMode: 'screen' }} dot={false} isAnimationActive={false} activeDot={false} />
              {extraAreas.map((area, idx) => (
                <Area key={idx} type="step" dataKey={area.dataKey} stroke="none" fill={area.fill} fillOpacity={area.opacity || 0.15} isAnimationActive={false} activeDot={false} />
              ))}
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </AreaChart>
          ) : (
            <LineChart 
              data={data} 
              syncId="telemetry" 
              syncMethod="value" 
              margin={{ top: 5, right: 10, left: 5, bottom: showXAxis ? 14 : 0 }} 
              onMouseEnter={() => { onChartActive(chartId); }}
            >
              <CartesianGrid fill="var(--color-brand-bg-deep)" strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis dataKey="lap_dist_pct" hide={!showXAxis} type="number" domain={['dataMin', 'dataMax']} stroke="var(--color-zinc-400)" tickFormatter={showXAxis ? (val) => (val * 100).toFixed(0) + '%' : undefined} fontSize={9} minTickGap={30} />
              <YAxis domain={domain} stroke="var(--color-zinc-400)" fontSize={9} tickCount={3} tickFormatter={tickFormatter} width={35} />
              <Tooltip isAnimationActive={false} wrapperStyle={{ zIndex: 1000 }} content={<CustomTooltip chartId={chartId} activeChart={activeChart} />} />
              <Line type="linear" dataKey={dataKey} stroke={stroke} strokeWidth={1} strokeOpacity={0.92} style={{ mixBlendMode: 'screen' }} dot={false} isAnimationActive={false} activeDot={<FastDot />} />
              <Line type="linear" dataKey={refDataKey} stroke="rgba(255, 255, 255, 0.7)" strokeWidth={1} strokeOpacity={0.75} style={{ mixBlendMode: 'screen' }} dot={false} isAnimationActive={false} activeDot={false} />
              {sectorBoundaries.map((pct, i) => (
                <ReferenceLine key={`sector-${i}`} x={pct} stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" opacity={0.4} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
