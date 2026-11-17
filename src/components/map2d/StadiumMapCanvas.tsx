import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { ALL_SECTIONS, SECTIONS_BY_ID } from '../../data/stadiumConfig';
import { TICKET_CATEGORIES } from '../../data/matchInfo';
import { SECTION_GEOMETRIES_2D } from '../../geometry/bowlCurve';
import type {
  CategoryId,
  SeatItem,
  SectionDefinition,
  ViewStage,
} from '../../types/stadium';
import { PitchSvg } from './PitchSvg';
import { SectionSeatGrid } from './SectionSeatGrid';

interface StadiumMapCanvasProps {
  stage: ViewStage;
  isDivingTo3D?: boolean;
  activeSectionId: number | null;
  highlightedSectionId: number | null;
  selectedSeat: SeatItem | null;
  activeCategoryFilter: CategoryId | null;
  onSelectSection: (section: SectionDefinition) => void;
  onSelectSeat: (seat: SeatItem) => void;
  onBackToOverview: () => void;
}

interface Camera2DState {
  cx: number;
  cy: number;
  scale: number;
  rotationDeg: number;
  seatOpacity: number;
  motionBlurPx: number;
}

const OVERVIEW_CAM: Camera2DState = {
  cx: 0,
  cy: 0,
  scale: 1,
  rotationDeg: 0,
  seatOpacity: 0,
  motionBlurPx: 0,
};

function getTargetCameraForSection(section: SectionDefinition): Camera2DState {
  const geo = SECTION_GEOMETRIES_2D.get(section.id);
  if (!geo) return OVERVIEW_CAM;

  const scale = section.tier === 'upper' ? 5.65 : 6.05;

  return {
    cx: geo.center.x,
    cy: geo.center.y,
    scale,
    rotationDeg: geo.focusRotationDeg,
    seatOpacity: 1,
    motionBlurPx: 0,
  };
}

function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  let diff = ((toDeg - fromDeg + 180) % 360) - 180;
  if (diff < -180) diff += 360;
  return diff;
}

export const StadiumMapCanvas: React.FC<StadiumMapCanvasProps> = ({
  stage,
  isDivingTo3D = false,
  activeSectionId,
  highlightedSectionId,
  selectedSeat,
  activeCategoryFilter,
  onSelectSection,
  onSelectSeat,
  onBackToOverview,
}) => {
  const [cam, setCam] = useState<Camera2DState>(OVERVIEW_CAM);
  const camRef = useRef<Camera2DState>(OVERVIEW_CAM);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const activeSection = activeSectionId ? SECTIONS_BY_ID.get(activeSectionId) ?? null : null;

  useEffect(() => {
    const target =
      stage === 'section' && activeSection
        ? getTargetCameraForSection(activeSection)
        : OVERVIEW_CAM;

    const start = { ...camRef.current };
    const angleDelta = shortestAngleDelta(start.rotationDeg, target.rotationDeg);
    const scaleChanged = Math.abs(target.scale - start.scale) > 0.2 || Math.abs(angleDelta) > 5;
    const durationMs = 540;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      // Smooth quintic ease-in-out / cubic-out hybrid
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const seatOpacity =
        target.seatOpacity === 1
          ? Math.max(0, (t - 0.35) / 0.65)
          : Math.max(0, 1 - t * 2.2);

      // Subtle velocity-linked motion blur during fast 2D zoom/rotation
      const velBlur = scaleChanged && t < 1 ? Math.pow(Math.sin(Math.PI * t), 1.6) * 2.1 : 0;

      const next: Camera2DState = {
        cx: start.cx + (target.cx - start.cx) * ease,
        cy: start.cy + (target.cy - start.cy) * ease,
        scale: start.scale + (target.scale - start.scale) * ease,
        rotationDeg: start.rotationDeg + angleDelta * ease,
        seatOpacity,
        motionBlurPx: velBlur,
      };
      camRef.current = next;
      setCam(next);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [stage, activeSection]);

  // Vertical shift when zoomed into a section so section sits framed nicely above its caption
  const zoomProgress = Math.min(1, Math.max(0, (cam.scale - 1) / 4.4));
  const focusShiftY = -18 * zoomProgress;
  const compassOpacity = Math.max(0, 1 - zoomProgress * 2.5);

  const groupTransform = `translate(0, ${focusShiftY.toFixed(2)}) scale(${cam.scale.toFixed(4)}) rotate(${cam.rotationDeg.toFixed(3)}) translate(${(-cam.cx).toFixed(3)}, ${(-cam.cy).toFixed(3)})`;

  return (
    <div
      className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden touch-none"
      onClick={() => {
        if (stage === 'section') {
          onBackToOverview();
        }
      }}
    >
      {/* Stage 2 Top Direction Indicator */}
      <div
        className={`pointer-events-none absolute top-2 left-0 right-0 z-20 flex flex-col items-center transition-all duration-300 ${
          stage === 'section' && activeSection
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2'
        }`}
      >
        <ChevronUp className="w-3.5 h-3.5 text-[#757886] stroke-[2]" />
        <span className="text-[10px] font-medium tracking-[0.22em] text-[#757886] uppercase mt-0.5">
          {activeSection?.tier === 'upper' ? 'TRIBUN BAWAH · LAPANGAN' : 'LAPANGAN'}
        </span>
      </div>

      {/* Crisp Vector SUGBK Oval Stadium SVG */}
      <svg
        viewBox="-242 -310 484 620"
        className={`w-full h-full max-h-full transition-transform duration-300 ease-in ${
          isDivingTo3D ? 'scale-[1.12]' : 'scale-100'
        }`}
        style={{
          filter:
            isDivingTo3D
              ? 'blur(5px)'
              : cam.motionBlurPx > 0.08
                ? `blur(${cam.motionBlurPx.toFixed(2)}px)`
                : 'none',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={groupTransform}>
          {/* SUGBK Stand Compass Labels (Overview) */}
          <g style={{ opacity: compassOpacity }} className="pointer-events-none select-none">
            <text
              x={0}
              y={-293}
              textAnchor="middle"
              fill="#6E717E"
              fontSize={9.5}
              fontWeight={500}
              letterSpacing="0.18em"
            >
              UTARA
            </text>
            <text
              x={0}
              y={301}
              textAnchor="middle"
              fill="#6E717E"
              fontSize={9.5}
              fontWeight={500}
              letterSpacing="0.18em"
            >
              SELATAN
            </text>
            <text
              x={-224}
              y={0}
              transform="rotate(-90 -224 0)"
              textAnchor="middle"
              fill="#6E717E"
              fontSize={9.5}
              fontWeight={500}
              letterSpacing="0.18em"
            >
              BARAT
            </text>
            <text
              x={224}
              y={0}
              transform="rotate(90 224 0)"
              textAnchor="middle"
              fill="#6E717E"
              fontSize={9.5}
              fontWeight={500}
              letterSpacing="0.18em"
            >
              TIMUR
            </text>
          </g>

          {/* Central Football Pitch */}
          <g style={{ opacity: Math.max(0.15, 1 - zoomProgress * 0.85) }}>
            <PitchSvg />
          </g>

          {/* All 76 Stadium Bowl Sections (101..138 & 201..238) */}
          {ALL_SECTIONS.map((sec) => {
            const geo = SECTION_GEOMETRIES_2D.get(sec.id);
            if (!geo) return null;

            const isFocusedInSectionView = stage === 'section' && activeSectionId === sec.id;
            const isHighlightedYellow =
              highlightedSectionId === sec.id &&
              (stage === 'overview' || cam.seatOpacity < 0.35);

            const catInfo = TICKET_CATEGORIES[sec.category];
            const isCategoryDimmed =
              stage === 'overview' &&
              activeCategoryFilter !== null &&
              sec.category !== activeCategoryFilter;

            const isHovered = hoveredId === sec.id && sec.available;

            let fill = '#0E0F13';
            let stroke = '#21232B';
            let strokeWidth = 0.6;

            if (sec.available) {
              if (isHighlightedYellow) {
                fill = '#F5CA37';
                stroke = '#F5CA37';
              } else if (stage === 'section' && !isFocusedInSectionView) {
                // Neighbor sections visible in periphery (like 133 & 131 in frame_025)
                fill = '#181920';
                stroke = '#23252E';
                strokeWidth = 0.35;
              } else {
                fill = isHovered ? catInfo.hoverColor : catInfo.mapColor;
                stroke = activeCategoryFilter === sec.category ? '#8D91A2' : 'rgba(255,255,255,0.06)';
                strokeWidth = 0.5;
              }
            }

            // In Stage 2 (zoomed section), only show faint numbers on immediate left/right same-tier neighbors
            let isImmediateSideNeighbor = false;
            if (activeSection && sec.tier === activeSection.tier && sec.id !== activeSection.id) {
              const slotDiff = Math.abs(sec.slotIndex - activeSection.slotIndex);
              isImmediateSideNeighbor = slotDiff === 1 || slotDiff === 35;
            }

            const showLabel =
              sec.available &&
              (stage === 'overview' ||
                (isFocusedInSectionView && cam.seatOpacity < 0.25) ||
                (stage === 'section' && isImmediateSideNeighbor));
            const labelFontSize = stage === 'section' && !isFocusedInSectionView ? 2.7 : 8.5;
            const labelColor = isHighlightedYellow
              ? '#0A0A0C'
              : stage === 'section'
                ? '#4A4D5A'
                : '#C6C9D6';

            return (
              <g
                key={sec.id}
                data-section-id={sec.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!sec.available) return;
                  onSelectSection(sec);
                }}
                onMouseEnter={() => {
                  if (sec.available) setHoveredId(sec.id);
                }}
                onMouseLeave={() => {
                  if (hoveredId === sec.id) setHoveredId(null);
                }}
                className={sec.available ? 'cursor-pointer' : 'cursor-default'}
                style={{
                  opacity: isCategoryDimmed && !isHighlightedYellow ? 0.28 : 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                <path
                  d={geo.svgPath}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                />

                {showLabel && (
                  <text
                    x={geo.center.x}
                    y={geo.center.y}
                    transform={`rotate(${(-cam.rotationDeg).toFixed(2)} ${geo.center.x.toFixed(2)} ${geo.center.y.toFixed(2)})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={labelColor}
                    fontSize={labelFontSize}
                    fontWeight={isHighlightedYellow ? 700 : 500}
                    className="pointer-events-none select-none"
                  >
                    {sec.id}
                  </text>
                )}
              </g>
            );
          })}

          {/* Zoomed-In Section Seat Grid */}
          {activeSectionId !== null && (
            <SectionSeatGrid
              sectionId={activeSectionId}
              selectedSeatId={selectedSeat?.id ?? null}
              currentMapRotationDeg={cam.rotationDeg}
              opacity={cam.seatOpacity}
              onSelectSeat={onSelectSeat}
            />
          )}
        </g>
      </svg>

      {/* Stage 2 Bottom Section Caption & Legend Overlay */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 z-20 pt-7 sm:pt-10 pb-2.5 sm:pb-4 px-5 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/92 to-transparent flex flex-col items-center text-center transition-all duration-300 ${
          stage === 'section' && activeSection
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
      >
        {activeSection && (
          <>
            <h2 className="text-[16px] font-semibold text-white tracking-[-0.01em]">
              Sektor {activeSection.id}
            </h2>
            <p className="text-[12.5px] text-[#858896] mt-0.5">
              {activeSection.tier === 'lower' ? 'Tribun Bawah' : 'Tribun Atas'} ·{' '}
              {activeSection.standLabel}
            </p>
            <div className="mt-2.5 flex items-center gap-5 text-[12px] text-[#9A9DAA]">
              <span className="flex items-center gap-1.5">
                <span className="w-[8.5px] h-[8.5px] rounded-[2px] bg-[#747784]" />
                Tersedia
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-[8.5px] h-[8.5px] rounded-[2px] bg-[#25262E] border border-white/10" />
                Terisi
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
