import { create } from 'zustand';

const MAX_LIVE_POINTS = 18000; // ~5 minutes at 60Hz

export const useLiveStore = create((set) => ({
  liveLapData: [],
  isStreaming: false,
  setLiveLapData: (data) => set({ liveLapData: data }),
  appendLiveData: (newData) => set((state) => {
    const updated = [...state.liveLapData, newData];
    return { liveLapData: updated.length > MAX_LIVE_POINTS ? updated.slice(-MAX_LIVE_POINTS) : updated };
  }),
  clearLiveData: () => set({ liveLapData: [], isStreaming: false }),
}));
