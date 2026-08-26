/**
 * Maps raw WebSocket telemetry packets from Cold Mirror backend
 * to the PascalCase format and unit standards expected by cold-mirror-widgets,
 * while preserving legacy snake_case fields for uPlot and rolling charts.
 */
export function mapLiveTelemetry(raw) {
  if (!raw) return null;

  const speedKmh = Number(raw.speed) || 0;
  // Widgets (DigitalDash, LiveInputs, PitHelper) expect Speed in m/s and multiply by 3.6 internally.
  const speedMs = speedKmh / 3.6;

  const grid = raw.grid || {};

  // Calculate session best lap time across the grid
  let sessionBestLap = -1;
  for (const carIdx of Object.keys(grid)) {
    const best = grid[carIdx]?.BestLapTime;
    if (best > 0 && (sessionBestLap === -1 || best < sessionBestLap)) {
      sessionBestLap = best;
    }
  }

  return {
    ...raw, // Preserve original snake_case fields for legacy charts/stats

    // Vehicle Dynamics
    Speed: speedMs,
    RPM: Number(raw.rpm) || 0,
    Gear: Number(raw.gear) || 0,
    Throttle: Number(raw.throttle) || 0,
    Brake: Number(raw.brake) || 0,
    Clutch: Number(raw.clutch) || 0,
    SteeringWheelAngle: Number(raw.wheel_angle) || 0,
    ShiftIndicatorPct: Number(raw.shift_indicator_pct) || 0,

    // Fuel
    FuelLevel: Number(raw.fuel_level) || 0,
    FuelUsePerHour: Number(raw.fuel_use_per_hour) || 0,
    FuelLevelPct: Number(raw.fuel_level_pct) || 0,

    // Environment & Weather
    AirTemp: Number(raw.air_temp) || 0,
    TrackTemp: Number(raw.track_temp) || 0,
    WindVel: Number(raw.wind_vel) || 0,
    WindDir: Number(raw.wind_dir) || 0,
    Yaw: Number(raw.yaw) || 0,
    Skies: Number(raw.skies) || 0,

    // Pit & Spotter
    OnPitRoad: Boolean(raw.on_pit_road),
    PitSvFlags: Number(raw.pit_sv_flags) || 0,
    PitSvFuel: Number(raw.pit_sv_fuel) || 0,
    CarLeftRight: Number(raw.car_left_right) || 0,

    // Session & Grid
    SessionFlags: Number(raw.session_flags) || 0,
    SessionTimeRemain: Number(raw.session_time_remain) || 0,
    SessionLapsRemainEx: Number(raw.session_laps_remain) || 0,
    SessionBestLapTime: sessionBestLap > 0 ? sessionBestLap : (Number(raw.session_best_lap_time) || -1),
    playerCarIdx: raw.player_car_idx ?? null,
    player_name: raw.player_name || '',
    grid: grid,

    // Lap Delta & Reference Timing
    LapDeltaToBestLap: Number(raw.lap_delta_to_best_lap) || 0,
    LapDeltaToBestLap_OK: raw.lap_delta_to_best_lap_ok !== undefined ? Boolean(raw.lap_delta_to_best_lap_ok) : true,
    LapDeltaToSessionBestLap: Number(raw.lap_delta_to_session_best_lap) || 0,
    LapDeltaToSessionBestLap_OK: raw.lap_delta_to_session_best_lap_ok !== undefined ? Boolean(raw.lap_delta_to_session_best_lap_ok) : true,
    LapDeltaToOptimalLap: Number(raw.lap_delta_to_optimal_lap) || 0,
    LapDeltaToOptimalLap_OK: raw.lap_delta_to_optimal_lap_ok !== undefined ? Boolean(raw.lap_delta_to_optimal_lap_ok) : true,
    LapDeltaToSessionOptimalLap: Number(raw.lap_delta_to_session_optimal_lap) || 0,
    LapDeltaToSessionOptimalLap_OK: raw.lap_delta_to_session_optimal_lap_ok !== undefined ? Boolean(raw.lap_delta_to_session_optimal_lap_ok) : true,
    LapDeltaToSessionLastlLap: Number(raw.lap_delta_to_session_last_lap ?? raw.lap_delta_to_last_lap) || 0,
    LapDeltaToSessionLastlLap_OK: (raw.lap_delta_to_session_last_lap_ok !== undefined ? Boolean(raw.lap_delta_to_session_last_lap_ok) : raw.lap_delta_to_last_lap_ok !== undefined ? Boolean(raw.lap_delta_to_last_lap_ok) : true),
    LapDeltaToAllTimeBestLap: Number(raw.lap_delta_to_all_time_best_lap) || 0,
    LapDeltaToAllTimeBestLap_OK: raw.lap_delta_to_all_time_best_lap_ok !== undefined ? Boolean(raw.lap_delta_to_all_time_best_lap_ok) : true,
    LapDeltaToAllTimeOptimalLap: Number(raw.lap_delta_to_all_time_optimal_lap) || 0,
    LapDeltaToAllTimeOptimalLap_OK: raw.lap_delta_to_all_time_optimal_lap_ok !== undefined ? Boolean(raw.lap_delta_to_all_time_optimal_lap_ok) : true,

    LapCurrentLapTime: Number(raw.lap_current_lap_time) || 0,
    LapBestLapTime: Number(raw.lap_best_lap_time) || 0,
    LapLastLapTime: Number(raw.lap_last_lap_time) || 0,
    LapOptimalLapTime: Number(raw.lap_optimal_lap_time) || 0,
    SessionOptimalLapTime: Number(raw.session_optimal_lap_time) || 0,
    AllTimeBestLapTime: Number(raw.all_time_best_lap_time) || 0,
    AllTimeOptimalLapTime: Number(raw.all_time_optimal_lap_time) || 0,

    Lap: Number(raw.lap_number) || 0,
    LapDistPct: Number(raw.lap_dist_pct) || 0,
  };
}
