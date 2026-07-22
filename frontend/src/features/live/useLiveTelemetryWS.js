import { useEffect, useRef } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';

const HOST = import.meta.env.VITE_API_HOST || 'localhost:8000';
const WS_URL = `ws://${HOST}/ws/telemetry/live`;

export function useLiveTelemetryWS(isLiveActive) {
  const setLiveLapData = useLiveStore((state) => state.setLiveLapData);
  const clearLiveData = useLiveStore((state) => state.clearLiveData);
  const bufferRef = useRef([]);
  const lastSessionTimeRef = useRef(null);
  const lastUpdateTimestampRef = useRef(Date.now());

  useEffect(() => {
    if (!isLiveActive) {
      clearLiveData();
      useLiveStore.setState({ isStreaming: false });
      return;
    }

    let ws = null;
    lastSessionTimeRef.current = null;
    lastUpdateTimestampRef.current = Date.now();

    // Periodically check if new telemetry points arrived recently (within 2.5s)
    const statusCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTimestampRef.current;
      const isStreaming = timeSinceLastUpdate < 2500;
      useLiveStore.setState({ isStreaming });
    }, 1000);

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

    ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        if (newData.status === 'waiting for data') {
          useLiveStore.setState({ isStreaming: false });
          return;
        }

        // Deduplication: Filter out duplicate stale Redis snapshots when iRacing isn't generating new data
        if (newData.session_time !== undefined && newData.session_time === lastSessionTimeRef.current) {
          return;
        }

        lastSessionTimeRef.current = newData.session_time;
        lastUpdateTimestampRef.current = Date.now();
        useLiveStore.setState({ isStreaming: true });

        // Push new unique telemetry frame into buffer
        bufferRef.current.push(newData);

        // Automatically update hoveredData if user isn't actively hovering chart
        const { isUserHovering, setHoveredData } = useAppStore.getState();
        if (!isUserHovering) {
          setHoveredData(newData);
        }
      } catch (err) {
        console.error('Live WS parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Live WS connection error:', err);
      useLiveStore.setState({ isStreaming: false });
    };

    return () => {
      clearInterval(flushInterval);
      clearInterval(statusCheckInterval);
      if (ws) {
        ws.close();
      }
      clearLiveData();
      useLiveStore.setState({ isStreaming: false });
    };
  }, [isLiveActive, setLiveLapData, clearLiveData]);
}
