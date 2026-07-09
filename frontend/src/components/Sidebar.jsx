import React, { useState, useEffect } from 'react';

export function Sidebar({ selectedLapId, onSelectLap, refreshTrigger }) {
  const [players, setPlayers] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/history')
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        if (data.length > 0) {
          const latestPlayer = data[data.length - 1];
          const latestSession = latestPlayer.sessions[latestPlayer.sessions.length - 1];
          const latestLap = latestSession.laps[latestSession.laps.length - 1];

          if (!selectedLapId) {
            setExpandedPlayer(latestPlayer.id);
            if (latestPlayer.sessions.length > 0) {
              setExpandedSession(latestSession.id);
            }
          } else if (refreshTrigger > 0) {
            // Auto-transition to the new live lap
            onSelectLap(latestLap);
          }
        }
      })
      .catch(err => console.error("History fetch error:", err));
  }, [refreshTrigger]);

  return (
    <div style={{ 
      height: '100%', 
      overflowY: 'auto', 
      padding: '24px',
      background: 'var(--card-bg)',
      borderRight: '1px solid var(--card-border)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>History</h2>
      </div>
      
      {players.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading history...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map(player => (
            <div key={player.id} style={{ 
              background: 'transparent', 
              border: '1px solid var(--card-border)',
              overflow: 'hidden'
            }}>
              {/* Player Header */}
              <div 
                style={{ 
                  padding: '10px 14px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  background: expandedPlayer === player.id ? 'var(--card-border)' : 'transparent',
                  fontWeight: '500',
                  color: 'var(--text-main)',
                  fontSize: '14px'
                }}
                onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
              >
                <span>👤 {player.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{expandedPlayer === player.id ? '▼' : '▶'}</span>
              </div>
              
              {/* Sessions List */}
              {expandedPlayer === player.id && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {player.sessions.map(session => (
                    <div key={session.id}>
                      {/* Session Header */}
                      <div 
                        style={{ 
                          padding: '8px 14px 8px 24px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          background: expandedSession === session.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                          borderTop: '1px solid var(--card-border)'
                        }}
                        onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      >
                        <span style={{ fontSize: '13px' }}>🏁 {session.track_name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{expandedSession === session.id ? '▼' : '▶'}</span>
                      </div>

                      {/* Laps List */}
                      {expandedSession === session.id && (
                        <div style={{ padding: '4px 8px 4px 24px', background: 'rgba(0,0,0,0.2)' }}>
                          {session.laps.map(lap => (
                            <div 
                              key={lap.id}
                              style={{
                                padding: '6px 10px',
                                margin: '2px 0',
                                cursor: 'pointer',
                                borderLeft: selectedLapId === lap.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                                background: selectedLapId === lap.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                color: selectedLapId === lap.id ? 'var(--text-main)' : 'var(--text-muted)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px'
                              }}
                              onClick={() => onSelectLap(lap)}
                            >
                              <span>Lap {lap.lap_number}</span>
                              <span className="digital-number">{lap.lap_time > 0 ? lap.lap_time.toFixed(1) + 's' : 'Live'}</span>
                            </div>
                          ))}
                          {session.laps.length === 0 && (
                            <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-muted)' }}>No laps recorded yet.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {player.sessions.length === 0 && (
                    <div style={{ padding: '8px 24px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--card-border)' }}>No sessions yet.</div>
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
