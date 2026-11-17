import React, { useMemo } from 'react';
import { evaluateBowlSlot2D, SECTION_GEOMETRIES_2D } from '../../geometry/bowlCurve';
import { getRowLabelAnchors, getSeatsForSection } from '../../geometry/seatLayout';
import type { SeatItem } from '../../types/stadium';

interface SectionSeatGridProps {
  sectionId: number;
  selectedSeatId: string | null;
  currentMapRotationDeg: number;
  opacity: number;
  onSelectSeat: (seat: SeatItem) => void;
}

export const SectionSeatGrid: React.FC<SectionSeatGridProps> = ({
  sectionId,
  selectedSeatId,
  currentMapRotationDeg,
  opacity,
  onSelectSeat,
}) => {
  const geo = SECTION_GEOMETRIES_2D.get(sectionId);
  const seats = useMemo(() => getSeatsForSection(sectionId), [sectionId]);
  const rowAnchors = useMemo(() => getRowLabelAnchors(sectionId), [sectionId]);

  if (!geo || opacity <= 0.01) return null;

  return (
    <g style={{ opacity }} className="transition-opacity duration-150">
      {/* Crisp thin gold border around active section */}
      <path
        d={geo.svgPath}
        fill="#121318"
        stroke="#C8A232"
        strokeWidth={0.34}
        strokeLinejoin="round"
      />

      {/* Individual seat rounded squares */}
      {seats.map((seat) => {
        const isSelected = seat.id === selectedSeatId;
        const isAvailable = seat.status === 'available';

        // Align seat square tangent to the stadium row arc so every seat stands upright when zoomed
        const slotIndex = sectionId >= 200 ? sectionId - 201 : sectionId - 101;
        const rawSlot = slotIndex + (1 - seat.u);
        const frame = evaluateBowlSlot2D(rawSlot);
        const localDeg =
          (Math.atan2(frame.tangent.y, frame.tangent.x) * 180) / Math.PI + 180;

        const size = isSelected ? 1.32 : 1.04;
        const half = size / 2;

        return (
          <g
            key={seat.id}
            data-seat-id={seat.id}
            transform={`translate(${seat.pos2d.x.toFixed(2)}, ${seat.pos2d.y.toFixed(2)}) rotate(${localDeg.toFixed(1)})`}
            onClick={(e) => {
              e.stopPropagation();
              if (isAvailable) {
                onSelectSeat(seat);
              }
            }}
            className={isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
          >
            {/* Invisible slightly larger hit target so touch/click is effortless */}
            <rect x={-0.82} y={-0.95} width={1.64} height={1.9} fill="transparent" />

            {/* Subtle warm radial glow + touch ripple pulse behind selected seat */}
            {isSelected && (
              <>
                <circle cx={0} cy={0} r={1.85} fill="rgba(245, 202, 55, 0.28)" />
                <circle
                  cx={0}
                  cy={0}
                  r={2.2}
                  fill="none"
                  stroke="rgba(245, 202, 55, 0.7)"
                  strokeWidth={0.22}
                  className="seat-pulse-ring"
                />
              </>
            )}

            <rect
              data-seat-visual="true"
              x={-half}
              y={-half}
              width={size}
              height={size}
              rx={0.26}
              fill={
                isSelected
                  ? '#F5CA37'
                  : isAvailable
                    ? '#747784'
                    : '#25262E'
              }
            />
          </g>
        );
      })}

      {/* Row numbers along right edge (1, 2, 4, 6 ...), counter-rotated to stay upright */}
      {rowAnchors.map((anchor) => (
        <text
          key={anchor.row}
          x={anchor.pos2d.x}
          y={anchor.pos2d.y}
          transform={`rotate(${(-currentMapRotationDeg).toFixed(2)} ${anchor.pos2d.x.toFixed(2)} ${anchor.pos2d.y.toFixed(2)})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#6E717F"
          fontSize={1.65}
          fontWeight={500}
          className="pointer-events-none select-none"
        >
          {anchor.row}
        </text>
      ))}
    </g>
  );
};
