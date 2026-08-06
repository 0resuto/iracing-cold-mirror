import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useLiveStore } from '../store/useLiveStore';
import { useAppStore } from '../store/useAppStore';

const THEME = {
  grid: 'rgba(255, 255, 255, 0.15)',
  text: '#a1a1aa',
  speed: '#EF4444',
  throttle: '#10B981',
  brake: '#EF4444',
  steering: '#eaeaea',
};

export const LiveTelemetryChart = React.memo(function LiveTelemetryChart() {
  const speedContainerRef = useRef(null);
  const inputsContainerRef = useRef(null);
  
  const isStreaming = useLiveStore(state => state.isStreaming);
  const isEmpty = useLiveStore(state => state.liveLapData.length === 0);
  
  const speedPlotRef = useRef(null);
  const inputsPlotRef = useRef(null);

  // Initialize uPlot instances once when the containers mount
  useEffect(() => {
    if (!speedContainerRef.current || !inputsContainerRef.current) return;

    const getSize = (el) => ({
      width: el.clientWidth,
      height: el.clientHeight,
    });

    const commonOpts = {
      legend: { show: false },
      cursor: { show: false },
      axes: [
        { show: false }, // X axis hidden
      ]
    };

    const speedOpts = {
      ...commonOpts,
      ...getSize(speedContainerRef.current),
      scales: {
        x: { time: false },
        y: { auto: true, range: (u, min, max) => {
          if (max == null) max = 0;
          return [0, Math.max(50, Math.ceil(max * 1.1 / 10) * 10)];
        }}
      },
      axes: [
        { show: false },
        { stroke: THEME.text, grid: { stroke: THEME.grid, dash: [3, 3] }, size: 35, font: "9px Inter" }
      ],
      series: [
        {}, // X
        { stroke: THEME.speed, width: 2 }
      ]
    };

    const inputsOpts = {
      ...commonOpts,
      ...getSize(inputsContainerRef.current),
      scales: {
        x: { time: false },
        pedals: { range: [0, 1] },
        steering: { range: [-180, 180] } // Default, updated dynamically later
      },
      axes: [
        { show: false },
        { scale: 'pedals', stroke: THEME.text, grid: { stroke: THEME.grid, dash: [3, 3] }, size: 35, font: "9px Inter", values: (u, vals) => vals.map(v => (v*100).toFixed(0)) },
        { scale: 'steering', side: 1, stroke: THEME.steering, grid: { show: false }, size: 35, font: "9px Inter" }
      ],
      series: [
        {}, // X
        { scale: 'pedals', stroke: THEME.throttle, fill: 'rgba(16, 185, 129, 0.15)', width: 1.5 }, // Throttle
        { scale: 'pedals', stroke: THEME.brake, fill: 'rgba(239, 68, 68, 0.25)', width: 1.5 }, // Brake
        { scale: 'steering', stroke: THEME.steering, width: 1.5 } // Steering
      ]
    };

    const speedPlot = new uPlot(speedOpts, [[], []], speedContainerRef.current);
    const inputsPlot = new uPlot(inputsOpts, [[], [], [], []], inputsContainerRef.current);

    speedPlotRef.current = speedPlot;
    inputsPlotRef.current = inputsPlot;

    // Handle resize
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === speedContainerRef.current && speedPlotRef.current) {
          speedPlotRef.current.setSize(getSize(speedContainerRef.current));
        } else if (entry.target === inputsContainerRef.current && inputsPlotRef.current) {
          inputsPlotRef.current.setSize(getSize(inputsContainerRef.current));
        }
      }
    });
    
    ro.observe(speedContainerRef.current);
    ro.observe(inputsContainerRef.current);

    return () => {
      ro.disconnect();
      if (speedPlotRef.current) speedPlotRef.current.destroy();
      if (inputsPlotRef.current) inputsPlotRef.current.destroy();
      speedPlotRef.current = null;
      inputsPlotRef.current = null;
    };
  }, [isEmpty]); // Re-run initialization when we switch from empty to having data

  // Direct subscription to Zustand to bypass React renders for 30Hz updates
  useEffect(() => {
    let animationFrameId;

    const draw = (state) => {
      const liveLapData = state.liveLapData;
      if (!speedPlotRef.current || !inputsPlotRef.current || !liveLapData || liveLapData.length === 0) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      animationFrameId = requestAnimationFrame(() => {
        const len = liveLapData.length;
        const time = new Array(len);
        const speed = new Array(len);
        const thr = new Array(len);
        const brk = new Array(len);
        const str = new Array(len);

        for (let i = 0; i < len; i++) {
          const d = liveLapData[i];
          time[i] = d.session_time !== undefined ? d.session_time : i;
          speed[i] = d.speed || 0;
          thr[i] = d.throttle || 0;
          brk[i] = d.brake || 0;
          str[i] = d.wheel_angle_deg || 0;
        }

        // Dynamically update steering scale from AppStore
        const maxStr = useAppStore.getState().steeringMax;
        inputsPlotRef.current.setScale('steering', { min: -maxStr, max: maxStr });

        speedPlotRef.current.setData([time, speed]);
        inputsPlotRef.current.setData([time, thr, brk, str]);
      });
    };

    const unsubscribe = useLiveStore.subscribe(draw);
    // Manually trigger first draw
    draw(useLiveStore.getState());

    return () => {
      unsubscribe();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isEmpty]);

  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-bg h-full">
        <p className="text-brand-10/40 font-mono text-xs tracking-widest animate-pulse">
          {isStreaming ? "WAITING FOR LIVE DATA..." : "LIVE TELEMETRY DISCONNECTED"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-bg p-2 sm:p-4 min-w-0">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-brand-60 flex-none gap-2">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/80 font-extrabold m-0 flex-none flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
          Live Dashboard
        </h2>
      </div>

      <div className="w-full flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        
        {/* Speed Chart */}
        <div className="flex-1 min-h-[150px] flex flex-col relative group min-w-0">
          <div className="absolute left-10 top-0 text-[9px] text-[#a1a1aa] font-bold tracking-widest z-10 pointer-events-none">SPEED (km/h)</div>
          <div className="flex-1 mt-3" ref={speedContainerRef} />
        </div>

        {/* Combined Inputs Chart */}
        <div className="flex-[2] min-h-[220px] flex flex-col relative group min-w-0">
          <div className="absolute left-10 top-0 text-[9px] text-[#a1a1aa] font-bold tracking-widest z-10 flex gap-4 pointer-events-none">
            <span>INPUTS</span>
            <span className="text-green-500">THR</span>
            <span className="text-red-500">BRK</span>
            <span className="text-brand-10">STR</span>
          </div>
          <div className="flex-1 mt-3" ref={inputsContainerRef} />
        </div>

      </div>
    </div>
  );
});
