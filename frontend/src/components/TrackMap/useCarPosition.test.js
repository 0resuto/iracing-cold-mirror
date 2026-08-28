import { describe, it, expect } from 'vitest';
import { useCarPosition } from './useCarPosition';
import { renderHook } from '@testing-library/react';

const svgData = {
  lonScale: 1,
  minX: 0,
  minY: 0,
  scale: 1,
  xOffset: 0,
  yOffset: 0,
  vbHeight: 1000,
};

describe('useCarPosition', () => {
  it('returns empty state without svgData', () => {
    const { result } = renderHook(() => useCarPosition({ x: 1 }, null, null, null));
    expect(result.current.isValid).toBe(false);
  });

  it('projects a point and computes heading from prev point', () => {
    const current = { lat: 10, lon: 10, slip_angle: 0 };
    const prev = { lat: 10, lon: 9 };
    const { result } = renderHook(() => useCarPosition(current, prev, svgData, null));
    expect(result.current.isValid).toBe(true);
    expect(result.current.x).toBe(10);
    expect(result.current.y).toBe(1000 - 10);
    // moving along +x => travel angle 0
    expect(result.current.travelAngle).toBeCloseTo(0, 3);
  });

  it('falls back to reference GPS points when only lap_dist_pct is provided', () => {
    const refGps = [
      { lat: 0, lon: 0, lap_dist_pct: 0 },
      { lat: 50, lon: 50, lap_dist_pct: 0.5 },
      { lat: 100, lon: 100, lap_dist_pct: 1 },
    ];
    const current = { lap_dist_pct: 0.5 };
    const { result } = renderHook(() => useCarPosition(current, null, svgData, refGps));
    expect(result.current.isValid).toBe(true);
    expect(result.current.x).toBe(50);
    expect(result.current.y).toBe(1000 - 50);
  });
});
