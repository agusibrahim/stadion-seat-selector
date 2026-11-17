import type { CategoryId, SectionDefinition, TierType } from '../types/stadium';

export const TOTAL_SLOTS = 38;

/**
 * Unnumbered / closed architectural blocks visible in the reference stadium map:
 * - Lower tier corner vomitoria/tunnels: 109 (NW), 116 (NE), 128 (SE)
 * - Upper tier press / VIP broadcast boxes: 203 (West), 222 & 223 (East)
 */
const BLOCKED_SECTION_IDS = new Set<number>([109, 116, 128, 203, 222, 223]);

function getStandMetadata(slotIndex: number, tier: TierType): {
  standLabel: string;
  zoneBadge: string;
  category: CategoryId;
} {
  // Slot topology around the 38-slot loop:
  // 0..5   : West straight (101..106 / 201..206), halfway between 2 and 3 (103/104)
  // 6..10  : North-west corner (107..111 / 207..211) -> note 111/211 transitions into North
  // 11..13 : North end straight (112..114 / 212..214)
  // 14..18 : North-east corner (115..119 / 215..219)
  // 19..24 : East straight (120..125 / 220..225), halfway between 21 and 22 (122/123)
  // 25..29 : South-east corner (126..130 / 226..230)
  // 30..32 : South end straight (131..133 / 231..233)
  // 33..37 : South-west corner (134..138 / 234..238)

  const isWestStraight = slotIndex >= 0 && slotIndex <= 5;
  const isEastStraight = slotIndex >= 19 && slotIndex <= 24;
  const isHalfwayCenter =
    slotIndex === 2 || slotIndex === 3 || slotIndex === 21 || slotIndex === 22;

  // Stand description (shown in Stage 2 subtitle, e.g. "Upper tier · North-east corner")
  let standLabel = 'Stadium bowl';
  if (slotIndex >= 0 && slotIndex <= 5) {
    standLabel = 'West stand';
  } else if (slotIndex >= 6 && slotIndex <= 9) {
    standLabel = 'North-west corner';
  } else if (slotIndex >= 10 && slotIndex <= 14) {
    standLabel = 'North end';
  } else if (slotIndex >= 15 && slotIndex <= 18) {
    standLabel = 'North-east corner';
  } else if (slotIndex >= 19 && slotIndex <= 24) {
    standLabel = 'East stand';
  } else if (slotIndex >= 25 && slotIndex <= 28) {
    standLabel = 'South-east corner';
  } else if (slotIndex >= 29 && slotIndex <= 33) {
    standLabel = 'South end';
  } else {
    standLabel = 'South-west corner';
  }

  // Strategic zone badge (shown in gold uppercase in Stage 3 bottom sheet)
  let zoneBadge = 'SIDE STAND';
  if (isHalfwayCenter) {
    zoneBadge = tier === 'lower' ? 'HALFWAY LINE' : 'UPPER HALFWAY';
  } else if (isWestStraight || isEastStraight) {
    zoneBadge = tier === 'lower' ? 'SIDE STAND' : 'UPPER STAND';
  } else if (
    (slotIndex >= 10 && slotIndex <= 14) ||
    (slotIndex >= 29 && slotIndex <= 33)
  ) {
    zoneBadge = tier === 'lower' ? 'BEHIND THE GOAL' : 'UPPER GOAL END';
  } else {
    zoneBadge = tier === 'lower' ? 'LOWER CORNER' : 'UPPER CORNER';
  }

  // Pricing category matching exact map brightness in reference video
  let category: CategoryId = 3;
  if (tier === 'lower') {
    category = isWestStraight || isEastStraight ? 1 : 2;
  } else {
    category = isWestStraight || isEastStraight ? 2 : 3;
  }

  return { standLabel, zoneBadge, category };
}

export const ALL_SECTIONS: SectionDefinition[] = (() => {
  const sections: SectionDefinition[] = [];

  for (const tier of ['lower', 'upper'] as const) {
    const baseId = tier === 'lower' ? 101 : 201;
    const rows = tier === 'lower' ? 24 : 20;

    for (let slotIndex = 0; slotIndex < TOTAL_SLOTS; slotIndex++) {
      const id = baseId + slotIndex;
      const { standLabel, zoneBadge, category } = getStandMetadata(slotIndex, tier);
      sections.push({
        id,
        slotIndex,
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
