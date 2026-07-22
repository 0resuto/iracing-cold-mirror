import { useQuery } from '@tanstack/react-query';

const HOST = import.meta.env.VITE_API_HOST || 'localhost:8000';
const API_BASE = `http://${HOST}/api`;

export function useHistoryQuery() {
  return useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/players_history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    refetchInterval: 5000, // keep history fresh for live updates
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
    enabled: !!lapId && !isLive,
    staleTime: 1000 * 60 * 60, // Completed historical lap data is immutable
  });
}

export function useLapDeltaQuery(lapId, referenceLapId) {
  return useQuery({
    queryKey: ['delta', lapId, referenceLapId],
    queryFn: async () => {
      if (!lapId || !referenceLapId) return [];
      const res = await fetch(`${API_BASE}/laps/${lapId}/delta?reference_lap_id=${referenceLapId}`);
      if (!res.ok) throw new Error('Failed to fetch lap delta');
      return res.json();
    },
    enabled: !!lapId && !!referenceLapId,
    staleTime: 1000 * 60 * 60, // Historical delta calculation is immutable
  });
}

export function useIdealLapQuery(playerId, trackName) {
  return useQuery({
    queryKey: ['idealLap', playerId, trackName],
    queryFn: async () => {
      if (!playerId || !trackName) return null;
      const res = await fetch(`${API_BASE}/players/${playerId}/ideal_lap?track_name=${encodeURIComponent(trackName)}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch ideal lap');
      }
      return res.json();
    },
    enabled: !!playerId && !!trackName,
    staleTime: 1000 * 60 * 5, // Ideal lap refreshes every 5 mins
  });
}
