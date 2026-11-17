import type { SeatButtonScreenMetrics, SeatSpatialMetrics } from '../types/stadium';

/**
 * Ray-Pinned 360° Stadium Zoom-In & Spherical Head-Look Kernel
 * ------------------------------------------------------------
 * Generalizes the proven `cinema_engine.rs` ray-pinned exponential zoom algorithm
 * to an arbitrary 360° stadium bowl section using the right-handed orthonormal basis:
 *   - B = (nx, 0, nz)   : Outward up the stadium steps (Screen DOWN at t=0)
 *   - F = (-nx, 0, -nz) : Inward toward the pitch (Screen UP at t=0)
 *   - R = (nz, 0, -nx)  : Rightward along the row when facing pitch (Screen RIGHT at t=0)
 *   - W = (0, 1, 0)     : World UP
 */

export interface RayPinnedFrameOutput {
  pos: [number, number, number];
  look: [number, number, number];
  up: [number, number, number];
  fovDeg: number;
  /** Weight in [0, 1] for shifting optical center above bottom sheet in seated POV */
  viewOffsetWeight: number;

  // Synchronized 2D Map Layer CSS Perspective Zoom transforms
  syncScale: number;
  syncTiltDeg: number;
  syncOpacity: number;
  syncBlurPx: number;

  // 3D Highlighted Yellow Seat state
  backScaleY: number;
  backrestVisible: boolean;
  badgeVisible: boolean;

  // Optical Motion-Blur Shader parameters
  zoomBlurStrength: number;
  verticalBlurStreak: number;
  focusUvX: number;
  focusUvY: number;
}

function clamp(v: number, minV: number, maxV: number): number {
  return v < minV ? minV : v > maxV ? maxV : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Pose3D {
  pos: [number, number, number];
  look: [number, number, number];
  up: [number, number, number];
}

/**
 * Computes a 3D camera pose at distance `h` and tilt `thetaRad` such that
 * `targetWorld` projects onto the EXACT screen NDC pixel `(ndcX, ndcY)`.
 */
function computeStadiumRayPinnedPose(
  targetWorld: [number, number, number],
  bx: number,
  bz: number,
  ndcX: number,
  ndcY: number,
  h: number,
  thetaRad: number,
  fovDeg: number,
  aspect: number,
): Pose3D {
  // Right-handed section basis: R = (bz, 0, -bx), W = (0, 1, 0), B = (bx, 0, bz)
  const rx = bz;
  const rz = -bx;

  const tanHalfFov = Math.tan((fovDeg * 0.5 * Math.PI) / 180);
  const tx = ndcX * tanHalfFov * aspect;
  const ty = ndcY * tanHalfFov;

  const cosT = Math.cos(thetaRad);
  const sinT = Math.sin(thetaRad);

  const denom = Math.max(0.18, cosT - ty * sinT);
  const dz = (-ty * h) / denom;
  const zDepth = (h * cosT) / denom;
  const dx = tx * zDepth;

  // Pivot point in the horizontal plane of the target seat: T - dx*R - dz*B
  const lookX = targetWorld[0] - dx * rx - dz * bx;
  const lookY = targetWorld[1];
  const lookZ = targetWorld[2] - dx * rz - dz * bz;

  // Camera sits at look + h*cos(theta)*W + h*sin(theta)*B
  const posX = lookX + h * sinT * bx;
  const posY = lookY + h * cosT;
  const posZ = lookZ + h * sinT * bz;

  // Camera up vector: sin(theta)*W - cos(theta)*B (strictly orthogonal to view ray!)
  const upX = -cosT * bx;
  const upY = sinT;
  const upZ = -cosT * bz;
  const upLen = Math.hypot(upX, upY, upZ) || 1;

  return {
    pos: [posX, posY, posZ],
    look: [lookX, lookY, lookZ],
    up: [upX / upLen, upY / upLen, upZ / upLen],
  };
}

/**
 * Rodrigues spherical head-look rotation around world Y (yaw) and camera horizontal right axis (pitch).
 */
function applySphericalHeadLook(
  eye: [number, number, number],
  baseTarget: [number, number, number],
  yawRad: number,
  pitchRad: number,
  weight: number,
): [number, number, number] {
  if (weight <= 0.0001 || (Math.abs(yawRad) < 0.0001 && Math.abs(pitchRad) < 0.0001)) {
    return baseTarget;
  }

  let dx = baseTarget[0] - eye[0];
  let dy = baseTarget[1] - eye[1];
  let dz = baseTarget[2] - eye[2];
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.001) return baseTarget;

  dx /= dist;
  dy /= dist;
  dz /= dist;

  // 1. Yaw around world Y (0, 1, 0)
  const yAngle = yawRad * weight;
  const cy = Math.cos(yAngle);
  const sy = Math.sin(yAngle);
  const dx1 = dx * cy + dz * sy;
  const dy1 = dy;
  const dz1 = -dx * sy + dz * cy;

  // 2. Pitch around horizontal right axis = normalize(cross(dir1, worldUp)) = normalize((-dz1, 0, dx1))
  const rLen = Math.max(1e-6, Math.hypot(dz1, dx1));
  const rx = -dz1 / rLen;
  const rz = dx1 / rLen;

  const pAngle = -pitchRad * weight;
  const cp = Math.cos(pAngle);
  const sp = Math.sin(pAngle);
  const dot = rx * dx1 + rz * dz1;

  const cx = -rz * dy1;
  const cyCross = rz * dx1 - rx * dz1;
  const cz = rx * dy1;

  const dx2 = dx1 * cp + cx * sp + rx * dot * (1 - cp);
  const dy2 = dy1 * cp + cyCross * sp;
  const dz2 = dz1 * cp + cz * sp + rz * dot * (1 - cp);

  return [eye[0] + dx2 * dist, eye[1] + dy2 * dist, eye[2] + dz2 * dist];
}

export function computeStadiumCameraFrame(
  metrics: SeatSpatialMetrics,
  rawT: number,
  btn: SeatButtonScreenMetrics,
  frameW: number,
  frameH: number,
  yawRad: number,
  pitchRad: number,
  directionSign: 1 | -1 | 0 = 0,
): RayPinnedFrameOutput {
  const t = clamp(rawT, 0, 1);
  const aspect = Math.max(0.25, frameW / Math.max(1, frameH));
  const [bx, bz] = metrics.sectionOutwardNormal;

  // Target point on top of the 3D yellow chair cushion
  const badgeTarget: [number, number, number] = [
    metrics.seatWorldPosition[0] - bx * 0.04,
    metrics.seatWorldPosition[1] + 0.22,
    metrics.seatWorldPosition[2] - bz * 0.04,
  ];

  const fovOverview = 40;
  const fovTiltZoom = 46;
  const fovPov = 58;

  // Altitude h0 where the 0.48m-wide 3D seat projects to the exact 2D seat button width on screen!
  const btnNdcW = (Math.max(5.5, btn.btnWidth) / Math.max(320, frameW)) * 2.0;
  const tanHalfFov0 = Math.tan((fovOverview * 0.5 * Math.PI) / 180);
  const h0 = clamp(0.48 / (btnNdcW * tanHalfFov0 * aspect), 22, 92);
  const h1 = 4.1; // zooms exponentially all the way down to 4.1m right above the chair!
  const tiltAngle1 = (30 * Math.PI) / 180;

  const split = 0.54;
  let pos: [number, number, number];
  let look: [number, number, number];
  let up: [number, number, number];
  let fovDeg: number;
  let viewOffsetWeight = 0;

  if (t <= split) {
    // Phase 1: Exponential Ray-Pinned Real Zoom-In + Perspective Tilt
    const u = easeInOutCubic(clamp(t / split, 0, 1));
    const h = h0 * Math.pow(h1 / h0, u);
    const theta = lerp(0, tiltAngle1, u);
    fovDeg = lerp(fovOverview, fovTiltZoom, u);

    const pose = computeStadiumRayPinnedPose(
      badgeTarget,
      bx,
      bz,
      btn.btnNdcX,
      btn.btnNdcY,
      h,
      theta,
      fovDeg,
      aspect,
    );
    pos = pose.pos;
    look = pose.look;
    up = pose.up;
    viewOffsetWeight = 0;
  } else {
    // Phase 2: Smooth C1 Settle Into Seated Eye Position + Sweep Gaze Up Across Pitch
    const p1 = computeStadiumRayPinnedPose(
      badgeTarget,
      bx,
      bz,
      btn.btnNdcX,
      btn.btnNdcY,
      h1,
      tiltAngle1,
      fovTiltZoom,
      aspect,
    );

    const rawU = clamp((t - split) / (1 - split), 0, 1);
    const posU = easeInOutCubic(rawU);
    const lookU = Math.pow(rawU, 1.85);

    pos = [
      lerp(p1.pos[0], metrics.eyePosition[0], posU),
      lerp(p1.pos[1], metrics.eyePosition[1], posU),
      lerp(p1.pos[2], metrics.eyePosition[2], posU),
    ];

    const baseLook: [number, number, number] = [
      lerp(p1.look[0], metrics.lookAtTarget[0], lookU),
      lerp(p1.look[1], metrics.lookAtTarget[1], lookU),
      lerp(p1.look[2], metrics.lookAtTarget[2], lookU),
    ];

    look = applySphericalHeadLook(pos, baseLook, yawRad, pitchRad, posU);

    const ux = lerp(p1.up[0], 0, posU);
    const uy = lerp(p1.up[1], 1, posU);
    const uz = lerp(p1.up[2], 0, posU);
    const uLen = Math.hypot(ux, uy, uz) || 1;
    up = [ux / uLen, uy / uLen, uz / uLen];

    fovDeg = lerp(fovTiltZoom, fovPov, posU);
    viewOffsetWeight = posU;
  }

  // Synchronized 2D Map Layer zoom scale (`1x -> ~10x`), 3D tilt, blur & crossfade
  const fadeEnd = 0.38;
  let syncScale = 1;
  let syncTiltDeg = 0;
  let syncOpacity = 1;
  let syncBlurPx = 0;

  if (t <= 0) {
    syncScale = 1;
    syncTiltDeg = 0;
    syncOpacity = 1;
    syncBlurPx = 0;
  } else if (t >= fadeEnd) {
    syncScale = 1;
    syncTiltDeg = 26;
    syncOpacity = 0;
    syncBlurPx = 0;
  } else {
    const uFade = clamp(t / fadeEnd, 0, 1);
    const uSplit = easeInOutCubic(clamp(t / split, 0, 1));
    const hCur = h0 * Math.pow(h1 / h0, uSplit);
    syncScale = Math.max(1, h0 / hCur);
    syncTiltDeg = easeInOutCubic(uFade) * 26;
    syncOpacity = 1 - Math.pow(uFade, 1.32);
    syncBlurPx =
      directionSign !== 0 ? Math.sin(Math.PI * uFade) * 3.8 + uFade * 4.2 : 0;
  }

  // 3D Target Chair backrest rise & disappearance right before sitting
  const morphU = easeInOutCubic(clamp((t - 0.34) / 0.36, 0, 1));
  const backScaleY = lerp(0.18, 1.0, morphU);
  const backrestVisible = t <= 0.86;
  const badgeVisible = t < 0.82;

  // Optical Radial-Zoom + Head-Sweep Fast Motion Blur envelope
  let zoomBlurStrength = 0;
  let verticalBlurStreak = 0;
  const seatUvX = clamp(btn.btnNdcX * 0.5 + 0.5, 0.12, 0.88);
  const seatUvY = clamp(btn.btnNdcY * 0.5 + 0.5, 0.12, 0.88);
  let focusUvX = seatUvX;
  let focusUvY = seatUvY;

  if (directionSign !== 0 && t > 0.01 && t < 0.995) {
    // Phase 1 velocity: exponential zoom rush directly into `(seatUvX, seatUvY)`
    const phase1Bell =
      t < 0.65 ? Math.pow(Math.sin((Math.PI * clamp(t / 0.65, 0, 1))), 1.25) : 0;
    // Phase 2 velocity: upward head-sweep across the pitch into seated POV
    const phase2Bell =
      t > 0.42
        ? Math.pow(Math.sin(Math.PI * clamp((t - 0.42) / 0.58, 0, 1)), 1.35)
        : 0;

    zoomBlurStrength =
      directionSign * (0.165 * phase1Bell + 0.065 * phase2Bell);
    verticalBlurStreak = directionSign * 0.068 * phase2Bell;

    // Smoothly drift blur focus from the seat pixel toward viewport center during Phase 2
    const drift = clamp((t - 0.48) / 0.45, 0, 1);
    focusUvX = lerp(seatUvX, 0.5, drift);
    focusUvY = lerp(seatUvY, 0.55, drift);
  }

  return {
    pos,
    look,
    up,
    fovDeg,
    viewOffsetWeight,
    syncScale,
    syncTiltDeg,
    syncOpacity,
    syncBlurPx,
    backScaleY,
    backrestVisible,
    badgeVisible,
    zoomBlurStrength,
    verticalBlurStreak,
    focusUvX,
    focusUvY,
  };
}
