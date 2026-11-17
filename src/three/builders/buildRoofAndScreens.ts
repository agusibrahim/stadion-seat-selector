import * as THREE from 'three';
import { MATCH_INFO } from '../../data/matchInfo';
import { TOTAL_SLOTS } from '../../data/stadiumConfig';
import { evaluateBowlSlot3D, STADIUM_3D } from '../../geometry/spatialMetrics';

/**
 * SUGBK Iconic "Temu Gelang" Radial Steel-Ribbed Canopy Texture
 */
function createTemuGelangRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1B1F2B');
  grad.addColorStop(0.75, '#242A38');
  grad.addColorStop(1, '#2E3546');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Prominent radial structural steel ribs converging toward the inner oval ring
  ctx.strokeStyle = '#384156';
  ctx.lineWidth = 8;
  const radialRibs = 8;
  for (let i = 0; i <= radialRibs; i++) {
    const x = (i * 512) / radialRibs;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Secondary circumferential purlin rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 4;
  for (let j = 1; j < 6; j++) {
    const y = (j * 512) / 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(18, 1);
  return tex;
}

function createFloodlightStripTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#141720';
  ctx.fillRect(0, 0, 512, 64);

  const count = 16;
  const w = 512 / count;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = '#FFFDF7';
    ctx.fillRect(i * w + 4, 10, w - 8, 44);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(30, 1);
  return tex;
}

function createGbkScoreboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 440;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#07080D';
  ctx.fillRect(0, 0, 1024, 440);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 1012, 428);

  // Top header: "EL CLASICO INDONESIA · KICK-OFF"
  ctx.fillStyle = '#F5CA37';
  ctx.font = '700 26px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EL CLASICO INDONESIA   ·   GBK SENAYAN', 512, 98);

  // Center kickoff time: "19:00"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 112px Inter, system-ui, sans-serif';
  ctx.fillText(MATCH_INFO.scoreboardTime, 512, 228);

  // Bottom teams row: "PERSIB   —   PERSIJA" with signature club color bars
  ctx.font = '700 46px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText('PERSIB', 438, 342);

  // Persib Maung Bandung Blue bar
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(256, 362, 182, 8);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('—', 512, 342);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('PERSIJA', 586, 342);

  // Persija Macan Kemayoran Red-Orange bar
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(586, 362, 200, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface RoofHandle {
  updateForCameraAltitude: (cameraY: number) => void;
  dispose: () => void;
}

export function buildRoofAndScreens(scene: THREE.Scene): RoofHandle {
  const disposables: Array<{ dispose: () => void }> = [];
  const roofGroup = new THREE.Group();
  scene.add(roofGroup);

  const outerRun = STADIUM_3D.upperOuterRun + 1.0;
  const innerRun = 2.8; // Iconic Temu Gelang deep cantilevered oval ring
  const outerY = 31.0;
  const innerY = 32.8;
  const segments = 180;

  const roofPositions: number[] = [];
  const roofUvs: number[] = [];
  const roofIndices: number[] = [];

  const lightPositions: number[] = [];
  const lightUvs: number[] = [];
  const lightIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const f = evaluateBowlSlot3D(u * TOTAL_SLOTS);

    roofPositions.push(
      f.x + f.nx * outerRun,
      outerY,
      f.z + f.nz * outerRun,
      f.x + f.nx * innerRun,
      innerY,
      f.z + f.nz * innerRun,
    );
    roofUvs.push(u, 0, u, 1);

    lightPositions.push(
      f.x + f.nx * (innerRun + 0.9),
      innerY - 0.6,
      f.z + f.nz * (innerRun + 0.9),
      f.x + f.nx * innerRun,
      innerY + 0.15,
      f.z + f.nz * innerRun,
    );
    lightUvs.push(u, 0, u, 1);

    if (i < segments) {
      const b = i * 2;
      roofIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      lightIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3));
  roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roofUvs, 2));
  roofGeo.setIndex(roofIndices);
  roofGeo.computeVertexNormals();

  const roofTex = createTemuGelangRoofTexture();
  const roofMat = new THREE.MeshBasicMaterial({
    map: roofTex,
    side: THREE.DoubleSide,
  });
  roofGroup.add(new THREE.Mesh(roofGeo, roofMat));
  disposables.push(roofGeo, roofTex, roofMat);

  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.Float32BufferAttribute(lightPositions, 3));
  lightGeo.setAttribute('uv', new THREE.Float32BufferAttribute(lightUvs, 2));
  lightGeo.setIndex(lightIndices);
  lightGeo.computeVertexNormals();

  const lightTex = createFloodlightStripTexture();
  const lightMat = new THREE.MeshBasicMaterial({
    map: lightTex,
    side: THREE.DoubleSide,
  });
  roofGroup.add(new THREE.Mesh(lightGeo, lightMat));
  disposables.push(lightGeo, lightTex, lightMat);

  // Giant Hanging Utara & Selatan SUGBK Jumbotrons
  const screenTex = createGbkScoreboardTexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const casingMat = new THREE.MeshBasicMaterial({ color: '#090B10' });
  const screenW = 21.0;
  const screenH = 9.0;

  const casingGeo = new THREE.BoxGeometry(screenW + 0.5, screenH + 0.5, 0.7);
  const faceGeo = new THREE.PlaneGeometry(screenW, screenH);
  disposables.push(screenTex, screenMat, casingMat, casingGeo, faceGeo);

  const northRoofZ = -(STADIUM_3D.innerRadiusZ + innerRun - 1.5);
  const southRoofZ = STADIUM_3D.innerRadiusZ + innerRun - 1.5;
  const screenY = innerY - screenH / 2 - 0.35;

  const northGroup = new THREE.Group();
  northGroup.position.set(0, screenY, northRoofZ);
  northGroup.add(new THREE.Mesh(casingGeo, casingMat));
  const northFace = new THREE.Mesh(faceGeo, screenMat);
  northFace.position.z = 0.38;
  const northRear = new THREE.Mesh(faceGeo, screenMat);
  northRear.position.z = -0.38;
  northRear.rotation.y = Math.PI;
  northGroup.add(northFace, northRear);
  scene.add(northGroup);

  const southGroup = new THREE.Group();
  southGroup.position.set(0, screenY, southRoofZ);
  southGroup.rotation.y = Math.PI;
  southGroup.add(new THREE.Mesh(casingGeo, casingMat));
  const southFace = new THREE.Mesh(faceGeo, screenMat);
  southFace.position.z = 0.38;
  const southRear = new THREE.Mesh(faceGeo, screenMat);
  southRear.position.z = -0.38;
  southRear.rotation.y = Math.PI;
  southGroup.add(southFace, southRear);
  scene.add(southGroup);

  return {
    updateForCameraAltitude: (cameraY: number) => {
      roofGroup.visible = cameraY < 30.8;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
