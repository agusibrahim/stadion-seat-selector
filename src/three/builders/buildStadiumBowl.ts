import * as THREE from 'three';
import { ALL_SECTIONS, TOTAL_SLOTS } from '../../data/stadiumConfig';
import { MATCH_INFO } from '../../data/matchInfo';
import { getSeatsForSection } from '../../geometry/seatLayout';
import {
  evaluateBowlSlot3D,
  sampleTierPosition3D,
  STADIUM_3D,
} from '../../geometry/spatialMetrics';
import type { TierType } from '../../types/stadium';

function createVipBoxesTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Warm illuminated hospitality lounge backdrop
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#5E411E');
  grad.addColorStop(0.22, '#DFAF63');
  grad.addColorStop(0.68, '#B8863D');
  grad.addColorStop(1, '#2D2114');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 128);

  // Dark structural mullions dividing individual VIP suites
  const boxCount = 16;
  const boxW = 1024 / boxCount;
  for (let i = 0; i < boxCount; i++) {
    const x = i * boxW;
    ctx.fillStyle = '#10131C';
    ctx.fillRect(x, 0, 8, 128);
    // Subtle ceiling downlight glow per box
    ctx.fillStyle = 'rgba(255, 238, 196, 0.25)';
    ctx.fillRect(x + 14, 14, boxW - 22, 16);
  }
  // Dark top & bottom framing transoms
  ctx.fillStyle = '#0D1018';
  ctx.fillRect(0, 0, 1024, 12);
  ctx.fillRect(0, 114, 1024, 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(19, 1);
  return tex;
}

function createMidTierLedTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#070E26';
  ctx.fillRect(0, 0, 1024, 64);

  ctx.fillStyle = '#D4A73A';
  ctx.fillRect(0, 56, 1024, 6);

  ctx.font = '700 22px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  let x = 20;
  while (x < 1000) {
    ctx.fillStyle = '#E2E8F0';
    const segment = `${MATCH_INFO.stageTitle}   ·   ${MATCH_INFO.kickoffTime}   ·   `;
    ctx.fillText(segment, x, 28);
    x += ctx.measureText(segment).width + 12;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(18, 1);
  return tex;
}

/**
 * Builds a continuous closed ribbon around the 38-slot bowl given two (run, y) profile points.
 */
function buildBowlBandGeometry(
  run0: number,
  y0: number,
  run1: number,
  y1: number,
  segments: number = 152,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const f = evaluateBowlSlot3D(u * TOTAL_SLOTS);
    positions.push(
      f.x + f.nx * run0,
      y0,
      f.z + f.nz * run0,
      f.x + f.nx * run1,
      y1,
      f.z + f.nz * run1,
    );
    uvs.push(u, 0, u, 1);

    if (i < segments) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds stepped concrete risers for a tier around the bowl.
 */
function buildSteppedTierGeometry(
  tier: TierType,
  rows: number,
  segments: number = 152,
): THREE.BufferGeometry {
  const innerRun = tier === 'lower' ? STADIUM_3D.lowerInnerRun - 0.45 : STADIUM_3D.upperInnerRun - 0.45;
  const outerRun = tier === 'lower' ? STADIUM_3D.lowerOuterRun + 0.55 : STADIUM_3D.upperOuterRun + 0.65;
  const innerY = tier === 'lower' ? STADIUM_3D.lowerInnerHeight - 0.25 : STADIUM_3D.upperInnerHeight - 0.25;
  const outerY = tier === 'lower' ? STADIUM_3D.lowerOuterHeight : STADIUM_3D.upperOuterHeight;

  // Profile polyline of (run, y) steps
  const profile: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    const t0 = r / rows;
    const t1 = (r + 1) / rows;
    const runStart = innerRun + t0 * (outerRun - innerRun);
    const runEnd = innerRun + t1 * (outerRun - innerRun);
    const yStep = innerY + t0 * (outerY - innerY);
    const yNext = innerY + t1 * (outerY - innerY);
    profile.push([runStart, yStep], [runEnd, yStep]);
    if (r === rows - 1) {
      profile.push([runEnd, yNext]);
    }
  }

  const pCount = profile.length;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const f = evaluateBowlSlot3D((i / segments) * TOTAL_SLOTS);
    for (let p = 0; p < pCount; p++) {
      const [run, y] = profile[p];
      positions.push(f.x + f.nx * run, y, f.z + f.nz * run);
    }

    if (i < segments) {
      const rowA = i * pCount;
      const rowB = (i + 1) * pCount;
      for (let p = 0; p < pCount - 1; p++) {
        indices.push(
          rowA + p,
          rowA + p + 1,
          rowB + p,
          rowA + p + 1,
          rowB + p + 1,
          rowB + p,
        );
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a clean low-poly L-shaped 3D stadium seat (seat cushion + vertical backrest)
 * oriented facing -Z in local space (rotated per instance to face inward toward the pitch).
 */
function createSingleSeatGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  function addBox(
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const box = new THREE.BoxGeometry(sx, sy, sz);
    box.translate(cx, cy, cz);
    const pos = box.getAttribute('position');
    const norm = box.getAttribute('normal');
    const idx = box.getIndex()!;
    const baseOffset = positions.length / 3;

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
    }
    for (let i = 0; i < idx.count; i++) {
      indices.push(baseOffset + idx.getX(i));
    }
    box.dispose();
  }

  // Seat pan
  addBox(0, 0.16, -0.04, 0.44, 0.08, 0.36);
  // Seat backrest (at +Z side of local seat so front faces -Z)
  addBox(0, 0.36, 0.13, 0.44, 0.36, 0.075);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

export interface TargetSeatUpdate {
  seatId: string;
  worldPos: [number, number, number];
  rotY: number;
  seatNumber: number;
  backScaleY: number;
  backrestVisible: boolean;
  badgeVisible: boolean;
}

export interface StadiumBowlHandle {
  updateTargetSeat: (state: TargetSeatUpdate | null) => void;
  dispose: () => void;
}

export function buildStadiumBowl(scene: THREE.Scene): StadiumBowlHandle {
  const disposables: Array<{ dispose: () => void }> = [];

  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#181C28',
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const darkWallMat = new THREE.MeshStandardMaterial({
    color: '#0F1118',
    roughness: 0.8,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
  disposables.push(concreteMat, darkWallMat);

  // 1. Stepped Lower & Upper concrete bowls
  const lowerStepsGeo = buildSteppedTierGeometry('lower', 24);
  const upperStepsGeo = buildSteppedTierGeometry('upper', 20);
  scene.add(new THREE.Mesh(lowerStepsGeo, concreteMat));
  scene.add(new THREE.Mesh(upperStepsGeo, concreteMat));
  disposables.push(lowerStepsGeo, upperStepsGeo);

  // 2. Pitch-side Lower Tier front wall
  const lowerFrontWallGeo = buildBowlBandGeometry(-0.48, 0, -0.48, STADIUM_3D.lowerInnerHeight);
  scene.add(new THREE.Mesh(lowerFrontWallGeo, darkWallMat));
  disposables.push(lowerFrontWallGeo);

  // 3. Mid-tier VIP Hospitality Boxes (warm glowing gold windows) + Mid-tier LED Fascia
  const vipTex = createVipBoxesTexture();
  const vipMat = new THREE.MeshBasicMaterial({ map: vipTex, side: THREE.DoubleSide });
  const vipBandGeo = buildBowlBandGeometry(
    STADIUM_3D.lowerOuterRun + 0.35,
    STADIUM_3D.lowerOuterHeight - 0.1,
    STADIUM_3D.lowerOuterRun + 0.35,
    STADIUM_3D.upperInnerHeight - 1.15,
  );
  scene.add(new THREE.Mesh(vipBandGeo, vipMat));
  disposables.push(vipTex, vipMat, vipBandGeo);

  const midLedTex = createMidTierLedTexture();
  const midLedMat = new THREE.MeshBasicMaterial({ map: midLedTex, side: THREE.DoubleSide });
  const midLedGeo = buildBowlBandGeometry(
    STADIUM_3D.upperInnerRun - 0.52,
    STADIUM_3D.upperInnerHeight - 1.2,
    STADIUM_3D.upperInnerRun - 0.52,
    STADIUM_3D.upperInnerHeight - 0.35,
  );
  scene.add(new THREE.Mesh(midLedGeo, midLedMat));
  disposables.push(midLedTex, midLedMat, midLedGeo);

  // 4. Upper Tier front parapet / curved black safety rail (visible in frame_011!)
  const upperRailFrontGeo = buildBowlBandGeometry(
    STADIUM_3D.upperInnerRun - 0.55,
    STADIUM_3D.upperInnerHeight - 0.38,
    STADIUM_3D.upperInnerRun - 0.55,
    STADIUM_3D.upperInnerHeight + 0.38,
  );
  const upperRailTopGeo = buildBowlBandGeometry(
    STADIUM_3D.upperInnerRun - 0.62,
    STADIUM_3D.upperInnerHeight + 0.38,
    STADIUM_3D.upperInnerRun - 0.36,
    STADIUM_3D.upperInnerHeight + 0.38,
  );
  scene.add(new THREE.Mesh(upperRailFrontGeo, darkWallMat));
  scene.add(new THREE.Mesh(upperRailTopGeo, darkWallMat));
  disposables.push(upperRailFrontGeo, upperRailTopGeo);

  // 5. Back perimeter stadium concourse wall behind Upper Tier
  const backWallGeo = buildBowlBandGeometry(
    STADIUM_3D.upperOuterRun + 0.65,
    STADIUM_3D.upperOuterHeight,
    STADIUM_3D.upperOuterRun + 0.65,
    31.2,
  );
  scene.add(new THREE.Mesh(backWallGeo, darkWallMat));
  disposables.push(backWallGeo);

  // 6. InstancedMesh 3D Royal-Blue Stadium Seats (1-to-1 unified with 2D `getSeatsForSection`!)
  const seatTransforms: Array<{
    seatId: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    shade: number;
  }> = [];

  for (const section of ALL_SECTIONS) {
    if (!section.available) continue;
    const totalRows = section.rows;
    const sectionSeats = getSeatsForSection(section.id);

    for (const s of sectionSeats) {
      const vNorm = totalRows > 1 ? (s.row - 1) / (totalRows - 1) : 0;
      const rawSlot = section.slotIndex + (1 - s.u);
      const pos = sampleTierPosition3D(rawSlot, section.tier, vNorm);
      const rotY = Math.atan2(pos.frame.nx, pos.frame.nz);
      const shade = ((section.id * 17 + s.row * 7 + s.seat * 13) % 9) / 9;

      seatTransforms.push({
        seatId: s.id,
        x: pos.x,
        y: pos.y - 0.16,
        z: pos.z,
        rotY,
        shade,
      });
    }
  }

  const seatGeo = createSingleSeatGeometry();
  const seatMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.52,
    metalness: 0.08,
  });

  const instancedSeats = new THREE.InstancedMesh(
    seatGeo,
    seatMat,
    seatTransforms.length,
  );

  const dummy = new THREE.Object3D();
  const colorA = new THREE.Color('#1537A8');
  const colorB = new THREE.Color('#1E47CC');
  const tempColor = new THREE.Color();
  const seatIndexById = new Map<string, number>();
  const savedMatrices = new Map<number, THREE.Matrix4>();
  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  for (let i = 0; i < seatTransforms.length; i++) {
    const t = seatTransforms[i];
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, t.rotY, 0);
    dummy.updateMatrix();
    instancedSeats.setMatrixAt(i, dummy.matrix);
    seatIndexById.set(t.seatId, i);

    tempColor.copy(colorA).lerp(colorB, t.shade);
    instancedSeats.setColorAt(i, tempColor);
  }

  let hiddenInstanceIdx: number | null = null;
  function hideBlueSeatByWorldPos(seatId: string, wx: number, wz: number) {
    let idx = seatIndexById.get(seatId) ?? null;
    if (idx === null) {
      // Fallback nearest-neighbor within 0.65m for curved trapezoid rows with variable column counts
      let bestDistSq = 0.45;
      for (let i = 0; i < seatTransforms.length; i++) {
        const dx = seatTransforms[i].x - wx;
        const dz = seatTransforms[i].z - wz;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          idx = i;
        }
      }
    }

    if (idx === hiddenInstanceIdx) return;

    // Restore previously hidden blue seat
    if (hiddenInstanceIdx !== null) {
      const orig = savedMatrices.get(hiddenInstanceIdx);
      if (orig) {
        instancedSeats.setMatrixAt(hiddenInstanceIdx, orig);
      }
      hiddenInstanceIdx = null;
    }

    if (idx !== null) {
      if (!savedMatrices.has(idx)) {
        const m = new THREE.Matrix4();
        instancedSeats.getMatrixAt(idx, m);
        savedMatrices.set(idx, m);
      }
      instancedSeats.setMatrixAt(idx, zeroMatrix);
      hiddenInstanceIdx = idx;
    }
    instancedSeats.instanceMatrix.needsUpdate = true;
  }

  instancedSeats.instanceMatrix.needsUpdate = true;
  if (instancedSeats.instanceColor) instancedSeats.instanceColor.needsUpdate = true;
  scene.add(instancedSeats);
  disposables.push(seatGeo, seatMat, instancedSeats);

  // 7. Highlighted Stadium-Gold 3D Target Seat Group (Cushion + Morphing Backrest + Seat Number Badge,
  // mirroring `cinema-seat-select` so you zoom straight onto your numbered 3D seat!)
  const targetGroup = new THREE.Group();
  targetGroup.visible = false;

  const goldSeatMat = new THREE.MeshStandardMaterial({
    color: '#F5CA37',
    emissive: '#9E7B12',
    emissiveIntensity: 0.52,
    roughness: 0.35,
    metalness: 0.06,
  });

  const targetCushionGeo = new THREE.BoxGeometry(0.5, 0.1, 0.42);
  const targetCushion = new THREE.Mesh(targetCushionGeo, goldSeatMat);
  targetCushion.position.set(0, 0.17, -0.04);
  targetGroup.add(targetCushion);

  const backHeight = 0.38;
  const targetBackGeo = new THREE.BoxGeometry(0.5, backHeight, 0.085);
  const targetBackrest = new THREE.Mesh(targetBackGeo, goldSeatMat);
  targetBackrest.position.set(0, 0.2 + backHeight * 0.5, 0.14);
  targetGroup.add(targetBackrest);

  // Crisp Seat Number Badge on top of the cushion
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 128;
  badgeCanvas.height = 128;
  const bCtx = badgeCanvas.getContext('2d')!;
  const badgeTex = new THREE.CanvasTexture(badgeCanvas);
  badgeTex.colorSpace = THREE.SRGBColorSpace;

  let renderedSeatNum = -1;
  function drawSeatBadge(num: number) {
    if (num === renderedSeatNum) return;
    renderedSeatNum = num;
    bCtx.clearRect(0, 0, 128, 128);
    bCtx.fillStyle = '#F5CA37';
    bCtx.beginPath();
    bCtx.roundRect(10, 10, 108, 108, 26);
    bCtx.fill();
    bCtx.fillStyle = '#0A0A0C';
    bCtx.font = '700 54px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText(String(num), 64, 67);
    badgeTex.needsUpdate = true;
  }

  const badgeGeo = new THREE.PlaneGeometry(0.38, 0.38);
  const badgeMat = new THREE.MeshBasicMaterial({
    map: badgeTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
  badgeMesh.rotation.x = -Math.PI / 2;
  badgeMesh.position.set(0, 0.23, -0.04);
  badgeMesh.renderOrder = 2;
  targetGroup.add(badgeMesh);

  scene.add(targetGroup);
  disposables.push(
    goldSeatMat,
    targetCushionGeo,
    targetBackGeo,
    badgeTex,
    badgeGeo,
    badgeMat,
  );

  return {
    updateTargetSeat: (state) => {
      if (!state) {
        targetGroup.visible = false;
        if (hiddenInstanceIdx !== null) {
          const orig = savedMatrices.get(hiddenInstanceIdx);
          if (orig) instancedSeats.setMatrixAt(hiddenInstanceIdx, orig);
          hiddenInstanceIdx = null;
          instancedSeats.instanceMatrix.needsUpdate = true;
        }
        return;
      }
      hideBlueSeatByWorldPos(state.seatId, state.worldPos[0], state.worldPos[2]);
      targetGroup.visible = true;
      targetGroup.position.set(
        state.worldPos[0],
        state.worldPos[1],
        state.worldPos[2],
      );
      targetGroup.rotation.set(0, state.rotY, 0);

      targetBackrest.visible = state.backrestVisible;
      targetBackrest.scale.y = state.backScaleY;
      targetBackrest.position.y = 0.2 + backHeight * 0.5 * state.backScaleY;

      badgeMesh.visible = state.badgeVisible;
      if (state.badgeVisible) {
        drawSeatBadge(state.seatNumber);
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
