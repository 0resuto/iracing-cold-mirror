import { create } from 'zustand';

export const useLiveStore = create((set) => ({
  latestTelemetry: null,
  sessionDrivers: [],
  sessionData: null,
  trackLength: 4000,
  driverCarIdx: null,
  isStreaming: false,
  liveTrackName: null,
  livePlayerName: null,
  liveCarName: null,
  setLatestTelemetry: (telemetry) => set({ latestTelemetry: telemetry }),
  setSessionDrivers: (drivers) => set({ sessionDrivers: drivers }),
  setSessionData: (sessionData) => set({ sessionData }),
  setTrackLength: (trackLength) => set({ trackLength }),
  clearLiveData: () => set({ latestTelemetry: null, isStreaming: false }),
}));
