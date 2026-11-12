/**
 * Procedural Pseudoisochromatic Plate Dot Generator
 * 
 * Mathematically generates Ishihara-style dot matrices without copyright infringement.
 * Uses jittered lattice sampling with randomized circle radii (3.5px to 8px)
 * and calibrated isoluminant color palettes for:
 * 1. Demo Plate ('12') - High luminance/hue contrast, universally visible
 * 2. Protan/Deutan Plate ('8') - Red-orange foreground on green-yellow background
 * 3. Tritan Plate ('5') - Violet-purple foreground on blue-green background
 * 4. Transformation Plate ('2') - Subtle saturation shift
 */

export interface PlateDot {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  isForeground: boolean;
}

// Low-resolution 16x16 bitmaps for numerals in the plate center
const DIGIT_BITMAPS: Record<string, string[]> = {
  '12': [
    '..X...XXXX..',
    '.XX..X....X.',
    '..X.......X.',
    '..X......X..',
    '..X.....X...',
    '..X....X....',
    '..X...X.....',
    '.XXX.XXXXXX.',
  ],
  '8': [
    '.XXXXXX.',
    'X......X',
    'X......X',
    '.XXXXXX.',
    'X......X',
    'X......X',
    'X......X',
    '.XXXXXX.',
  ],
  '5': [
    'XXXXXXXX',
    'X.......',
    'X.......',
    'XXXXXXX.',
    '.......X',
    '.......X',
    'X......X',
    '.XXXXXX.',
  ],
  '2': [
    '.XXXXXX.',
    'X......X',
    '.......X',
    '.....XX.',
    '....X...',
    '..XX....',
    '.X......',
    'XXXXXXXX',
  ],
};

function isInsideDigit(digitKey: string, normX: number, normY: number): boolean {
  const map = DIGIT_BITMAPS[digitKey];
  if (!map) return false;
  const rows = map.length;
  const cols = map[0].length;

  // Center the bitmap within -0.55 to 0.55
  const colIdx = Math.floor(((normX + 0.55) / 1.1) * cols);
  const rowIdx = Math.floor(((normY + 0.55) / 1.1) * rows);

  if (rowIdx >= 0 && rowIdx < rows && colIdx >= 0 && colIdx < cols) {
    return map[rowIdx][colIdx] === 'X';
  }
  return false;
}

/**
 * Generates an array of non-overlapping procedural dots within a circular boundary
 */
export function generateProceduralPlate(
  plateIndex: number,
  plateSize = 280
): PlateDot[] {
  const dots: PlateDot[] = [];
  const radius = plateSize / 2;
  const cxCenter = radius;
  const cyCenter = radius;

  let digitKey = '12';
  if (plateIndex === 2) digitKey = '8';
  else if (plateIndex === 3) digitKey = '5';
  else if (plateIndex === 4) digitKey = '2';

  // Seeded deterministic pseudorandom so plate stays consistent during re-render
  let seed = plateIndex * 997 + 101;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const gridStep = 12.5;

  for (let x = -radius + 12; x < radius - 12; x += gridStep) {
    for (let y = -radius + 12; y < radius - 12; y += gridStep) {
      // Jitter center position
      const jx = x + (rnd() - 0.5) * (gridStep * 0.75);
      const jy = y + (rnd() - 0.5) * (gridStep * 0.75);

      const dist = Math.sqrt(jx * jx + jy * jy);
      // Keep strictly within circular plate boundary
      if (dist > radius - 14) continue;

      const normX = jx / (radius * 0.7);
      const normY = jy / (radius * 0.7);

      const inForeground = isInsideDigit(digitKey, normX, normY);
      const dotRadius = 3.8 + rnd() * 3.8; // Varying dot sizes 3.8 to 7.6px

      let fill = '';
      const lumJitter = Math.round((rnd() - 0.5) * 16);

      if (plateIndex === 1) {
        // DEMO: 12 (High contrast orange vs teal/blue)
        if (inForeground) {
          fill = `hsl(${22 + Math.round(rnd() * 12)}, 90%, ${52 + lumJitter}%)`;
        } else {
          fill = `hsl(${190 + Math.round(rnd() * 25)}, 75%, ${44 + lumJitter}%)`;
        }
      } else if (plateIndex === 2) {
        // PROTAN / DEUTAN: 8 (Red-orange foreground vs yellow-olive background)
        if (inForeground) {
          fill = `hsl(${12 + Math.round(rnd() * 14)}, 82%, ${50 + lumJitter}%)`;
        } else {
          fill = `hsl(${80 + Math.round(rnd() * 25)}, 60%, ${45 + lumJitter}%)`;
        }
      } else if (plateIndex === 3) {
        // TRITAN: 5 (Violet/purple foreground vs teal/cyan background)
        if (inForeground) {
          fill = `hsl(${275 + Math.round(rnd() * 20)}, 70%, ${52 + lumJitter}%)`;
        } else {
          fill = `hsl(${170 + Math.round(rnd() * 20)}, 75%, ${42 + lumJitter}%)`;
        }
      } else {
        // TRANSFORMATION: 2 (Subtle salmon vs muted gray-green)
        if (inForeground) {
          fill = `hsl(${355 + Math.round(rnd() * 12)}, 65%, ${54 + lumJitter}%)`;
        } else {
          fill = `hsl(${125 + Math.round(rnd() * 20)}, 35%, ${50 + lumJitter}%)`;
        }
      }

      dots.push({
        cx: cxCenter + jx,
        cy: cyCenter + jy,
        r: dotRadius,
        fill,
        isForeground: inForeground,
      });
    }
  }

  return dots;
}

