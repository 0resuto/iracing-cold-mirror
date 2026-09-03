import React, { useMemo } from 'react';
import { getPathBounds } from './trackGeometry';

/**
 * Renders a lightweight SVG preview of a race track.
 * Auto-scales any SVG path bounds to fit perfectly inside its container.
 */
export const TrackMiniPreview = React.memo(function TrackMiniPreview({ svgPath, className = '', strokeWidth }) {
  const bounds = useMemo(() => getPathBounds(svgPath), [svgPath]);

  if (!svgPath || !bounds) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-brand-10/30 text-xs font-mono ${className}`}>
        No preview
      </div>
    );
  }

  const effectiveWidth = strokeWidth || Math.max((bounds.vbWidth + bounds.vbHeight) * 0.014, 12);

  return (
    <svg
      viewBox={bounds.viewBox}
      className={`w-full h-full overflow-visible transition-transform duration-300 ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Outer Glow / Soft Edge */}
      <path
        d={svgPath}
        fill="none"
        stroke="rgba(56, 189, 248, 0.2)"
        strokeWidth={effectiveWidth * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Main Track Ribbon */}
      <path
        d={svgPath}
        fill="none"
        stroke="var(--color-brand-30, #38bdf8)"
        strokeWidth={effectiveWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
