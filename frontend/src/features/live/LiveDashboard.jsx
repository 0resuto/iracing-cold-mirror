import React, { useState } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
import { Checkbox } from '../../components/Checkbox';
import {
  TelemetryProvider,
  DigitalDash,
  LiveInputs,
  LiveFuel,
  LiveWeather,
  PitHelper,
  LinearTrackMap,
  LiveRadar,
  LiveRelative,
  LiveStandings
} from 'cold-mirror-widgets';
import { Activity } from 'lucide-react';

export function LiveDashboard() {
  const latestTelemetry = useLiveStore((state) => state.latestTelemetry);
  const sessionDrivers = useLiveStore((state) => state.sessionDrivers);
  const sessionData = useLiveStore((state) => state.sessionData);
  const trackLength = useLiveStore((state) => state.trackLength);
  const isStreaming = useLiveStore((state) => state.isStreaming);
  const columns = useAppStore((state) => state.standingsColumns);

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
          Waiting for WebSocket stream at /ws/telemetry/live
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

          {/* 2. Cockpit Widgets Row (Fuel & Weather status) */}
          <div className="flex flex-wrap items-center gap-3 flex-none">
            {/* Fuel Status (3x narrower, original 140px height: ~240px wide, 140px high) */}
            <div className="w-full sm:w-[240px] h-[140px] min-h-[140px] flex flex-col flex-none">
              <LiveFuel maxFuel={120} lowFuelThreshold={15} criticalFuelThreshold={5} throttleMs={200} />
            </div>

            {/* Weather / Track Conditions (~30% narrower, ~2.5x shorter: ~380px wide, 56px high) */}
            <div className="w-full sm:w-[380px] h-[56px] min-h-[56px] flex flex-col flex-none">
              <LiveWeather tempUnit="C" speedUnit="kmh" throttleMs={500} />
            </div>
          </div>

          {/* Hidden Widgets (Radar, PitHelper, DigitalDash) - Ready for customization menu */}
          {false && (
            <div className="hidden">
              <LiveRadar rangeMeters={30} throttleMs={33} />
              <PitHelper units="kph" throttleMs={33} />
              <DigitalDash units="kph" shiftPctThreshold={0.95} throttleMs={16} />
            </div>
          )}

          {/* 3. Timing & Classification Section with Standings / Relative Tabs */}
          <div className="flex-1 flex flex-col border border-brand-60/60 rounded-xl bg-brand-bg shadow-xl overflow-hidden min-h-[320px]">
            {/* Section Header & Tabs */}
            <div className="flex items-center justify-between bg-brand-60/40 border-b border-brand-60 px-3.5 py-2 flex-none flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'standings'
                      ? 'bg-brand-30/20 text-brand-10 border border-brand-30/40 shadow-sm'
                      : 'text-brand-10/60 hover:text-brand-10'
                  }`}
                >
                  Standings
                </button>
                <button
                  onClick={() => setActiveTab('relative')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'relative'
                      ? 'bg-brand-30/20 text-brand-10 border border-brand-30/40 shadow-sm'
                      : 'text-brand-10/60 hover:text-brand-10'
                  }`}
                >
                  Relative
                </button>
              </div>

              {activeTab === 'standings' && (
                <Checkbox
                  label="Group by Class"
                  checked={groupByClass}
                  onChange={(e) => setGroupByClass(e.target.checked)}
                />
              )}
            </div>

            {/* Tab Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              {activeTab === 'standings' && (
                <LiveStandings 
                  columns={{ num: true, classPos: true, gap: true, ...columns }} 
                  groupByClass={groupByClass} 
                  showClassName={true} 
                  throttleMs={200} 
                />
              )}
              {activeTab === 'relative' && (
                <LiveRelative 
                  columns={{ num: true, gap: true, ...columns }} 
                  showClassName={true} 
                  throttleMs={100} 
                />
              )}
            </div>
          </div>

        </div>

        {/* 5. Bottom Pinned Live Inputs Bar (Full width, 102px height, edge-to-edge) */}
        <div className="w-full h-[102px] min-h-[102px] flex-none border-t border-brand-60/60 bg-[#121214]/95 backdrop-blur-md p-0 z-30 shadow-2xl flex items-center overflow-hidden">
          <LiveInputs throttleMs={33} timeRange={3} isLocked={true} />
        </div>
      </div>
    </TelemetryProvider>
  );
}
