import { useState, useEffect } from 'react';

export function useTelemetry() {
  const [data, setData] = useState({
    speed: 0,
    rpm: 800,
    gear: 0,
    throttle: 0,
    brake: 0,
    wheel_angle: 0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Open a persistent WebSocket connection
    const ws = new WebSocket('ws://localhost:8000/ws/telemetry/live');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        if (json.status !== 'waiting for data') {
          setData(json);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setError("WebSocket disconnected");
    };

    // Cleanup: close the connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  return { data, error };
}
