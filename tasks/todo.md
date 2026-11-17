# Stadium Seat Selector — Implementation Plan & Review

## Objective
Build a 100% visual & interactive replica of the **Barcelona – Milan Stadium Seat Selector** reference video using **React + TypeScript + Vite + Three.js**, engineered with clean, modular, maintainable architecture.

## Checklist
- [x] Analyze reference video (`x-video-2122433340250718529-1-1562p.mp4`) and extract high-res reference frames (`frame_001`–`frame_058`)
- [x] Scaffold Vite + React + TypeScript + Three.js + Tailwind CSS project
- [x] Implement domain types & stadium configuration (`101–138` Lower tier, `201–238` Upper tier, exact blocked vomitoria/VIP slots `109, 116, 128, 203, 222, 223`, Categories 1–3 pricing `€190 / €120 / €65`)
- [x] Implement parametric stadium bowl geometry, deterministic seat generator, and calibrated 3D spatial coordinate math (`to the centre spot`, `to the nearest goal`, `above the pitch`)
- [x] Build Stage 1 & Stage 2 2D Interactive SVG Map:
  - [x] Compass labels (`NORTH`, `EAST`, `SOUTH`, `WEST`) & detailed emerald striped pitch
  - [x] Category filter pills (`Cat 1 €190`, `Cat 2 €120`, `Cat 3 €65`)
  - [x] Smooth auto-rotate & zoom transition orienting selected section toward `^ PITCH` / `^ LOWER TIER · PITCH`
  - [x] Section seat grid with Available / Taken / Selected states, row numbers (`1..20` / `1..24`), glow highlight, and legend
- [x] Build Stage 3 Three.js 3D First-Person "View from Seat":
  - [x] Custom twilight/sunset sky dome & stadium floodlighting
  - [x] FIFA pitch with grass stripes, lines, corner flags, 3D goal nets, and West sideline dugouts
  - [x] 2-tier 3D stadium bowl with `InstancedMesh` royal-blue seats, LED perimeter & mid-tier ribbons, and warm-lit VIP hospitality boxes
  - [x] Overhanging roof truss canopy, inner floodlight ring, and North/South `20:45 BARCELONA — MILAN` jumbotrons
  - [x] Smooth fly-in camera transition + inertial touch/mouse drag-to-look-around + `<-> Drag to look around` pill
- [x] Build Stage 3 HUD & Bottom Sheet:
  - [x] Top floating `View from {sec} · Row {row} · Seat {seat}` pill & back navigation
  - [x] Bottom sheet with gold zone badge, dynamic stadium mini-map (with seat dot & live FOV indicator), 3 spatial metrics, `Change seat`, and `Buy ticket` → `✓ Added to basket` state
- [x] Verify TypeScript compilation, production build, and visual fidelity across all 3 video scenarios (`Sec 217`, `Sec 132`, `Sec 104`) via Playwright screenshots compared against reference frames
- [x] Implement 100% video-accurate **Ray-Pinned Exponential Real Zoom-In (`2D ↔ 3D`) + Fast Motion-Blur Dive & Reverse Zoom-Out** (matching `/Users/macbook/Downloads/cinema-seat-select`):
  - [x] Persistently mount & pre-compile the 3D WebGL stadium underneath the 2D layer (`0ms` startup latency, `0%` idle GPU usage in 2D)
  - [x] Unify 1-to-1 seat coordinates between 2D `SectionSeatGrid` and 3D `InstancedMesh`, and highlight the selected 3D chair in stadium gold (`#F5CA37`) with a crisp seat-number badge (`17`, `11`, `2`) and morphing backrest
  - [x] Generalize `cinema_engine.rs`'s **Ray-Pinned Exponential Zoom (`h = h0 * pow(h1/h0, u)`)** to arbitrary 360° stadium bowl sections (`src/geometry/rayPinnedCamera.ts`) locked sub-pixel to `(btnCenterX, btnCenterY)` while scaling & perspective-tilting the 2D layer (`1x → ~10x`) in 60fps lockstep
  - [x] Add 32-tap Interleaved-Gradient-Noise Jittered GLSL Optical Radial-Zoom + Head-Sweep Motion Blur (`src/three/effects/ZoomBlurPass.ts`)
  - [x] Implement full reverse Ray-Pinned Zoom-Out + Fast Blur on `Change seat` / `<` Back
  - [x] Verify 24-frame 16fps video contact sheets (`zoom217_final.png`, `back217_v2_sheet.png`, `zoom104_v2_sheet.png`) via Playwright WebGL video recording
- [x] Native Mobile Adaptiveness & Performance Optimization:
  - [x] Automatically hide simulated `9:41` status bar, signal/wifi/battery icons, and home indicator on real mobile/touch devices (`@media (max-width: 540px), (hover: none) and (pointer: coarse)`) while keeping the phone mockup bezel on desktop
  - [x] Add `viewport-fit=cover` + OS `env(safe-area-inset-top / bottom)` spacing + fluid `clamp()` typography & pill sizing (`320px`–`430px` widths & compact `640px` heights)
  - [x] Anchor `<-> Drag to look around` dynamically `-top-12` above the sliding `SeatDetailSheet` so it adapts to every screen height
  - [x] Add mobile GPU optimizations (`1.75` DPR cap, `0.78x` offscreen motion-blur buffer & `22` jittered taps on mobile, adaptive `1024×1536` turf texture, non-passive `touchmove` scroll lock) + native Android/iOS hardware Back / swipe-back (`popstate`) support
  - [x] Verify across compact mobile (`360×640`), modern phone (`393×852`), and desktop (`1280×900`) viewports in Playwright (`CONSOLE_ERRORS: []`)
- [x] Transform into **Stadion Utama Gelora Bung Karno (SUGBK) — Persib vs Persija**:
  - [x] Update match metadata & Rupiah categories (`Persib – Persija`, `Stadion Utama GBK · Sab 23 Mei · 19:00 WIB`, `VIP Rp450rb`, `Cat 1 Rp250rb`, `Cat 2 Rp125rb`)
  - [x] Re-engineer 2D & 3D parametric bowl geometry (`bowlCurve.ts`, `spatialMetrics.ts`, `stadiumConfig.ts`) into **SUGBK's true 36-sector / 12-Zona Olympic Elliptical Oval** (`101–136` Tribun Bawah, `201–236` Tribun Atas, 4 Marathon Gates & Barat VVIP Royal Box)
  - [x] Add **SUGBK's iconic 8-lane brick-red 400m athletics running track** around the FIFA pitch in both 2D (`PitchSvg.tsx`, `StadiumMiniMap.tsx`) and 3D (`buildPitchAndGoals.ts`)
  - [x] Build **SUGBK's signature Merah-Putih (Red & White) wave-mosaic 3D seats** in `buildStadiumBowl.ts` + **Temu Gelang** radial-ribbed oval canopy & `19:00 WIB PERSIB — PERSIJA` jumbotrons in `buildRoofAndScreens.ts`
  - [x] Verify 2D overview, zoomed sectors, ray-pinned zoom-in + fast blur, POV drag directions, and mobile responsiveness via Playwright screenshots, then commit cleanly

## Review & Verification Summary
- **Typecheck & Production Build:** `bun run build` (`tsc -b && vite build`) passes with zero TypeScript errors and zero bundle warnings (`three` isolated into its own vendor chunk).
- **Unified Parametric Math:** Both the 2D SVG stadium map and the 3D Three.js stadium bowl share the same 38-slot parametric geometry, producing exact Euclidean metrics matching all 3 scenarios in the video (`Sec 217 R12 S17` → `95m / 61m / 23m`, `Sec 132 R8 S11` → `68m / 15m / 5m`, `Sec 104 R16 S2` → `54m / 75m / 9m`).
- **End-to-End Headless Browser Check:** Verified all 3 flows via Playwright Chromium with WebGL enabled (`CONSOLE_ERRORS: []`) and visually compared rendered screenshots side-by-side against extracted video frames.
