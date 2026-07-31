import React from 'react';
import { useSystemInfoQuery } from '../../api/queries';

export const SystemPanel = () => {
  const { data: systemInfo, isLoading, isError } = useSystemInfoQuery();

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0" style={{ padding: '20px' }}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-bold m-0">System Parameters</h2>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
          v0.1.0
        </span>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500 animate-pulse">Loading system statistics...</div>
      ) : isError || !systemInfo ? (
        <div className="text-xs text-red-500">Failed to connect to server</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Server Connection Card */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col gap-3" style={{ padding: '16px' }}>
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Server Infrastructure</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Backend API</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Database</span>
              <span className="font-mono text-zinc-300 font-bold">{systemInfo.database}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">API Key Security</span>
              <span className={`font-bold ${systemInfo.auth_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {systemInfo.auth_enabled ? '🔒 Active' : '🔓 Dev Mode'}
              </span>
            </div>
          </div>

          {/* Last Uploaded Session Card */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col gap-3" style={{ padding: '16px' }}>
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Last Session Upload</span>
            {systemInfo.last_upload ? (
              <>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-zinc-400 flex-none">Track</span>
                  <span className="font-bold text-zinc-100 truncate">{systemInfo.last_upload.track_name}</span>
                </div>
                {systemInfo.last_upload.created_at && (
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-zinc-400 flex-none">Uploaded</span>
                    <span className="text-zinc-300 font-mono text-xs truncate">
                      {new Date(systemInfo.last_upload.created_at).toLocaleDateString()} {new Date(systemInfo.last_upload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-zinc-400 flex-none">Driver</span>
                  <span className="text-zinc-200 font-bold truncate">{systemInfo.last_upload.player_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-zinc-400 flex-none">Laps Uploaded</span>
                  <span className="font-mono text-sky-400 font-bold flex-none">{systemInfo.last_upload.total_laps} laps</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-500 italic">No telemetry sessions uploaded yet</div>
            )}
          </div>

          {/* Database Stats Card */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col gap-2.5" style={{ padding: '16px' }}>
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Storage Metrics</span>
            <div className="grid grid-cols-3 gap-2.5 text-center mt-1">
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/80">
                <div className="text-xs text-zinc-500">Drivers</div>
                <div className="text-base font-bold font-mono text-zinc-100">{systemInfo.total_players}</div>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/80">
                <div className="text-xs text-zinc-500">Sessions</div>
                <div className="text-base font-bold font-mono text-sky-400">{systemInfo.total_sessions}</div>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/80">
                <div className="text-xs text-zinc-500">Laps</div>
                <div className="text-base font-bold font-mono text-purple-400">{systemInfo.total_laps}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
