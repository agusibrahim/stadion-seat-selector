# Lessons Learned

## 1. Extract High-FPS Contact Sheets for Motion & Transition Fidelity
- **Mistake:** Sampling a reference video at only `2 fps` captures static UI states accurately, but misses fast intermediate transition choreography.
- **Rule:** Always extract `16–24 fps` contact sheets across every transition boundary and verify intermediate frames via real-time video capture (`record_video_dir`), not slow blocking `page.screenshot()` loops.

## 2. True Ray-Pinned Zoom-In (`2D ↔ 3D`) vs Disconnected Overhead Drop
- **Mistake:** Fading out a static 2D map (`scale 1.0 → 1.12`) into an unpinned overhead 3D camera drop looks like a crossfade + elevator drop, NOT a real continuous zoom-in into the seat.
- **Rule:** For genuine 2D-to-3D seat zoom-in (as proven in `cinema-seat-select`):
  1. Keep the 3D WebGL scene persistently mounted & GPU-warm underneath the 2D layer (`0ms` shader/mesh init stall on transition).
  2. Measure the clicked 2D seat element's exact screen `(btnCenterX, btnCenterY, btnWidth, ndcX, ndcY)`.
  3. Compute initial 3D altitude `h0` where the 3D highlighted chair projects to the exact pixel width `btnWidth` at `(ndcX, ndcY)`, then zoom exponentially (`h = h0 * pow(h1 / h0, u)`) using a **ray-pinned camera pose** (`computeRayPinnedPose` in the section's orthonormal basis `(R, W, B)`) while simultaneously scaling the 2D layer by `syncScale = h0 / hCur` (`1x → ~10x`) around `transformOrigin: (btnCenterX, btnCenterY)` with perspective tilt and optical radial zoom motion blur, before settling into `eyePosition` and sweeping `lookAt` up across the pitch.

## 3. Verify 3D First-Person Drag Signs Visually Against Mini-Map & Panorama Convention
- **Mistake:** Negating `yawRad` while keeping `+pitchRad` in Rodrigues spherical head-look inverted horizontal panning relative to natural panorama drag and desynchronized the mini-map sightline ray.
- **Rule:** Always test both `dx > 0` (drag right) and `dy > 0` (drag down) in Playwright screenshots and verify that the 3D panorama and the 2D mini-map sightline ray rotate in exact agreement.
