import { useEffect } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';

const WS_URL = 'ws://localhost:8000/ws/telemetry/live';
const API_BASE = 'http://localhost:8000/api';

export function useLiveTelemetryWS(selectedLap) {
  const appendLiveData = useLiveStore((state) => state.appendLiveData);
  const setLiveLapData = useLiveStore((state) => state.setLiveLapData);
  const clearLiveData = useLiveStore((state) => state.clearLiveData);

  useEffect(() => {
    // If no lap is selected or the lap is already completed (lap_time !== 0), don't connect to WS
    if (!selectedLap || selectedLap.lap_time !== 0) {
      clearLiveData();
      return;
    }

    let isMounted = true;
    let ws = null;

    // Fetch initial existing points for this live lap
    fetch(`${API_BASE}/laps/${selectedLap.id}/telemetry`)
      .then(res => res.json())
      .then(initialData => {
        if (!isMounted) return;
        setLiveLapData(initialData);

        // Connect to WebSocket after initial data is loaded
        ws = new WebSocket(WS_URL);
        
        ws.onmessage = (event) => {
          try {
            const newData = JSON.parse(event.data);
            if (newData.status === 'waiting for data') return;
            
            // Only process live data for the currently selected lap!
            if (newData.lap_number !== selectedLap.lap_number) return;
            
            appendLiveData(newData);

            // Automatically update hoveredData to the latest point if the user isn't actively hovering the chart
            const { isUserHovering, setHoveredData } = useAppStore.getState();
            if (!isUserHovering) {
              setHoveredData(newData);
            }
          } catch (err) {
            console.error('Live WS parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('Live WS error:', err);
        };
      })
      .catch(err => {
        console.error('Failed to preload live lap:', err);
      });

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
    };
  }, [selectedLap, setLiveLapData, appendLiveData, clearLiveData]);
}
