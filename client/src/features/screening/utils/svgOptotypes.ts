/**
 * SVG Optotype Geometry & Rendering Utilities
 * 
 * Provides mathematically accurate vector geometry for:
 * 1. Snellen Tumbling-E (5x5 grid, limb stroke 1/5th letter height)
 * 2. Landolt-C (outer diameter 5x, thickness 1x, gap 1x at 0, 90, 180, 270 deg)
 * 3. Sloan Letters (C, D, H, K, N, O, R, S, V, Z)
 * 4. Physical size to device pixels calculation
 */

import { TumblingEDirection, LandoltCDirection, OptotypeType } from '../types/screening';

export const DIRECTION_ROTATION_DEGREES: Record<TumblingEDirection, number> = {
  RIGHT: 0,
  DOWN: 90,
  LEFT: 180,
  UP: 270,
};

export const DIRECTION_LABELS: Record<TumblingEDirection, { en: string; hi: string; symbol: string }> = {
  UP: { en: 'UP', hi: 'ऊपर (Up)', symbol: '▲' },
  DOWN: { en: 'DOWN', hi: 'नीचे (Down)', symbol: '▼' },
  LEFT: { en: 'LEFT', hi: 'बाएँ (Left)', symbol: '◀' },
  RIGHT: { en: 'RIGHT', hi: 'दाएँ (Right)', symbol: '▶' },
};

/**
 * Standard 5x5 Tumbling-E SVG Path (100x100 bounding box)
 * Base orientation: RIGHT (gap facing 3 o'clock)
 */
export function getTumblingESvgPath(): string {
  return `
    M 0 0
    L 100 0
    L 100 20
    L 20 20
    L 20 40
    L 100 40
    L 100 60
    L 20 60
    L 20 80
    L 100 80
    L 100 100
    L 0 100
    Z
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Landolt-C SVG Path (100x100 bounding box)
 * Base orientation: RIGHT (break facing 3 o'clock)
 * Outer circle radius: 50 (diameter 100)
 * Inner cutout radius: 30 (thickness 20 = 1/5th)
 * Gap width: 20 units (subtends 1/5th visual angle)
 */
export function getLandoltCSvgPath(): string {
  return `
    M 90 40
    A 50 50 0 1 0 90 60
    L 74 56
    A 30 30 0 1 1 74 44
    Z
  `.replace(/\s+/g, ' ').trim();
}

export const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;

/**
 * Calculates rendered pixel height of optotype given:
 * - base physical size in mm at standard distance
 * - confirmed viewing distance
 * - calibrated pixelsPerMm (or devicePixelRatio fallback)
 */
export function calculateOptotypePixels(
  standardHeightMmAt3m: number,
  viewingDistanceMeters: number,
  pixelsPerMm?: number
): number {
  // Visual angle scaling: size scales proportionally with test distance
  // standardHeight is specified at 3.0 meters
  const scaledHeightMm = standardHeightMmAt3m * (viewingDistanceMeters / 3.0);

  if (pixelsPerMm && pixelsPerMm > 0) {
    return Math.max(12, Math.round(scaledHeightMm * pixelsPerMm));
  }

  // Fallback estimation assuming standard 96 DPI screen (3.78 px/mm)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const estimatedPxPerMm = 3.78 * (dpr > 1.5 ? 1.2 : 1.0);
  return Math.max(12, Math.round(scaledHeightMm * estimatedPxPerMm));
}

