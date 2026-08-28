import { useEffect, useRef } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
import { mapLiveTelemetry } from './telemetryMapper';
import { useToast } from '@0resuto/ui-kit';

const WS_URL = import.meta.env.VITE_WS_URL || (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws/telemetry/live`;
})();

export function useLiveTelemetryWS(isLiveActive) {
  const clearLiveData = useLiveStore((state) => state.clearLiveData);
  const lastSessionTimeRef = useRef(null);
  const lastUpdateTimestampRef = useRef(0);
  const staleTimeoutRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!isLiveActive) {
      clearLiveData();
      useLiveStore.setState({ isStreaming: false, latestTelemetry: null });
      useAppStore.getState().setHoveredData(null);
      return;
    }

    let ws = null;
    let reconnectTimeout = null;
    lastSessionTimeRef.current = null;
    lastUpdateTimestampRef.current = 0;

    // Periodically check if new telemetry points arrived recently (within 2.5s)
    const statusCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTimestampRef.current;
      const isStreaming = timeSinceLastUpdate < 2500;
      const wasStreaming = useLiveStore.getState().isStreaming;
      useLiveStore.setState({ isStreaming });

      // Stream went offline — start 5s delayed cleanup of stale telemetry
      if (wasStreaming && !isStreaming) {
        staleTimeoutRef.current = setTimeout(() => {
          if (!useLiveStore.getState().isStreaming) {
            useLiveStore.setState({ latestTelemetry: null });
          }
        }, 5000);
      }
      // Stream came back — cancel pending cleanup
      if (!wasStreaming && isStreaming && staleTimeoutRef.current) {
        clearTimeout(staleTimeoutRef.current);
        staleTimeoutRef.current = null;
      }
    }, 1000);

    const connectWS = () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      ws = new WebSocket(WS_URL);

      ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);

          if (rawData.status === 'waiting for data') {
            if (useLiveStore.getState().isStreaming) {
              toast('iRacing is waiting for data...');
            }
            useLiveStore.setState({ isStreaming: false, latestTelemetry: null });
            return;
          }

          if (rawData.session_time !== undefined && rawData.session_time === lastSessionTimeRef.current) {
            return;
          }

          lastSessionTimeRef.current = rawData.session_time;
          lastUpdateTimestampRef.current = Date.now();

          const mappedData = mapLiveTelemetry(rawData);
          if (mappedData.wheel_angle !== undefined && mappedData.wheel_angle !== null) {
            mappedData.wheel_angle_deg = mappedData.wheel_angle * (180 / Math.PI);
          }

          const storeUpdates = {
            latestTelemetry: mappedData,
          };

          if (mappedData.playerCarIdx !== undefined && mappedData.playerCarIdx !== null) {
            storeUpdates.driverCarIdx = mappedData.playerCarIdx;
          }

          if (!useLiveStore.getState().isStreaming) {
            toast.success('Connected to iRacing Live Telemetry');
            storeUpdates.isStreaming = true;
            storeUpdates.liveTrackName = rawData.track_name;
            storeUpdates.livePlayerName = rawData.player_name;
            storeUpdates.liveCarName = rawData.car_name;
          }

          if (rawData.session_drivers) {
            useLiveStore.getState().setSessionDrivers(rawData.session_drivers);
          }

          useLiveStore.setState(storeUpdates);
        } catch (err) {
          console.error('Live WS parse error:', err);
        }
      };

      ws.onerror = (err) => {
        // Prevent noisy errors during React Strict Mode unmounts
        if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) return;
        
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
        
        // Auto-reconnect after 2 seconds
        reconnectTimeout = setTimeout(connectWS, 2000);
      };
    };

    connectWS();

    return () => {
      if (staleTimeoutRef.current) clearTimeout(staleTimeoutRef.current);
      clearInterval(statusCheckInterval);
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; 
        ws.close();
      }
      clearLiveData();
      useLiveStore.setState({ isStreaming: false, latestTelemetry: null });
    };
  }, [isLiveActive, clearLiveData, toast]);
}
