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
  });
}
