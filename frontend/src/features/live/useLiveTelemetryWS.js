import { useEffect, useRef } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';

const HOST = import.meta.env.VITE_API_HOST || 'localhost:8000';
const WS_URL = `ws://${HOST}/ws/telemetry/live`;
const API_BASE = `http://${HOST}/api`;

export function useLiveTelemetryWS(selectedLap) {
  const setLiveLapData = useLiveStore((state) => state.setLiveLapData);
  const clearLiveData = useLiveStore((state) => state.clearLiveData);
  const bufferRef = useRef([]);

  const lapId = selectedLap?.id;
  const lapTime = selectedLap?.lap_time;
  const lapNumber = selectedLap?.lap_number;

  useEffect(() => {
    // If no lap is selected or the lap is already completed (lapTime !== 0), don't connect to WS
    if (!lapId || lapTime !== 0) {
      clearLiveData();
      return;
    }

    let isMounted = true;
    let ws = null;

    // Batch flush interval (flushes buffer every 50ms -> 20Hz update rate)
    const flushInterval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const batch = bufferRef.current;
        bufferRef.current = [];

        useLiveStore.setState((state) => ({
          liveLapData: [...state.liveLapData, ...batch]
        }));
      }
    }, 50);

    // Fetch initial existing points for this live lap
    fetch(`${API_BASE}/laps/${lapId}/telemetry`)
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
            if (newData.lap_number !== lapNumber) return;
            
            // Push to buffer instead of immediate 60Hz state dispatch
            bufferRef.current.push(newData);

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
      clearInterval(flushInterval);
      if (ws) {
        ws.close();
      }
    };
  }, [lapId, lapTime, lapNumber, setLiveLapData, clearLiveData]);
}
