import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTelemetryData } from './useTelemetryData';
import { useAppStore } from '../../store/useAppStore';
import * as queries from '../../api/queries';

vi.mock('../../api/queries', () => ({
  useHistoryQuery: vi.fn(),
  useLapTelemetryQuery: vi.fn(() => ({ data: [] })),
  useLapDeltaQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/history' })),
}));

describe('useTelemetryData', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    vi.clearAllMocks();
  });

  it('calculates all-time best lap across all players for matching track and car', () => {
    const mockPlayers = [
      {
        id: 1,
        name: 'Player 1',
        sessions: [
          {
            id: 10,
            track_name: 'Spa',
            car_name: 'GT3',
            laps: [
              { id: 100, lap_number: 0, lap_time: 0.0 }, // outlap
              { id: 101, lap_number: 1, lap_time: 125.5 },
              { id: 102, lap_number: 2, lap_time: 124.0 },
            ],
          },
          {
            id: 11,
            track_name: 'Spa',
            car_name: 'Formula4', // different car
            laps: [
              { id: 103, lap_number: 1, lap_time: 110.0 },
            ],
          },
        ],
      },
      {
        id: 2,
        name: 'Player 2',
        sessions: [
          {
            id: 20,
            track_name: 'Spa',
            car_name: 'GT3', // same car, faster lap
            laps: [
              { id: 201, lap_number: 1, lap_time: 122.5 }, // all-time best GT3 at Spa
            ],
          },
        ],
      },
    ];

    queries.useHistoryQuery.mockReturnValue({ data: mockPlayers });

    // Select lap 101 (Player 1, Spa, GT3)
    useAppStore.getState().setSelectedLap({
      id: 101,
      lap_number: 1,
      lap_time: 125.5,
      player_id: 1,
      track_name: 'Spa',
      car_name: 'GT3',
    });

    const { result } = renderHook(() => useTelemetryData());

    // activeRefId should be 201 (Player 2's faster GT3 lap at Spa, not 103 Formula4)
    expect(result.current.activeRefId).toBe(201);
  });
});
