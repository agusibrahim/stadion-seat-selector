import React from 'react';
import { MATCH_INFO, TICKET_CATEGORIES } from '../../data/matchInfo';
import type { SeatItem, SectionDefinition } from '../../types/stadium';

interface BottomActionBarProps {
  hiddenFor3D?: boolean;
  activeSection: SectionDefinition | null;
  selectedSeat: SeatItem | null;
  selectedSeatSection: SectionDefinition | null;
  onContinue: () => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  hiddenFor3D = false,
  activeSection,
  selectedSeat,
  selectedSeatSection,
  onContinue,
}) => {
  const canContinue = Boolean(selectedSeat && selectedSeatSection);

  let topCaption = 'Choose a section';
  let mainValue = `from ${MATCH_INFO.startingPriceFormatted}`;

  if (selectedSeat && selectedSeatSection) {
    topCaption = `Sec ${selectedSeat.sectionId} · Row ${selectedSeat.row} · Seat ${selectedSeat.seat}`;
    mainValue = TICKET_CATEGORIES[selectedSeatSection.category].fullPrice;
  } else if (activeSection) {
    const tierText = activeSection.tier === 'lower' ? 'Lower tier' : 'Upper tier';
    topCaption = `Section ${activeSection.id} · ${tierText}`;
    mainValue = 'Choose a seat';
  }

  return (
    <div
      className={`bottom-safe-bar relative z-30 shrink-0 bg-[#111216] border-t border-white/[0.07] rounded-t-[26px] px-4 sm:px-5 pt-3.5 shadow-[0_-12px_36px_rgba(0,0,0,0.65)] transition-all duration-200 ${
        hiddenFor3D ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[clamp(11.5px,3.2vw,12.5px)] text-[#8A8D9B] font-normal truncate">
            {topCaption}
          </p>
          <p className="text-[clamp(18.5px,5.2vw,21px)] font-bold tracking-[-0.02em] text-white mt-0.5 leading-snug">
            {mainValue}
          </p>
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className={`h-[46px] sm:h-[48px] min-w-[132px] sm:min-w-[144px] px-6 sm:px-7 rounded-full text-[clamp(14px,3.9vw,15px)] font-semibold tracking-[-0.01em] transition-all duration-200 shrink-0 ${
            canContinue
              ? 'bg-[#F5CA37] text-[#0A0A0C] shadow-[0_4px_20px_rgba(245,202,55,0.3)] hover:bg-[#FAD44C] active:scale-[0.96] cursor-pointer'
              : 'bg-[#1D1E24] text-[#5B5E6B] cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
