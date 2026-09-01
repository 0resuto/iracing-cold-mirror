import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLapTelemetryQuery, useLapDeltaQuery, useHistoryQuery } from '../../api/queries';

import { useLocation } from 'react-router-dom';

export function useTelemetryData() {
  const location = useLocation();
  const selectedLap = useAppStore((state) => state.selectedLap);
  const referenceLapId = useAppStore((state) => state.referenceLapId);

  const isLive = location.pathname === '/live';

  const { data: playersData = [] } = useHistoryQuery();
  const players = playersData;

  const currentSession = useMemo(() => {
    if (!selectedLap || !players.length) return null;
    for (const player of players) {
      for (const session of player.sessions || []) {
        if (session.laps?.some((l) => l.id === selectedLap.id)) {
          return session;
        }
      }
    }
    return null;
  }, [selectedLap, players]);

  const trackLength = currentSession?.track_length || null;
  
  const { bestLapId, validReferenceLapId } = useMemo(() => {
    if (!selectedLap || !players.length) return { bestLapId: null, validReferenceLapId: null };

    let bestLap = null;
    let refValid = false;
    let minTime = Infinity;
    const targetTrack = selectedLap.track_name;
    const targetCar = selectedLap.car_name || '';

    for (const player of players) {
      for (const s of (player.sessions || [])) {
        if (s.track_name === targetTrack && (s.car_name || '') === targetCar) {
          for (const l of (s.laps || [])) {
            if (l.id === referenceLapId) refValid = true;
            if (l.lap_number > 0 && l.lap_time > 0) {
              if (l.lap_time < minTime) {
                minTime = l.lap_time;
                bestLap = l;
              }
            }
          }
        }
      }
    }

    return {
      bestLapId: bestLap ? bestLap.id : null,
      validReferenceLapId: refValid ? referenceLapId : null
    };
  }, [selectedLap, players, referenceLapId]);

  const activeRefId = validReferenceLapId || bestLapId;

  const { data: staticLapData = [] } = useLapTelemetryQuery(selectedLap?.id, isLive);
  const { data: rawReferenceData = [] } = useLapTelemetryQuery(isLive ? null : activeRefId, isLive);
  const { data: rawDeltaData = [] } = useLapDeltaQuery(isLive ? null : selectedLap?.id, activeRefId);

  const lapData = isLive ? [] : staticLapData;
  const referenceData = isLive ? [] : rawReferenceData;
  const deltaData = isLive ? [] : rawDeltaData;

  return {
    lapData,
    referenceData,
    deltaData,
    selectedLap,
    activeRefId,
    players,
    isLive,
    currentSession,
    trackLength,
  };
}
