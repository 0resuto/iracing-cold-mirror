import { create } from 'zustand';

export const useLiveStore = create((set) => ({
  liveLapData: [],
  setLiveLapData: (data) => set({ liveLapData: data }),
  appendLiveData: (newData) => set((state) => ({ liveLapData: [...state.liveLapData, newData] })),
  clearLiveData: () => set({ liveLapData: [] }),
}));
