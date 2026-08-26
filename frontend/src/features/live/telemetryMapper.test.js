import { describe, it, expect } from 'vitest';
import { mapLiveTelemetry } from './telemetryMapper';

describe('mapLiveTelemetry', () => {
  it('returns null for null or undefined input', () => {
    expect(mapLiveTelemetry(null)).toBeNull();
    expect(mapLiveTelemetry(undefined)).toBeNull();
  });

  it('correctly converts speed from km/h to m/s for widgets', () => {
    const raw = { speed: 180 }; // 180 km/h = 50 m/s
    const mapped = mapLiveTelemetry(raw);
    expect(mapped.speed).toBe(180); // Preserved for legacy uPlot
    expect(mapped.Speed).toBe(50);   // Converted for widgets
  });

  it('maps vehicle dynamics and environmental fields to PascalCase', () => {
    const raw = {
      speed: 108,
      rpm: 6500,
      gear: 3,
      throttle: 0.8,
      brake: 0.1,
      clutch: 0.0,
      wheel_angle: 0.25,
      shift_indicator_pct: 0.9,
      fuel_level: 45.2,
      fuel_use_per_hour: 22.4,
      fuel_level_pct: 0.45,
      air_temp: 21.5,
      track_temp: 30.2,
      wind_vel: 4.5,
      wind_dir: 1.2,
      yaw: 0.4,
      skies: 1,
      on_pit_road: true,
      pit_sv_flags: 15,
      pit_sv_fuel: 20,
      car_left_right: 2,
      player_car_idx: 4,
      player_name: 'Test Driver',
      grid: {
        '0': { BestLapTime: 92.5 },
        '4': { BestLapTime: 91.2 },
      },
    };

    const mapped = mapLiveTelemetry(raw);

    expect(mapped.Speed).toBe(30);
    expect(mapped.RPM).toBe(6500);
    expect(mapped.Gear).toBe(3);
    expect(mapped.Throttle).toBe(0.8);
    expect(mapped.Brake).toBe(0.1);
    expect(mapped.Clutch).toBe(0.0);
    expect(mapped.SteeringWheelAngle).toBe(0.25);
    expect(mapped.ShiftIndicatorPct).toBe(0.9);
    expect(mapped.FuelLevel).toBe(45.2);
    expect(mapped.FuelUsePerHour).toBe(22.4);
    expect(mapped.AirTemp).toBe(21.5);
    expect(mapped.TrackTemp).toBe(30.2);
    expect(mapped.WindVel).toBe(4.5);
    expect(mapped.WindDir).toBe(1.2);
    expect(mapped.Yaw).toBe(0.4);
    expect(mapped.Skies).toBe(1);
    expect(mapped.OnPitRoad).toBe(true);
    expect(mapped.PitSvFlags).toBe(15);
    expect(mapped.PitSvFuel).toBe(20);
    expect(mapped.CarLeftRight).toBe(2);
    expect(mapped.playerCarIdx).toBe(4);
    expect(mapped.player_name).toBe('Test Driver');
    expect(mapped.SessionBestLapTime).toBe(91.2);
  });

  it('maps all delta channels, OK validity flags, and reference lap times', () => {
    const raw = {
      lap_delta_to_best_lap: -0.234,
      lap_delta_to_best_lap_ok: true,
      lap_delta_to_session_best_lap: 0.512,
      lap_delta_to_session_best_lap_ok: true,
      lap_delta_to_optimal_lap: -0.456,
      lap_delta_to_optimal_lap_ok: true,
      lap_delta_to_session_optimal_lap: 0.123,
      lap_delta_to_session_optimal_lap_ok: false,
      lap_delta_to_session_last_lap: -0.05,
      lap_delta_to_session_last_lap_ok: true,
      lap_delta_to_all_time_best_lap: 0.88,
      lap_delta_to_all_time_best_lap_ok: true,
      lap_delta_to_all_time_optimal_lap: 0.42,
      lap_delta_to_all_time_optimal_lap_ok: false,
      lap_current_lap_time: 45.67,
      lap_best_lap_time: 92.1,
      lap_last_lap_time: 93.4,
      lap_optimal_lap_time: 91.5,
      session_optimal_lap_time: 90.8,
      all_time_best_lap_time: 89.9,
      all_time_optimal_lap_time: 89.2,
      lap_number: 5,
      lap_dist_pct: 0.55,
    };

    const mapped = mapLiveTelemetry(raw);

    expect(mapped.LapDeltaToBestLap).toBe(-0.234);
    expect(mapped.LapDeltaToBestLap_OK).toBe(true);
    expect(mapped.LapDeltaToSessionBestLap).toBe(0.512);
    expect(mapped.LapDeltaToSessionBestLap_OK).toBe(true);
    expect(mapped.LapDeltaToOptimalLap).toBe(-0.456);
    expect(mapped.LapDeltaToOptimalLap_OK).toBe(true);
    expect(mapped.LapDeltaToSessionOptimalLap).toBe(0.123);
    expect(mapped.LapDeltaToSessionOptimalLap_OK).toBe(false);
    expect(mapped.LapDeltaToSessionLastlLap).toBe(-0.05);
    expect(mapped.LapDeltaToSessionLastlLap_OK).toBe(true);
    expect(mapped.LapDeltaToAllTimeBestLap).toBe(0.88);
    expect(mapped.LapDeltaToAllTimeBestLap_OK).toBe(true);
    expect(mapped.LapDeltaToAllTimeOptimalLap).toBe(0.42);
    expect(mapped.LapDeltaToAllTimeOptimalLap_OK).toBe(false);

    expect(mapped.LapCurrentLapTime).toBe(45.67);
    expect(mapped.LapBestLapTime).toBe(92.1);
    expect(mapped.LapLastLapTime).toBe(93.4);
    expect(mapped.LapOptimalLapTime).toBe(91.5);
    expect(mapped.SessionOptimalLapTime).toBe(90.8);
    expect(mapped.AllTimeBestLapTime).toBe(89.9);
    expect(mapped.AllTimeOptimalLapTime).toBe(89.2);

    expect(mapped.Lap).toBe(5);
    expect(mapped.LapDistPct).toBe(0.55);
  });
});
