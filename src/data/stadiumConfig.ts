import type { CategoryId, SectionDefinition, TierType } from '../types/stadium';

/**
 * Stadion Utama Gelora Bung Karno (SUGBK) Topology
 * ------------------------------------------------
 * 36 Elliptical Radial Sectors = 12 Official GBK Zones (Zona 1..12) × 3 Sectors/Zone:
 * - Slots 0..5   : Tribun Barat (VIP Barat Utama, halfway line between 103 & 104)
 * - Slots 6..8   : Ka. Barat Laut (108 = NW Marathon Tunnel)
 * - Slots 9..14  : Tribun Utara (North Curve behind goal, center between 112 & 113)
 * - Slots 15..17 : Ka. Timur Laut (117 = NE Marathon Tunnel)
 * - Slots 18..23 : Tribun Timur (VIP Timur Utama, halfway line between 121 & 122)
 * - Slots 24..26 : Ka. Tenggara (126 = SE Marathon Tunnel)
 * - Slots 27..32 : Tribun Selatan (South Curve behind goal, center between 130 & 131)
 * - Slots 33..35 : Ka. Barat Daya (135 = SW Marathon Tunnel)
 */
export const TOTAL_SLOTS = 36;

/**
 * Architectural openings in SUGBK:
 * - Lower tier 4 Olympic Marathon Gates / Vomitoria: 108 (NW), 117 (NE), 126 (SE), 135 (SW)
 * - Upper tier VVIP Garuda Royal / Broadcast Tribune recess: 203, 204 (Barat Center)
 */
const BLOCKED_SECTION_IDS = new Set<number>([108, 117, 126, 135, 203, 204]);

function computeZonaNumber(slotIndex: number): number {
  // Zona 1 starts at Barat Tengah-Utara (slot 3) and wraps clockwise 1..12
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
  const isBaratMain = slotIndex >= 0 && slotIndex <= 5;
  const isTimurMain = slotIndex >= 18 && slotIndex <= 23;
  const isBaratCenter = slotIndex === 2 || slotIndex === 3;
  const isTimurCenter = slotIndex === 20 || slotIndex === 21;
  const isUtaraMain = slotIndex >= 10 && slotIndex <= 13;
  const isSelatanMain = slotIndex >= 28 && slotIndex <= 31;

  let standName = 'Tribun Sudut';
  if (isBaratMain) {
    standName = tier === 'lower' ? 'VIP Barat' : 'Tribun Barat Atas';
  } else if (slotIndex >= 6 && slotIndex <= 9) {
    standName = 'Barat Laut';
  } else if (isUtaraMain) {
    standName = 'Tribun Utara';
  } else if (slotIndex >= 14 && slotIndex <= 17) {
    standName = 'Timur Laut';
  } else if (isTimurMain) {
    standName = tier === 'lower' ? 'VIP Timur' : 'Tribun Timur Atas';
  } else if (slotIndex >= 24 && slotIndex <= 27) {
    standName = 'Tenggara';
  } else if (isSelatanMain) {
    standName = 'Tribun Selatan';
  } else {
    standName = 'Barat Daya';
  }

  const standLabel = `${standName} · Zona ${zona}`;

  let zoneBadge = `ZONA ${zona} · ${standName.toUpperCase()}`;
  if (isBaratCenter && tier === 'lower') {
    zoneBadge = `VIP BARAT UTAMA · ZONA ${zona}`;
  } else if (isTimurCenter && tier === 'lower') {
    zoneBadge = `VIP TIMUR UTAMA · ZONA ${zona}`;
  } else if (isUtaraMain) {
    zoneBadge = `TRIBUN UTARA · ZONA ${zona}`;
  } else if (isSelatanMain) {
    zoneBadge = `TRIBUN SELATAN · ZONA ${zona}`;
  } else if (tier === 'upper') {
    zoneBadge = `TRIBUN ATAS · ZONA ${zona}`;
  }

  // SUGBK Ticket Pricing Categories:
  // - Cat 1 (VIP Rp450rb): Lower Barat (101..106) & Lower Timur Tengah (120..123)
  // - Cat 2 (Cat 1 Rp250rb): Lower Timur Sayap (119, 124), Upper Barat & Timur (201..206, 219..224), Lower Utara/Selatan Tengah
  // - Cat 3 (Cat 2 Rp125rb): Upper Utara/Selatan & all corner sectors
  let category: CategoryId = 3;
  if (tier === 'lower') {
    if (isBaratMain || (slotIndex >= 19 && slotIndex <= 22)) {
      category = 1;
    } else {
      category = 2;
    }
  } else {
    if (isBaratMain || isTimurMain) {
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
