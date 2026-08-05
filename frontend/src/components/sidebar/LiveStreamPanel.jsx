import React from 'react';
import { useLiveStore } from '../../store/useLiveStore';

export const LiveStreamPanel = () => {
  const liveLapData = useLiveStore(state => state.liveLapData);
  const isStreaming = useLiveStore(state => state.isStreaming);
  const latestPoint = liveLapData[liveLapData.length - 1];

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0 p-5">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/60 font-bold m-0">Live Stream</h2>
        {isStreaming ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            LIVE
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-60 border border-brand-60 text-brand-10/60 text-xs font-medium">
            OFFLINE
          </span>
        )}
      </div>

      <div className="bg-brand-bg border border-brand-60 rounded-xl flex flex-col gap-3 p-4">
        <div className="text-xs text-brand-10/60 flex justify-between items-center">
          <span>Collector Status</span>
          <span className={`font-semibold flex items-center gap-1.5 ${isStreaming ? 'text-green-400' : 'text-brand-10/40'}`}>
            {isStreaming ? '🟢 iRacing Streaming' : '⚪ Waiting for iRacing...'}
          </span>
        </div>
        <div className="text-xs text-brand-10/60 flex justify-between items-center">
          <span>Buffered Points</span>
          <span className="font-mono text-brand-10 font-bold">{liveLapData.length}</span>
        </div>
        {isStreaming && latestPoint && (
          <>
            <div className="text-xs text-brand-10/60 flex justify-between items-center">
              <span>Live Speed</span>
              <span className="font-mono text-red-400 font-bold">{latestPoint.speed?.toFixed(1)} km/h</span>
            </div>
            <div className="text-xs text-brand-10/60 flex justify-between items-center">
              <span>Track Position</span>
              <span className="font-mono text-brand-30/80 font-bold">{((latestPoint.lap_dist_pct || 0) * 100).toFixed(1)}%</span>
            </div>
          </>
        )}
      </div>

      {!isStreaming && (
        <div className="text-xs text-amber-400/90 leading-relaxed bg-amber-500/10 rounded-xl border border-amber-500/20 p-4">
          ⚠️ <strong>iRacing isn't running or collector is idle.</strong><br/>
          Start iRacing live collector script (<code>run.bat</code> or <code>dev/run_dev.bat</code>) to view live telemetry stream.
        </div>
      )}
    </div>
  );
};
