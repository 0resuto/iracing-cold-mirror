import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://localhost:8000/api';

export function useHistoryQuery() {
  return useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    refetchInterval: 5000, // keep history somewhat fresh, optional
  });
}

export function useLapTelemetryQuery(lapId, isLive) {
  return useQuery({
    queryKey: ['telemetry', lapId],
    queryFn: async () => {
      if (!lapId) return [];
      const res = await fetch(`${API_BASE}/laps/${lapId}/telemetry`);
      if (!res.ok) throw new Error('Failed to fetch lap telemetry');
      return res.json();
    },
    enabled: !!lapId && !isLive, // don't fetch static data if it's a live lap
  });
}

export function useReferenceTelemetryQuery(playerId, trackName, skip) {
  return useQuery({
    queryKey: ['bestLapTelemetry', playerId, trackName],
    queryFn: async () => {
      if (!playerId || !trackName) return [];
      
      // 1. Get best lap metadata
      const bestLapRes = await fetch(`${API_BASE}/players/${playerId}/best_lap?track_name=${encodeURIComponent(trackName)}`);
      if (!bestLapRes.ok) {
          if (bestLapRes.status === 404) return []; // No best lap yet
          throw new Error('Failed to fetch best lap metadata');
      }
      const bestLap = await bestLapRes.json();
      
      if (!bestLap || !bestLap.id) return [];

      // 2. Fetch the actual telemetry
      const telemetryRes = await fetch(`${API_BASE}/laps/${bestLap.id}/telemetry`);
      if (!telemetryRes.ok) throw new Error('Failed to fetch reference telemetry');
      return telemetryRes.json();
    },
    enabled: !!playerId && !!trackName && !skip,
  });
}
