import React from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
import { Checkbox } from '../Checkbox';

export const LiveStreamPanel = () => {
  const isStreaming = useLiveStore(state => state.isStreaming);
  const columns = useAppStore(state => state.standingsColumns);
  const toggleColumn = useAppStore(state => state.toggleStandingsColumn);
  const showClassName = useAppStore(state => state.showClassName);
  const toggleShowClassName = useAppStore(state => state.toggleShowClassName);
  const liveDeltaReferenceMode = useAppStore(state => state.liveDeltaReferenceMode);
  const setLiveDeltaReferenceMode = useAppStore(state => state.setLiveDeltaReferenceMode);

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
      </div>

      <div className="bg-brand-bg border border-brand-60 rounded-xl flex flex-col p-4">
        <h3 className="text-[10px] uppercase tracking-widest text-brand-10/60 font-bold mb-3">Delta Reference</h3>
        <select
          value={liveDeltaReferenceMode}
          onChange={(e) => setLiveDeltaReferenceMode(e.target.value)}
          aria-label="Delta Reference Mode"
          className="bg-brand-60/50 border border-brand-60 text-brand-10 text-xs rounded-lg px-3 py-2 outline-none hover:border-brand-30/50 cursor-pointer transition-colors w-full"
        >
          <option value="sessionBest">Session Best (SB)</option>
          <option value="personalBest">Personal Best (PB)</option>
          <option value="optimal">Optimal Lap (OPT)</option>
          <option value="sessionOptimal">Session Optimal (S-OPT)</option>
          <option value="lastLap">Last Lap (LAST)</option>
          <option value="allTimeBest">All-Time Best (ATB)</option>
          <option value="allTimeOptimal">All-Time Optimal (AT-OPT)</option>
        </select>
        <span className="text-[10px] text-brand-10/40 mt-2">
          Target lap used by LiveDelta widget for realtime delta calculations.
        </span>
      </div>

      <div className="bg-brand-bg border border-brand-60 rounded-xl flex flex-col p-4">
        <h3 className="text-[10px] uppercase tracking-widest text-brand-10/60 font-bold mb-3">Standings Columns</h3>
        <div className="flex flex-col gap-2.5">
          {Object.entries({
            pos: 'Position',
            driver: 'Driver Name & License',
            carName: 'Car Model Name',
            carClass: 'Car Class',
            srating: 'Safety Rating',
            irating: 'iRating',
            lastLap: 'Last Lap Time',
            trackPct: 'Track Progress %',
          }).map(([key, label]) => (
            <Checkbox
              key={key}
              label={label}
              checked={columns[key]}
              onChange={() => toggleColumn(key)}
            />
          ))}
          <div className="border-t border-brand-60 pt-2.5 mt-1">
            <Checkbox
              label="Show Class Name in Standings"
              checked={showClassName}
              onChange={toggleShowClassName}
            />
          </div>
        </div>
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
