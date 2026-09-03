import React from 'react';

/**
 * Reusable official iRacing Asphalt Surface (Dual-contour polygon or single-contour ribbon)
 */
export const TrackAsphaltRibbon = React.memo(function TrackAsphaltRibbon({
  trackDef,
  trackWidthVbUnits = 14,
  fill = 'rgba(30, 41, 59, 0.95)',
  stroke = 'rgba(148, 163, 184, 0.5)',
  strokeWidth = 1.5,
}) {
  if (!trackDef?.svg_path) return null;

  if (trackDef.svg_path_outside) {
    return (
      <g className="track-asphalt-ribbon-dual">
        {/* Real 2D Asphalt Surface */}
        <path
          d={`${trackDef.svg_path} ${trackDef.svg_path_outside}`}
          fill={fill}
          fillRule="evenodd"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Subtle Inside Kerb Line */}
        <path
          d={trackDef.svg_path}
          fill="none"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  // Single-Contour Fallback (e.g. Monza)
  return (
    <g className="track-asphalt-ribbon-single">
      <path
        d={trackDef.svg_path}
        fill="none"
        stroke="rgba(148, 163, 184, 0.25)"
        strokeWidth={trackWidthVbUnits + 1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={trackDef.svg_path}
        fill="none"
        stroke={fill}
        strokeWidth={trackWidthVbUnits}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={trackDef.svg_path}
        fill="none"
        stroke="rgba(226, 232, 240, 0.5)"
        strokeWidth={1.2}
        strokeDasharray="4 6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
});

/**
 * Reusable official iRacing Start/Finish Line and Direction Arrow
 */
export const TrackStartFinish = React.memo(function TrackStartFinish({ startFinish }) {
  if (!startFinish) return null;

  return (
    <g className="track-start-finish pointer-events-none select-none">
      {startFinish.line && (
        <path
          d={startFinish.line}
          fill="white"
          stroke="white"
          strokeWidth="1.5"
        />
      )}
      {startFinish.arrow && (
        <path
          d={startFinish.arrow}
          fill="var(--color-brand-30, #38bdf8)"
          opacity="0.85"
        />
      )}
    </g>
  );
});

/**
 * Reusable official iRacing Corner Name Labels
 */
export const TrackTurnLabels = React.memo(function TrackTurnLabels({ turnLabels }) {
  if (!turnLabels || turnLabels.length === 0) return null;

  return (
    <g className="track-turn-labels pointer-events-none select-none">
      {turnLabels.map((label, idx) => (
        <text
          key={`lbl-${idx}`}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fill="rgba(148, 163, 184, 0.65)"
          fontSize="11"
          fontWeight="600"
          className="font-sans drop-shadow"
        >
          {label.name}
        </text>
      ))}
    </g>
  );
});

/**
 * Reusable official iRacing Turn Badges
 */
export const TrackTurnBadges = React.memo(function TrackTurnBadges({
  turnMarkers,
  selectedTurnNumber,
  onSelectTurn,
  badgeRadius = 12,
  selectedRadius = 16,
}) {
  if (!turnMarkers || turnMarkers.length === 0) return null;

  return (
    <g className="track-turn-badges">
      {turnMarkers.map((turn, i) => {
        const isSelected = selectedTurnNumber === turn.turn_number;
        const r = isSelected ? selectedRadius : badgeRadius;

        return (
          <g
            key={`turn-${turn.turn_number || i}`}
            transform={`translate(${turn.x}, ${turn.y})`}
            onClick={(e) => {
              if (onSelectTurn) {
                e.stopPropagation();
                onSelectTurn(turn);
              }
            }}
            className="cursor-pointer group"
          >
            <circle
              r={r}
              fill={isSelected ? 'var(--color-brand-30, #38bdf8)' : 'rgba(15, 23, 42, 0.92)'}
              stroke={isSelected ? '#ffffff' : 'rgba(148, 163, 184, 0.6)'}
              strokeWidth={isSelected ? 2.5 : 1.2}
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-150 shadow-md"
            />
            <text
              y="4"
              textAnchor="middle"
              fontSize={isSelected ? '11' : '9'}
              fontWeight="900"
              fill={isSelected ? '#0f172a' : '#f8fafc'}
              className="font-mono select-none pointer-events-none"
            >
              {turn.label || turn.turn_number}
            </text>
          </g>
        );
      })}
    </g>
  );
});
