import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    const initialState = useAppStore.getInitialState();
    useAppStore.setState(initialState, true);
  });

  it('should have initial state', () => {
    const state = useAppStore.getState();
    expect(state.activeTab).toBe('history');
    expect(state.selectedLap).toBeNull();
    expect(state.isSidebarOpen).toBe(true);
  });

  it('should update active tab and clear hovered data', () => {
    useAppStore.getState().setHoveredData({ speed: 100 });
    useAppStore.getState().setActiveTab('live');
    
    const state = useAppStore.getState();
    expect(state.activeTab).toBe('live');
    expect(state.hoveredData).toBeNull();
  });

  it('should toggle sidebar', () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(false);
    
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(true);
  });
});
