import React from 'react';

/**
 * Renders a lightweight normalized SVG preview of a race track.
 * Uses the precomputed 0 0 100 100 viewBox SVG path.
 */
export const TrackMiniPreview = React.memo(function TrackMiniPreview({ svgPath, className = '', strokeWidth = 2.5 }) {
  if (!svgPath) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-brand-10/30 text-xs font-mono ${className}`}>
        No preview
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full overflow-visible transition-transform duration-300 ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Outer Glow / Soft Edge */}
      <path
        d={svgPath}
        fill="none"
        stroke="rgba(56, 189, 248, 0.2)"
        strokeWidth={strokeWidth + 3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Main Track Ribbon */}
      <path
        d={svgPath}
        fill="none"
        stroke="var(--color-brand-30, #38bdf8)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
