import { useAppStore } from '../../store/useAppStore';
import { useLiveStore } from '../../store/useLiveStore';
import { useLapTelemetryQuery, useLapDeltaQuery, useHistoryQuery } from '../../api/queries';

export function useTelemetryData() {
  const selectedLap = useAppStore((state) => state.selectedLap);
  const referenceLapId = useAppStore((state) => state.referenceLapId);
  const isLive = selectedLap?.lap_time === 0 || selectedLap?.lap_time === -1;

  const { data: players = [] } = useHistoryQuery();
  
  let bestLapId = null;
  if (selectedLap) {
      let bestLap = null;
      const player = players.find(p => p.id === selectedLap.player_id);
      if (player) {
          for (const s of player.sessions) {
              if (s.track_name === selectedLap.track_name) {
                  for (const l of s.laps) {
                      if (l.lap_time > 0) {
                          if (!bestLap || l.lap_time < bestLap.lap_time) {
                              bestLap = l;
                          }
                      }
                  }
              }
          }
      }
      bestLapId = bestLap ? bestLap.id : null;
  }

  const activeRefId = referenceLapId || bestLapId;

  const { data: staticLapData = [] } = useLapTelemetryQuery(selectedLap?.id, isLive);
  const liveLapData = useLiveStore((state) => state.liveLapData);
  
  const { data: referenceData = [] } = useLapTelemetryQuery(activeRefId, false);
  const { data: deltaData = [] } = useLapDeltaQuery(selectedLap?.id, activeRefId);

  const lapData = isLive ? liveLapData : staticLapData;

  return { lapData, referenceData, deltaData, selectedLap, activeRefId, players };
}
