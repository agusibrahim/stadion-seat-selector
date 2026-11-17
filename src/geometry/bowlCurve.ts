import { ALL_SECTIONS, TOTAL_SLOTS } from '../data/stadiumConfig';
import type { Point2D, SectionDefinition, SectionGeometry2D, TierType } from '../types/stadium';

/**
 * 2D Stadium Bowl Parametric Curve
 * --------------------------------
 * Centered at (0, 0) in a 460 x 580 SVG coordinate system.
 * North is -Y, South is +Y, West is -X, East is +X.
 *
 * Slot layout (38 total slots clockwise):
 * - 0..5   (6 slots): West straight (bottom-to-top, y: +104 -> -104)
 * - 6..10  (5 slots): NW quarter-circle corner
 * - 11..13 (3 slots): North straight (left-to-right, x: -45 -> +45)
 * - 14..18 (5 slots): NE quarter-circle corner
 * - 19..24 (6 slots): East straight (top-to-bottom, y: -104 -> +104)
 * - 25..29 (5 slots): SE quarter-circle corner
 * - 30..32 (3 slots): South straight (right-to-left, x: +45 -> -45)
 * - 33..37 (5 slots): SW quarter-circle corner
 */

export const BOWL_2D = {
  straightHalfX: 45, // North/South straight half-span
  straightHalfY: 104, // West/East straight half-span
  innerCornerRadius: 64,
  lowerInnerOffset: 0,
  lowerOuterOffset: 52,
  upperInnerOffset: 59,
  upperOuterOffset: 107,
  slotGapHalf: 1.25, // crisp dark radial channel between adjacent sections
  pitchWidth: 178,
  pitchHeight: 274,
} as const;

export interface CurveFrame2D {
  point: Point2D;
  /** Outward unit normal (pointing away from pitch) */
  normal: Point2D;
  /** Clockwise unit tangent */
  tangent: Point2D;
}

/**
 * Evaluates the base inner stadium curve at continuous slot coordinate `s` in [0, 38).
 */
export function evaluateBowlSlot2D(rawSlot: number): CurveFrame2D {
  const s = ((rawSlot % TOTAL_SLOTS) + TOTAL_SLOTS) % TOTAL_SLOTS;
  const { straightHalfX: hx, straightHalfY: hy, innerCornerRadius: r } = BOWL_2D;

  // 0..6: West straight (bottom y=+hy to top y=-hy, outward normal = (-1, 0))
  if (s < 6) {
    const t = s / 6;
    return {
      point: { x: -(hx + r), y: hy - t * (2 * hy) },
      normal: { x: -1, y: 0 },
      tangent: { x: 0, y: -1 },
    };
  }

  // 6..11: NW corner (angle PI -> 1.5*PI around (-hx, -hy))
  if (s < 11) {
    const t = (s - 6) / 5;
    const angle = Math.PI + t * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return {
      point: { x: -hx + r * nx, y: -hy + r * ny },
      normal: { x: nx, y: ny },
      tangent: { x: -ny, y: nx },
    };
  }

  // 11..14: North straight (left x=-hx to right x=+hx, outward normal = (0, -1))
  if (s < 14) {
    const t = (s - 11) / 3;
    return {
      point: { x: -hx + t * (2 * hx), y: -(hy + r) },
      normal: { x: 0, y: -1 },
      tangent: { x: 1, y: 0 },
    };
  }

  // 14..19: NE corner (angle -0.5*PI -> 0 around (+hx, -hy))
  if (s < 19) {
    const t = (s - 14) / 5;
    const angle = -Math.PI / 2 + t * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return {
      point: { x: hx + r * nx, y: -hy + r * ny },
      normal: { x: nx, y: ny },
      tangent: { x: -ny, y: nx },
    };
  }

  // 19..25: East straight (top y=-hy to bottom y=+hy, outward normal = (+1, 0))
  if (s < 25) {
    const t = (s - 19) / 6;
    return {
      point: { x: hx + r, y: -hy + t * (2 * hy) },
      normal: { x: 1, y: 0 },
      tangent: { x: 0, y: 1 },
    };
  }

  // 25..30: SE corner (angle 0 -> 0.5*PI around (+hx, +hy))
  if (s < 30) {
    const t = (s - 25) / 5;
    const angle = t * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return {
      point: { x: hx + r * nx, y: hy + r * ny },
      normal: { x: nx, y: ny },
      tangent: { x: -ny, y: nx },
    };
  }

  // 30..33: South straight (right x=+hx to left x=-hx, outward normal = (0, +1))
  if (s < 33) {
    const t = (s - 30) / 3;
    return {
      point: { x: hx - t * (2 * hx), y: hy + r },
      normal: { x: 0, y: 1 },
      tangent: { x: -1, y: 0 },
    };
  }

  // 33..38: SW corner (angle 0.5*PI -> PI around (-hx, +hy))
  const t = (s - 33) / 5;
  const angle = Math.PI / 2 + t * (Math.PI / 2);
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  return {
    point: { x: -hx + r * nx, y: hy + r * ny },
    normal: { x: nx, y: ny },
    tangent: { x: -ny, y: nx },
  };
}

export function getTierOffsets2D(tier: TierType): { inner: number; outer: number } {
  return tier === 'lower'
    ? { inner: BOWL_2D.lowerInnerOffset, outer: BOWL_2D.lowerOuterOffset }
    : { inner: BOWL_2D.upperInnerOffset, outer: BOWL_2D.upperOuterOffset };
}

/**
 * Evaluates a point inside a specific section given normalized coordinates:
 * - `u` in [0, 1]: left-to-right when facing the pitch (i.e. counter-clockwise, from slot+1 toward slot)
 * - `v` in [0, 1]: front-to-back row (0 = inner pitch-side edge, 1 = outer back-wall edge)
 */
export function sampleSectionPoint2D(
  slotIndex: number,
  tier: TierType,
  u: number,
  v: number,
  edgeInsetPx: number = BOWL_2D.slotGapHalf,
): Point2D {
  const { inner, outer } = getTierOffsets2D(tier);
  const offset = inner + v * (outer - inner);

  // Facing the pitch means looking along -normal.
  // Left-to-right when facing -normal corresponds to decreasing clockwise slot (slotIndex + 1 -> slotIndex).
  const rawSlot = slotIndex + (1 - u);
  const frame = evaluateBowlSlot2D(rawSlot);

  // Apply uniform pixel gap inset at u=0 and u=1 boundaries
  const basePoint = {
    x: frame.point.x + frame.normal.x * offset,
    y: frame.point.y + frame.normal.y * offset,
  };

  // Shift inward from radial slot dividers so gaps have crisp uniform width
  const shiftDir = 1 - 2 * u; // +1 at u=0 (slot+1 boundary, shift toward -tangent), -1 at u=1 (slot boundary, shift toward +tangent)
  return {
    x: basePoint.x - frame.tangent.x * shiftDir * edgeInsetPx,
    y: basePoint.y - frame.tangent.y * shiftDir * edgeInsetPx,
  };
}

function pointsToSvgPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return (
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ` +
    rest.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
    ' Z'
  );
}

function buildSectionGeometry(section: SectionDefinition): SectionGeometry2D {
  const arcSteps = 10;
  const innerEdge: Point2D[] = [];
  const outerEdge: Point2D[] = [];

  for (let i = 0; i <= arcSteps; i++) {
    const u = i / arcSteps;
    innerEdge.push(sampleSectionPoint2D(section.slotIndex, section.tier, u, 0));
    outerEdge.push(sampleSectionPoint2D(section.slotIndex, section.tier, u, 1));
  }

  const polygon = [...innerEdge, ...[...outerEdge].reverse()];
  const svgPath = pointsToSvgPath(polygon);
  const center = sampleSectionPoint2D(section.slotIndex, section.tier, 0.5, 0.5, 0);

  const midFrame = evaluateBowlSlot2D(section.slotIndex + 0.5);
  const inwardX = -midFrame.normal.x;
  const inwardY = -midFrame.normal.y;
  const inwardAngleRad = Math.atan2(inwardY, inwardX);

  // In SVG screen space, straight UP is -90 deg (-PI/2).
  // Rotate the map by (-90 - inwardAngleDeg) so the pitch is directly ABOVE the zoomed section.
  const inwardAngleDeg = (inwardAngleRad * 180) / Math.PI;
  let focusRotationDeg = -90 - inwardAngleDeg;
  while (focusRotationDeg > 180) focusRotationDeg -= 360;
  while (focusRotationDeg <= -180) focusRotationDeg += 360;

  return {
    id: section.id,
    polygon,
    svgPath,
    center,
    inwardAngleRad,
    focusRotationDeg,
    innerEdge,
    outerEdge,
  };
}

export const SECTION_GEOMETRIES_2D: ReadonlyMap<number, SectionGeometry2D> = new Map(
  ALL_SECTIONS.map((sec) => [sec.id, buildSectionGeometry(sec)]),
);
