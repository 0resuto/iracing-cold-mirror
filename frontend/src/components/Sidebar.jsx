import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useHistoryQuery, useIdealLapQuery } from '../api/queries';

export const Sidebar = React.memo(function Sidebar() {
  const selectedLap = useAppStore(state => state.selectedLap);
  const setSelectedLap = useAppStore(state => state.setSelectedLap);
  const isOpen = useAppStore(state => state.isSidebarOpen);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const selectedLapId = selectedLap ? selectedLap.id : null;

  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sectorSortBy, setSectorSortBy] = useState('order');

  const { data: players = [], isLoading, isError } = useHistoryQuery();
  const { data: idealLap } = useIdealLapQuery(selectedLap?.player_id, selectedLap?.track_name);

  const displaySectors = React.useMemo(() => {
    if (!selectedLap || !selectedLap.sectors || selectedLap.sectors.length === 0) return [];
    
    let bestLap = null;
    const player = players.find(p => p.id === selectedLap.player_id);
    if (player) {
        for (const s of player.sessions) {
            if (s.track_name === selectedLap.track_name) {
                for (const l of s.laps) {
                    if (l.lap_time > 0) {
                        if (!bestLap || l.lap_time < bestLap.lap_time) {
                            bestLap = l;
                        }
                    }
                }
            }
        }
    }
    
    const mappedSectors = selectedLap.sectors.map(sector => {
        let delta = null;
        if (bestLap && bestLap.id !== selectedLap.id) {
            const bestSector = bestLap.sectors.find(s => s.sector_number === sector.sector_number);
            if (bestSector) {
                delta = sector.sector_time - bestSector.sector_time;
            }
        }
        return { ...sector, delta };
    });

    if (sectorSortBy === 'delta') {
        mappedSectors.sort((a, b) => {
            if (a.delta === null && b.delta === null) return a.sector_number - b.sector_number;
            if (a.delta === null) return 1;
            if (b.delta === null) return -1;
            return b.delta - a.delta;
        });
    } else {
        mappedSectors.sort((a, b) => a.sector_number - b.sector_number);
    }
    
    return mappedSectors;
  }, [selectedLap, players, sectorSortBy]);

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
        display: isOpen ? 'flex' : 'none',
        flexDirection: 'column',
        minWidth: '256px',
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
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
                              <span className="digital-number">{lap.lap_time > 0 ? lap.lap_time.toFixed(1) + 's' : (lap.lap_time < 0 ? 'Outlap' : 'Live')}</span>
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

      {/* Ideal Lap Section */}
      {idealLap && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ margin: 0, fontSize: '13px' }}>Theoretical Best</h3>
                <span className="digital-number" style={{ color: 'var(--accent-blue)', fontSize: '16px' }}>{idealLap.ideal_lap_time.toFixed(2)}s</span>
             </div>
          </div>
      )}

      {/* Sectors Section */}
      {selectedLap && selectedLap.sectors && selectedLap.sectors.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="panel-title" style={{ margin: 0, fontSize: '13px' }}>Lap Sectors</h3>
                  <select 
                      value={sectorSortBy} 
                      onChange={e => setSectorSortBy(e.target.value)}
                      style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--card-border)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', outline: 'none' }}
                  >
                      <option value="order">By Order</option>
                      <option value="delta">By Time Loss</option>
                  </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {displaySectors.map((sector) => (
                      <div key={sector.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: sector.delta > 0 ? '2px solid var(--accent-red)' : (sector.delta <= 0 ? '2px solid #22c55e' : '2px solid transparent') }}>
                          <span style={{ color: 'var(--text-muted)' }}>Sec {sector.sector_number + 1}</span>
                          <div style={{ display: 'flex', gap: '8px', fontFamily: 'monospace' }}>
                              <span style={{ color: 'var(--text-main)' }}>{sector.sector_time.toFixed(2)}s</span>
                              <span style={{ color: sector.delta <= 0 ? '#22c55e' : 'var(--accent-red)', width: '45px', textAlign: 'right', display: 'inline-block' }}>
                                  {sector.delta !== null ? (sector.delta > 0 ? '+' : '') + sector.delta.toFixed(2) : '-'}
                              </span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      </div>
    </div>
  );
});
