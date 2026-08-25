import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTelemetryData } from '../features/telemetry/useTelemetryData';
import { TelemetryProvider, LiveInputs, LiveDelta } from 'cold-mirror-widgets';
import { RpmBar } from './RpmBar';
import { FrictionCircle } from './FrictionCircle';

function mapToWidgetFormat(data, delta, bestLapTime, sessionBestLap) {
  if (!data) return null;
  return {
    Speed: (Number(data.speed) || 0) / 3.6,
    RPM: Number(data.rpm) || 0,
    Gear: Number(data.gear) || 0,
    Throttle: Number(data.throttle) || 0,
    Brake: Number(data.brake) || 0,
    Clutch: Number(data.clutch) || 0,
    SteeringWheelAngle: Number(data.wheel_angle) || 0,
    ShiftIndicatorPct: Number(data.shift_indicator_pct) || 0,
    LapDeltaToBestLap: delta != null ? delta : 0,
    LapDeltaToSessionBestLap: sessionBestLap != null ? sessionBestLap : 0,
    LapDeltaToOptimalLap: delta != null ? delta : 0,
    LapCurrentLapTime: Number(data.lap_time) || 0,
    LapBestLapTime: bestLapTime || 0,
    SessionBestLapTime: sessionBestLap != null ? sessionBestLap : -1,
    Lap: Number(data.lap_number) || 0,
    OnPitRoad: false,
    SessionFlags: 0,
    LapDistPct: Number(data.lap_dist_pct) || 0,
  };
}

export const StatsWidget = React.memo(function StatsWidget() {
  const hoveredData = useAppStore((state) => state.hoveredData);
  const { lapData, deltaData, players, selectedLap } = useTelemetryData();

  const data = hoveredData || (lapData.length > 0 ? lapData[lapData.length - 1] : null);

  const maxRpm = useMemo(() => {
    if (!selectedLap || !players?.length) return 8500;
    const player = players.find(p => p.id === selectedLap.player_id);
    if (!player) return 8500;
    const session = player.sessions?.find(s => s.track_name === selectedLap.track_name);
    return session?.redline_rpm || 8500;
  }, [selectedLap, players]);

  const currentDelta = useMemo(() => {
    if (!data) return null;
    if (data.delta !== undefined && data.delta !== null) return data.delta;
    if (deltaData && deltaData.length > 0 && data.lap_dist_pct !== undefined) {
      const targetPct = data.lap_dist_pct;
      let left = 0;
      let right = deltaData.length - 1;
      let bestIdx = 0;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (deltaData[mid].lap_dist_pct < targetPct) {
          bestIdx = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      let closest = deltaData[bestIdx];
      if (bestIdx + 1 < deltaData.length) {
        const diff1 = Math.abs(deltaData[bestIdx].lap_dist_pct - targetPct);
        const diff2 = Math.abs(deltaData[bestIdx + 1].lap_dist_pct - targetPct);
        if (diff2 < diff1) closest = deltaData[bestIdx + 1];
      }
      return closest.delta;
    }
    return null;
  }, [data, deltaData]);

  const bestLapTime = useMemo(() => {
    if (!selectedLap || !players?.length) return null;
    const player = players.find(p => p.id === selectedLap.player_id);
    if (!player) return null;
    const session = player.sessions?.find(s => s.track_name === selectedLap.track_name);
    return session?.best_lap_time || null;
  }, [selectedLap, players]);

  const sessionBestLap = useMemo(() => {
    if (!players?.length) return null;
    let best = null;
    for (const p of players) {
      for (const s of (p.sessions || [])) {
        if (s.best_lap_time && s.best_lap_time > 0 && (best === null || s.best_lap_time < best)) {
          best = s.best_lap_time;
        }
      }
    }
    return best;
  }, [players]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-brand-10/40">
        No Data Available
      </div>
    );
  }

  const widgetTelemetry = mapToWidgetFormat(data, currentDelta, bestLapTime, sessionBestLap);

  return (
    <TelemetryProvider telemetry={widgetTelemetry} sessionDrivers={[]} sessionData={null} trackLength={0}>
      <div className="flex flex-wrap w-full gap-x-3 gap-y-6 p-4 justify-center items-center" style={{ '--widget-bg-color': 'rgba(30, 30, 36, 0.5)' }}>

        {/* Delta */}
        <div className="flex-none w-[192px] h-[160px] border border-brand-60/60 rounded-xl bg-[var(--widget-bg-color)] shadow-xl">
          <div style={{ '--widget-bg-color': 'transparent' }} className="h-full overflow-hidden">
            <LiveDelta
              variant="standard"
              referenceMode="personalBest"
              range={2}
              showLapTime={true}
              throttleMs={1}
              isLocked={true}
            />
          </div>
        </div>

        {/* Inputs + RPM combined block */}
        <div className="flex flex-col border border-brand-60/60 rounded-xl bg-[var(--widget-bg-color)] shadow-xl overflow-hidden h-[160px]">
          <div className="w-[160px] h-[120px] hide-inputs-graph" style={{ '--widget-bg-color': 'transparent' }}>
            <LiveInputs throttleMs={1} timeRange={3} isLocked={true} />
          </div>
          <div className="px-3 pb-3">
            <RpmBar rpm={data.rpm} maxRpm={maxRpm} />
          </div>
        </div>

        {/* G-Force Friction Circle */}
        <div className="flex items-center justify-center border border-brand-60/60 rounded-xl bg-[var(--widget-bg-color)] shadow-xl p-3 h-[160px]">
          <FrictionCircle latAccel={data.lat_accel ?? data.g_lat ?? 0} longAccel={data.long_accel ?? data.g_lon ?? 0} maxG={2.5} />
        </div>
      </div>
    </TelemetryProvider>
  );
});
