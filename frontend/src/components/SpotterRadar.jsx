import React, { useEffect, useState, useMemo } from 'react';
import { useLiveStore } from '../store/useLiveStore';
import { ShieldAlert } from 'lucide-react';

const intToHexColor = (colorInt) => {
  if (colorInt === undefined || colorInt === null) return '#444444';
  const hex = colorInt.toString(16).padStart(6, '0');
  return `#${hex}`;
};

export const SpotterRadar = () => {
  const [radarState, setRadarState] = useState({
    opponents: [],
    spotterFlags: 0,
    hasLiveTelemetry: false
  });

  // Track max delta for visibility (0.015 is roughly 75m on a 5000m track)
  const MAX_DELTA = 0.015;

  useEffect(() => {
    let lastUpdateTime = 0;
    
    const unsubscribe = useLiveStore.subscribe((state) => {
      const now = performance.now();
      // 30Hz update rate (33ms) for super smooth vertical motion
      if (now - lastUpdateTime < 33) return;
      lastUpdateTime = now;

      const latestData = state.liveLapData[state.liveLapData.length - 1];
      if (!latestData) return;

      const grid = latestData.grid || {};
      const sessionDrivers = state.sessionDrivers || [];
      const spotterFlags = latestData.car_left_right || 0; // 0=Clear, 1=Left, 2=Right, 3=Both

      const playerName = latestData.player_name || '';
      const playerDriver = sessionDrivers.find(d => d.UserName === playerName);
      const playerIdx = playerDriver?.CarIdx;
      
      if (playerIdx === undefined || !grid[playerIdx]) {
        setRadarState(prev => ({ ...prev, hasLiveTelemetry: false }));
        return;
      }

      const playerPct = grid[playerIdx].LapDistPct || 0;
      const rawOpponents = [];

      for (const driver of sessionDrivers) {
        const idx = driver.CarIdx?.toString();
        if (idx == playerIdx) continue; // Skip player

        const gridData = grid[idx];
        if (gridData && gridData.TrackSurface > -1) {
          let oppPct = gridData.LapDistPct || 0;
          let delta = oppPct - playerPct;
          
          // Handle start/finish line wrap-around
          if (delta > 0.5) delta -= 1.0;
          if (delta < -0.5) delta += 1.0;

          // Only track cars within our radar vision
          if (Math.abs(delta) <= MAX_DELTA) {
            rawOpponents.push({
              id: driver.CarIdx,
              name: driver.CarScreenNameShort || driver.UserName,
              delta: delta,
              color: intToHexColor(driver.CarClassColor),
              pos: gridData.Position || 0,
              lane: 'center' // Default lane
            });
          }
        }
      }

      // Sort by absolute distance to figure out who is immediately next to us
      rawOpponents.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

      // Apply spotter flags to the closest cars
      // If someone is left/right, it's usually the closest car(s)
      let leftAssigned = false;
      let rightAssigned = false;

      if (spotterFlags === 1 || spotterFlags === 3) {
        // Find closest car and put them left
        if (rawOpponents.length > 0) {
          rawOpponents[0].lane = 'left';
          leftAssigned = true;
        }
      }
      if (spotterFlags === 2 || spotterFlags === 3) {
        // Find next closest car and put them right
        const targetIdx = leftAssigned && rawOpponents.length > 1 ? 1 : 0;
        if (rawOpponents.length > targetIdx) {
          rawOpponents[targetIdx].lane = 'right';
          rightAssigned = true;
        }
      }

      setRadarState({
        opponents: rawOpponents,
        spotterFlags,
        hasLiveTelemetry: true
      });
    });

    return () => unsubscribe();
  }, []);

  if (!radarState.hasLiveTelemetry) {
    return (
      <div className="w-48 h-full bg-brand-60/10 border border-brand-60 rounded-xl flex items-center justify-center flex-col text-brand-10/40 p-4 text-center">
        <ShieldAlert size={24} className="mb-2 opacity-50" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Radar Offline</span>
      </div>
    );
  }

  const { opponents, spotterFlags } = radarState;
  const isLeftDanger = spotterFlags === 1 || spotterFlags === 3;
  const isRightDanger = spotterFlags === 2 || spotterFlags === 3;

  return (
    <div className="w-48 h-full bg-brand-bg border border-brand-60 rounded-xl relative overflow-hidden flex flex-col shadow-2xl shrink-0">
      <div className="flex-none p-2 border-b border-brand-60/50 bg-brand-60/20 text-center z-10 backdrop-blur-md">
        <h3 className="text-[10px] uppercase tracking-widest text-brand-10/80 font-bold m-0 flex items-center justify-center gap-1.5">
          <ShieldAlert size={12} className={spotterFlags > 0 ? "text-red-500 animate-pulse" : "text-brand-30"} />
          Blind Spot
        </h3>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        {/* Radar Lanes Background */}
        <div className="absolute inset-0 flex">
          <div className={`flex-1 border-r border-brand-60/30 transition-colors duration-300 ${isLeftDanger ? 'bg-red-500/10' : ''}`} />
          <div className="flex-[1.5] border-r border-brand-60/30 bg-brand-60/5" />
          <div className={`flex-1 transition-colors duration-300 ${isRightDanger ? 'bg-red-500/10' : ''}`} />
        </div>
        
        {/* Distance Markers */}
        <div className="absolute top-1/4 left-0 right-0 border-t border-brand-60/20" />
        <div className="absolute top-3/4 left-0 right-0 border-t border-brand-60/20" />

        {/* Player Car (Fixed lower middle) */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.4)] z-50 flex items-center justify-center border-2 border-brand-30">
          <span className="text-black text-[9px] font-black transform -rotate-90">YOU</span>
        </div>

        {/* Opponent Cars */}
        {opponents.map(opp => {
          // Map delta to Y position (delta=0 -> bottom 25%, delta=MAX_DELTA -> top 0%, delta=-MAX_DELTA -> bottom 100%)
          // bottom-1/4 means player is at Y=75% of container height.
          const yPct = 75 - (opp.delta / MAX_DELTA) * 75;
          
          let laneLeft = '50%'; // Center
          if (opp.lane === 'left') laneLeft = '20%';
          if (opp.lane === 'right') laneLeft = '80%';

          return (
            <div
              key={opp.id}
              className={`absolute w-5 h-8 rounded-sm shadow-md flex items-center justify-center border border-black/50 transition-all duration-75 z-40 ${opp.lane !== 'center' ? 'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'opacity-80'}`}
              style={{
                top: `${Math.max(-10, Math.min(110, yPct))}%`,
                left: laneLeft,
                transform: 'translate(-50%, -50%)',
                backgroundColor: opp.color,
              }}
            >
              <div className="absolute -top-3 whitespace-nowrap text-[8px] font-bold text-brand-10/80 bg-brand-bg/80 px-1 rounded">
                P{opp.pos > 0 ? opp.pos : '-'}
              </div>
            </div>
          );
        })}
        
        {/* Danger Side Indicators */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-red-500 transition-opacity duration-200 ${isLeftDanger ? 'opacity-100 shadow-[0_0_15px_rgba(239,68,68,1)]' : 'opacity-0'}`} />
        <div className={`absolute right-0 top-0 bottom-0 w-1 bg-red-500 transition-opacity duration-200 ${isRightDanger ? 'opacity-100 shadow-[0_0_15px_rgba(239,68,68,1)]' : 'opacity-0'}`} />
      </div>
    </div>
  );
};
