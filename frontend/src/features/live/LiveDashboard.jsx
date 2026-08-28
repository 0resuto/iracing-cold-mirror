import React, { useState } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
import { Checkbox, Select, SlidingPill } from '@0resuto/ui-kit';
import {
  TelemetryProvider,
  LiveInputs,
  LiveFuel,
  LiveWeather,
  LinearTrackMap,
  LiveRelative,
  LiveStandings,
  LiveDelta,
  LiveFlags,
  DELTA_MODES,
} from 'cold-mirror-widgets';
import { Activity } from 'lucide-react';

export function LiveDashboard() {
  const latestTelemetry = useLiveStore((state) => state.latestTelemetry);
  const sessionDrivers = useLiveStore((state) => state.sessionDrivers);
  const sessionData = useLiveStore((state) => state.sessionData);
  const trackLength = useLiveStore((state) => state.trackLength);
  const isStreaming = useLiveStore((state) => state.isStreaming);
  const columns = useAppStore((state) => state.standingsColumns);
  const showClassName = useAppStore((state) => state.showClassName);
  const liveDeltaReferenceMode = useAppStore((state) => state.liveDeltaReferenceMode);
  const setLiveDeltaReferenceMode = useAppStore((state) => state.setLiveDeltaReferenceMode);

  const [activeTab, setActiveTab] = useState('standings'); // 'standings' | 'relative'
  const [groupByClass, setGroupByClass] = useState(true);

  if (!isStreaming && !latestTelemetry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-brand-bg h-full p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-60/40 border border-brand-60/60 flex items-center justify-center mb-4 text-brand-30 animate-pulse">
          <Activity size={32} />
        </div>
        <h3 className="text-base font-bold text-brand-10 tracking-wide uppercase">Live Telemetry Disconnected</h3>
        <p className="text-xs text-brand-10/50 max-w-sm mt-1 mb-4">
          Start the live telemetry collector service in iRacing to display live dashboard, standings, and radar.
        </p>
        <span className="text-[11px] font-mono text-brand-10/30 px-3 py-1 rounded bg-brand-60/20 border border-brand-60/40">
          Waiting for WebSocket stream at /api/v1/ws/telemetry/live
        </span>
      </div>
    );
  }

  return (
    <TelemetryProvider
      telemetry={latestTelemetry}
      sessionDrivers={sessionDrivers}
      sessionData={sessionData}
      trackLength={trackLength}
    >
      <div 
        className="relative flex-1 flex flex-col h-full overflow-hidden bg-brand-bg min-w-0"
        style={{
          '--widget-bg-color': 'rgba(30, 30, 36, 0.65)',
          '--inactive-opacity': '0.7',
        }}
      >
        {/* Main Scrollable View Area (Scrollbar flush against the right edge) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-1 pb-3 flex flex-col gap-3 min-w-0">
          
          {/* 1. Track Linear Map (Increased height, tight top spacing) */}
          <div className="w-full flex-none h-[60px] min-h-[60px]">
            <LinearTrackMap throttleMs={33} />
          </div>

          {/* 2. Weather + Flags Row */}
          <div className="flex flex-wrap items-center gap-3 flex-none">
            <div className="w-full sm:w-[418px] h-[56px] min-h-[56px] flex flex-col flex-none">
              <LiveWeather tempUnit="C" speedUnit="kmh" throttleMs={500} />
            </div>
            <div className="w-full sm:w-[320px] h-[56px] min-h-[56px] flex-none border border-brand-60/60 rounded-xl bg-[var(--widget-bg-color)] shadow-xl">
              <div style={{ '--widget-bg-color': 'transparent' }} className="h-full overflow-hidden">
                <LiveFlags
                  variant="banner"
                  autoHideClean={false}
                  showSector={true}
                  throttleMs={50}
                  isLocked={true}
                />
              </div>
            </div>
          </div>

          {/* 3. Delta + Fuel (left) alongside Standings Table (right) */}
          <div className="flex-1 flex gap-3 min-h-0 min-w-0">

            {/* Left Column: Delta + Fuel stacked */}
            <div className="flex-none w-[240px] flex flex-col gap-3">
              <div className="h-[280px] min-h-[280px] flex-none border border-brand-60/60 rounded-xl bg-[var(--widget-bg-color)] shadow-xl flex flex-col overflow-hidden">
                {/* Delta Header with Quick Mode Selector */}
                <div className="flex items-center border-b border-brand-60/60 px-2 py-1.5 flex-none">
                  <Select
                    size="sm"
                    value={liveDeltaReferenceMode}
                    onChange={setLiveDeltaReferenceMode}
                    options={[
                      { value: DELTA_MODES.SESSION_BEST, label: 'Session Best (SB)' },
                      { value: DELTA_MODES.PERSONAL_BEST, label: 'Personal Best (PB)' },
                      { value: DELTA_MODES.OPTIMAL, label: 'Optimal Lap (OPT)' },
                      { value: DELTA_MODES.SESSION_OPTIMAL, label: 'Session Optimal (S-OPT)' },
                      { value: DELTA_MODES.LAST_LAP, label: 'Last Lap (LAST)' },
                      { value: DELTA_MODES.ALL_TIME_BEST, label: 'All-Time Best (ATB)' },
                      { value: DELTA_MODES.ALL_TIME_OPTIMAL, label: 'All-Time Optimal (AT-OPT)' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div style={{ '--widget-bg-color': 'transparent' }} className="flex-1 overflow-hidden">
                  <LiveDelta
                    variant="split"
                    referenceMode={liveDeltaReferenceMode}
                    range={2}
                    showLapTime={true}
                    throttleMs={16}
                    isLocked={true}
                  />
                </div>
              </div>
              <div className="h-[140px] min-h-[140px] flex-none">
                <LiveFuel maxFuel={120} lowFuelThreshold={15} criticalFuelThreshold={5} throttleMs={200} />
              </div>
            </div>

            {/* Right Column: Standings / Relative Table */}
            <div className="flex-1 flex flex-col border border-brand-60/60 rounded-xl bg-[var(--widget-bg-color)] shadow-xl overflow-hidden min-h-[320px] min-w-0">
            {/* Tab Header */}
            <div className="flex items-center justify-between border-b border-brand-60/60 px-3.5 py-2 flex-none flex-wrap gap-2">
              <SlidingPill
                size="sm"
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: 'standings', label: 'Standings' },
                  { value: 'relative', label: 'Relative' },
                ]}
                width="w-44"
              />

              {activeTab === 'standings' && (
                <Checkbox
                  label="Group by Class"
                  checked={groupByClass}
                  onChange={(val) => setGroupByClass(typeof val === 'boolean' ? val : val.target.checked)}
                />
              )}
            </div>

            {/* Tab Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              {activeTab === 'standings' && (
                <LiveStandings 
                  columns={{ num: true, classPos: true, gap: true, ...columns }} 
                  groupByClass={groupByClass} 
                  showClassName={showClassName}
                  throttleMs={200} 
                />
              )}
              {activeTab === 'relative' && (
                <LiveRelative 
                  columns={{ num: true, gap: true, ...columns }} 
                  showClassName={showClassName}
                  throttleMs={100} 
                />
              )}
            </div>
          </div>

          </div>

        </div>

        {/* 5. Bottom Pinned Live Inputs Bar (Full width, 102px height, edge-to-edge) */}
        <div className="w-full h-[102px] min-h-[102px] flex-none border-t border-brand-60/60 bg-zinc-900/95 backdrop-blur-md p-0 z-30 shadow-2xl flex items-center overflow-hidden">
          <LiveInputs throttleMs={33} timeRange={3} isLocked={true} />
        </div>
      </div>
    </TelemetryProvider>
  );
}
