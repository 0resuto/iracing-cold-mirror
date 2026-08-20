import React, { useState } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
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
import { Activity, Trophy, Radio } from 'lucide-react';

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
        className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar gap-4 p-2 sm:p-4 bg-brand-bg min-w-0"
        style={{
          '--widget-bg-color': 'rgba(30, 30, 36, 0.65)',
          '--inactive-opacity': '0.7',
        }}
      >
        {/* Track Linear Map Header */}
        <div className="w-full flex-none min-h-[48px]">
          <LinearTrackMap throttleMs={33} />
        </div>

        {/* Top Grid: Instrument Dash, Inputs, Proximity Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-none">
          {/* Digital Cockpit Cluster */}
          <div className="lg:col-span-6 xl:col-span-5 min-h-[220px] flex flex-col">
            <DigitalDash units="kph" shiftPctThreshold={0.95} throttleMs={16} />
          </div>

          {/* Live Inputs Trace & Wheel */}
          <div className="lg:col-span-6 xl:col-span-4 min-h-[220px] flex flex-col">
            <LiveInputs throttleMs={33} timeRange={3} />
          </div>

          {/* Proximity Radar */}
          <div className="lg:col-span-12 xl:col-span-3 min-h-[220px] flex flex-col">
            <LiveRadar rangeMeters={30} throttleMs={33} />
          </div>
        </div>

        {/* Secondary Status Row: Fuel, Weather, Pit Lane Assistant */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-none">
          {/* Fuel Status */}
          <div className="min-h-[140px] flex flex-col">
            <LiveFuel maxFuel={120} lowFuelThreshold={15} criticalFuelThreshold={5} throttleMs={200} />
          </div>

          {/* Environmental Conditions */}
          <div className="min-h-[140px] flex flex-col">
            <LiveWeather tempUnit="C" speedUnit="kmh" throttleMs={500} />
          </div>

          {/* Pit Helper */}
          <div className="min-h-[140px] flex flex-col">
            <PitHelper units="kph" throttleMs={33} />
          </div>
        </div>

        {/* Timing & Leaderboard Section with Tabs */}
        <div className="flex-1 flex flex-col border border-brand-60/60 rounded-xl bg-brand-bg shadow-xl overflow-hidden min-h-[360px]">
          {/* Section Header & View Toggles */}
          <div className="flex items-center justify-between bg-brand-60/40 border-b border-brand-60 px-4 py-2.5 flex-none flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'standings'
                    ? 'bg-brand-30/20 text-brand-10 border border-brand-30/40 shadow-sm'
                    : 'text-brand-10/60 hover:text-brand-10'
                }`}
              >
                <Trophy size={14} className="text-yellow-500" />
                Standings
              </button>
              <button
                onClick={() => setActiveTab('relative')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'relative'
                    ? 'bg-brand-30/20 text-brand-10 border border-brand-30/40 shadow-sm'
                    : 'text-brand-10/60 hover:text-brand-10'
                }`}
              >
                <Radio size={14} className="text-cyan-400" />
                Relative (F3)
              </button>
            </div>

            {activeTab === 'standings' && (
              <label className="flex items-center gap-2 text-xs text-brand-10/70 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupByClass}
                  onChange={(e) => setGroupByClass(e.target.checked)}
                  className="rounded bg-brand-60 border-brand-60 text-brand-30 focus:ring-0 focus:ring-offset-0"
                />
                <span>Group by Class</span>
              </label>
            )}
          </div>

          {/* Tab Content */}
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
    </TelemetryProvider>
  );
}
