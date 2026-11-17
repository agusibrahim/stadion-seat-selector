import type { CategoryId, SectionDefinition, TierType } from '../types/stadium';

/**
 * Gelora Bung Karno Main Stadium (SUGBK) Topology
 * -----------------------------------------------
 * 36 Elliptical Radial Sections = 12 Official GBK Zones (Zones 1..12) × 3 Sections/Zone:
 * - Slots 0..5   : West Stand (West VIP, halfway line between 103 & 104)
 * - Slots 6..8   : North-west curve (108 = NW Marathon Gate)
 * - Slots 9..14  : North End (North curve behind goal, center between 112 & 113)
 * - Slots 15..17 : North-east curve (117 = NE Marathon Gate)
 * - Slots 18..23 : East Stand (East VIP, halfway line between 121 & 122)
 * - Slots 24..26 : South-east curve (126 = SE Marathon Gate)
 * - Slots 27..32 : South End (South curve behind goal, center between 130 & 131)
 * - Slots 33..35 : South-west curve (135 = SW Marathon Gate)
 */
export const TOTAL_SLOTS = 36;

/**
 * Architectural openings in SUGBK:
 * - Lower tier 4 Olympic Marathon Gates / Vomitoria: 108 (NW), 117 (NE), 126 (SE), 135 (SW)
 * - Upper tier VVIP Garuda Royal / Broadcast Tribune recess: 203, 204 (West Center)
 */
const BLOCKED_SECTION_IDS = new Set<number>([108, 117, 126, 135, 203, 204]);

function computeZonaNumber(slotIndex: number): number {
  // Zone 1 starts at West Center-North (slot 3) and wraps clockwise 1..12
  const shifted = (slotIndex - 3 + TOTAL_SLOTS) % TOTAL_SLOTS;
  return Math.floor(shifted / 3) + 1;
}

function getGbkStandMetadata(
  slotIndex: number,
  zona: number,
  tier: TierType,
): {
  standLabel: string;
  zoneBadge: string;
  category: CategoryId;
} {
  const isWestMain = slotIndex >= 0 && slotIndex <= 5;
  const isEastMain = slotIndex >= 18 && slotIndex <= 23;
  const isWestCenter = slotIndex === 2 || slotIndex === 3;
  const isEastCenter = slotIndex === 20 || slotIndex === 21;
  const isNorthMain = slotIndex >= 10 && slotIndex <= 13;
  const isSouthMain = slotIndex >= 28 && slotIndex <= 31;

  let standName = 'Corner curve';
  if (isWestMain) {
    standName = tier === 'lower' ? 'West VIP stand' : 'West stand';
  } else if (slotIndex >= 6 && slotIndex <= 9) {
    standName = 'North-west curve';
  } else if (isNorthMain) {
    standName = 'North end';
  } else if (slotIndex >= 14 && slotIndex <= 17) {
    standName = 'North-east curve';
  } else if (isEastMain) {
    standName = tier === 'lower' ? 'East VIP stand' : 'East stand';
  } else if (slotIndex >= 24 && slotIndex <= 27) {
    standName = 'South-east curve';
  } else if (isSouthMain) {
    standName = 'South end';
  } else {
    standName = 'South-west curve';
  }

  const standLabel = `${standName} · Zone ${zona}`;

  let zoneBadge = `ZONE ${zona} · ${standName.toUpperCase()}`;
  if (isWestCenter && tier === 'lower') {
    zoneBadge = `WEST VIP · HALFWAY LINE`;
  } else if (isEastCenter && tier === 'lower') {
    zoneBadge = `EAST VIP · HALFWAY LINE`;
  } else if (isNorthMain) {
    zoneBadge = tier === 'lower' ? `BEHIND THE GOAL · NORTH` : `UPPER NORTH · ZONE ${zona}`;
  } else if (isSouthMain) {
    zoneBadge = tier === 'lower' ? `BEHIND THE GOAL · SOUTH` : `UPPER SOUTH · ZONE ${zona}`;
  } else if (tier === 'upper') {
    zoneBadge = `UPPER TIER · ZONE ${zona}`;
  }

  let category: CategoryId = 3;
  if (tier === 'lower') {
    if (isWestMain || (slotIndex >= 19 && slotIndex <= 22)) {
      category = 1;
    } else {
      category = 2;
    }
  } else {
    if (isWestMain || isEastMain) {
      category = 2;
    } else {
      category = 3;
    }
  }

  return { standLabel, zoneBadge, category };
}

export const ALL_SECTIONS: SectionDefinition[] = (() => {
  const sections: SectionDefinition[] = [];

  for (const tier of ['lower', 'upper'] as const) {
    const baseId = tier === 'lower' ? 101 : 201;
    const rows = tier === 'lower' ? 22 : 20;

    for (let slotIndex = 0; slotIndex < TOTAL_SLOTS; slotIndex++) {
      const id = baseId + slotIndex;
      const zona = computeZonaNumber(slotIndex);
      const { standLabel, zoneBadge, category } = getGbkStandMetadata(
        slotIndex,
        zona,
        tier,
      );
      sections.push({
        id,
        slotIndex,
        zona,
        tier,
        category,
        available: !BLOCKED_SECTION_IDS.has(id),
        standLabel,
        zoneBadge,
        rows,
      });
    }
  }

  return sections;
})();

export const SECTIONS_BY_ID: ReadonlyMap<number, SectionDefinition> = new Map(
  ALL_SECTIONS.map((s) => [s.id, s]),
);
