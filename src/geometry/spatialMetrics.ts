import { SECTIONS_BY_ID } from '../data/stadiumConfig';
import type { SeatItem, SeatSpatialMetrics, TierType } from '../types/stadium';
import { slotToEllipseAngle } from './bowlCurve';

/**
 * SUGBK (Stadion Utama Gelora Bung Karno) 3D World Coordinates (1 unit = 1 meter)
 * -------------------------------------------------------------------------------
 * - Origin (0, 0, 0) = Pitch centre spot
 * - Pitch: 68m wide (X: -34 .. +34) × 105m long (Z: -52.5 .. +52.5)
 * - 8-Lane 400m Red Athletics Track wraps around the pitch inside the oval bowl
 * - Inner Bowl Ellipse: semi-minor X = 53.5m (Barat–Timur), semi-major Z = 79.5m (Utara–Selatan)
 */
export const STADIUM_3D = {
  pitchLength: 105,
  pitchWidth: 68,
  innerRadiusX: 53.5, // Barat–Timur inner seating wall (clears 8-lane track + moat)
  innerRadiusZ: 79.5, // Utara–Selatan inner seating wall (clears track D-curve + moat)

  // Tribun Bawah (22 rows)
  lowerInnerRun: 0.0,
  lowerOuterRun: 18.2,
  lowerInnerHeight: 2.1, // elevated above GBK perimeter moat wall
  lowerOuterHeight: 12.6,

  // Tribun Atas (20 rows, cantilevered above Royal/Skybox concourse)
  upperInnerRun: 17.8,
  upperOuterRun: 34.8,
  upperInnerHeight: 16.8,
  upperOuterHeight: 28.6,

  seatEyeOffset: 0.64,
} as const;

export interface BowlFrame3D {
  x: number;
  z: number;
  nx: number;
  nz: number;
  tx: number;
  tz: number;
}

export function evaluateBowlSlot3D(rawSlot: number): BowlFrame3D {
  // Uses exact same arc-length angle mapping as 2D `bowlCurve.ts`!
  const phi = slotToEllipseAngle(rawSlot);
  const { innerRadiusX: rx, innerRadiusZ: rz } = STADIUM_3D;

  const cp = Math.cos(phi);
  const sp = Math.sin(phi);

  const x = rx * cp;
  const z = rz * sp;

  const gx = cp / rx;
  const gz = sp / rz;
  const gLen = Math.hypot(gx, gz) || 1;
  const nx = gx / gLen;
  const nz = gz / gLen;

  return {
    x,
    z,
    nx,
    nz,
    tx: -nz,
    tz: nx,
  };
}

export function sampleTierPosition3D(
  rawSlot: number,
  tier: TierType,
  vRowNormalized: number,
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
  const totalRows = section?.rows ?? 22;

  const vNorm = totalRows > 1 ? (seat.row - 1) / (totalRows - 1) : 0;
  const rawSlot = slotIndex + (1 - seat.u);
  const pos = sampleTierPosition3D(rawSlot, tier, vNorm);

  const eyeForwardOffset = 0.18;
  const eyeX = pos.x - pos.frame.nx * eyeForwardOffset;
  const eyeZ = pos.z - pos.frame.nz * eyeForwardOffset;
  const eyeY = pos.y + STADIUM_3D.seatEyeOffset;
  const eyePosition: [number, number, number] = [eyeX, eyeY, eyeZ];
  const seatWorldPosition: [number, number, number] = [pos.x, pos.y - 0.16, pos.z];
  const seatRotationY = Math.atan2(pos.frame.nx, pos.frame.nz);

  const secMidFrame = evaluateBowlSlot3D(slotIndex + 0.5);
  const sectionOutwardNormal: [number, number] = [secMidFrame.nx, secMidFrame.nz];

  const lookX = pos.x * 0.07;
  const lookZ = pos.z * 0.12;
  const lookY = tier === 'upper' ? -3.2 : -1.5;
  const lookAtTarget: [number, number, number] = [lookX, lookY, lookZ];

  const halfPitchZ = STADIUM_3D.pitchLength / 2;
  const distToCentre = Math.hypot(pos.x, pos.z, pos.y);
  const distNorthGoal = Math.hypot(pos.x, pos.z - -halfPitchZ, pos.y * 0.85);
  const distSouthGoal = Math.hypot(pos.x, pos.z - halfPitchZ, pos.y * 0.85);
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
