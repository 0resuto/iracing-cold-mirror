import { useEffect, useRef } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
import toast from 'react-hot-toast';

const WS_URL = import.meta.env.VITE_WS_URL || (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/telemetry/live`;
})();

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
    lastUpdateTimestampRef.current = 0;

    // Periodically check if new telemetry points arrived recently (within 2.5s)
    const statusCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTimestampRef.current;
      const isStreaming = timeSinceLastUpdate < 2500;
      useLiveStore.setState({ isStreaming });
    }, 1000);

    // Batch flush interval (flushes buffer every 33ms -> 30Hz update rate for smooth rendering)
    const MAX_LIVE_DISPLAY_POINTS = 300; // ~10 seconds of rolling window at 30Hz
    const flushInterval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const batch = bufferRef.current;
        bufferRef.current = [];

        useLiveStore.setState((state) => {
          const updated = [...state.liveLapData, ...batch];
          return {
            liveLapData: updated.length > MAX_LIVE_DISPLAY_POINTS 
              ? updated.slice(-MAX_LIVE_DISPLAY_POINTS) 
              : updated
          };
        });

        const { isUserHovering, setHoveredData } = useAppStore.getState();
        if (!isUserHovering) {
          setHoveredData(batch[batch.length - 1]);
        }
      }
    }, 33);

    ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        
        // Convert radians to degrees for the frontend components to display correctly
        if (newData.wheel_angle !== undefined && newData.wheel_angle !== null) {
          newData.wheel_angle_deg = newData.wheel_angle * (180 / Math.PI);
        }

        if (newData.status === 'waiting for data') {
          if (useLiveStore.getState().isStreaming) {
            toast('iRacing is waiting for data...', { icon: '🟡' });
          }
          useLiveStore.setState({ isStreaming: false });
          return;
        }

        // Deduplication: Filter out duplicate stale Redis snapshots when iRacing isn't generating new data
        if (newData.session_time !== undefined && newData.session_time === lastSessionTimeRef.current) {
          return;
        }

        lastSessionTimeRef.current = newData.session_time;
        lastUpdateTimestampRef.current = Date.now();
        if (!useLiveStore.getState().isStreaming) {
          toast.success('Connected to iRacing Live Telemetry');
        }
        
        useLiveStore.setState({ isStreaming: true });

        // Push new unique telemetry frame into buffer
        bufferRef.current.push(newData);
      } catch (err) {
        console.error('Live WS parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Live WS connection error:', err);
      if (useLiveStore.getState().isStreaming) {
         toast.error('Lost connection to Telemetry Server');
      }
      useLiveStore.setState({ isStreaming: false });
    };

    ws.onclose = () => {
      if (useLiveStore.getState().isStreaming) {
         toast.error('Connection closed');
      }
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
