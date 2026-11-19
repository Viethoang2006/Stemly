import React from 'react';
import {
  BreadboardHole,
  BreadboardObj,
  GRID,
  getBreadboardHoles,
} from './circuitSandboxCore';

interface TinkercadBreadboardSvgProps {
  breadboard: BreadboardObj;
  highlightedNetKey: string | null;
  hoveredHoleId: string | null;
  wireStartHoleId: string | null;
  isSelected: boolean;
  isLightCanvas: boolean;
  onSelectBreadboard: (id: string) => void;
  onStartDragBreadboard: (e: React.PointerEvent, bb: BreadboardObj) => void;
  onHoleClick: (e: React.MouseEvent, bbId: string, hole: BreadboardHole) => void;
  onHoleHover: (hole: BreadboardHole | null, bbId: string) => void;
}

export const TinkercadBreadboardSvg: React.FC<TinkercadBreadboardSvgProps> = ({
  breadboard,
  highlightedNetKey,
  hoveredHoleId,
  wireStartHoleId,
  isSelected,
  isLightCanvas,
  onSelectBreadboard,
  onStartDragBreadboard,
  onHoleClick,
  onHoleHover,
}) => {
  const holes = React.useMemo(() => getBreadboardHoles(breadboard), [breadboard]);

  const width = (breadboard.cols - 1) * GRID + 56;
  const height = 360;
  const left = breadboard.x - 28;
  const top = breadboard.y - 180;
  const right = left + width;

  const colMarkers = [1, 5, 10, 15, 20, 25].filter((n) => n <= breadboard.cols);
  const topRowLetters = [
    { label: 'j', dy: -100 },
    { label: 'i', dy: -80 },
    { label: 'h', dy: -60 },
    { label: 'g', dy: -40 },
    { label: 'f', dy: -20 },
  ];
  const botRowLetters = [
    { label: 'e', dy: 20 },
    { label: 'd', dy: 40 },
    { label: 'c', dy: 60 },
    { label: 'b', dy: 80 },
    { label: 'a', dy: 100 },
  ];

  const bodyFill = isLightCanvas ? '#f8fafc' : '#e2e8f0';
  const bodyStroke = isSelected ? '#2563eb' : isLightCanvas ? '#cbd5e1' : '#64748b';

  return (
    <g>
      {/* Breadboard outer drop shadow */}
      <rect
        x={left + 3}
        y={top + 5}
        width={width}
        height={height}
        rx={12}
        fill={isLightCanvas ? 'rgba(15, 23, 42, 0.12)' : 'rgba(0, 0, 0, 0.45)'}
        className="pointer-events-none"
      />

      {/* Main Ivory ABS Breadboard Body (draggable via rim) */}
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={12}
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth={isSelected ? 2.4 : 1.6}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelectBreadboard(breadboard.id);
          onStartDragBreadboard(e, breadboard);
        }}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing"
      />

      {/* Top & Bottom Power Rail Dividers */}
      <line
        x1={left + 10}
        y1={breadboard.y - 124}
        x2={right - 10}
        y2={breadboard.y - 124}
        stroke="#cbd5e1"
        strokeWidth="1.2"
        className="pointer-events-none"
      />
      <line
        x1={left + 10}
        y1={breadboard.y + 124}
        x2={right - 10}
        y2={breadboard.y + 124}
        stroke="#cbd5e1"
        strokeWidth="1.2"
        className="pointer-events-none"
      />

      {/* Classic Tinkercad Blue (-) and Red (+) Power Bus Lines */}
      {/* Top - blue line */}
      <line
        x1={breadboard.x - 4}
        y1={breadboard.y - 170}
        x2={breadboard.x + (breadboard.cols - 1) * GRID + 4}
        y2={breadboard.y - 170}
        stroke="#2563eb"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="pointer-events-none"
      />
      {/* Top + red line */}
      <line
        x1={breadboard.x - 4}
        y1={breadboard.y - 130}
        x2={breadboard.x + (breadboard.cols - 1) * GRID + 4}
        y2={breadboard.y - 130}
        stroke="#dc2626"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="pointer-events-none"
      />
      {/* Bottom + red line */}
      <line
        x1={breadboard.x - 4}
        y1={breadboard.y + 130}
        x2={breadboard.x + (breadboard.cols - 1) * GRID + 4}
        y2={breadboard.y + 130}
        stroke="#dc2626"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="pointer-events-none"
      />
      {/* Bottom - blue line */}
      <line
        x1={breadboard.x - 4}
        y1={breadboard.y + 170}
        x2={breadboard.x + (breadboard.cols - 1) * GRID + 4}
        y2={breadboard.y + 170}
        stroke="#2563eb"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="pointer-events-none"
      />

      {/* Rail + and - Signs */}
      <g className="pointer-events-none select-none" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="11">
        <text x={left + 12} y={breadboard.y - 157} fill="#2563eb">−</text>
        <text x={left + 12} y={breadboard.y - 137} fill="#dc2626">+</text>
        <text x={left + 12} y={breadboard.y + 144} fill="#dc2626">+</text>
        <text x={left + 12} y={breadboard.y + 164} fill="#2563eb">−</text>

        <text x={right - 18} y={breadboard.y - 157} fill="#2563eb">−</text>
        <text x={right - 18} y={breadboard.y - 137} fill="#dc2626">+</text>
        <text x={right - 18} y={breadboard.y + 144} fill="#dc2626">+</text>
        <text x={right - 18} y={breadboard.y + 164} fill="#2563eb">−</text>
      </g>

      {/* Center DIP IC Ravine / Channel */}
      <rect
        x={left + 12}
        y={breadboard.y - 8}
        width={width - 24}
        height={16}
        rx={3}
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth="1"
        className="pointer-events-none"
      />
      <line
        x1={left + 14}
        y1={breadboard.y - 6}
        x2={right - 14}
        y2={breadboard.y - 6}
        stroke="rgba(15, 23, 42, 0.08)"
        strokeWidth="2"
        className="pointer-events-none"
      />

      {/* Row Labels (j..f, e..a) */}
      <g className="pointer-events-none select-none" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="8.5" fill="#64748b">
        {topRowLetters.map((r) => (
          <React.Fragment key={r.label}>
            <text x={left + 11} y={breadboard.y + r.dy + 3} textAnchor="middle">{r.label}</text>
            <text x={right - 11} y={breadboard.y + r.dy + 3} textAnchor="middle">{r.label}</text>
          </React.Fragment>
        ))}
        {botRowLetters.map((r) => (
          <React.Fragment key={r.label}>
            <text x={left + 11} y={breadboard.y + r.dy + 3} textAnchor="middle">{r.label}</text>
            <text x={right - 11} y={breadboard.y + r.dy + 3} textAnchor="middle">{r.label}</text>
          </React.Fragment>
        ))}
      </g>

      {/* Column Numbers (1, 5, 10, 15, 20, 25) */}
      <g className="pointer-events-none select-none" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="8.5" fill="#64748b">
        {colMarkers.map((colNum) => {
          const cx = breadboard.x + (colNum - 1) * GRID;
          return (
            <React.Fragment key={colNum}>
              <text x={cx} y={breadboard.y - 111} textAnchor="middle">{colNum}</text>
              <text x={cx} y={breadboard.y + 117} textAnchor="middle">{colNum}</text>
            </React.Fragment>
          );
        })}
      </g>

      {/* Breadboard Title Stamp */}
      <text
        x={breadboard.x + ((breadboard.cols - 1) * GRID) / 2}
        y={breadboard.y + 3}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="8"
        fontWeight="700"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="1.5"
        className="pointer-events-none select-none"
      >
        BREADBOARD · STEMLY STUDIO
      </text>

      {/* Interactive Breadboard Pin Holes */}
      {holes.map((hole) => {
        const isNetHighlighted = highlightedNetKey !== null && hole.netKey === highlightedNetKey;
        const isHovered = hoveredHoleId === hole.holeId;
        const isWireStart = wireStartHoleId === hole.holeId;

        return (
          <g
            key={hole.holeId}
            onClick={(e) => onHoleClick(e, breadboard.id, hole)}
            onMouseEnter={() => onHoleHover(hole, breadboard.id)}
            onMouseLeave={() => onHoleHover(null, breadboard.id)}
            className="cursor-pointer"
          >
            {/* Invisible hit area */}
            <circle cx={hole.x} cy={hole.y} r="9" fill="transparent" />

            {/* Signature Tinkercad Green Connected-Strip Halo */}
            {(isNetHighlighted || isWireStart) && (
              <circle
                cx={hole.x}
                cy={hole.y}
                r={isHovered || isWireStart ? 7.5 : 6.2}
                fill={isWireStart ? 'rgba(245, 158, 11, 0.28)' : 'rgba(34, 197, 94, 0.24)'}
                stroke={isWireStart ? '#f59e0b' : '#16a34a'}
                strokeWidth={isHovered || isWireStart ? 1.8 : 1.4}
              />
            )}

            {/* Outer beveled hole rim */}
            <rect
              x={hole.x - 4}
              y={hole.y - 4}
              width="8"
              height="8"
              rx="1.8"
              fill={isHovered ? '#dcfce7' : '#cbd5e1'}
              stroke={isNetHighlighted ? '#16a34a' : '#94a3b8'}
              strokeWidth="0.7"
            />

            {/* Dark metallic inner contact slot */}
            <rect
              x={hole.x - 2.3}
              y={hole.y - 2.3}
              width="4.6"
              height="4.6"
              rx="1"
              fill="#1e293b"
            />
          </g>
        );
      })}
    </g>
  );
};
