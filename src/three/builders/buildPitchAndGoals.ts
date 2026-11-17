import * as THREE from 'three';
import { MATCH_INFO } from '../../data/matchInfo';
import { evaluateBowlSlot3D, STADIUM_3D } from '../../geometry/spatialMetrics';
import { TOTAL_SLOTS } from '../../data/stadiumConfig';

function createPitchTexture(): THREE.CanvasTexture {
  const isMobile =
    typeof window !== 'undefined' &&
    (window.innerWidth <= 540 || window.matchMedia?.('(pointer: coarse)').matches);
  const canvas = document.createElement('canvas');
  canvas.width = isMobile ? 1024 : 1536;
  canvas.height = isMobile ? 1536 : 2304;
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Base apron green
  ctx.fillStyle = '#2B7F3E';
  ctx.fillRect(0, 0, w, h);

  // Pitch inner margins (canvas maps 76m x 113m so apron blends seamlessly)
  const totalW = 76;
  const totalL = 113;
  const pxPerM_X = w / totalW;
  const pxPerM_Y = h / totalL;

  const pitchLeft = ((totalW - STADIUM_3D.pitchWidth) / 2) * pxPerM_X;
  const pitchTop = ((totalL - STADIUM_3D.pitchLength) / 2) * pxPerM_Y;
  const pitchW = STADIUM_3D.pitchWidth * pxPerM_X;
  const pitchH = STADIUM_3D.pitchLength * pxPerM_Y;

  // 18 alternating lush FIFA mowing stripes
  const stripeCount = 18;
  const stripeH = pitchH / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2F8742' : '#3A964D';
    ctx.fillRect(pitchLeft, pitchTop + i * stripeH, pitchW, stripeH + 1);
  }

  // Subtle longitudinal mowing sheen
  for (let j = 0; j < 10; j++) {
    ctx.fillStyle = j % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.018)';
    ctx.fillRect(pitchLeft + (j * pitchW) / 10, pitchTop, pitchW / 10, pitchH);
  }

  // Crisp white markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(3.5, 0.14 * pxPerM_X);
  ctx.lineJoin = 'miter';

  // Outer boundary
  ctx.strokeRect(pitchLeft, pitchTop, pitchW, pitchH);

  // Halfway line
  const midY = pitchTop + pitchH / 2;
  const midX = pitchLeft + pitchW / 2;
  ctx.beginPath();
  ctx.moveTo(pitchLeft, midY);
  ctx.lineTo(pitchLeft + pitchW, midY);
  ctx.stroke();

  // Centre circle (9.15m radius) & centre spot
  const circleR = 9.15 * pxPerM_X;
  ctx.beginPath();
  ctx.arc(midX, midY, circleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(midX, midY, 0.32 * pxPerM_X, 0, Math.PI * 2);
  ctx.fill();

  // Penalty boxes (40.32m x 16.5m), goal boxes (18.32m x 5.5m), spots (11m), & D-arcs
  const penW = 40.32 * pxPerM_X;
  const penH = 16.5 * pxPerM_Y;
  const goalAreaW = 18.32 * pxPerM_X;
  const goalAreaH = 5.5 * pxPerM_Y;
  const spotDist = 11.0 * pxPerM_Y;

  // North end (top)
  ctx.strokeRect(midX - penW / 2, pitchTop, penW, penH);
  ctx.strokeRect(midX - goalAreaW / 2, pitchTop, goalAreaW, goalAreaH);
  ctx.beginPath();
  ctx.arc(midX, pitchTop + spotDist, 0.28 * pxPerM_X, 0, Math.PI * 2);
  ctx.fill();
  const dAngle = Math.acos((16.5 - 11.0) / 9.15);
  ctx.beginPath();
  ctx.arc(midX, pitchTop + spotDist, circleR, Math.PI / 2 - dAngle, Math.PI / 2 + dAngle);
  ctx.stroke();

  // South end (bottom)
  ctx.strokeRect(midX - penW / 2, pitchTop + pitchH - penH, penW, penH);
  ctx.strokeRect(midX - goalAreaW / 2, pitchTop + pitchH - goalAreaH, goalAreaW, goalAreaH);
  ctx.beginPath();
  ctx.arc(midX, pitchTop + pitchH - spotDist, 0.28 * pxPerM_X, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    midX,
    pitchTop + pitchH - spotDist,
    circleR,
    -Math.PI / 2 - dAngle,
    -Math.PI / 2 + dAngle,
  );
  ctx.stroke();

  // 4 corner arcs (1m radius)
  const cornerR = 1.15 * pxPerM_X;
  const corners: Array<[number, number, number, number]> = [
    [pitchLeft, pitchTop, 0, Math.PI / 2],
    [pitchLeft + pitchW, pitchTop, Math.PI / 2, Math.PI],
    [pitchLeft + pitchW, pitchTop + pitchH, Math.PI, Math.PI * 1.5],
    [pitchLeft, pitchTop + pitchH, Math.PI * 1.5, Math.PI * 2],
  ];
  for (const [cx, cy, a0, a1] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, cornerR, a0, a1);
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

  ctx.fillStyle = '#081233';
  ctx.fillRect(0, 0, 1024, 64);

  // Top & bottom subtle accent strip
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(0, 0, 1024, 5);
  ctx.fillRect(0, 59, 1024, 5);

  ctx.font = '700 24px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  const items = [
    { text: 'THE FINAL', color: '#F5CA37' },
    { text: '·', color: '#60A5FA' },
    { text: MATCH_INFO.kickoffTime, color: '#FFFFFF' },
    { text: '·', color: '#60A5FA' },
    { text: 'BARCELONA — MILAN', color: '#FFFFFF' },
    { text: '·', color: '#60A5FA' },
  ];

  let x = 28;
  while (x < 1000) {
    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, x, 33);
      x += ctx.measureText(item.text).width + 22;
      if (x >= 1000) break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(16, 1);
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

  // Back sloped net plane
  const slopeLen = Math.hypot(goalH, bottomDepth - topDepth);
  const backNetGeo = new THREE.PlaneGeometry(goalW, slopeLen);
  const backNet = new THREE.Mesh(backNetGeo, netMat);
  const midDepth = (topDepth + bottomDepth) / 2;
  backNet.position.set(0, goalH / 2, zGoalLine + depthSign * midDepth);
  backNet.rotation.x = depthSign * Math.atan2(bottomDepth - topDepth, goalH);
  group.add(backNet);

  // Roof net plane
  const topNetGeo = new THREE.PlaneGeometry(goalW, topDepth);
  topNetGeo.rotateX(Math.PI / 2);
  const topNet = new THREE.Mesh(topNetGeo, netMat);
  topNet.position.set(0, goalH, zGoalLine + (depthSign * topDepth) / 2);
  group.add(topNet);

  // Side trapezoid nets
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
    const uvs = new Float32Array([
      0, 0, 0, 1, 0.5, 1,
      0, 0, 0.5, 1, 1, 0,
    ]);
    sideShape.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    sideShape.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    sideShape.computeVertexNormals();
    const sideMesh = new THREE.Mesh(sideShape, netMat);
    group.add(sideMesh);
    disposables.push(sideShape);
  }

  disposables.push(backNetGeo, topNetGeo);
  return group;
}

export function buildPitchAndGoals(scene: THREE.Scene): () => void {
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Dark stadium perimeter track floor covering full bowl base
  const trackGeo = new THREE.PlaneGeometry(160, 220);
  trackGeo.rotateX(-Math.PI / 2);
  const trackMat = new THREE.MeshStandardMaterial({
    color: '#11131A',
    roughness: 0.92,
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.y = -0.04;
  scene.add(trackMesh);
  disposables.push(trackGeo, trackMat);

  // 2. Green turf & FIFA pitch markings
  const pitchTex = createPitchTexture();
  const pitchGeo = new THREE.PlaneGeometry(76, 113);
  pitchGeo.rotateX(-Math.PI / 2);
  const pitchMat = new THREE.MeshLambertMaterial({ map: pitchTex });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.position.y = 0;
  scene.add(pitchMesh);
  disposables.push(pitchTex, pitchGeo, pitchMat);

  // 3. North & South 3D Goals with mesh nets
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

  // 4. Four yellow corner flags
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

  // 5. West sideline team dugouts / benches (visible from Section 104 in frames 051 & 057)
  const dugoutGeo = new THREE.BoxGeometry(1.9, 2.05, 9.6);
  const dugoutMat = new THREE.MeshStandardMaterial({
    color: '#12141B',
    roughness: 0.65,
    metalness: 0.2,
  });
  disposables.push(dugoutGeo, dugoutMat);

  for (const benchZ of [-10.5, 10.5]) {
    const dugout = new THREE.Mesh(dugoutGeo, dugoutMat);
    dugout.position.set(-37.2, 1.02, benchZ);
    scene.add(dugout);
  }

  // 6. Pitch-side LED perimeter advertising ribbon around the inner bowl
  const ledSegs = 152;
  const ledHeight = 1.02;
  const ledInset = -1.25; // slightly in front of Lower Tier front wall
  const ledPositions: number[] = [];
  const ledUvs: number[] = [];
  const ledIndices: number[] = [];

  for (let i = 0; i <= ledSegs; i++) {
    const rawSlot = (i / ledSegs) * TOTAL_SLOTS;
    const f = evaluateBowlSlot3D(rawSlot);
    const x = f.x + f.nx * ledInset;
    const z = f.z + f.nz * ledInset;
    const u = i / ledSegs;

    ledPositions.push(x, 0.05, z, x, 0.05 + ledHeight, z);
    ledUvs.push(u, 0, u, 1);

    if (i < ledSegs) {
      const base = i * 2;
      ledIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const ledGeo = new THREE.BufferGeometry();
  ledGeo.setAttribute('position', new THREE.Float32BufferAttribute(ledPositions, 3));
  ledGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ledUvs, 2));
  ledGeo.setIndex(ledIndices);
  ledGeo.computeVertexNormals();

  const ledTex = createLedRibbonTexture();
  const ledMat = new THREE.MeshBasicMaterial({
    map: ledTex,
    side: THREE.DoubleSide,
  });
  scene.add(new THREE.Mesh(ledGeo, ledMat));
  disposables.push(ledGeo, ledTex, ledMat);

  return () => {
    disposables.forEach((d) => d.dispose());
  };
}
