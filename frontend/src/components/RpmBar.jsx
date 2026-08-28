import React from 'react';
import { ProgressBar } from '@0resuto/ui-kit';

export function RpmBar({ rpm = 0, maxRpm = 8500 }) {
  const rpmPct = Math.min((rpm / maxRpm) * 100, 100);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-baseline gap-1.5 mb-1.5 justify-center">
        <span className="font-mono text-sm font-bold text-brand-10">{Math.round(rpm)}</span>
        <span className="text-brand-10/60 text-[10px] uppercase font-bold tracking-widest">RPM</span>
      </div>
      <ProgressBar
        value={rpmPct}
        color={rpmPct > 90 ? 'accent-red' : 'brand-10'}
        size={8}
        className="w-full"
      />
    </div>
  );
}