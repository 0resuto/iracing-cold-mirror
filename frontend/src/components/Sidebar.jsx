import React, { useState, useEffect } from 'react';

export function Sidebar({ selectedLapId, onSelectLap }) {
  const [sessions, setSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/history')
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        if (data.length > 0) {
          setExpandedSession(data[data.length - 1].id); // Auto-expand latest session
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("History fetch error:", err);
        setError("Failed to connect to the server.");
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="glass-panel" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <h2 className="panel-title" style={{ marginBottom: '16px' }}>History</h2>
      
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading history...</div>
      ) : error ? (
        <div style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{error}</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No history found. Start a session!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessions.map(session => (
            <div key={session.id} style={{ 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              overflow: 'hidden'
            }}>
              {/* Session Header */}
              <div 
                style={{ 
                  padding: '12px 16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  background: expandedSession === session.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  fontWeight: expandedSession === session.id ? 'bold' : 'normal'
                }}
                onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
              >
                <span>{session.track_name || `Session #${session.id}`}</span>
                <span style={{ color: 'var(--text-muted)' }}>{expandedSession === session.id ? '▼' : '▶'}</span>
              </div>
              
              {/* Laps List */}
              {expandedSession === session.id && (
                <div style={{ padding: '8px', borderTop: '1px solid var(--card-border)' }}>
                  {session.laps.map(lap => (
                    <div 
                      key={lap.id}
                      style={{
                        padding: '8px 12px',
                        margin: '4px 0',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        background: selectedLapId === lap.id ? 'var(--accent-blue)' : 'transparent',
                        color: selectedLapId === lap.id ? '#fff' : 'var(--text-muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '14px'
                      }}
                      onClick={() => onSelectLap(lap)}
                    >
                      <span>Lap {lap.lap_number}</span>
                      <span className="digital-number">{lap.lap_time > 0 ? lap.lap_time.toFixed(1) + 's' : 'In Progress'}</span>
                    </div>
                  ))}
                  {session.laps.length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>No laps recorded yet.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
