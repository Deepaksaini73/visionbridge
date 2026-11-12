import React from 'react';
import {
  TumblingEDirection,
  getTumblingESvgPath,
  DIRECTION_ROTATION_DEGREES,
  ACUITY_LEVELS,
} from '@shared/config/screeningConfig';

interface TumblingEOptotypeProps {
  direction: TumblingEDirection;
  level: number; // 1 to 7
  scaleFactor?: number; // calibrated scaling multiplier (default 1.0)
  invertColors?: boolean; // black on white (default) or white on black
  className?: string;
  maxDisplayHeightPx?: number;
}

/**
 * Baseline pixel sizes for Level 1 to 7 at standard 100% web scale (3m viewing distance reference)
 */
const BASELINE_PIXEL_SIZES: Record<number, number> = {
  1: 180, // Level 1 (6/60 equiv)
  2: 125, // Level 2 (6/36 equiv)
  3: 90,  // Level 3 (6/24 equiv)
  4: 68,  // Level 4 (6/18 equiv)
  5: 48,  // Level 5 (6/12 equiv)
  6: 36,  // Level 6 (6/9 equiv)
  7: 26,  // Level 7 (6/6 equiv)
};

export const TumblingEOptotype: React.FC<TumblingEOptotypeProps> = ({
  direction,
  level,
  scaleFactor = 1.0,
  invertColors = false,
  className = '',
  maxDisplayHeightPx,
}) => {
  const baseSize = BASELINE_PIXEL_SIZES[level] || 90;
  let computedSize = Math.round(baseSize * scaleFactor);

  if (maxDisplayHeightPx && computedSize > maxDisplayHeightPx) {
    computedSize = maxDisplayHeightPx;
  }

  // Minimum size clamp to prevent browser sub-pixel rendering collapse
  computedSize = Math.max(16, computedSize);

  const rotation = DIRECTION_ROTATION_DEGREES[direction] ?? 0;
  const pathD = getTumblingESvgPath();

  const levelInfo = ACUITY_LEVELS.find(l => l.level === level);

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* High-Contrast Optotype Container */}
      <div 
        className={`flex items-center justify-center p-6 rounded-3xl transition-all duration-200 ${
          invertColors ? 'bg-navy-950 text-white' : 'bg-white text-slate-950 shadow-healthcare-md border border-slate-200/60'
        }`}
        style={{ minWidth: computedSize + 48, minHeight: computedSize + 48 }}
        aria-label={`Tumbling E Optotype, pointing ${direction}`}
      >
        <svg
          width={computedSize}
          height={computedSize}
          viewBox="0 0 100 100"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '50% 50%',
            transition: 'transform 0.15s ease-out',
          }}
          shapeRendering="geometricPrecision"
          aria-hidden="true"
        >
          <path
            d={pathD}
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Subtle non-identifying size indicator for operator confirmation */}
      {levelInfo && (
        <span className="text-[10px] font-mono text-slate-400 mt-2 font-medium tracking-wide">
          {levelInfo.label} (~{levelInfo.snellenMeters} equiv at 3m) • {computedSize}px
        </span>
      )}
    </div>
  );
};

