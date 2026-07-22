import { create } from 'zustand';

export const useLiveStore = create((set) => ({
  liveLapData: [],
  isStreaming: false,
  setLiveLapData: (data) => set({ liveLapData: data }),
  appendLiveData: (newData) => set((state) => ({ liveLapData: [...state.liveLapData, newData] })),
  clearLiveData: () => set({ liveLapData: [], isStreaming: false }),
}));
