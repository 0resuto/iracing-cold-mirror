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
    // Poll every 100ms
    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/telemetry/live');
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();
        
        // If the backend returns 'waiting for data', skip update
        if (json.status !== 'waiting for data') {
          setData(json);
          setError(null);
        }
      } catch (err) {
        console.error("Telemetry fetch error:", err);
        setError(err.message);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return { data, error };
}
