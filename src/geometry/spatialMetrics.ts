import { SECTIONS_BY_ID, TOTAL_SLOTS } from '../data/stadiumConfig';
import type { SeatItem, SeatSpatialMetrics, TierType } from '../types/stadium';

/**
 * Unified 3D Stadium World Coordinates (1 unit = 1 meter)
 * -------------------------------------------------------
 * - Origin (0, 0, 0) = Pitch centre spot
 * - X axis: West (-X) to East (+X); Pitch touchlines at X = ±34m (width = 68m)
 * - Z axis: North (-Z) to South (+Z); Pitch goal lines at Z = ±52.5m (length = 105m)
 * - Y axis: Height in meters above the pitch turf (Y = 0)
 *
 * Both the Three.js 3D Stadium builder AND the seat spatial metrics use `evaluateBowlSlot3D`
 * so the 3D first-person camera sits physically right above the rendered 3D blue seat!
 */
export const STADIUM_3D = {
  pitchLength: 105, // Z: -52.5 .. +52.5
  pitchWidth: 68, // X: -34.0 .. +34.0
  straightHalfX: 16.5, // North/South straight half-span in meters
  straightHalfZ: 36.5, // West/East straight half-span in meters
  cornerRadiusX: 24.0, // Inner bowl X = ±(16.5 + 24.0) = ±40.5m (6.5m apron from touchline)
  cornerRadiusZ: 25.3, // Inner bowl Z = ±(36.5 + 25.3) = ±61.8m (9.3m apron from goal line)

  // Lower tier profile (24 rows)
  lowerInnerRun: 0.0,
  lowerOuterRun: 19.3, // ~0.84m tread per row
  lowerInnerHeight: 1.6,
  lowerOuterHeight: 12.6, // ~0.48m riser per row

  // Upper tier profile (20 rows, cantilevered slightly over VIP hospitality ring)
  upperInnerRun: 19.0,
  upperOuterRun: 35.8, // ~0.88m tread per row
  upperInnerHeight: 16.4,
  upperOuterHeight: 27.8, // ~0.60m riser per row

  seatEyeOffset: 0.64, // seated spectator eye level above step riser
} as const;

export interface BowlFrame3D {
  x: number;
  z: number;
  nx: number; // outward horizontal unit normal X
  nz: number; // outward horizontal unit normal Z
  tx: number; // clockwise horizontal unit tangent X
  tz: number; // clockwise horizontal unit tangent Z
}

/**
 * Evaluates the inner 3D stadium bowl perimeter at continuous slot `rawSlot` in [0, 38).
 * Matches the exact 38-slot orientation of `evaluateBowlSlot2D`:
 * - North is -Z, South is +Z, West is -X, East is +X.
 */
export function evaluateBowlSlot3D(rawSlot: number): BowlFrame3D {
  const s = ((rawSlot % TOTAL_SLOTS) + TOTAL_SLOTS) % TOTAL_SLOTS;
  const {
    straightHalfX: hx,
    straightHalfZ: hz,
    cornerRadiusX: rx,
    cornerRadiusZ: rz,
  } = STADIUM_3D;

  // 0..6: West straight (Z: +hz -> -hz, X = -(hx + rx))
  if (s < 6) {
    const t = s / 6;
    return {
      x: -(hx + rx),
      z: hz - t * (2 * hz),
      nx: -1,
      nz: 0,
      tx: 0,
      tz: -1,
    };
  }

  // 6..11: NW corner (angle PI -> 1.5*PI)
  if (s < 11) {
    const t = (s - 6) / 5;
    const angle = Math.PI + t * (Math.PI / 2);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const nLen = Math.hypot(ca / rx, sa / rz);
    const nx = ca / rx / nLen;
    const nz = sa / rz / nLen;
    return {
      x: -hx + rx * ca,
      z: -hz + rz * sa,
      nx,
      nz,
      tx: -nz,
      tz: nx,
    };
  }

  // 11..14: North straight (X: -hx -> +hx, Z = -(hz + rz))
  if (s < 14) {
    const t = (s - 11) / 3;
    return {
      x: -hx + t * (2 * hx),
      z: -(hz + rz),
      nx: 0,
      nz: -1,
      tx: 1,
      tz: 0,
    };
  }

  // 14..19: NE corner (angle -0.5*PI -> 0)
  if (s < 19) {
    const t = (s - 14) / 5;
    const angle = -Math.PI / 2 + t * (Math.PI / 2);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const nLen = Math.hypot(ca / rx, sa / rz);
    const nx = ca / rx / nLen;
    const nz = sa / rz / nLen;
    return {
      x: hx + rx * ca,
      z: -hz + rz * sa,
      nx,
      nz,
      tx: -nz,
      tz: nx,
    };
  }

  // 19..25: East straight (Z: -hz -> +hz, X = +(hx + rx))
  if (s < 25) {
    const t = (s - 19) / 6;
    return {
      x: hx + rx,
      z: -hz + t * (2 * hz),
      nx: 1,
      nz: 0,
      tx: 0,
      tz: 1,
    };
  }

  // 25..30: SE corner (angle 0 -> 0.5*PI)
  if (s < 30) {
    const t = (s - 25) / 5;
    const angle = t * (Math.PI / 2);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const nLen = Math.hypot(ca / rx, sa / rz);
    const nx = ca / rx / nLen;
    const nz = sa / rz / nLen;
    return {
      x: hx + rx * ca,
      z: hz + rz * sa,
      nx,
      nz,
      tx: -nz,
      tz: nx,
    };
  }

  // 30..33: South straight (X: +hx -> -hx, Z = +(hz + rz))
  if (s < 33) {
    const t = (s - 30) / 3;
    return {
      x: hx - t * (2 * hx),
      z: hz + rz,
      nx: 0,
      nz: 1,
      tx: -1,
      tz: 0,
    };
  }

  // 33..38: SW corner (angle 0.5*PI -> PI)
  const t = (s - 33) / 5;
  const angle = Math.PI / 2 + t * (Math.PI / 2);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const nLen = Math.hypot(ca / rx, sa / rz);
  const nx = ca / rx / nLen;
  const nz = sa / rz / nLen;
  return {
    x: -hx + rx * ca,
    z: hz + rz * sa,
    nx,
    nz,
    tx: -nz,
    tz: nx,
  };
}

export function sampleTierPosition3D(
  rawSlot: number,
  tier: TierType,
  vRowNormalized: number, // 0 at Row 1 .. 1 at back row
): { x: number; y: number; z: number; frame: BowlFrame3D } {
  const frame = evaluateBowlSlot3D(rawSlot);
  const run =
    tier === 'lower'
      ? STADIUM_3D.lowerInnerRun +
        vRowNormalized * (STADIUM_3D.lowerOuterRun - STADIUM_3D.lowerInnerRun)
      : STADIUM_3D.upperInnerRun +
        vRowNormalized * (STADIUM_3D.upperOuterRun - STADIUM_3D.upperInnerRun);

  const y =
    tier === 'lower'
      ? STADIUM_3D.lowerInnerHeight +
        vRowNormalized * (STADIUM_3D.lowerOuterHeight - STADIUM_3D.lowerInnerHeight)
      : STADIUM_3D.upperInnerHeight +
        vRowNormalized * (STADIUM_3D.upperOuterHeight - STADIUM_3D.upperInnerHeight);

  return {
    x: frame.x + frame.nx * run,
    y,
    z: frame.z + frame.nz * run,
    frame,
  };
}

export function computeSeatSpatialMetrics(seat: SeatItem): SeatSpatialMetrics {
  const section = SECTIONS_BY_ID.get(seat.sectionId);
  const tier: TierType = section?.tier ?? 'lower';
  const slotIndex = section?.slotIndex ?? 0;
  const totalRows = section?.rows ?? 24;

  const vNorm = totalRows > 1 ? (seat.row - 1) / (totalRows - 1) : 0;
  const rawSlot = slotIndex + (1 - seat.u);
  const pos = sampleTierPosition3D(rawSlot, tier, vNorm);

  // Place spectator eyes slightly forward (inward toward pitch) from backrest so chair behind never clips
  const eyeForwardOffset = 0.18;
  const eyeX = pos.x - pos.frame.nx * eyeForwardOffset;
  const eyeZ = pos.z - pos.frame.nz * eyeForwardOffset;
  const eyeY = pos.y + STADIUM_3D.seatEyeOffset;
  const eyePosition: [number, number, number] = [eyeX, eyeY, eyeZ];
  const seatWorldPosition: [number, number, number] = [pos.x, pos.y - 0.16, pos.z];
  const seatRotationY = Math.atan2(pos.frame.nx, pos.frame.nz);

  // Mid-section outward normal matches Stage 2 2D `focusRotationDeg` orientation identically
  const secMidFrame = evaluateBowlSlot3D(slotIndex + 0.5);
  const sectionOutwardNormal: [number, number] = [secMidFrame.nx, secMidFrame.nz];

  // Natural spectator gaze: blend between pitch centre spot (0,0,0) and perpendicular pitch line
  // so behind-the-goal seats look straight down the pitch through the near goal, halfway seats
  // look across the halfway line, and corner seats look naturally across the penalty/centre area!
  const lookX = pos.x * 0.08;
  const lookZ = pos.z * 0.14;
  const lookY = tier === 'upper' ? -3.4 : -1.75;
  const lookAtTarget: [number, number, number] = [lookX, lookY, lookZ];

  const goalLineRefZ = 53.5;
  const distToCentre = Math.hypot(pos.x, pos.z, pos.y);
  const distNorthGoal = Math.hypot(pos.x, pos.z - -goalLineRefZ, pos.y * 0.78);
  const distSouthGoal = Math.hypot(pos.x, pos.z - goalLineRefZ, pos.y * 0.78);
  const distNearestGoal = Math.min(distNorthGoal, distSouthGoal);

  return {
    eyePosition,
    lookAtTarget,
    seatWorldPosition,
    seatRotationY,
    sectionOutwardNormal,
    seatId: seat.id,
    seatNumber: seat.seat,
    toCentreSpotMeters: Math.round(distToCentre),
    toNearestGoalMeters: Math.round(distNearestGoal),
    abovePitchMeters: Math.round(pos.y),
  };
}
