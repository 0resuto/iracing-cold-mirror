import React from 'react';

export function RpmBar({ rpm = 0, maxRpm = 8500 }) {
  const rpmPct = Math.min((rpm / maxRpm) * 100, 100);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-baseline gap-1.5 mb-1.5 justify-center">
        <span className="font-mono text-sm font-bold text-brand-10">{Math.round(rpm)}</span>
        <span className="text-brand-10/60 text-[10px] uppercase font-bold tracking-widest">RPM</span>
      </div>
      <div className="h-2 w-full bg-brand-60/80 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full transition-all duration-100 ease-linear rounded-full"
          style={{ 
            width: `${rpmPct}%`, 
                backgroundColor: rpmPct > 90 ? 'var(--color-accent-red)' : 'var(--color-brand-10)'
          }}
        ></div>
      </div>
    </div>
  );
}
