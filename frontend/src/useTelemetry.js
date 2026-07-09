import { useState, useEffect } from 'react';

export function useTelemetry(selectedLap) {
  const [lapData, setLapData] = useState([]);
  const [hoveredData, setHoveredData] = useState(null);
  const [isUserHovering, setIsUserHovering] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!selectedLap) return;

    let isMounted = true;
    let ws = null;

    if (selectedLap.lap_time > 0) {
      fetch(`http://localhost:8000/api/laps/${selectedLap.id}/telemetry`)
        .then(res => res.json())
        .then(data => {
          if (isMounted) setLapData(data);
        })
        .catch(err => console.error("Telemetry fetch error:", err));
    } else {
      setLapData([]);
      
      fetch(`http://localhost:8000/api/laps/${selectedLap.id}/telemetry`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          setLapData(data);
          
          ws = new WebSocket('ws://localhost:8000/ws/telemetry/live');
          let lastTime = data.length > 0 ? data[data.length - 1].session_time : -1;
          
          ws.onmessage = (event) => {
            try {
              const newData = JSON.parse(event.data);
              if (newData.status === 'waiting for data') return;

              if (lastTime !== -1 && newData.session_time < lastTime - 5) {
                 setRefreshTrigger(t => t + 1);
                 return;
              }
              lastTime = newData.session_time;
              
              setLapData(prevData => {
                if (prevData.length > 0) {
                  const lastPoint = prevData[prevData.length - 1];
                  if (newData.session_time <= lastPoint.session_time) {
                    return prevData;
                  }
                }
                return [...prevData, newData];
              });

              setIsUserHovering(hovering => {
                if (!hovering) setHoveredData(newData);
                return hovering;
              });
            } catch (err) {
              console.error("Live WS parse error:", err);
            }
          };

          ws.onerror = (err) => console.error("Live WS error:", err);
        })
        .catch(err => console.error("Failed to preload live lap:", err));
    }

    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, [selectedLap]);

  return { lapData, hoveredData, setHoveredData, setIsUserHovering, refreshTrigger };
}
