import * as THREE from 'three';

export function buildSkyAndLights(scene: THREE.Scene): () => void {
  const disposables: Array<{ dispose: () => void }> = [];

  // Custom twilight / warm sunset sky dome matching both SW sunset glow (frame_011)
  // and N/E deep dusk slate sky (frame_030, frame_057)
  const skyGeo = new THREE.SphereGeometry(420, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.68, 0.08, 0.73).normalize() },
      uZenithColor: { value: new THREE.Color('#27304B') },
      uDuskHorizonColor: { value: new THREE.Color('#4E5672') },
      uSunsetGlowColor: { value: new THREE.Color('#D09376') },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uDuskHorizonColor;
      uniform vec3 uSunsetGlowColor;
      varying vec3 vWorldDir;

      void main() {
        float elev = clamp(vWorldDir.y, -0.1, 1.0);
        float horizonFactor = 1.0 - smoothstep(0.0, 0.52, max(elev, 0.0));

        vec3 baseSky = mix(uZenithColor, uDuskHorizonColor, pow(horizonFactor, 1.25));

        // Directional warm evening sunset glow toward South-West
        float sunAzimuth = max(dot(normalize(vec3(vWorldDir.x, 0.0, vWorldDir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
        float warmBand = pow(sunAzimuth, 2.2) * smoothstep(0.42, 0.02, max(elev, 0.0));
        vec3 finalColor = mix(baseSky, uSunsetGlowColor, warmBand * 0.85);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);
  disposables.push(skyGeo, skyMat);

  // Stadium floodlight & twilight illumination
  const hemiLight = new THREE.HemisphereLight('#B8C8FF', '#1B2436', 1.15);
  scene.add(hemiLight);

  const mainFlood = new THREE.DirectionalLight('#FFFBF2', 1.45);
  mainFlood.position.set(45, 85, 35);
  scene.add(mainFlood);

  const counterFlood = new THREE.DirectionalLight('#DCE7FF', 0.95);
  counterFlood.position.set(-50, 75, -45);
  scene.add(counterFlood);

  return () => {
    disposables.forEach((d) => d.dispose());
  };
}
