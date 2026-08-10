import React, { useEffect, useState, useRef } from 'react';
import { useLiveStore } from '../store/useLiveStore';
import { Flag, Navigation2 } from 'lucide-react';

// Helper to convert iRacing decimal color to hex
const intToHexColor = (colorInt) => {
  if (colorInt === undefined || colorInt === null) return '#444444';
  const hex = colorInt.toString(16).padStart(6, '0');
  return `#${hex}`;
};

// Calculate relative luminance to determine if text should be black or white
const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return '#ffffff';
  hexcolor = hexcolor.replace('#', '');
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#18181b' : '#ffffff';
};

export const LiveRadar = () => {
  const [positions, setPositions] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    let lastUpdateTime = 0;
    
    // Subscribe to live store to get high-frequency updates without re-rendering parent
    const unsubscribe = useLiveStore.subscribe((state) => {
      const now = performance.now();
      // Update radar at ~15Hz (66ms) for smooth but efficient animation
      if (now - lastUpdateTime < 66) return;
      lastUpdateTime = now;

      const latestData = state.liveLapData[state.liveLapData.length - 1];
      const grid = latestData?.grid || {};
      const sessionDrivers = state.sessionDrivers || [];

      if (Object.keys(grid).length === 0 || sessionDrivers.length === 0) return;

      const activeDrivers = [];
      const playerName = latestData.player_name || '';
      const playerIdx = sessionDrivers.find(d => d.UserName === playerName)?.CarIdx;

      for (const driver of sessionDrivers) {
        const idx = driver.CarIdx?.toString();
        const gridData = grid[idx];
        
        if (gridData && gridData.TrackSurface > -1) {
          activeDrivers.push({
            id: driver.CarIdx,
            name: driver.CarScreenNameShort || driver.UserName,
            pct: gridData.LapDistPct || 0,
            pos: gridData.Position || 0,
            color: intToHexColor(driver.CarClassColor),
            isPlayer: idx == playerIdx
          });
        }
      }

      setPositions(activeDrivers);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full flex flex-col mb-4 bg-brand-60/20 border border-brand-60 rounded-xl p-3 shadow-inner relative overflow-hidden z-0">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[10px] uppercase tracking-widest text-brand-10/60 font-bold m-0 flex items-center gap-1.5">
          <Navigation2 size={12} className="text-brand-30" />
          Track Radar
        </h3>
        <div className="text-[9px] text-brand-10/40 font-mono tracking-widest uppercase">
          0% - 100%
        </div>
      </div>

      {/* Radar Track Bar */}
      <div 
        ref={containerRef}
        className="relative h-4 w-full bg-brand-bg rounded-full border border-brand-60/50"
      >
        {/* Start/Finish Line */}
        <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white/40 z-0"></div>
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/10 z-0 border-r border-dashed border-white/20"></div>

        {/* Driver Dots */}
        {positions.map((d) => (
          <div
            key={d.id}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full z-10 transition-all duration-75 group cursor-pointer shadow-md flex items-center justify-center font-bold text-[8px] ${d.isPlayer ? 'w-5 h-5 border-[2.5px] border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'w-3.5 h-3.5 border border-black/40 hover:scale-125'}`}
            style={{ 
              left: `${d.pct * 100}%`,
              backgroundColor: d.color,
              color: getContrastYIQ(d.color),
              zIndex: d.isPlayer ? 50 : Math.max(10, 100 - d.pos)
            }}
          >
            {!d.isPlayer && d.pos > 0 && d.pos}
            {d.isPlayer && d.pos > 0 && <span className="text-[10px]">{d.pos}</span>}

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div className="bg-brand-60 border border-brand-30/40 text-brand-10 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1.5">
                <span className="text-brand-10/60 font-mono">P{d.pos > 0 ? d.pos : '-'}</span>
                <span>{d.name}</span>
                {d.isPlayer && <span className="text-[8px] bg-accent-blue px-1 py-0.5 rounded text-white leading-none">YOU</span>}
              </div>
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-brand-60"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
