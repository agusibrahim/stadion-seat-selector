import * as THREE from 'three';
import { computeStadiumCameraFrame } from '../geometry/rayPinnedCamera';
import type { SeatButtonScreenMetrics, SeatSpatialMetrics } from '../types/stadium';
import { buildSkyAndLights } from './builders/buildSkyAndLights';
import { buildPitchAndGoals } from './builders/buildPitchAndGoals';
import { buildStadiumBowl, type StadiumBowlHandle } from './builders/buildStadiumBowl';
import { buildRoofAndScreens, type RoofHandle } from './builders/buildRoofAndScreens';
import { ZoomBlurPass } from './effects/ZoomBlurPass';

export type SceneMode = 'MAP_2D' | 'TRANSITION_TO_3D' | 'POV_3D' | 'TRANSITION_TO_2D';

export interface StadiumSceneCallbacks {
  onFirstDrag?: () => void;
  onYawOffsetChange?: (yawRad: number) => void;
  onHudStateChange?: (topHudActive: boolean, sheetVisible: boolean) => void;
  onModeChange?: (mode: SceneMode) => void;
}

const DEFAULT_BTN_METRICS: SeatButtonScreenMetrics = {
  btnCenterX: 195,
  btnCenterY: 420,
  btnWidth: 9,
  btnNdcX: 0,
  btnNdcY: 0,
};

const MAX_YAW_RAD = 1.35;
const MAX_PITCH_RAD = 0.48;

export class StadiumSceneManager {
  private container: HTMLElement;
  private map2DLayerEl: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private zoomBlurPass: ZoomBlurPass;
  private bowlHandle: StadiumBowlHandle;
  private roofHandle: RoofHandle;
  private resizeObserver: ResizeObserver;
  private cleanupBuilders: Array<() => void> = [];
  private rafId: number | null = null;
  private callbacks: StadiumSceneCallbacks;

  // Mode & transition timing
  private mode: SceneMode = 'MAP_2D';
  private activeMetrics: SeatSpatialMetrics | null = null;
  private btnMetrics: SeatButtonScreenMetrics = DEFAULT_BTN_METRICS;
  private transitionStartTime = 0;
  private lastFrameTime = performance.now();
  private lastHudTop = false;
  private lastSheetVisible = false;

  // Inertial spherical head-look physics (matching Auditorium3D.jsx)
  private isDragging = false;
  private activePointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastMoveTime = 0;
  private hasNotifiedFirstDrag = false;

  private yaw = 0;
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private yawVel = 0;
  private pitchVel = 0;
  private isMobileGpu: boolean;

  constructor(container: HTMLElement, callbacks: StadiumSceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.isMobileGpu =
      typeof window !== 'undefined' &&
      (window.innerWidth <= 540 ||
        Boolean(window.matchMedia?.('(pointer: coarse)').matches));

    this.scene = new THREE.Scene();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 480);
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobileGpu ? 1.75 : 2);

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 900);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.zoomBlurPass = new ZoomBlurPass(width, height, dpr, this.isMobileGpu);

    // Build all 3D stadium meshes & pre-compile shaders into VRAM once on startup
    const cleanupSky = buildSkyAndLights(this.scene);
    const cleanupPitch = buildPitchAndGoals(this.scene);
    this.bowlHandle = buildStadiumBowl(this.scene);
    this.roofHandle = buildRoofAndScreens(this.scene);

    this.cleanupBuilders.push(
      cleanupSky,
      cleanupPitch,
      () => this.bowlHandle.dispose(),
      () => this.roofHandle.dispose(),
    );

    this.renderer.compile(this.scene, this.camera);

    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  public setMap2DLayerElement(el: HTMLElement | null): void {
    this.map2DLayerEl = el;
  }

  /**
   * Launches the real Ray-Pinned Exponential Zoom-In + Fast Motion Blur from the exact
   * 2D seat pixel `(btnCenterX, btnCenterY)` all the way into the seated 3D POV.
   */
  public startZoomTo3D(
    metrics: SeatSpatialMetrics,
    btnMetrics: SeatButtonScreenMetrics,
  ): void {
    this.activeMetrics = metrics;
    this.btnMetrics = btnMetrics;

    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.hasNotifiedFirstDrag = false;
    this.callbacks.onYawOffsetChange?.(0);

    this.transitionStartTime = 0; // Stamped on next render tick for 0ms lag
    this.setHudState(false, false);
    this.container.style.opacity = '1';
    this.container.style.pointerEvents = 'none';
    this.mode = 'TRANSITION_TO_3D';
    this.callbacks.onModeChange?.('TRANSITION_TO_3D');
  }

  /**
   * Launches the exact reverse Ray-Pinned Zoom-Out + Fast Motion Blur from seated 3D POV
   * back onto the 2D yellow seat dot.
   */
  public startZoomTo2D(): void {
    if (this.mode !== 'POV_3D' && this.mode !== 'TRANSITION_TO_3D') return;

    this.isDragging = false;
    this.activePointerId = null;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.yawVel = 0;
    this.pitchVel = 0;

    this.transitionStartTime = 0;
    this.setHudState(false, false);
    this.container.style.pointerEvents = 'none';
    this.renderer.domElement.style.cursor = 'default';
    this.mode = 'TRANSITION_TO_2D';
    this.callbacks.onModeChange?.('TRANSITION_TO_2D');
  }

  private setHudState(topActive: boolean, sheetVisible: boolean): void {
    if (topActive !== this.lastHudTop || sheetVisible !== this.lastSheetVisible) {
      this.lastHudTop = topActive;
      this.lastSheetVisible = sheetVisible;
      this.callbacks.onHudStateChange?.(topActive, sheetVisible);
    }
  }

  private resetMap2DStyles(): void {
    const mapEl = this.map2DLayerEl;
    if (!mapEl) return;
    mapEl.style.opacity = '1';
    mapEl.style.transformOrigin = '50% 50%';
    mapEl.style.transform = 'none';
    mapEl.style.filter = 'none';
    mapEl.style.pointerEvents = 'auto';
  }

  private applyPoseAndSync2D(rawT: number, dirSign: 1 | -1 | 0): {
    zoomBlur: number;
    vertStreak: number;
    focusX: number;
    focusY: number;
  } {
    const metrics = this.activeMetrics;
    if (!metrics) {
      return { zoomBlur: 0, vertStreak: 0, focusX: 0.5, focusY: 0.5 };
    }

    const w = Math.max(1, this.container.clientWidth || 390);
    const h = Math.max(1, this.container.clientHeight || 846);

    const frame = computeStadiumCameraFrame(
      metrics,
      rawT,
      this.btnMetrics,
      w,
      h,
      this.yaw,
      this.pitch,
      dirSign,
    );

    this.camera.position.set(frame.pos[0], frame.pos[1], frame.pos[2]);
    this.camera.up.set(frame.up[0], frame.up[1], frame.up[2]);
    this.camera.lookAt(frame.look[0], frame.look[1], frame.look[2]);
    this.camera.fov = frame.fovDeg;
    this.roofHandle.updateForCameraAltitude(frame.pos[1]);

    // Lift optical center gently (+5.5% of viewport height) into the visible region above the bottom sheet
    // so sky/scoreboard, pitch, AND foreground seats are all framed cleanly on every phone aspect ratio!
    const shiftY = Math.round(h * 0.055 * frame.viewOffsetWeight);
    if (shiftY !== 0) {
      this.camera.setViewOffset(w, h, 0, shiftY, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();

    // Update 3D highlighted yellow target chair + seat number badge
    this.bowlHandle.updateTargetSeat({
      seatId: metrics.seatId,
      worldPos: metrics.seatWorldPosition,
      rotY: metrics.seatRotationY,
      seatNumber: metrics.seatNumber,
      backScaleY: frame.backScaleY,
      backrestVisible: frame.backrestVisible,
      badgeVisible: frame.badgeVisible,
    });

    // Lockstep 60fps CSS Perspective Zoom & Blur on the 2D Map Layer
    const mapEl = this.map2DLayerEl;
    if (mapEl) {
      if (rawT <= 0) {
        this.resetMap2DStyles();
      } else if (rawT >= 0.38) {
        mapEl.style.opacity = '0';
        mapEl.style.pointerEvents = 'none';
        mapEl.style.filter = 'none';
      } else {
        mapEl.style.pointerEvents = 'none';
        mapEl.style.transformOrigin = `${this.btnMetrics.btnCenterX.toFixed(1)}px ${this.btnMetrics.btnCenterY.toFixed(1)}px`;
        mapEl.style.transform = `perspective(900px) rotateX(${frame.syncTiltDeg.toFixed(2)}deg) scale(${frame.syncScale.toFixed(3)})`;
        mapEl.style.opacity = frame.syncOpacity.toFixed(3);
        mapEl.style.filter =
          frame.syncBlurPx > 0.08 ? `blur(${frame.syncBlurPx.toFixed(2)}px)` : 'none';
      }
    }

    return {
      zoomBlur: frame.zoomBlurStrength,
      vertStreak: frame.verticalBlurStreak,
      focusX: frame.focusUvX,
      focusY: frame.focusUvY,
    };
  }

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobileGpu ? 1.75 : 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.zoomBlurPass.setSize(w, h, dpr);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'POV_3D') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.isDragging = true;
    this.activePointerId = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.lastMoveTime = performance.now();
    this.yawVel = 0;
    this.pitchVel = 0;
    this.renderer.domElement.style.cursor = 'grabbing';
    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture errors
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    const now = performance.now();
    const dt = Math.max(4, now - this.lastMoveTime);
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.lastMoveTime = now;

    if ((Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) && !this.hasNotifiedFirstDrag) {
      this.hasNotifiedFirstDrag = true;
      this.callbacks.onFirstDrag?.();
    }

    const refW = Math.max(320, this.container.clientWidth || 390);
    const sensitivity = 1.7 / refW;
    const deltaYaw = dx * sensitivity;
    const deltaPitch = dy * sensitivity * 0.82;

    const yawEdge = 1 - 0.55 * Math.pow(Math.abs(this.targetYaw) / MAX_YAW_RAD, 2);
    const pitchEdge = 1 - 0.55 * Math.pow(Math.abs(this.targetPitch) / MAX_PITCH_RAD, 2);

    this.targetYaw = THREE.MathUtils.clamp(
      this.targetYaw + deltaYaw * Math.max(0.25, yawEdge),
      -MAX_YAW_RAD,
      MAX_YAW_RAD,
    );
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch + deltaPitch * Math.max(0.25, pitchEdge),
      -MAX_PITCH_RAD,
      MAX_PITCH_RAD,
    );

    const instVelYaw = (deltaYaw / dt) * 16.67;
    const instVelPitch = (deltaPitch / dt) * 16.67;
    this.yawVel = this.yawVel * 0.4 + instVelYaw * 0.6;
    this.pitchVel = this.pitchVel * 0.4 + instVelPitch * 0.6;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    if (!this.isDragging) return;
    this.isDragging = false;
    this.activePointerId = null;
    this.renderer.domElement.style.cursor = 'grab';
    try {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (this.isDragging && e.cancelable) {
      e.preventDefault();
    }
  };

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove, { passive: false });
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  private unbindEvents(): void {
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('touchmove', this.onTouchMove);
  }

  private animate(now: number): void {
    this.rafId = requestAnimationFrame(this.animate);

    const dt = Math.min(50, Math.max(1, now - this.lastFrameTime));
    this.lastFrameTime = now;

    // Zero GPU work when idle in 2D map!
    if (this.mode === 'MAP_2D' || !this.activeMetrics) {
      return;
    }

    const frameScale = dt / 16.67;

    // Inertial head-look physics
    if (
      !this.isDragging &&
      (Math.abs(this.yawVel) > 0.00005 || Math.abs(this.pitchVel) > 0.00005)
    ) {
      this.targetYaw = THREE.MathUtils.clamp(
        this.targetYaw + this.yawVel * frameScale,
        -MAX_YAW_RAD,
        MAX_YAW_RAD,
      );
      this.targetPitch = THREE.MathUtils.clamp(
        this.targetPitch + this.pitchVel * frameScale,
        -MAX_PITCH_RAD,
        MAX_PITCH_RAD,
      );
      const friction = Math.pow(0.91, frameScale);
      this.yawVel *= friction;
      this.pitchVel *= friction;
    }

    const prevYaw = this.yaw;
    const lerpAlpha = 1 - Math.pow(0.74, frameScale);
    this.yaw += (this.targetYaw - this.yaw) * lerpAlpha;
    this.pitch += (this.targetPitch - this.pitch) * lerpAlpha;

    if (Math.abs(this.yaw - prevYaw) > 0.0008) {
      this.callbacks.onYawOffsetChange?.(this.yaw);
    }

    let blurParams = { zoomBlur: 0, vertStreak: 0, focusX: 0.5, focusY: 0.5 };

    if (this.mode === 'TRANSITION_TO_3D') {
      if (this.transitionStartTime === 0) {
        this.transitionStartTime = now;
      }
      const elapsed = now - this.transitionStartTime;
      const t = THREE.MathUtils.clamp(elapsed / 1420, 0, 1);
      blurParams = this.applyPoseAndSync2D(t, 1);

      if (t > 0.56) this.setHudState(true, t > 0.78);

      if (t >= 1) {
        this.setHudState(true, true);
        this.container.style.pointerEvents = 'auto';
        this.renderer.domElement.style.cursor = 'grab';
        this.mode = 'POV_3D';
        this.callbacks.onModeChange?.('POV_3D');
      }
    } else if (this.mode === 'POV_3D') {
      blurParams = this.applyPoseAndSync2D(1, 0);
    } else if (this.mode === 'TRANSITION_TO_2D') {
      if (this.transitionStartTime === 0) {
        this.transitionStartTime = now;
      }
      const elapsed = now - this.transitionStartTime;
      const u = THREE.MathUtils.clamp(elapsed / 1120, 0, 1);
      const t = 1 - u;
      blurParams = this.applyPoseAndSync2D(t, -1);

      if (u >= 1) {
        this.resetMap2DStyles();
        this.bowlHandle.updateTargetSeat(null);
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
        this.mode = 'MAP_2D';
        this.callbacks.onModeChange?.('MAP_2D');
        return;
      }
    }

    this.zoomBlurPass.render(
      this.renderer,
      this.scene,
      this.camera,
      blurParams.zoomBlur,
      blurParams.vertStreak,
      blurParams.focusX,
      blurParams.focusY,
    );
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver.disconnect();
    this.unbindEvents();
    this.zoomBlurPass.dispose();
    this.cleanupBuilders.forEach((fn) => fn());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
