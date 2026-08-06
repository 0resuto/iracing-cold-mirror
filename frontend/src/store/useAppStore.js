import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedLap: null,
  referenceLapId: null,
  isSidebarOpen: true,
  hoveredData: null,
  isUserHovering: false,

  setSelectedLap: (lap) => set({ selectedLap: lap, hoveredData: null }),
  setReferenceLapId: (id) => set({ referenceLapId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setHoveredData: (data) => set({ hoveredData: data }),
  setIsUserHovering: (isHovering) => set({ isUserHovering: isHovering }),
  steeringMax: 450,
  setSteeringMax: (val) => set({ steeringMax: val }),
}));
