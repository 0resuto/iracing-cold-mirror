import React, { useMemo } from 'react';
import { useLiveStore } from '../../store/useLiveStore';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Checkbox, Select, SidebarCard } from '@0resuto/ui-kit';
import { Radio, Sliders, Layers } from 'lucide-react';

export const LiveStreamPanel = () => {
  const isStreaming = useLiveStore(state => state.isStreaming);
  const columns = useAppStore(state => state.standingsColumns);
  const toggleColumn = useAppStore(state => state.toggleStandingsColumn);
  const showClassName = useAppStore(state => state.showClassName);
  const toggleShowClassName = useAppStore(state => state.toggleShowClassName);
  const liveDeltaReferenceMode = useAppStore(state => state.liveDeltaReferenceMode);
  const setLiveDeltaReferenceMode = useAppStore(state => state.setLiveDeltaReferenceMode);

  const deltaOptions = useMemo(() => [
    { value: 'sessionBest', label: 'Session Best (SB)' },
    { value: 'personalBest', label: 'Personal Best (PB)' },
    { value: 'optimal', label: 'Optimal Lap (OPT)' },
    { value: 'sessionOptimal', label: 'Session Optimal (S-OPT)' },
    { value: 'lastLap', label: 'Last Lap (LAST)' },
    { value: 'allTimeBest', label: 'All-Time Best (ATB)' },
    { value: 'allTimeOptimal', label: 'All-Time Optimal (AT-OPT)' },
  ], []);

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0 p-5">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/60 font-bold m-0">Live Stream</h2>
        {isStreaming ? (
          <Badge color="red" beacon active>
            LIVE
          </Badge>
        ) : (
          <Badge color="neutral" active={false}>
            OFFLINE
          </Badge>
        )}
      </div>

      <SidebarCard title="Collector Status" icon={Radio}>
        <div className="text-xs text-brand-10/80 flex justify-between items-center">
          <span>iRacing Service</span>
          <span className={`font-semibold flex items-center gap-1.5 ${isStreaming ? 'text-emerald-400' : 'text-brand-10/40'}`}>
            {isStreaming ? '🟢 Streaming Data' : '⚪ Waiting for iRacing...'}
          </span>
        </div>
      </SidebarCard>

      <SidebarCard title="Delta Reference" icon={Sliders}>
        <Select
          size="md"
          value={liveDeltaReferenceMode}
          onChange={setLiveDeltaReferenceMode}
          options={deltaOptions}
        />
        <span className="text-[10px] text-brand-10/40 leading-tight block">
          Target lap used by LiveDelta widget for realtime delta calculations.
        </span>
      </SidebarCard>

      <SidebarCard title="Standings Columns" icon={Layers}>
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
          <div className="border-t border-brand-10/10 pt-2.5 mt-1">
            <Checkbox
              label="Show Class Name in Standings"
              checked={showClassName}
              onChange={toggleShowClassName}
            />
          </div>
        </div>
      </SidebarCard>

      {!isStreaming && (
        <div className="text-xs text-amber-400/90 leading-relaxed bg-amber-500/10 rounded-xl border border-amber-500/20 p-4">
          ⚠️ <strong>iRacing isn't running or collector is idle.</strong><br/>
          Start iRacing live collector script (<code>run.bat</code> or <code>dev/run_dev.bat</code>) to view live telemetry stream.
        </div>
      )}
    </div>
  );
};
