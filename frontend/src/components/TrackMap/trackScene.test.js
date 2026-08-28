import { describe, it, expect } from 'vitest';
import { getCatmullRomSpline } from '../../utils/catmullRomSpline';
import { buildTrackScene } from '../../utils/trackScene';

describe('getCatmullRomSpline', () => {
  it('returns empty string for insufficient points', () => {
    expect(getCatmullRomSpline(null)).toBe('');
    expect(getCatmullRomSpline([])).toBe('');
    expect(getCatmullRomSpline([{ x: 0, y: 0 }])).toBe('');
  });

  it('builds a line for exactly two points', () => {
    const d = getCatmullRomSpline([{ x: 0, y: 0 }, { x: 10, y: 20 }]);
    expect(d).toBe('M 0.00 0.00 L 10.00 20.00');
  });

  it('builds a closed spline for a closed loop', () => {
    const d = getCatmullRomSpline([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ], true);
    expect(d.endsWith(' Z')).toBe(true);
    expect(d.startsWith('M 0.00 0.00')).toBe(true);
    expect(d).toContain(' C ');
  });
});

describe('buildTrackScene', () => {
  const makePoint = (lon, lat, lap_dist_pct) => ({ lon, lat, lap_dist_pct: lap_dist_pct ?? 0 });

  it('returns null without a bounds source', () => {
    expect(buildTrackScene({ refGpsPoints: null, lapGpsPoints: null, isLive: false })).toBeNull();
  });

  it('builds a scene with paths and projection from reference points', () => {
    const ref = [
      makePoint(0, 0, 0),
      makePoint(1, 0, 0.5),
      makePoint(1, 1, 1),
    ];
    const scene = buildTrackScene({ refGpsPoints: ref, lapGpsPoints: null, isLive: false });
    expect(scene).not.toBeNull();
    expect(scene.basePath).toBeTruthy();
    expect(scene.basePath.endsWith(' Z')).toBe(true);
    expect(scene.lapPath).toBeNull();
    expect(scene.vbWidth).toBe(1000);
    expect(scene.vbHeight).toBe(1000);
    expect(typeof scene.projectToScreen).toBe('function');
    expect(scene.realisticCarScale).toBeGreaterThan(0);
    expect(scene.metersPerVbUnit).toBeGreaterThan(0);

    // Projection maps each point back inside the viewBox
    for (const p of ref) {
      const s = scene.projectToScreen(p.lon, p.lat);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1000);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1000);
    }
  });

  it('uses the current lap as bounds source in historical mode', () => {
    const ref = [makePoint(0, 0, 0), makePoint(1, 1, 1)];
    const lap = [makePoint(0.2, 0.2, 0), makePoint(0.8, 0.8, 1)];
    const scene = buildTrackScene({ refGpsPoints: ref, lapGpsPoints: lap, isLive: false });
    expect(scene.lapPath).toBeTruthy();
  });
});
