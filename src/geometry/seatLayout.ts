import { SECTIONS_BY_ID } from '../data/stadiumConfig';
import type { Point2D, SeatItem, SectionDefinition } from '../types/stadium';
import { evaluateBowlSlot2D, sampleSectionPoint2D } from './bowlCurve';

function hashUint32(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

function getArcWidth2D(section: SectionDefinition, v: number): number {
  const steps = 6;
  let length = 0;
  let prev = sampleSectionPoint2D(section.slotIndex, section.tier, 0, v);
  for (let i = 1; i <= steps; i++) {
    const cur = sampleSectionPoint2D(section.slotIndex, section.tier, i / steps, v);
    length += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    prev = cur;
  }
  return length;
}

function getSeatsCountForRow(section: SectionDefinition, v: number): number {
  const width = getArcWidth2D(section, v);
  if (section.tier === 'upper') {
    return Math.max(20, Math.min(34, Math.round(width * 0.66)));
  }
  return Math.max(16, Math.min(26, Math.round(width * 0.66)));
}

const sectionSeatsCache = new Map<number, SeatItem[]>();

export function getSeatsForSection(sectionId: number): SeatItem[] {
  const cached = sectionSeatsCache.get(sectionId);
  if (cached) return cached;

  const section = SECTIONS_BY_ID.get(sectionId);
  if (!section || !section.available) return [];

  const seats: SeatItem[] = [];
  const totalRows = section.rows;

  for (let row = 1; row <= totalRows; row++) {
    const v = (row - 0.5) / totalRows;
    const vPadded = 0.035 + v * 0.93;
    const seatsInRow = getSeatsCountForRow(section, vPadded);

    let groupRemaining = 0;
    let currentAvailable = true;

    for (let colLeftToRight = 0; colLeftToRight < seatsInRow; colLeftToRight++) {
      const seatNumber = seatsInRow - colLeftToRight;
      const u = (colLeftToRight + 0.5) / seatsInRow;
      const uPadded = 0.04 + u * 0.92;

      if (groupRemaining <= 0) {
        const h = hashUint32(sectionId * 10007 + row * 313 + colLeftToRight * 37);
        currentAvailable = (h % 100) < 56;
        groupRemaining = 1 + ((h >>> 8) % 4);
      }
      groupRemaining--;

      const id = `${sectionId}-${row}-${seatNumber}`;
      // Guarantee center showcase seats in every section are available for smooth testing
      const isCenterShowcase =
        (row === 10 || row === 12 || row === 14) &&
        (seatNumber === 8 || seatNumber === 12 || seatNumber === 16);

      const status = isCenterShowcase || currentAvailable ? 'available' : 'taken';

      const pos2d = sampleSectionPoint2D(
        section.slotIndex,
        section.tier,
        uPadded,
        vPadded,
        1.45,
      );

      seats.push({
        id,
        sectionId,
        row,
        seat: seatNumber,
        seatsInRow,
        status,
        pos2d,
        u: uPadded,
        v: vPadded,
      });
    }
  }

  sectionSeatsCache.set(sectionId, seats);
  return seats;
}

export interface RowLabelAnchor {
  row: number;
  pos2d: Point2D;
}

export function getRowLabelAnchors(sectionId: number): RowLabelAnchor[] {
  const section = SECTIONS_BY_ID.get(sectionId);
  if (!section) return [];

  const totalRows = section.rows;
  const frame = evaluateBowlSlot2D(section.slotIndex);
  const anchors: RowLabelAnchor[] = [];

  for (let row = 1; row <= totalRows; row++) {
    if (row !== 1 && row % 2 !== 0) continue;
    const v = (row - 0.5) / totalRows;
    const vPadded = 0.035 + v * 0.93;
    const rightEdge = sampleSectionPoint2D(
      section.slotIndex,
      section.tier,
      1,
      vPadded,
      1.25,
    );
    anchors.push({
      row,
      pos2d: {
        x: rightEdge.x - frame.tangent.x * 2.4,
        y: rightEdge.y - frame.tangent.y * 2.4,
      },
    });
  }

  return anchors;
}
