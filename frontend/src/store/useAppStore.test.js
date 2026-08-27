import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    const initialState = useAppStore.getInitialState();
    useAppStore.setState(initialState, true);
  });

  it('should have initial state', () => {
    const state = useAppStore.getState();
    expect(state.selectedLap).toBeNull();
    expect(state.referenceLapId).toBeNull();
    expect(state.isSidebarOpen).toBe(true);
    expect(state.hoveredData).toBeNull();
    expect(state.steeringMax).toBe(450);
    expect(state.liveDeltaReferenceMode).toBe('optimal');
  });

  it('should update liveDeltaReferenceMode', () => {
    useAppStore.getState().setLiveDeltaReferenceMode('sessionBest');
    expect(useAppStore.getState().liveDeltaReferenceMode).toBe('sessionBest');
  });

  it('should update selected lap and clear hovered data', () => {
    useAppStore.getState().setHoveredData({ speed: 100 });
    useAppStore.getState().setSelectedLap({ id: 1, lap_time: 90.5 });
    
    const state = useAppStore.getState();
    expect(state.selectedLap).toEqual({ id: 1, lap_time: 90.5 });
    expect(state.hoveredData).toBeNull();
  });

  it('should toggle sidebar', () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(false);
    
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(true);
  });

  it('should toggle standings columns', () => {
    const initialPos = useAppStore.getState().standingsColumns.pos;
    useAppStore.getState().toggleStandingsColumn('pos');
    expect(useAppStore.getState().standingsColumns.pos).toBe(!initialPos);
  });

  it('should have showOutlaps false by default and support toggling', () => {
    expect(useAppStore.getState().showOutlaps).toBe(false);
    useAppStore.getState().setShowOutlaps(true);
    expect(useAppStore.getState().showOutlaps).toBe(true);
    useAppStore.getState().toggleShowOutlaps();
    expect(useAppStore.getState().showOutlaps).toBe(false);
  });
});
