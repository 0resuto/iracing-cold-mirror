import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export function useHistoryQuery() {
  return useQuery({
    queryKey: ['history'],
    queryFn: () => apiFetch('/players_history'),
    refetchInterval: 5000, // keep history fresh for live updates
  });
}

export function useLapTelemetryQuery(lapId, isLive) {
  return useQuery({
    queryKey: ['telemetry', lapId],
    queryFn: () => (lapId ? apiFetch(`/laps/${lapId}/telemetry`) : []),
    enabled: !!lapId && !isLive,
    staleTime: 1000 * 60 * 60, // Completed historical lap data is immutable
  });
}

export function useLapDeltaQuery(lapId, referenceLapId) {
  return useQuery({
    queryKey: ['delta', lapId, referenceLapId],
    queryFn: () => (lapId && referenceLapId ? apiFetch(`/laps/${lapId}/delta?reference_lap_id=${referenceLapId}`) : []),
    enabled: !!lapId && !!referenceLapId,
    staleTime: 1000 * 60 * 60, // Historical delta calculation is immutable
  });
}

export function useIdealLapQuery(playerId, trackName) {
  return useQuery({
    queryKey: ['idealLap', playerId, trackName],
    queryFn: async () => {
      if (!playerId || !trackName) return null;
      try {
        return await apiFetch(`/players/${playerId}/ideal_lap?track_name=${encodeURIComponent(trackName)}`);
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!playerId && !!trackName,
    staleTime: 1000 * 60 * 5, // Ideal lap refreshes every 5 mins
  });
}

export function useSystemInfoQuery() {
  return useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => apiFetch('/system_info'),
    refetchInterval: 10000,
  });
}

/**
 * Mutation for deleting a telemetry session (Admin only).
 * Automatically invalidates 'history' and 'systemInfo' caches upon success.
 */
export function useDeleteSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId) => {
      return apiFetch(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['systemInfo'] });
    },
  });
}
