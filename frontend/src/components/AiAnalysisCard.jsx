import React, { useState } from 'react';
import { Button, Badge, SidebarCard, useToast } from '@0resuto/ui-kit';
import { Sparkles, Lock, Bot, Play, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function AiAnalysisCard({ selectedLap, onOpenLogin }) {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const toast = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleRunAnalysis = () => {
    if (!selectedLap) {
      toast.warning('No Lap Selected', 'Please select a lap from the history tree first.');
      return;
    }

    setIsAnalyzing(true);
    // Simulating pending endpoint call for AI Analysis (ready to connect to backend endpoint)
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult({
        summary: `Lap #${selectedLap.lap_number} analysis completed with AI Engine.`,
        tips: [
          'Turn 1: Braking point is 12m earlier than theoretical optimum.',
          'Sector 2: Throttle application was smooth, +0.18s gain over reference.',
          'Final Chicane: Apex speed maintained at 114 km/h.',
        ],
      });
      toast.success('AI Analysis Ready', 'Insights generated for selected lap.');
    }, 1200);
  };

  return (
    <SidebarCard title="AI Telemetry Analysis" icon={Sparkles}>
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-brand-10/70">
            <Bot size={14} className="text-purple-400" />
            <span className="font-medium">AI Coach Engine</span>
          </div>
          {isAdmin ? (
            <Badge color="purple" active beacon>Admin Feature</Badge>
          ) : (
            <Badge color="neutral">
              <Lock size={10} className="inline mr-1" />
              Admin Only
            </Badge>
          )}
        </div>

        {isAdmin ? (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-brand-10/70">
              Deep neural analysis of braking points, throttle traces, and trail-braking efficiency.
            </p>

            <Button
              variant="primary"
              size="sm"
              fullWidth
              isLoading={isAnalyzing}
              leftIcon={<Play size={13} />}
              onClick={handleRunAnalysis}
              disabled={!selectedLap}
            >
              {selectedLap ? `Analyze Lap #${selectedLap.lap_number}` : 'Select Lap to Analyze'}
            </Button>

            {analysisResult && (
              <div className="mt-2 p-2.5 bg-purple-950/20 border border-purple-500/30 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-[11px]">
                  <CheckCircle2 size={13} />
                  <span>{analysisResult.summary}</span>
                </div>
                <ul className="text-[10px] text-brand-10/70 space-y-1 pl-1">
                  {analysisResult.tips.map((tip, idx) => (
                    <li key={idx} className="list-disc list-inside text-brand-10/80">
                      {tip}
                    </li>
                  ))}
                </ul>
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
