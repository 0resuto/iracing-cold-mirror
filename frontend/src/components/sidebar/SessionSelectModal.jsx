import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge, Select, Checkbox, Input } from '@0resuto/ui-kit';
import { 
  Search, 
  MapPin, 
  Zap, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  FilterX
} from 'lucide-react';
import { useHistoryQuery } from '../../api/queries';
import { useAppStore } from '../../store/useAppStore';
import { formatSessionTime, formatLapTime } from './utils';

export function SessionSelectModal({ isOpen, onClose }) {
  const { data: rawPlayers = [] } = useHistoryQuery();
  const selectedLap = useAppStore(state => state.selectedLap);
  const setSelectedLap = useAppStore(state => state.setSelectedLap);
  const showOutlapsStore = useAppStore(state => state.showOutlaps);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrack, setFilterTrack] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterCar, setFilterCar] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'fastest' | 'track_asc'
  const [showOutlaps, setShowOutlaps] = useState(showOutlapsStore);

  // Selected Session State for Master-Detail (null = auto-derived from selected lap or first item)
  const [userSelectedSessionId, setUserSelectedSessionId] = useState(null);

  // Mobile Drill-down step: 'sessions' | 'laps'
  const [mobileStep, setMobileStep] = useState('sessions');

  // Normalize all sessions into a flat tabular dataset
  const allSessions = useMemo(() => {
    const list = [];
    (rawPlayers || []).forEach(player => {
      (player.sessions || []).forEach(session => {
        const laps = session.laps || [];
        const validLaps = laps.filter(l => l.lap_number > 0 && l.lap_time > 0);
        
        let bestLap = null;
        let bestTime = Infinity;
        validLaps.forEach(l => {
          if (l.lap_time < bestTime) {
            bestTime = l.lap_time;
            bestLap = l;
          }
        });

        const { date, timeRange } = formatSessionTime(
          session.start_time, 
          session.duration_seconds, 
          session.created_at
        );

        list.push({
          id: session.id,
          rawSession: session,
          player,
          playerId: player.id,
          playerName: player.name,
          trackName: session.track_name || 'Unknown Track',
          carName: session.car_name || 'Unknown Car',
          startTime: session.start_time || session.created_at,
          date,
          timeRange,
          lapsCount: laps.length,
          validLapsCount: validLaps.length,
          bestLap,
          bestTime: bestTime === Infinity ? null : bestTime,
          laps
        });
      });
    });
    return list;
  }, [rawPlayers]);

  // Unique filter lists
  const { trackOptions, driverOptions, carOptions } = useMemo(() => {
    const tracks = new Set();
    const drivers = new Set();
    const cars = new Set();

    allSessions.forEach(s => {
      if (s.trackName) tracks.add(s.trackName);
      if (s.playerName) drivers.add(s.playerName);
      if (s.carName) cars.add(s.carName);
    });

    return {
      trackOptions: Array.from(tracks).sort(),
      driverOptions: Array.from(drivers).sort(),
      carOptions: Array.from(cars).sort()
    };
  }, [allSessions]);

  // Options for custom Select dropdowns
  const trackSelectOptions = useMemo(() => [
    { value: 'all', label: `All Tracks (${trackOptions.length})` },
    ...trackOptions.map(t => ({ value: t, label: t }))
  ], [trackOptions]);

  const driverSelectOptions = useMemo(() => [
    { value: 'all', label: `All Drivers (${driverOptions.length})` },
    ...driverOptions.map(d => ({ value: d, label: d }))
  ], [driverOptions]);

  const carSelectOptions = useMemo(() => [
    { value: 'all', label: `All Cars (${carOptions.length})` },
    ...carOptions.map(c => ({ value: c, label: c }))
  ], [carOptions]);

  const sortSelectOptions = useMemo(() => [
    { value: 'newest', label: 'Sort: Newest First' },
    { value: 'oldest', label: 'Sort: Oldest First' },
    { value: 'fastest', label: 'Sort: Fastest Lap' },
    { value: 'track_asc', label: 'Sort: Track (A-Z)' }
  ], []);

  // Filtered & Sorted Sessions
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allSessions
      .filter(s => {
        if (filterTrack !== 'all' && s.trackName !== filterTrack) return false;
        if (filterDriver !== 'all' && s.playerName !== filterDriver) return false;
        if (filterCar !== 'all' && s.carName !== filterCar) return false;

        if (q) {
          const matchTrack = s.trackName.toLowerCase().includes(q);
          const matchDriver = s.playerName.toLowerCase().includes(q);
          const matchCar = s.carName.toLowerCase().includes(q);
          if (!matchTrack && !matchDriver && !matchCar) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.startTime || 0) - new Date(a.startTime || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.startTime || 0) - new Date(b.startTime || 0);
        }
        if (sortBy === 'fastest') {
          return (a.bestTime || Infinity) - (b.bestTime || Infinity);
        }
        if (sortBy === 'track_asc') {
          return a.trackName.localeCompare(b.trackName);
        }
        return 0;
      });
  }, [allSessions, searchQuery, filterTrack, filterDriver, filterCar, sortBy]);

  // Derive active session ID: user-selected, or matched to current selectedLap, or first filtered item
  const activeSessionId = useMemo(() => {
    if (userSelectedSessionId && filteredSessions.some(s => s.id === userSelectedSessionId)) {
      return userSelectedSessionId;
    }
    if (selectedLap) {
      const match = filteredSessions.find(s => s.laps.some(l => l.id === selectedLap.id));
      if (match) return match.id;
    }
    return filteredSessions[0]?.id || null;
  }, [userSelectedSessionId, filteredSessions, selectedLap]);

  // Active session object
  const activeSession = useMemo(() => {
    return allSessions.find(s => s.id === activeSessionId) || null;
  }, [allSessions, activeSessionId]);

  // Laps list of active session
  const activeSessionLaps = useMemo(() => {
    if (!activeSession) return [];
    let laps = activeSession.laps || [];
    if (!showOutlaps) {
      laps = laps.filter(l => l.lap_number > 0 && l.lap_time > 0);
    }
    return [...laps].sort((a, b) => a.lap_number - b.lap_number);
  }, [activeSession, showOutlaps]);

  // Handler: select lap
  const handleSelectLap = (lap, session) => {
    const sess = session || activeSession;
    if (!sess) return;

    setSelectedLap({
      ...lap,
      player_id: sess.playerId,
      track_name: sess.trackName,
      car_name: sess.carName
    });
    onClose();
  };

  // Handler: quick select best lap of a session
  const handleSelectBestLap = (session, e) => {
    if (e) e.stopPropagation();
    if (!session?.bestLap) return;
    handleSelectLap(session.bestLap, session);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterTrack('all');
    setFilterDriver('all');
    setFilterCar('all');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Track & Session"
      description="Browse recorded telemetry sessions and select a lap to analyze."
      size="full"
      fill
      scrollable={false}
    >
      <div className="flex flex-col gap-3 h-full w-full min-h-0 min-w-0 overflow-hidden">
        
        {/* Top Filter & Search Toolbar */}
        <div className="shrink-0 flex flex-col gap-2 p-3 bg-brand-bg-deep/40 rounded-xl border border-brand-10/10">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="flex-1 min-w-[200px]">
              <Input
                size="sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search track, driver, car..."
                icon={Search}
              />
            </div>

            {/* Track Filter */}
            <div className="w-[175px] flex-none">
              <Select
                size="sm"
                value={filterTrack}
                onChange={setFilterTrack}
                options={trackSelectOptions}
              />
            </div>

            {/* Driver Filter */}
            <div className="w-[160px] flex-none">
              <Select
                size="sm"
                value={filterDriver}
                onChange={setFilterDriver}
                options={driverSelectOptions}
              />
            </div>

            {/* Car Filter */}
            <div className="w-[160px] flex-none">
              <Select
                size="sm"
                value={filterCar}
                onChange={setFilterCar}
                options={carSelectOptions}
              />
            </div>

            {/* Sort Filter */}
            <div className="w-[155px] flex-none">
              <Select
                size="sm"
                value={sortBy}
                onChange={setSortBy}
                options={sortSelectOptions}
              />
            </div>

            {/* Show Outlaps Switch */}
            <div className="flex items-center ml-auto">
              <Checkbox
                checked={showOutlaps}
                onChange={(checked) => setShowOutlaps(checked)}
                label={<span className="text-xs text-brand-10/70 select-none">Outlaps</span>}
              />
            </div>

            {(searchQuery || filterTrack !== 'all' || filterDriver !== 'all' || filterCar !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                leftIcon={<FilterX size={13} />}
                className="text-xs h-7 text-brand-10/50 hover:text-brand-10"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP VIEW (Master-Detail Side-by-Side Tables)                          */}
        {/* ========================================================================= */}
        <div className="hidden md:flex flex-row gap-3 flex-1 min-h-0 min-w-0 overflow-hidden">
          
          {/* Left Column: Sessions Master Table */}
          <div className="w-1/2 min-w-0 min-h-0 flex flex-col rounded-xl border border-brand-10/10 bg-brand-bg-deep/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-brand-10/10 flex items-center justify-between flex-none bg-black/20 shrink-0">
              <span className="text-xs font-bold text-brand-10/80 uppercase tracking-wider">
                Recorded Sessions
              </span>
              <span className="text-[10px] font-mono text-brand-10/50 flex-none">
                {filteredSessions.length} Sessions
              </span>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-xs text-brand-10/40">
                  No matching sessions found. Try adjusting your search or filters.
                </div>
              ) : (
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-brand-bg-deep border-b border-brand-10/10 text-[10px] font-mono text-brand-10/40 uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-2 px-3 w-[30%]">Track</th>
                      <th className="py-2 px-2 w-[26%]">Driver / Car</th>
                      <th className="py-2 px-2 w-[16%]">Date</th>
                      <th className="py-2 px-2 w-[8%] text-center">Laps</th>
                      <th className="py-2 px-2 w-[11%] text-right">Best Lap</th>
                      <th className="py-2 px-3 w-[9%] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-10/5">
                    {filteredSessions.map(session => {
                      const isActive = session.id === activeSessionId;
                      const hasCurrentLap = selectedLap && session.laps.some(l => l.id === selectedLap.id);

                      return (
                        <tr
                          key={session.id}
                          onClick={() => setUserSelectedSessionId(session.id)}
                          className={`cursor-pointer transition-colors border-l-2 ${
                            isActive 
                              ? 'bg-brand-30/20 text-brand-10 font-medium border-brand-30' 
                              : 'border-transparent hover:bg-brand-10/5 text-brand-10/80'
                          }`}
                        >
                          <td className="py-2.5 px-3 min-w-0 truncate">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <MapPin size={13} className={isActive ? 'text-brand-30 shrink-0' : 'text-brand-10/40 shrink-0'} />
                              <span className="truncate font-semibold text-brand-10 text-xs" title={session.trackName}>
                                {session.trackName}
                              </span>
                              {hasCurrentLap && (
                                <Badge color="brand" size="sm" className="text-[9px] py-0 px-1 font-mono shrink-0">
                                  ACTIVE
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 min-w-0 truncate">
                            <div className="flex flex-col min-w-0 truncate">
                              <span className="truncate font-medium text-xs text-brand-10/90" title={session.playerName}>
                                {session.playerName}
                              </span>
                              <span className="truncate text-[10px] text-brand-10/50 font-mono" title={session.carName}>
                                {session.carName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] text-brand-10/60 whitespace-nowrap truncate">
                            {session.date}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-xs text-brand-10/70 whitespace-nowrap">
                            {session.validLapsCount}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-xs whitespace-nowrap">
                            {session.bestTime ? (
                              <span className="text-purple-300">
                                {formatLapTime(session.bestTime)}
                              </span>
                            ) : (
                              <span className="text-brand-10/30">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {session.bestLap && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={(e) => handleSelectBestLap(session, e)}
                                leftIcon={<Zap size={11} className="text-amber-400" />}
                                title="Load fastest lap directly"
                                className="text-[10px] h-6 px-2 py-0 text-brand-10/70 hover:text-brand-10 border border-brand-10/10 hover:border-brand-30/40"
                              >
                                Best
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Laps Detail Table */}
          <div className="w-1/2 min-w-0 min-h-0 flex flex-col rounded-xl border border-brand-10/10 bg-brand-bg-deep/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-brand-10/10 flex items-center justify-between flex-none bg-black/20 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs font-bold text-brand-10/80 uppercase tracking-wider">
                  Laps in Session
                </span>
                {activeSession && (
                  <span className="text-[11px] text-brand-30 font-medium truncate">
                    ({activeSession.trackName})
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-brand-10/50 flex-none">
                {activeSessionLaps.length} Laps
              </span>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain">
              {!activeSession ? (
                <div className="p-8 text-center text-xs text-brand-10/40">
                  Select a session from the table to view its laps.
                </div>
              ) : activeSessionLaps.length === 0 ? (
                <div className="p-8 text-center text-xs text-brand-10/40">
                  No valid laps recorded in this session.
                </div>
              ) : (
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-brand-bg-deep border-b border-brand-10/10 text-[10px] font-mono text-brand-10/40 uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-2 px-3 w-[22%]">Lap</th>
                      <th className="py-2 px-2 w-[20%] text-right">Time</th>
                      <th className="py-2 px-2 w-[18%] text-right">Delta</th>
                      <th className="py-2 px-2 w-[24%] text-center">Sectors</th>
                      <th className="py-2 px-3 w-[16%] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-10/5">
                    {activeSessionLaps.map(lap => {
                      const isSelected = selectedLap?.id === lap.id;
                      const isBest = activeSession.bestLap?.id === lap.id;
                      const isOutlap = lap.lap_number === 0 || lap.lap_time <= 0;
                      const delta = activeSession.bestTime && lap.lap_time > 0 
                        ? (lap.lap_time - activeSession.bestTime) 
                        : null;

                      return (
                        <tr
                          key={lap.id}
                          onClick={() => handleSelectLap(lap, activeSession)}
                          className={`cursor-pointer transition-colors border-l-2 ${
                            isSelected
                              ? 'bg-brand-30/20 text-brand-10 font-bold border-brand-30'
                              : isOutlap
                              ? 'border-transparent text-brand-10/40 hover:bg-brand-10/5'
                              : 'border-transparent hover:bg-brand-10/5 text-brand-10/90'
                          }`}
                        >
                          <td className="py-2.5 px-3 min-w-0 truncate">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="font-semibold text-xs truncate">
                                {lap.lap_number === 0 ? 'Outlap' : `Lap ${lap.lap_number}`}
                              </span>
                              {isBest && (
                                <Badge color="purple" active size="sm" className="text-[9px] py-0 px-1 font-mono shrink-0">
                                  BEST
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-xs whitespace-nowrap">
                            <span className={isBest ? 'text-purple-300' : 'text-brand-10'}>
                              {formatLapTime(lap.lap_time)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[11px] whitespace-nowrap">
                            {isOutlap ? (
                              <span className="text-brand-10/30">—</span>
                            ) : isBest ? (
                              <span className="text-purple-400 font-bold">0.00s</span>
                            ) : delta !== null ? (
                              <span className="text-amber-400">+{delta.toFixed(2)}s</span>
                            ) : (
                              <span className="text-brand-10/30">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {lap.sectors && lap.sectors.length > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                {lap.sectors.slice(0, 3).map((s, idx) => (
                                  <span 
                                    key={s.id || idx} 
                                    className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-brand-10/60"
                                    title={`Sector ${s.sector_number}: ${typeof s.sector_time === 'number' ? s.sector_time.toFixed(2) : '—'}s`}
                                  >
                                    {typeof s.sector_time === 'number' ? s.sector_time.toFixed(1) : '—'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-brand-10/30 font-mono">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-brand-30 font-bold px-2 py-0.5 rounded bg-brand-30/15">
                                <Check size={11} /> Loaded
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectLap(lap, activeSession);
                                }}
                                className="text-[10px] h-6 px-2 py-0 text-brand-10/70 hover:text-brand-10 border border-brand-10/10 hover:border-brand-30/40"
                              >
                                Select
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE VIEW (2-Step Drill-Down Flow)                                      */}
        {/* ========================================================================= */}
        <div className="md:hidden flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-brand-10/10 bg-brand-bg-deep/30">
          
          {/* Step 1: Sessions Card List */}
          {mobileStep === 'sessions' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-3 py-2 border-b border-brand-10/10 flex items-center justify-between flex-none bg-black/20">
                <span className="text-xs font-bold text-brand-10/80 uppercase tracking-wider">
                  Sessions ({filteredSessions.length})
                </span>
                <span className="text-[10px] text-brand-10/40">Tap session to see laps</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2 custom-scrollbar overscroll-contain">
                {filteredSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-brand-10/40">
                    No matching sessions found.
                  </div>
                ) : (
                  filteredSessions.map(session => {
                    const hasCurrentLap = selectedLap && session.laps.some(l => l.id === selectedLap.id);

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setUserSelectedSessionId(session.id);
                          setMobileStep('laps');
                        }}
                        className="p-3 rounded-lg border border-brand-10/10 bg-black/30 hover:bg-black/50 transition-colors flex flex-col gap-1.5 cursor-pointer active:scale-[0.99]"
                      >
                        {/* Line 1: Track & Best Lap */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={13} className="text-brand-30 flex-none" />
                            <span className="font-bold text-xs text-brand-10 truncate">{session.trackName}</span>
                            {hasCurrentLap && (
                              <Badge color="brand" size="sm" className="text-[9px] py-0 px-1">ACTIVE</Badge>
                            )}
                          </div>
                          {session.bestTime && (
                            <span className="font-mono font-bold text-xs text-purple-300 flex-none">
                              {formatLapTime(session.bestTime)} ★
                            </span>
                          )}
                        </div>

                        {/* Line 2: Driver, Car, Date */}
                        <div className="flex items-center justify-between text-[11px] text-brand-10/60 truncate">
                          <span className="truncate">{session.playerName} · {session.carName}</span>
                          <span className="font-mono text-[10px] text-brand-10/40 flex-none ml-2">{session.date}</span>
                        </div>

                        {/* Line 3: Actions & Lap Count */}
                        <div className="flex items-center justify-between pt-1 border-t border-brand-10/5">
                          <span className="text-[10px] font-mono text-brand-10/50">
                            {session.validLapsCount} recorded laps
                          </span>
                          <div className="flex items-center gap-1.5">
                            {session.bestLap && (
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={(e) => handleSelectBestLap(session, e)}
                                leftIcon={<Zap size={11} className="text-amber-400" />}
                                className="text-[10px] h-6 px-2"
                              >
                                Best
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="xs"
                              rightIcon={<ChevronRight size={12} />}
                              className="text-[10px] h-6 px-2 text-brand-30"
                            >
                              Laps
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Step 2: Laps List for Selected Session */}
          {mobileStep === 'laps' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Header with Back Button */}
              <div className="px-3 py-2 border-b border-brand-10/10 flex items-center justify-between flex-none bg-black/30">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setMobileStep('sessions')}
                  leftIcon={<ArrowLeft size={13} />}
                  className="text-xs h-7 px-2 text-brand-10/80 hover:text-brand-10"
                >
                  Sessions
                </Button>
                {activeSession && (
                  <span className="text-xs font-bold text-brand-10 truncate px-2">
                    {activeSession.trackName}
                  </span>
                )}
                <span className="text-[10px] font-mono text-brand-10/50 flex-none">
                  {activeSessionLaps.length} Laps
                </span>
              </div>

              {/* Laps List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar overscroll-contain">
                {activeSessionLaps.length === 0 ? (
                  <div className="p-6 text-center text-xs text-brand-10/40">
                    No laps in this session.
                  </div>
                ) : (
                  activeSessionLaps.map(lap => {
                    const isSelected = selectedLap?.id === lap.id;
                    const isBest = activeSession?.bestLap?.id === lap.id;
                    const isOutlap = lap.lap_number === 0 || lap.lap_time <= 0;
                    const delta = activeSession?.bestTime && lap.lap_time > 0 
                      ? (lap.lap_time - activeSession.bestTime) 
                      : null;

                    return (
                      <div
                        key={lap.id}
                        onClick={() => handleSelectLap(lap, activeSession)}
                        className={`p-2.5 rounded-lg border transition-colors flex flex-col gap-1 cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? 'bg-brand-30/20 border-brand-30/60 text-brand-10'
                            : 'bg-black/30 border-brand-10/10 hover:bg-black/50 text-brand-10/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs">
                              {lap.lap_number === 0 ? 'Outlap' : `Lap ${lap.lap_number}`}
                            </span>
                            {isBest && (
                              <Badge color="purple" active size="sm" className="text-[9px] py-0 px-1 font-mono">
                                BEST
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-xs ${isBest ? 'text-purple-300' : 'text-brand-10'}`}>
                              {formatLapTime(lap.lap_time)}
                            </span>
                            {!isOutlap && delta !== null && delta > 0 && (
                              <span className="text-[10px] font-mono text-amber-400">
                                +{delta.toFixed(2)}s
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sectors micro-bar */}
                        {lap.sectors && lap.sectors.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-brand-10/50">
                            {lap.sectors.slice(0, 3).map((s, idx) => (
                              <span key={s.id || idx} className="bg-black/40 px-1 py-0.5 rounded">
                                S{s.sector_number}: {s.sector_time.toFixed(2)}s
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
