import React from 'react';
import { ALL_SECTIONS } from '../../data/stadiumConfig';
import { SECTION_GEOMETRIES_2D } from '../../geometry/bowlCurve';
import type { SeatItem } from '../../types/stadium';

interface StadiumMiniMapProps {
  seat: SeatItem;
  yawOffsetRad: number;
}

export const StadiumMiniMap: React.FC<StadiumMiniMapProps> = ({
  seat,
  yawOffsetRad,
}) => {
  const activeGeo = SECTION_GEOMETRIES_2D.get(seat.sectionId);
  // Look direction in 2D SVG plane: inward normal rotated by -yawOffsetRad
  const baseAngle = activeGeo ? activeGeo.inwardAngleRad : -Math.PI / 2;
  const lookAngle = baseAngle - yawOffsetRad;
  const rayLength = 155;
  const rayEndX = seat.pos2d.x + Math.cos(lookAngle) * rayLength;
  const rayEndY = seat.pos2d.y + Math.sin(lookAngle) * rayLength;

  return (
    <div className="w-[76px] h-[92px] shrink-0 flex items-center justify-center">
      <svg
        viewBox="-232 -282 464 564"
        className="w-full h-full overflow-visible"
      >
        {/* Central mini pitch */}
        <rect
          x={-89}
          y={-137}
          width={178}
          height={274}
          rx={6}
          fill="#18452B"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={4}
        />
        <line
          x1={-89}
          y1={0}
          x2={89}
          y2={0}
          stroke="rgba(255,255,255,0.38)"
          strokeWidth={4}
        />

        {/* Mini stadium bowl sections */}
        {ALL_SECTIONS.map((sec) => {
          const geo = SECTION_GEOMETRIES_2D.get(sec.id);
          if (!geo) return null;
          const isSelectedSec = sec.id === seat.sectionId;
          return (
            <path
              key={sec.id}
              d={geo.svgPath}
              fill={
                isSelectedSec
                  ? '#F5CA37'
                  : sec.available
                    ? '#2A2C36'
                    : '#14151B'
              }
              stroke="#0D0E12"
              strokeWidth={2.2}
            />
          );
        })}

        {/* Dashed sightline ray from seat across the pitch */}
        <line
          x1={seat.pos2d.x}
          y1={seat.pos2d.y}
          x2={rayEndX}
          y2={rayEndY}
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth={5}
          strokeDasharray="12 12"
          strokeLinecap="round"
        />

        {/* Crisp white seat location pin */}
        <circle
          cx={seat.pos2d.x}
          cy={seat.pos2d.y}
          r={15}
          fill="#FFFFFF"
          stroke="#0D0E12"
          strokeWidth={5}
        />
      </svg>
    </div>
  );
};
