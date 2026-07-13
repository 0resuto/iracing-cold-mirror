import { useAppStore } from '../../store/useAppStore';
import { useLiveStore } from '../../store/useLiveStore';
import { useLapTelemetryQuery, useReferenceTelemetryQuery } from '../../api/queries';

export function useTelemetryData() {
  const selectedLap = useAppStore((state) => state.selectedLap);
  const isLive = selectedLap?.lap_time === 0;

  const { data: staticLapData = [] } = useLapTelemetryQuery(selectedLap?.id, isLive);
  const liveLapData = useLiveStore((state) => state.liveLapData);
  
  const { data: referenceData = [] } = useReferenceTelemetryQuery(
    selectedLap?.player_id, 
    selectedLap?.track_name, 
    isLive // optionally skip if live, but maybe we want reference data in live mode too?
  );

  const lapData = isLive ? liveLapData : staticLapData;

  return { lapData, referenceData, selectedLap, isLive };
}
