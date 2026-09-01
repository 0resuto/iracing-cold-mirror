import React, { useState } from 'react';
import { Button, Badge, SidebarCard, useToast, ProgressBar } from '@0resuto/ui-kit';
import { Sparkles, Lock, Bot, Play, AlertTriangle, ChevronDown, ChevronRight, Gauge, Disc } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useAnalyzeLapMutation } from '../api/queries';

export function AiAnalysisCard({ selectedLap, onOpenLogin }) {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const referenceLapId = useAppStore((state) => state.referenceLapId);
  const toast = useToast();
  const analyzeMutation = useAnalyzeLapMutation();

  const [analysisResult, setAnalysisResult] = useState(null);
  const [expandedCorner, setExpandedCorner] = useState(null);

  const handleRunAnalysis = async () => {
    if (!selectedLap) {
      toast.warning('No Lap Selected', 'Please select a lap from the history tree first.');
      return;
    }

    try {
      const data = await analyzeMutation.mutateAsync({
        lapId: selectedLap.id,
        referenceLapId: referenceLapId || null,
      });

      setAnalysisResult(data);
      toast.success('AI Analysis Completed', `Generated insights for Lap #${selectedLap.lap_number}`);
    } catch (err) {
      toast.error('AI Analysis Failed', err.message || 'Could not complete telemetry analysis');
    }
  };

  const toggleCorner = (cornerIndex) => {
    setExpandedCorner(expandedCorner === cornerIndex ? null : cornerIndex);
  };

  return (
    <SidebarCard title="AI Telemetry Coach" icon={Sparkles}>
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-brand-10/70">
            <Bot size={14} className="text-purple-400" />
            <span className="font-medium">Gemini Racing Engineer</span>
          </div>
          {isAdmin ? (
            <Badge color="purple" active beacon>
              {analysisResult?.model_name || 'AI Active'}
            </Badge>
          ) : (
            <Badge color="neutral">
              <Lock size={10} className="inline mr-1" />
              Admin Only
            </Badge>
          )}
        </div>

        {isAdmin ? (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] text-brand-10/70 leading-relaxed">
              Automated telemetry comparison of braking thresholds, apex line speeds, and throttle pickup.
            </p>

            <Button
              variant="primary"
              size="sm"
              fullWidth
              isLoading={analyzeMutation.isPending}
              leftIcon={<Play size={13} />}
              onClick={handleRunAnalysis}
              disabled={!selectedLap}
            >
              {selectedLap
                ? `Analyze Lap #${selectedLap.lap_number} (${selectedLap.lap_time ? selectedLap.lap_time.toFixed(2) + 's' : ''})`
                : 'Select Lap to Analyze'}
            </Button>

            {analyzeMutation.isPending && (
              <div className="py-2 space-y-1.5 text-center">
                <ProgressBar value={100} pulse color="accent-purple" size="sm" />
                <span className="text-[10px] text-purple-300/70 animate-pulse">
                  Extracting physics & synthesizing engineer coaching...
                </span>
              </div>
            )}

            {analysisResult && !analyzeMutation.isPending && (
              <div className="space-y-3 pt-1">
                {/* Score & Summary Card */}
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                      Driving Score
                    </span>
                    <span className="text-sm font-mono font-extrabold text-purple-400">
                      {Math.round(analysisResult.overall_score || 85)}/100
                    </span>
                  </div>

                  <p className="text-[11px] text-brand-10/90 leading-normal">
                    {analysisResult.summary}
                  </p>
                </div>

                {/* Top Critical Mistakes */}
                {analysisResult.critical_mistakes && analysisResult.critical_mistakes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-10/60 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-amber-400" />
                      Priority Focus Areas
                    </span>
                    <div className="space-y-1">
                      {analysisResult.critical_mistakes.map((mistake, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-amber-950/20 border border-amber-500/20 rounded-lg flex items-start gap-2 text-[11px]"
                        >
                          <span className="font-bold text-amber-400 flex-none">{mistake.corner || `#${idx + 1}`}</span>
                          <span className="text-brand-10/80 flex-1">{mistake.description || mistake}</span>
                          {mistake.time_loss && (
                            <span className="font-mono text-[10px] text-accent-red font-semibold flex-none">
                              +{mistake.time_loss.toFixed(2)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-Corner Breakdown */}
                {analysisResult.corner_analyses && analysisResult.corner_analyses.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-10/60">
                      Corner Analysis ({analysisResult.corner_analyses.length})
                    </span>
                    <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {analysisResult.corner_analyses.map((corner, idx) => {
                        const isExpanded = expandedCorner === idx;
                        const isTimeLoss = (corner.time_loss || 0) > 0.05;

                        return (
                          <div
                            key={idx}
                            className={`border rounded-lg transition-colors overflow-hidden ${
                              isExpanded ? 'bg-brand-60/80 border-purple-500/40' : 'bg-black/30 border-brand-10/10 hover:border-brand-10/20'
                            }`}
                          >
                            <div
                              onClick={() => toggleCorner(idx)}
                              className="p-2 flex items-center justify-between cursor-pointer text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown size={14} className="text-purple-400" /> : <ChevronRight size={14} className="text-brand-10/40" />}
                                <span className="font-bold text-brand-10">{corner.name || `Turn ${idx + 1}`}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {corner.time_loss != null && (
                                  <span className={`font-mono text-[10px] font-semibold ${isTimeLoss ? 'text-accent-red' : 'text-emerald-400'}`}>
                                    {corner.time_loss > 0 ? `+${corner.time_loss.toFixed(2)}s` : `${corner.time_loss.toFixed(2)}s`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-2.5 pt-0 border-t border-brand-10/5 text-[10px] space-y-2 bg-black/20">
                                {/* Telemetry Metrics Grid */}
                                <div className="grid grid-cols-2 gap-2 pt-1 text-brand-10/70">
                                  {corner.brake_delta_m != null && (
                                    <div className="flex items-center gap-1.5">
                                      <Disc size={11} className="text-amber-400" />
                                      <span>Braking: <strong>{corner.brake_delta_m > 0 ? `+${corner.brake_delta_m}m late` : `${Math.abs(corner.brake_delta_m)}m early`}</strong></span>
                                    </div>
                                  )}
                                  {corner.apex_speed_delta != null && (
                                    <div className="flex items-center gap-1.5">
                                      <Gauge size={11} className="text-blue-400" />
                                      <span>Apex: <strong>{corner.apex_speed_delta > 0 ? `+${corner.apex_speed_delta} km/h` : `${corner.apex_speed_delta} km/h`}</strong></span>
                                    </div>
                                  )}
                                </div>

                                {/* Advice text */}
                                {corner.advice && (
                                  <p className="text-purple-200/90 leading-relaxed pl-1 border-l-2 border-purple-400/60">
                                    {corner.advice}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-brand-bg/60 border border-brand-10/10 rounded-lg space-y-2 text-center">
            <p className="text-[11px] text-brand-10/60">
              AI telemetry insights and coaching are available for administrators.
            </p>
            {onOpenLogin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenLogin}
                className="w-full text-xs"
              >
                Sign in as Admin
              </Button>
            )}
          </div>
        )}
      </div>
    </SidebarCard>
  );
}
