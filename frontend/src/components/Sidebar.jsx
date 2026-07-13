import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useHistoryQuery } from '../api/queries';

export const Sidebar = React.memo(function Sidebar() {
  const selectedLap = useAppStore(state => state.selectedLap);
  const setSelectedLap = useAppStore(state => state.setSelectedLap);
  const isOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const selectedLapId = selectedLap ? selectedLap.id : null;

  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);

  const { data: players = [], isLoading, isError } = useHistoryQuery();

  useEffect(() => {
    if (players.length > 0) {
      const latestPlayer = players[players.length - 1];
      const latestSession = latestPlayer.sessions[latestPlayer.sessions.length - 1];

      if (!selectedLapId) {
        setExpandedPlayer(latestPlayer.id);
        if (latestPlayer.sessions.length > 0) {
          setExpandedSession(latestSession.id);
        }
      }
    }
  }, [players, selectedLapId]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--card-bg)' }}>
      {/* Icon Nav Bar (64px wide) */}
      <div style={{ width: '64px', minWidth: '64px', borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', background: 'var(--bg-color)' }}>
        <button 
          onClick={toggleSidebar} 
          style={{ background: 'var(--card-border)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '12px', padding: '8px', marginBottom: '32px', borderRadius: '4px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isOpen ? '◀' : '▶'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* History Icon */}
          <div title="History" onClick={() => { if (!isOpen) toggleSidebar(); }} style={{ cursor: 'pointer', color: 'var(--accent-blue)', fontSize: '20px', display: 'flex', justifyContent: 'center', borderLeft: '2px solid var(--accent-blue)' }}>
            ⏱️
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '24px',
        display: isOpen ? 'flex' : 'none',
        flexDirection: 'column',
        minWidth: '256px'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>History</h2>
      </div>
      
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading history...</div>
      ) : isError ? (
        <div style={{ color: 'var(--accent-red)', fontSize: '12px' }}>Failed to load history</div>
      ) : players.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No history found</div>
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
                              onClick={() => setSelectedLap({ ...lap, player_id: player.id, track_name: session.track_name })}
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
    </div>
  );
});
