import React from 'react';
import { useSystemInfoQuery } from '../../api/queries';

export const SystemPanel = () => {
  const { data: systemInfo, isLoading, isError } = useSystemInfoQuery();

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0 p-5">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs uppercase tracking-wider text-brand-10/60 font-bold m-0">System Parameters</h2>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-30/10 border border-brand-30/20 text-brand-30/80 text-xs font-bold">
          v0.1.0
        </span>
      </div>

      {isLoading ? (
        <div className="text-xs text-brand-10/40 animate-pulse">Loading system statistics...</div>
      ) : isError || !systemInfo ? (
        <div className="text-xs text-red-500">Failed to connect to server</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Server Connection Card */}
          <div className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-3 p-4">
            <span className="text-xs uppercase tracking-wider text-brand-10/40 font-bold">Server Infrastructure</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-10/60">Backend API</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-10/60">Database</span>
              <span className="font-mono text-brand-10/80 font-bold">{systemInfo.database}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-10/60">API Key Security</span>
              <span className={`font-bold ${systemInfo.auth_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {systemInfo.auth_enabled ? '🔒 Active' : '🔓 Dev Mode'}
              </span>
            </div>
          </div>

          {/* Last Uploaded Session Card */}
          <div className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-3 p-4">
            <span className="text-xs uppercase tracking-wider text-brand-10/40 font-bold">Last Session Upload</span>
            {systemInfo.last_upload ? (
              <>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-brand-10/60 flex-none">Track</span>
                  <span className="font-bold text-brand-10 truncate">{systemInfo.last_upload.track_name}</span>
                </div>
                {systemInfo.last_upload.created_at && (
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-brand-10/60 flex-none">Uploaded</span>
                    <span className="text-brand-10/80 font-mono text-xs truncate">
                      {new Date(systemInfo.last_upload.created_at).toLocaleDateString()} {new Date(systemInfo.last_upload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-brand-10/60 flex-none">Driver</span>
                  <span className="text-brand-10/90 font-bold truncate">{systemInfo.last_upload.player_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-brand-10/60 flex-none">Laps Uploaded</span>
                  <span className="font-mono text-brand-30/80 font-bold flex-none">{systemInfo.last_upload.total_laps} laps</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-brand-10/40 italic">No telemetry sessions uploaded yet</div>
            )}
          </div>

          {/* Database Stats Card */}
          <div className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-2.5 p-4">
            <span className="text-xs uppercase tracking-wider text-brand-10/40 font-bold">Storage Metrics</span>
            <div className="grid grid-cols-3 gap-2.5 text-center mt-1">
              <div className="bg-brand-60 p-3 rounded-lg border border-brand-60/80">
                <div className="text-xs text-brand-10/40">Drivers</div>
                <div className="text-base font-bold font-mono text-brand-10">{systemInfo.total_players}</div>
              </div>
              <div className="bg-brand-60 p-3 rounded-lg border border-brand-60/80">
                <div className="text-xs text-brand-10/40">Sessions</div>
                <div className="text-base font-bold font-mono text-brand-30/80">{systemInfo.total_sessions}</div>
              </div>
              <div className="bg-brand-60 p-3 rounded-lg border border-brand-60/80">
                <div className="text-xs text-brand-10/40">Laps</div>
                <div className="text-base font-bold font-mono text-brand-30/80">{systemInfo.total_laps}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
