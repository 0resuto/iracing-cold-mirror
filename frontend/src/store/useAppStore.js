import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedLap: null,
  referenceLapId: null,
  isSidebarOpen: false,
  hoveredData: null,
  isUserHovering: false,

  setSelectedLap: (lap) => set({ selectedLap: lap, hoveredData: null }),
  setReferenceLapId: (id) => set({ referenceLapId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  setHoveredData: (data) => set({ hoveredData: data }),
  setIsUserHovering: (isHovering) => set({ isUserHovering: isHovering }),
  steeringMax: 450,
  setSteeringMax: (val) => set({ steeringMax: val }),
  showOutlaps: false,
  setShowOutlaps: (val) => set({ showOutlaps: val }),
  toggleShowOutlaps: () => set((state) => ({ showOutlaps: !state.showOutlaps })),
  liveDeltaReferenceMode: 'optimal',
  setLiveDeltaReferenceMode: (mode) => set({ liveDeltaReferenceMode: mode }),
  standingsColumns: {
    pos: true,
    driver: true,
    carName: true,
    carClass: true,
    srating: true,
    irating: true,
    lastLap: true,
    trackPct: false,
  },
  toggleStandingsColumn: (col) => set((state) => ({
    standingsColumns: {
      ...state.standingsColumns,
      [col]: !state.standingsColumns[col]
    }
  })),
  showClassName: false,
  toggleShowClassName: () => set((state) => ({ showClassName: !state.showClassName })),
}));
