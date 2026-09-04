import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionSelectModal } from './SessionSelectModal';
import { formatLapTime } from './utils';
import { useAppStore } from '../../store/useAppStore';
import * as queries from '../../api/queries';

vi.mock('../../api/queries', () => ({
  useHistoryQuery: vi.fn(),
}));

const mockPlayers = [
  {
    id: 1,
    name: 'Max Verstappen',
    sessions: [
      {
        id: 101,
        track_name: 'Spa-Francorchamps',
        car_name: 'Porsche 911 GT3 R',
        start_time: '2026-09-01T12:00:00Z',
        duration_seconds: 1200,
        laps: [
          { id: 1001, lap_number: 0, lap_time: 0 },
          { id: 1002, lap_number: 1, lap_time: 138.45 },
          { id: 1003, lap_number: 2, lap_time: 137.20 },
        ],
      },
      {
        id: 102,
        track_name: 'Monza',
        car_name: 'Ferrari 296 GT3',
        start_time: '2026-09-02T15:00:00Z',
        duration_seconds: 900,
        laps: [
          { id: 1004, lap_number: 1, lap_time: 108.10 },
        ],
      },
    ],
  },
];

describe('SessionSelectModal', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    vi.clearAllMocks();
    queries.useHistoryQuery.mockReturnValue({
      data: mockPlayers,
      isLoading: false,
    });
  });

  it('formats lap time correctly', () => {
    expect(formatLapTime(0)).toBe('Outlap');
    expect(formatLapTime(-1)).toBe('Outlap');
    expect(formatLapTime(58.45)).toBe('58.45s');
    expect(formatLapTime(137.20)).toBe('2:17.20');
  });

  it('renders modal with sessions table when isOpen is true', () => {
    render(<SessionSelectModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Select Track & Session/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Spa-Francorchamps/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Monza/i).length).toBeGreaterThan(0);
  });

  it('filters sessions by search input', () => {
    render(<SessionSelectModal isOpen={true} onClose={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Search track, driver, car.../i);
    fireEvent.change(searchInput, { target: { value: 'Monza' } });

    expect(screen.getAllByText(/Monza/i).length).toBeGreaterThan(0);
    // Table should not contain Spa-Francorchamps title
    expect(screen.queryByTitle('Spa-Francorchamps')).not.toBeInTheDocument();
  });

  it('selects the fastest lap when clicking Best button', () => {
    const onClose = vi.fn();
    render(<SessionSelectModal isOpen={true} onClose={onClose} />);

    // Default sort is 'newest': Monza (Sep 2) is first, Spa (Sep 1) is second
    const bestButtons = screen.getAllByRole('button', { name: /Best/i });
    expect(bestButtons.length).toBeGreaterThan(0);
    
    // Click Best on the first session (Monza, lap 1004)
    fireEvent.click(bestButtons[0]);

    const state = useAppStore.getState();
    expect(state.selectedLap).not.toBeNull();
    expect(state.selectedLap.id).toBe(1004); // Monza lap
    expect(state.selectedLap.track_name).toBe('Monza');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selects a specific lap from the laps table', () => {
    const onClose = vi.fn();
    render(<SessionSelectModal isOpen={true} onClose={onClose} />);

    // Click on Lap 1 row or select button
    const lap1Elements = screen.getAllByText(/Lap 1/i);
    expect(lap1Elements.length).toBeGreaterThan(0);
    fireEvent.click(lap1Elements[0]);

    const state = useAppStore.getState();
    expect(state.selectedLap).not.toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
