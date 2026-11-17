import * as THREE from 'three';
import { MATCH_INFO } from '../../data/matchInfo';
import { TOTAL_SLOTS } from '../../data/stadiumConfig';
import { evaluateBowlSlot3D, STADIUM_3D } from '../../geometry/spatialMetrics';

function createRoofTrussTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#151822';
  ctx.fillRect(0, 0, 512, 512);

  // Structural roof coffers / steel ribs (visible in frames 015, 030, 057)
  ctx.strokeStyle = '#252A38';
  ctx.lineWidth = 6;
  const cols = 8;
  const rows = 6;
  for (let i = 0; i <= cols; i++) {
    const x = (i * 512) / cols;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    const y = (j * 512) / rows;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 2);
  return tex;
}

function createFloodlightStripTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#141720';
  ctx.fillRect(0, 0, 512, 64);

  // Segmented bright stadium roof floodlight modules
  const count = 16;
  const w = 512 / count;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = '#F8FAFF';
    ctx.fillRect(i * w + 4, 12, w - 8, 40);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(28, 1);
  return tex;
}

function createScoreboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 440;
  const ctx = canvas.getContext('2d')!;

  // Deep pitch-black OLED scoreboard casing
  ctx.fillStyle = '#07080D';
  ctx.fillRect(0, 0, 1024, 440);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 1012, 428);

  // Top header: "THE FINAL   KICK-OFF"
  ctx.fillStyle = '#8C92A4';
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE FINAL     KICK-OFF', 512, 108);

  // Center kickoff time: "20:45"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 116px Inter, system-ui, sans-serif';
  ctx.fillText(MATCH_INFO.kickoffTime, 512, 238);

  // Bottom teams row: "BARCELONA   —   MILAN"
  ctx.font = '700 42px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText('BARCELONA', 442, 345);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('—', 512, 345);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('MILAN', 582, 345);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface RoofHandle {
  /** Fades/hides roof overhead geometry while the aerial zoom camera is above roof elevation */
  updateForCameraAltitude: (cameraY: number) => void;
  dispose: () => void;
}

export function buildRoofAndScreens(scene: THREE.Scene): RoofHandle {
  const disposables: Array<{ dispose: () => void }> = [];
  const roofGroup = new THREE.Group();
  scene.add(roofGroup);

  const outerRun = STADIUM_3D.upperOuterRun + 0.9; // ~36.7m
  const innerRun = 2.0; // overhangs deep over the stands to frame the pitch & sky
  const outerY = 30.8;
  const innerY = 31.6;
  const segments = 152;

  // 1. Overhanging structural roof canopy
  const roofPositions: number[] = [];
  const roofUvs: number[] = [];
  const roofIndices: number[] = [];

  // 2. Inner floodlight fascia strip along inner lip of roof
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

    // Angled floodlight bezel at inner roof lip
    lightPositions.push(
      f.x + f.nx * (innerRun + 0.8),
      innerY - 0.55,
      f.z + f.nz * (innerRun + 0.8),
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

  const roofTex = createRoofTrussTexture();
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

  // 3. Giant Hanging Jumbotron Scoreboards suspended from North & South roof lips
  const screenTex = createScoreboardTexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const casingMat = new THREE.MeshBasicMaterial({ color: '#090B10' });
  const screenW = 19.5;
  const screenH = 8.4;

  const casingGeo = new THREE.BoxGeometry(screenW + 0.5, screenH + 0.5, 0.7);
  const faceGeo = new THREE.PlaneGeometry(screenW, screenH);
  disposables.push(screenTex, screenMat, casingMat, casingGeo, faceGeo);

  const northRoofZ = -(STADIUM_3D.straightHalfZ + STADIUM_3D.cornerRadiusZ + innerRun - 1.5);
  const southRoofZ = STADIUM_3D.straightHalfZ + STADIUM_3D.cornerRadiusZ + innerRun - 1.5;
  const screenY = innerY - screenH / 2 - 0.35;

  // North scoreboard (facing South +Z, plus rear face so never blank edge-on)
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

  // South scoreboard (facing North -Z, plus rear face)
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
      // Hide overhanging roof truss while camera is above roof height (aerial zoom phase)
      // so the camera never looks through the roof top; show immediately below Y = 30.2m!
      roofGroup.visible = cameraY < 30.2;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
