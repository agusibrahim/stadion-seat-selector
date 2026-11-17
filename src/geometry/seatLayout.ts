import { SECTIONS_BY_ID } from '../data/stadiumConfig';
import type { Point2D, SeatItem, SectionDefinition } from '../types/stadium';
import { evaluateBowlSlot2D, getTierOffsets2D, sampleSectionPoint2D } from './bowlCurve';

const GUARANTEED_AVAILABLE_SEATS = new Set<string>([
  '217-12-17',
  '132-8-11',
  '104-16-2',
]);

function hashUint32(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

function getArcWidth2D(section: SectionDefinition, v: number): number {
  const { inner, outer } = getTierOffsets2D(section.tier);
  const offset = inner + v * (outer - inner);
  // Measure chord/arc length across the section at row depth v
  const steps = 6;
  let length = 0;
  let prev = sampleSectionPoint2D(section.slotIndex, section.tier, 0, v);
  for (let i = 1; i <= steps; i++) {
    const cur = sampleSectionPoint2D(section.slotIndex, section.tier, i / steps, v);
    length += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    prev = cur;
  }
  // Keep unused warning away while documenting offset relation
  void offset;
  return length;
}

function getSeatsCountForRow(section: SectionDefinition, v: number): number {
  const width = getArcWidth2D(section, v);
  const isCorner =
    (section.slotIndex >= 6 && section.slotIndex <= 10) ||
    (section.slotIndex >= 14 && section.slotIndex <= 18) ||
    (section.slotIndex >= 25 && section.slotIndex <= 29) ||
    (section.slotIndex >= 33 && section.slotIndex <= 37);

  if (!isCorner) {
    // Straight rectangular stands: crisp uniform 18-seat grid (matches reference frames 025 & 045)
    return section.tier === 'lower' ? 18 : 20;
  }

  // Curved trapezoid corners (e.g. Section 217: ~25 seats in Row 1 -> ~35 seats in Row 20, 31 at Row 12)
  if (section.tier === 'upper') {
    return Math.max(22, Math.min(36, Math.round(width * 0.685)));
  }
  return Math.max(14, Math.min(26, Math.round(width * 0.68)));
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
    // Inset slightly from front/back polygon border so seats sit neatly inside the gold outline
    const v = (row - 0.5) / totalRows;
    const vPadded = 0.03 + v * 0.94;
    const seatsInRow = getSeatsCountForRow(section, vPadded);

    // Generate realistic contiguous groups of taken/available seats along each row
    let groupRemaining = 0;
    let currentAvailable = true;

    for (let colLeftToRight = 0; colLeftToRight < seatsInRow; colLeftToRight++) {
      // Seat 1 is on the right when facing the pitch (col = seatsInRow - 1)
      const seatNumber = seatsInRow - colLeftToRight;
      const u = (colLeftToRight + 0.5) / seatsInRow;
      const uPadded = 0.035 + u * 0.93;

      if (groupRemaining <= 0) {
        const h = hashUint32(sectionId * 10007 + row * 313 + colLeftToRight * 37);
        currentAvailable = (h % 100) < 54;
        groupRemaining = 1 + ((h >>> 8) % 4); // clusters of 1..4 seats
      }
      groupRemaining--;

      const id = `${sectionId}-${row}-${seatNumber}`;
      const status = GUARANTEED_AVAILABLE_SEATS.has(id)
        ? 'available'
        : currentAvailable
          ? 'available'
          : 'taken';

      const pos2d = sampleSectionPoint2D(
        section.slotIndex,
        section.tier,
        uPadded,
        vPadded,
        1.5,
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

/**
 * Computes positions for row labels along the right outer edge of the active section
 * (rows 1, 2, 4, 6, 8, ... matching reference frames 007, 025, 045).
 */
export function getRowLabelAnchors(sectionId: number): RowLabelAnchor[] {
  const section = SECTIONS_BY_ID.get(sectionId);
  if (!section) return [];

  const totalRows = section.rows;
  const frame = evaluateBowlSlot2D(section.slotIndex);
  const anchors: RowLabelAnchor[] = [];

  for (let row = 1; row <= totalRows; row++) {
    if (row !== 1 && row % 2 !== 0) continue;
    const v = (row - 0.5) / totalRows;
    const vPadded = 0.03 + v * 0.94;
    const rightEdge = sampleSectionPoint2D(
      section.slotIndex,
      section.tier,
      1,
      vPadded,
      1.25,
    );
    // Offset slightly outside the right boundary (along -tangent)
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
