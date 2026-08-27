import React from 'react';
import { useSystemInfoQuery } from '../../api/queries';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Checkbox, SidebarCard, StatPill } from '@0resuto/ui-kit';
import { Sliders, Server, Database, BarChart3, Users, Layers, Activity } from 'lucide-react';

export const SystemPanel = () => {
  const { data: systemInfo, isLoading, isError } = useSystemInfoQuery();
  const showOutlaps = useAppStore(state => state.showOutlaps);
  const toggleShowOutlaps = useAppStore(state => state.toggleShowOutlaps);

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0 p-5">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/60 font-bold m-0">System Parameters</h2>
        <Badge color="brand">v0.2.0</Badge>
      </div>

      {/* Display Preferences Card */}
      <SidebarCard title="Display Preferences" icon={Sliders}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex flex-col pr-2">
            <span className="text-brand-10/90 font-semibold">Show Outlaps</span>
            <span className="text-[10px] text-brand-10/40 leading-tight">Display outlap (lap 0) and incomplete laps</span>
          </div>
          <Checkbox
            checked={showOutlaps}
            onChange={toggleShowOutlaps}
          />
        </div>
      </SidebarCard>

      {isLoading ? (
        <div className="text-xs text-brand-10/40 animate-pulse">Loading system statistics...</div>
      ) : isError || !systemInfo ? (
        <div className="text-xs text-red-500">Failed to connect to server</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Server Connection Card */}
          <SidebarCard title="Server Infrastructure" icon={Server}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-10/70">Backend API</span>
              <Badge color="green" beacon active>Online</Badge>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-brand-10/10">
              <span className="text-brand-10/70">API Key Security</span>
              <Badge color={systemInfo.auth_enabled ? 'green' : 'yellow'} active>
                {systemInfo.auth_enabled ? '🔒 Active' : '🔓 Dev Mode'}
              </Badge>
            </div>
          </SidebarCard>

          {/* Last Uploaded Session Card */}
          <SidebarCard title="Last Session Upload" icon={Database}>
            {systemInfo.last_upload ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-brand-10/60 flex-none">Track</span>
                  <span className="font-bold text-brand-10 truncate">{systemInfo.last_upload.track_name}</span>
                </div>
                {systemInfo.last_upload.created_at && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-brand-10/60 flex-none">Uploaded</span>
                    <span className="text-brand-10/80 font-mono text-xs truncate">
                      {new Date(systemInfo.last_upload.created_at).toLocaleDateString()} {new Date(systemInfo.last_upload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-brand-10/60 flex-none">Driver</span>
                  <span className="text-brand-10/90 font-bold truncate">{systemInfo.last_upload.player_name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-brand-10/60 flex-none">Laps</span>
                  <span className="font-mono text-brand-10 font-bold flex-none">{systemInfo.last_upload.total_laps} laps</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-brand-10/40 italic">No telemetry sessions uploaded yet</div>
            )}
          </SidebarCard>

          {/* Database Stats Card */}
          <SidebarCard title="Storage Metrics" icon={BarChart3}>
            <div className="flex flex-col gap-2">
              <StatPill
                icon={Users}
                label="Drivers"
                value={systemInfo.total_players}
                color="brand"
                size="md"
                className="w-full justify-between"
              />
              <StatPill
                icon={Layers}
                label="Sessions"
                value={systemInfo.total_sessions}
                color="blue"
                size="md"
                className="w-full justify-between"
              />
              <StatPill
                icon={Activity}
                label="Laps"
                value={systemInfo.total_laps}
                color="green"
                size="md"
                className="w-full justify-between"
              />
            </div>
          </SidebarCard>
        </div>
      )}
    </div>
  );
};
