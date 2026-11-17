import * as THREE from 'three';
import { MATCH_INFO } from '../../data/matchInfo';
import { STADIUM_3D } from '../../geometry/spatialMetrics';

/**
 * SUGBK Arena Floor Texture:
 * - Outer dark concrete moat
 * - Authentic 8-lane terracotta brick-red 400m Olympic running track with white lane ovals
 * - Lush green D-zones & 18-stripe FIFA 68m × 105m football pitch
 */
function createGbkArenaTexture(): THREE.CanvasTexture {
  const isMobile =
    typeof window !== 'undefined' &&
    (window.innerWidth <= 540 || window.matchMedia?.('(pointer: coarse)').matches);
  const canvas = document.createElement('canvas');
  canvas.width = isMobile ? 1024 : 1536;
  canvas.height = isMobile ? 1536 : 2304;
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // World plane spans 114m (X: -57..+57) × 168m (Z: -84..+84)
  const worldW = 114;
  const worldL = 168;
  const sx = w / worldW;
  const sy = h / worldL;
  const cx = w / 2;
  const cy = h / 2;

  // Helper to trace a stadium track oval (straightZ = ±27.0m, radius = R)
  function traceTrackOval(radiusM: number) {
    const straightHalfZ = 27.0;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy - straightHalfZ * sy,
      radiusM * sx,
      radiusM * sy,
      0,
      Math.PI,
      0,
      false,
    );
    ctx.ellipse(
      cx,
      cy + straightHalfZ * sy,
      radiusM * sx,
      radiusM * sy,
      0,
      0,
      Math.PI,
      false,
    );
    ctx.closePath();
  }

  // 1. Dark perimeter drainage moat
  ctx.fillStyle = '#11131A';
  ctx.fillRect(0, 0, w, h);

  // 2. Outer asphalt apron inside seating wall
  traceTrackOval(51.4);
  ctx.fillStyle = '#1B1E27';
  ctx.fill();

  // 3. Iconic SUGBK 8-Lane Brick-Red Tartan Running Track (R: 42.8m .. 50.2m)
  const trackOuterR = 50.2;
  const trackInnerR = 42.8;
  traceTrackOval(trackOuterR);
  ctx.fillStyle = '#9E2E24';
  ctx.fill();

  // Subtle alternating tartan lane sheen + 8 crisp white lane markings
  const lanes = 8;
  for (let lane = 0; lane <= lanes; lane++) {
    const r = trackInnerR + (lane / lanes) * (trackOuterR - trackInnerR);
    traceTrackOval(r);
    ctx.strokeStyle =
      lane === 0 || lane === lanes
        ? 'rgba(255, 255, 255, 0.82)'
        : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(1.2, (lane === 0 ? 0.14 : 0.06) * sx);
    ctx.stroke();
  }

  // 4. Inner green turf infield (D-zones + pitch apron) inside Lane 1 curb
  traceTrackOval(trackInnerR);
  ctx.fillStyle = '#277639';
  ctx.fill();

  // 5. FIFA 68m × 105m Football Pitch with 18 mowing stripes
  const pitchLeft = cx - (STADIUM_3D.pitchWidth / 2) * sx;
  const pitchTop = cy - (STADIUM_3D.pitchLength / 2) * sy;
  const pitchW = STADIUM_3D.pitchWidth * sx;
  const pitchH = STADIUM_3D.pitchLength * sy;

  const stripeCount = 18;
  const stripeH = pitchH / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2E8742' : '#39964D';
    ctx.fillRect(pitchLeft, pitchTop + i * stripeH, pitchW, stripeH + 1);
  }

  for (let j = 0; j < 10; j++) {
    ctx.fillStyle = j % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.018)';
    ctx.fillRect(pitchLeft + (j * pitchW) / 10, pitchTop, pitchW / 10, pitchH);
  }

  // Crisp white FIFA pitch markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.93)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.93)';
  ctx.lineWidth = Math.max(2.5, 0.14 * sx);

  ctx.strokeRect(pitchLeft, pitchTop, pitchW, pitchH);

  // Halfway line & centre circle
  ctx.beginPath();
  ctx.moveTo(pitchLeft, cy);
  ctx.lineTo(pitchLeft + pitchW, cy);
  ctx.stroke();

  const circleR = 9.15 * sx;
  ctx.beginPath();
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 0.32 * sx, 0, Math.PI * 2);
  ctx.fill();

  // Penalty boxes & goal boxes
  const penW = 40.32 * sx;
  const penH = 16.5 * sy;
  const goalAreaW = 18.32 * sx;
  const goalAreaH = 5.5 * sy;
  const spotDist = 11.0 * sy;
  const dAngle = Math.acos((16.5 - 11.0) / 9.15);

  // Utara (top)
  ctx.strokeRect(cx - penW / 2, pitchTop, penW, penH);
  ctx.strokeRect(cx - goalAreaW / 2, pitchTop, goalAreaW, goalAreaH);
  ctx.beginPath();
  ctx.arc(cx, pitchTop + spotDist, 0.28 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, pitchTop + spotDist, circleR, Math.PI / 2 - dAngle, Math.PI / 2 + dAngle);
  ctx.stroke();

  // Selatan (bottom)
  ctx.strokeRect(cx - penW / 2, pitchTop + pitchH - penH, penW, penH);
  ctx.strokeRect(cx - goalAreaW / 2, pitchTop + pitchH - goalAreaH, goalAreaW, goalAreaH);
  ctx.beginPath();
  ctx.arc(cx, pitchTop + pitchH - spotDist, 0.28 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    cx,
    pitchTop + pitchH - spotDist,
    circleR,
    -Math.PI / 2 - dAngle,
    -Math.PI / 2 + dAngle,
  );
  ctx.stroke();

  // Corner arcs
  const cornerR = 1.15 * sx;
  const corners: Array<[number, number, number, number]> = [
    [pitchLeft, pitchTop, 0, Math.PI / 2],
    [pitchLeft + pitchW, pitchTop, Math.PI / 2, Math.PI],
    [pitchLeft + pitchW, pitchTop + pitchH, Math.PI, Math.PI * 1.5],
    [pitchLeft, pitchTop + pitchH, Math.PI * 1.5, Math.PI * 2],
  ];
  for (const [px, py, a0, a1] of corners) {
    ctx.beginPath();
    ctx.arc(px, py, cornerR, a0, a1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createGoalNetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(245, 248, 255, 0.65)';
  ctx.lineWidth = 3;
  const step = 16;
  for (let x = 0; x <= 128; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 4);
  return tex;
}

function createLedRibbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#091029';
  ctx.fillRect(0, 0, 1024, 64);

  // Persib Blue & Persija Red-Orange accent strips
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(0, 0, 1024, 5);
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(0, 59, 1024, 5);

  ctx.font = '700 23px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  const items = [
    { text: 'GELORA BUNG KARNO', color: '#F5CA37' },
    { text: '·', color: '#94A3B8' },
    { text: 'PERSIB', color: '#60A5FA' },
    { text: 'VS', color: '#FFFFFF' },
    { text: 'PERSIJA', color: '#FB923C' },
    { text: '·', color: '#94A3B8' },
    { text: MATCH_INFO.kickoffTime, color: '#FFFFFF' },
    { text: '·', color: '#94A3B8' },
  ];

  let x = 22;
  while (x < 1000) {
    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, x, 33);
      x += ctx.measureText(item.text).width + 18;
      if (x >= 1000) break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(14, 1);
  return tex;
}

function buildGoalGroup(
  zGoalLine: number,
  depthSign: number,
  postMat: THREE.Material,
  netMat: THREE.Material,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const group = new THREE.Group();
  const goalW = 7.32;
  const goalH = 2.44;
  const topDepth = 0.78;
  const bottomDepth = 1.48;
  const r = 0.065;

  const postGeo = new THREE.CylinderGeometry(r, r, goalH, 12);
  const crossbarGeo = new THREE.CylinderGeometry(r, r, goalW + r * 2, 12);
  crossbarGeo.rotateZ(Math.PI / 2);
  disposables.push(postGeo, crossbarGeo);

  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-goalW / 2, goalH / 2, zGoalLine);
  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(goalW / 2, goalH / 2, zGoalLine);
  const crossbar = new THREE.Mesh(crossbarGeo, postMat);
  crossbar.position.set(0, goalH, zGoalLine);
  group.add(leftPost, rightPost, crossbar);

  const slopeLen = Math.hypot(goalH, bottomDepth - topDepth);
  const backNetGeo = new THREE.PlaneGeometry(goalW, slopeLen);
  const backNet = new THREE.Mesh(backNetGeo, netMat);
  const midDepth = (topDepth + bottomDepth) / 2;
  backNet.position.set(0, goalH / 2, zGoalLine + depthSign * midDepth);
  backNet.rotation.x = depthSign * Math.atan2(bottomDepth - topDepth, goalH);
  group.add(backNet);

  const topNetGeo = new THREE.PlaneGeometry(goalW, topDepth);
  topNetGeo.rotateX(Math.PI / 2);
  const topNet = new THREE.Mesh(topNetGeo, netMat);
  topNet.position.set(0, goalH, zGoalLine + (depthSign * topDepth) / 2);
  group.add(topNet);

  for (const side of [-1, 1]) {
    const sideShape = new THREE.BufferGeometry();
    const x = (side * goalW) / 2;
    const z0 = zGoalLine;
    const zTop = zGoalLine + depthSign * topDepth;
    const zBot = zGoalLine + depthSign * bottomDepth;
    const vertices = new Float32Array([
      x, 0, z0,
      x, goalH, z0,
      x, goalH, zTop,
      x, 0, z0,
      x, goalH, zTop,
      x, 0, zBot,
    ]);
    const uvs = new Float32Array([0, 0, 0, 1, 0.5, 1, 0, 0, 0.5, 1, 1, 0]);
    sideShape.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    sideShape.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    sideShape.computeVertexNormals();
    group.add(new THREE.Mesh(sideShape, netMat));
    disposables.push(sideShape);
  }

  disposables.push(backNetGeo, topNetGeo);
  return group;
}

/**
 * Builds the pitch-side rectangular LED perimeter board sitting just outside
 * the football touchlines & goal lines (inside the red GBK running track!).
 */
function buildPitchLedBoardGeometry(): THREE.BufferGeometry {
  const halfX = 37.2;
  const halfZ = 56.2;
  const cornerR = 4.0;
  const height = 0.98;
  const segsPerCorner = 8;

  const pts: Array<[number, number]> = [];
  const cornerDefs: Array<[number, number, number, number]> = [
    [halfX - cornerR, -halfZ + cornerR, -Math.PI / 2, 0],
    [halfX - cornerR, halfZ - cornerR, 0, Math.PI / 2],
    [-halfX + cornerR, halfZ - cornerR, Math.PI / 2, Math.PI],
    [-halfX + cornerR, -halfZ + cornerR, Math.PI, Math.PI * 1.5],
  ];

  for (const [cx, cz, a0, a1] of cornerDefs) {
    for (let i = 0; i <= segsPerCorner; i++) {
      const a = a0 + (i / segsPerCorner) * (a1 - a0);
      pts.push([cx + Math.cos(a) * cornerR, cz + Math.sin(a) * cornerR]);
    }
  }
  pts.push(pts[0]);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let totalDist = 0;
  const dists = [0];

  for (let i = 1; i < pts.length; i++) {
    totalDist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    dists.push(totalDist);
  }

  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const u = dists[i] / totalDist;
    positions.push(x, 0.04, z, x, 0.04 + height, z);
    uvs.push(u, 0, u, 1);

    if (i < pts.length - 1) {
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

export function buildPitchAndGoals(scene: THREE.Scene): () => void {
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Dark base floor under entire oval bowl
  const baseGeo = new THREE.PlaneGeometry(180, 240);
  baseGeo.rotateX(-Math.PI / 2);
  const baseMat = new THREE.MeshBasicMaterial({ color: '#11131A' });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.05;
  scene.add(baseMesh);
  disposables.push(baseGeo, baseMat);

  // 2. SUGBK Red Running Track + Green FIFA Pitch Texture
  const arenaTex = createGbkArenaTexture();
  const arenaGeo = new THREE.PlaneGeometry(114, 168);
  arenaGeo.rotateX(-Math.PI / 2);
  const arenaMat = new THREE.MeshLambertMaterial({ map: arenaTex });
  scene.add(new THREE.Mesh(arenaGeo, arenaMat));
  disposables.push(arenaTex, arenaGeo, arenaMat);

  // 3. North & South 3D Goals with taut white mesh nets
  const postMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.3,
    metalness: 0.15,
  });
  const netTex = createGoalNetTexture();
  const netMat = new THREE.MeshBasicMaterial({
    map: netTex,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(postMat, netTex, netMat);

  scene.add(buildGoalGroup(-STADIUM_3D.pitchLength / 2, -1, postMat, netMat, disposables));
  scene.add(buildGoalGroup(STADIUM_3D.pitchLength / 2, 1, postMat, netMat, disposables));

  // 4. Corner flags
  const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6);
  const poleMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const flagGeo = new THREE.PlaneGeometry(0.42, 0.3);
  const flagMat = new THREE.MeshBasicMaterial({
    color: '#FACC15',
    side: THREE.DoubleSide,
  });
  disposables.push(poleGeo, poleMat, flagGeo, flagMat);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = (sx * STADIUM_3D.pitchWidth) / 2;
      const cz = (sz * STADIUM_3D.pitchLength) / 2;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(cx, 0.75, cz);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(cx + 0.21, 1.35, cz);
      scene.add(pole, flag);
    }
  }

  // 5. Team Dugouts / Player Benches on Barat sideline (inside track apron)
  const dugoutGeo = new THREE.BoxGeometry(1.75, 2.0, 9.2);
  const dugoutMat = new THREE.MeshStandardMaterial({
    color: '#13161E',
    roughness: 0.65,
    metalness: 0.2,
  });
  disposables.push(dugoutGeo, dugoutMat);

  for (const benchZ of [-10.5, 10.5]) {
    const dugout = new THREE.Mesh(dugoutGeo, dugoutMat);
    dugout.position.set(-39.6, 1.0, benchZ);
    scene.add(dugout);
  }

  // 6. Pitch-side LED advertising board: glowing LED screen facing inward across the pitch,
  // with realistic matte black aluminum cabinet backing facing outward toward the track!
  const ledGeo = buildPitchLedBoardGeometry();
  const ledTex = createLedRibbonTexture();
  const ledScreenMat = new THREE.MeshBasicMaterial({
    map: ledTex,
    side: THREE.BackSide,
  });
  const ledBackCabinetMat = new THREE.MeshStandardMaterial({
    color: '#11141D',
    roughness: 0.75,
    side: THREE.FrontSide,
  });
  scene.add(new THREE.Mesh(ledGeo, ledScreenMat));
  scene.add(new THREE.Mesh(ledGeo, ledBackCabinetMat));
  disposables.push(ledGeo, ledTex, ledScreenMat, ledBackCabinetMat);

  return () => {
    disposables.forEach((d) => d.dispose());
  };
}
