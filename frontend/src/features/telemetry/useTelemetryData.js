import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLiveStore } from '../../store/useLiveStore';
import { useLapTelemetryQuery, useLapDeltaQuery, useHistoryQuery } from '../../api/queries';

export function useTelemetryData() {
  const activeTab = useAppStore((state) => state.activeTab);
  const selectedLap = useAppStore((state) => state.selectedLap);
  const referenceLapId = useAppStore((state) => state.referenceLapId);

  const isLive = activeTab === 'live';

  const { data: playersData = [] } = useHistoryQuery();
  const players = playersData;
  
  const { bestLapId, validReferenceLapId } = useMemo(() => {
    if (!selectedLap || !players.length) return { bestLapId: null, validReferenceLapId: null };

    let bestLap = null;
    let refValid = false;
    const player = players.find(p => p.id === selectedLap.player_id);

    if (player) {
      for (const s of (player.sessions || [])) {
        if (s.track_name === selectedLap.track_name) {
          for (const l of (s.laps || [])) {
            if (l.id === referenceLapId) refValid = true;
            if (l.lap_time > 0) {
              if (!bestLap || l.lap_time < bestLap.lap_time) bestLap = l;
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
  const liveLapData = useLiveStore((state) => state.liveLapData);
  
  const { data: referenceData = [] } = useLapTelemetryQuery(activeRefId, isLive);
  const { data: deltaData = [] } = useLapDeltaQuery(isLive ? null : selectedLap?.id, activeRefId);

  const lapData = isLive ? liveLapData : staticLapData;

  return { lapData, referenceData, deltaData, selectedLap, activeRefId, players, isLive };
}
