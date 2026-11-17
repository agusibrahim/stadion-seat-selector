import React from 'react';
import { BOWL_2D } from '../../geometry/bowlCurve';

/**
 * 2D SUGBK Central Pitch + Iconic Oval 8-Lane Brick-Red Athletics Track
 */
export const PitchSvg: React.FC = () => {
  const w = BOWL_2D.pitchWidth; // 140
  const h = BOWL_2D.pitchHeight; // 216
  const x0 = -w / 2;
  const y0 = -h / 2;

  const stripes = 12;
  const stripeH = h / stripes;

  const penW = 83;
  const penH = 34;
  const goalBoxW = 38;
  const goalBoxH = 11.5;
  const goalMouthW = 16;
  const goalMouthDepth = 4.2;
  const circleR = 19;

  // SUGBK Oval Running Track dimensions surrounding the pitch
  const trackStraightY = 66;
  const trackOuterRx = 98;
  const trackOuterRy = 104;
  const trackInnerRx = 80;
  const trackInnerRy = 86;

  function buildTrackPath(rx: number, ry: number): string {
    return [
      `M ${-rx} ${-trackStraightY}`,
      `A ${rx} ${ry} 0 0 1 ${rx} ${-trackStraightY}`,
      `L ${rx} ${trackStraightY}`,
      `A ${rx} ${ry} 0 0 1 ${-rx} ${trackStraightY}`,
      'Z',
    ].join(' ');
  }

  return (
    <g className="pointer-events-none">
      <defs>
        <clipPath id="pitch-clip">
          <rect x={x0} y={y0} width={w} height={h} rx={1.5} />
        </clipPath>
      </defs>

      {/* SUGBK 8-Lane Terracotta Red Running Track Oval */}
      <path
        d={buildTrackPath(trackOuterRx, trackOuterRy)}
        fill="#591E1B"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth={0.85}
      />
      {/* Mid-lane subtle divider lines */}
      {[0.25, 0.5, 0.75].map((f) => {
        const rx = trackInnerRx + f * (trackOuterRx - trackInnerRx);
        const ry = trackInnerRy + f * (trackOuterRy - trackInnerRy);
        return (
          <path
            key={f}
            d={buildTrackPath(rx, ry)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.11)"
            strokeWidth={0.55}
          />
        );
      })}

      {/* Inner Turf Infield (D-zones inside Lane 1 curb) */}
      <path
        d={buildTrackPath(trackInnerRx, trackInnerRy)}
        fill="#0F2D1C"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth={0.85}
      />

      {/* Alternating dark emerald FIFA turf stripes */}
      <g clipPath="url(#pitch-clip)">
        {Array.from({ length: stripes }).map((_, idx) => (
          <rect
            key={idx}
            x={x0}
            y={y0 + idx * stripeH}
            width={w}
            height={stripeH + 0.4}
            fill={idx % 2 === 0 ? '#143B25' : '#19462C'}
          />
        ))}
      </g>

      {/* FIFA Pitch Markings */}
      <g
        fill="none"
        stroke="rgba(176, 218, 190, 0.58)"
        strokeWidth={0.95}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x={x0} y={y0} width={w} height={h} />
        <line x1={x0} y1={0} x2={x0 + w} y2={0} />
        <circle cx={0} cy={0} r={circleR} />

        {/* Utara (North) penalty & goal box */}
        <rect x={-penW / 2} y={y0} width={penW} height={penH} />
        <rect x={-goalBoxW / 2} y={y0} width={goalBoxW} height={goalBoxH} />
        <rect
          x={-goalMouthW / 2}
          y={y0 - goalMouthDepth}
          width={goalMouthW}
          height={goalMouthDepth}
        />
        <path d={`M -15 ${y0 + penH} A ${circleR} ${circleR} 0 0 0 15 ${y0 + penH}`} />

        {/* Selatan (South) penalty & goal box */}
        <rect x={-penW / 2} y={y0 + h - penH} width={penW} height={penH} />
        <rect x={-goalBoxW / 2} y={y0 + h - goalBoxH} width={goalBoxW} height={goalBoxH} />
        <rect x={-goalMouthW / 2} y={y0 + h} width={goalMouthW} height={goalMouthDepth} />
        <path
          d={`M -15 ${y0 + h - penH} A ${circleR} ${circleR} 0 0 1 15 ${y0 + h - penH}`}
        />
      </g>
    </g>
  );
};
