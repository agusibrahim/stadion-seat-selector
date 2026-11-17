import { ALL_SECTIONS, TOTAL_SLOTS } from '../data/stadiumConfig';
import type { Point2D, SectionDefinition, SectionGeometry2D, TierType } from '../types/stadium';

/**
 * SUGBK (Stadion Utama Gelora Bung Karno) 2D Elliptical Bowl Geometry
 * -------------------------------------------------------------------
 * Authentic Olympic oval bowl surrounding the 8-lane 400m athletics track
 * and 105m × 68m FIFA football pitch.
 *
 * 36 radial sectors (Zona 1..12 × 3 sectors):
 * - rawSlot = 3.0  -> Exact BARAT (West, angle = PI)
 * - rawSlot = 12.0 -> Exact UTARA (North, angle = 1.5 * PI)
 * - rawSlot = 21.0 -> Exact TIMUR (East, angle = 0)
 * - rawSlot = 30.0 -> Exact SELATAN (South, angle = 0.5 * PI)
 */

export const BOWL_2D = {
  innerRadiusX: 114, // Semi-minor axis (Barat–Timur)
  innerRadiusY: 186, // Semi-major axis (Utara–Selatan)
  lowerInnerOffset: 0,
  lowerOuterOffset: 46,
  upperInnerOffset: 53,
  upperOuterOffset: 98,
  slotGapHalf: 1.25,
  pitchWidth: 140,
  pitchHeight: 216,
  trackStraightHalfY: 82,
  trackInnerR: 73,
  trackOuterR: 96,
} as const;

export interface CurveFrame2D {
  point: Point2D;
  /** Outward unit normal (pointing away from pitch) */
  normal: Point2D;
  /** Clockwise unit tangent */
  tangent: Point2D;
}

// Precompute quarter-ellipse arc-length table so all 36 sectors have uniform width
// while preserving exact cardinal symmetry at slots 3, 12, 21, 30!
const QUAD_SAMPLES = 360;
const quadArcLengths: Float64Array = (() => {
  const arr = new Float64Array(QUAD_SAMPLES + 1);
  let acc = 0;
  let prevX: number = BOWL_2D.innerRadiusX;
  let prevY = 0;
  for (let i = 1; i <= QUAD_SAMPLES; i++) {
    const theta = (i / QUAD_SAMPLES) * (Math.PI / 2);
    const x = BOWL_2D.innerRadiusX * Math.cos(theta);
    const y = BOWL_2D.innerRadiusY * Math.sin(theta);
    acc += Math.hypot(x - prevX, y - prevY);
    arr[i] = acc;
    prevX = x;
    prevY = y;
  }
  return arr;
})();

function invertQuarterArc(uFrac: number): number {
  const target = Math.max(0, Math.min(1, uFrac)) * quadArcLengths[QUAD_SAMPLES];
  let lo = 0;
  let hi = QUAD_SAMPLES;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (quadArcLengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return 0;
  const l0 = quadArcLengths[lo - 1];
  const l1 = quadArcLengths[lo];
  const frac = l1 > l0 ? (target - l0) / (l1 - l0) : 0;
  return ((lo - 1 + frac) / QUAD_SAMPLES) * (Math.PI / 2);
}

/**
 * Converts continuous `rawSlot` in [0, 36) to parametric ellipse angle `phi`
 * (clockwise in screen space: PI = West, 1.5*PI = North, 0 = East, 0.5*PI = South).
 */
export function slotToEllipseAngle(rawSlot: number): number {
  const s = ((rawSlot % TOTAL_SLOTS) + TOTAL_SLOTS) % TOTAL_SLOTS;
  // Shift so qSlot = 0 corresponds to rawSlot = 21 (East, phi = 0)
  const qSlot = (s - 21 + TOTAL_SLOTS) % TOTAL_SLOTS; // 0..36 clockwise from East
  const quadIdx = Math.floor(qSlot / 9); // 0: E->S, 1: S->W, 2: W->N, 3: N->E
  const u = (qSlot - quadIdx * 9) / 9;

  if (quadIdx === 0) {
    // East (0) -> South (PI/2): cos decreases, sin increases
    return invertQuarterArc(u);
  }
  if (quadIdx === 1) {
    // South (PI/2) -> West (PI)
    return Math.PI - invertQuarterArc(1 - u);
  }
  if (quadIdx === 2) {
    // West (PI) -> North (1.5*PI)
    return Math.PI + invertQuarterArc(u);
  }
  // North (1.5*PI) -> East (2*PI)
  return Math.PI * 2 - invertQuarterArc(1 - u);
}

export function evaluateBowlSlot2D(rawSlot: number): CurveFrame2D {
  const phi = slotToEllipseAngle(rawSlot);
  const { innerRadiusX: rx, innerRadiusY: ry } = BOWL_2D;

  const cp = Math.cos(phi);
  const sp = Math.sin(phi);

  const px = rx * cp;
  const py = ry * sp;

  // Outward gradient of (x/rx)^2 + (y/ry)^2 = 1 is proportional to (cos(phi)/rx, sin(phi)/ry)
  const gx = cp / rx;
  const gy = sp / ry;
  const gLen = Math.hypot(gx, gy) || 1;
  const nx = gx / gLen;
  const ny = gy / gLen;

  // Clockwise unit tangent in SVG screen space (+X right, +Y down) is (-ny, nx)
  return {
    point: { x: px, y: py },
    normal: { x: nx, y: ny },
    tangent: { x: -ny, y: nx },
  };
}

export function getTierOffsets2D(tier: TierType): { inner: number; outer: number } {
  return tier === 'lower'
    ? { inner: BOWL_2D.lowerInnerOffset, outer: BOWL_2D.lowerOuterOffset }
    : { inner: BOWL_2D.upperInnerOffset, outer: BOWL_2D.upperOuterOffset };
}

export function sampleSectionPoint2D(
  slotIndex: number,
  tier: TierType,
  u: number,
  v: number,
  edgeInsetPx: number = BOWL_2D.slotGapHalf,
): Point2D {
  const { inner, outer } = getTierOffsets2D(tier);
  const offset = inner + v * (outer - inner);

  const rawSlot = slotIndex + (1 - u);
  const frame = evaluateBowlSlot2D(rawSlot);

  const basePoint = {
    x: frame.point.x + frame.normal.x * offset,
    y: frame.point.y + frame.normal.y * offset,
  };

  const shiftDir = 1 - 2 * u;
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
  const arcSteps = 12;
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
