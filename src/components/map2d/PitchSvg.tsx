import React from 'react';
import { BOWL_2D } from '../../geometry/bowlCurve';

export const PitchSvg: React.FC = () => {
  const w = BOWL_2D.pitchWidth; // 178
  const h = BOWL_2D.pitchHeight; // 274
  const x0 = -w / 2;
  const y0 = -h / 2;

  const stripes = 12;
  const stripeH = h / stripes;

  const penW = 105;
  const penH = 43;
  const goalBoxW = 48;
  const goalBoxH = 14.5;
  const goalMouthW = 20;
  const goalMouthDepth = 5.2;
  const circleR = 24;

  return (
    <g className="pointer-events-none">
      <defs>
        <clipPath id="pitch-clip">
          <rect x={x0} y={y0} width={w} height={h} rx={1.5} />
        </clipPath>
      </defs>

      {/* Alternating dark emerald turf stripes */}
      <g clipPath="url(#pitch-clip)">
        {Array.from({ length: stripes }).map((_, idx) => (
          <rect
            key={idx}
            x={x0}
            y={y0 + idx * stripeH}
            width={w}
            height={stripeH + 0.4}
            fill={idx % 2 === 0 ? '#133723' : '#174129'}
          />
        ))}
      </g>

      {/* Pitch lines */}
      <g
        fill="none"
        stroke="rgba(166, 208, 180, 0.52)"
        strokeWidth={1.05}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Outer boundary */}
        <rect x={x0} y={y0} width={w} height={h} />

        {/* Halfway line & centre circle */}
        <line x1={x0} y1={0} x2={x0 + w} y2={0} />
        <circle cx={0} cy={0} r={circleR} />

        {/* North penalty box, goal box, goal mouth & D-arc */}
        <rect x={-penW / 2} y={y0} width={penW} height={penH} />
        <rect x={-goalBoxW / 2} y={y0} width={goalBoxW} height={goalBoxH} />
        <rect x={-goalMouthW / 2} y={y0 - goalMouthDepth} width={goalMouthW} height={goalMouthDepth} />
        <path d={`M -19 ${y0 + penH} A ${circleR} ${circleR} 0 0 0 19 ${y0 + penH}`} />

        {/* South penalty box, goal box, goal mouth & D-arc */}
        <rect x={-penW / 2} y={y0 + h - penH} width={penW} height={penH} />
        <rect x={-goalBoxW / 2} y={y0 + h - goalBoxH} width={goalBoxW} height={goalBoxH} />
        <rect x={-goalMouthW / 2} y={y0 + h} width={goalMouthW} height={goalMouthDepth} />
        <path d={`M -19 ${y0 + h - penH} A ${circleR} ${circleR} 0 0 1 19 ${y0 + h - penH}`} />
      </g>
    </g>
  );
};
