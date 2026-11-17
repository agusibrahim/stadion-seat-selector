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
  const baseAngle = activeGeo ? activeGeo.inwardAngleRad : -Math.PI / 2;
  const lookAngle = baseAngle - yawOffsetRad;
  const rayLength = 155;
  const rayEndX = seat.pos2d.x + Math.cos(lookAngle) * rayLength;
  const rayEndY = seat.pos2d.y + Math.sin(lookAngle) * rayLength;

  const trackPath =
    'M -98 -66 A 98 104 0 0 1 98 -66 L 98 66 A 98 104 0 0 1 -98 66 Z';

  return (
    <div className="w-[74px] h-[92px] shrink-0 flex items-center justify-center">
      <svg
        viewBox="-226 -294 452 588"
        className="w-full h-full overflow-visible"
      >
        {/* Mini SUGBK red running track oval */}
        <path
          d={trackPath}
          fill="#5C1F1B"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={3.2}
        />

        {/* Central mini pitch */}
        <rect
          x={-70}
          y={-108}
          width={140}
          height={216}
          rx={5}
          fill="#18472B"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth={3.8}
        />
        <line
          x1={-70}
          y1={0}
          x2={70}
          y2={0}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={3.8}
        />

        {/* Mini SUGBK oval bowl sectors */}
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
