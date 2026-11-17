import React from 'react';
import { Check } from 'lucide-react';
import { TICKET_CATEGORIES } from '../../data/matchInfo';
import type {
  SeatItem,
  SeatSpatialMetrics,
  SectionDefinition,
} from '../../types/stadium';
import { StadiumMiniMap } from './StadiumMiniMap';

interface SeatDetailSheetProps {
  section: SectionDefinition;
  seat: SeatItem;
  metrics: SeatSpatialMetrics;
  yawOffsetRad: number;
  addedToBasket: boolean;
  onChangeSeat: () => void;
  onBuyTicket: () => void;
}

export const SeatDetailSheet: React.FC<SeatDetailSheetProps> = ({
  section,
  seat,
  metrics,
  yawOffsetRad,
  addedToBasket,
  onChangeSeat,
  onBuyTicket,
}) => {
  const fullPrice = TICKET_CATEGORIES[section.category].fullPrice;
  const tierLabel = section.tier === 'lower' ? 'Tribun Bawah' : 'Tribun Atas';

  return (
    <div className="bottom-safe-sheet relative z-30 rounded-t-[28px] bg-[#0D0E12] border-t border-white/[0.08] px-4 sm:px-5 pt-2.5 shadow-[0_-16px_48px_rgba(0,0,0,0.75)]">
      {/* Bottom sheet drag handle */}
      <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />

      {/* Header + SUGBK Mini-Map */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-0.5">
          <p className="text-[10.5px] sm:text-[11px] font-semibold tracking-[0.15em] text-[#E5B83B] uppercase truncate">
            {section.zoneBadge}
          </p>
          <h2 className="compact-sheet-title text-[clamp(23px,6.6vw,27px)] font-bold tracking-[-0.025em] text-white leading-tight mt-1">
            Sektor {section.id}
          </h2>
          <p className="text-[clamp(12.5px,3.5vw,13.5px)] text-[#8A8E9E] mt-0.5 truncate">
            Baris {seat.row} · Kursi {seat.seat} · {tierLabel}
          </p>
        </div>

        <StadiumMiniMap seat={seat} yawOffsetRad={yawOffsetRad} />
      </div>

      {/* 3 Real-Time SUGBK Spatial Distance Metrics */}
      <div className="compact-sheet-metrics mt-3.5 py-3 border-y border-white/[0.08] grid grid-cols-3 divide-x divide-white/[0.08]">
        <div className="pr-2">
          <p className="text-[clamp(17px,4.9vw,20px)] font-bold tracking-[-0.02em] text-white leading-tight">
            {metrics.toCentreSpotMeters} m
          </p>
          <p className="text-[clamp(10px,2.85vw,11px)] text-[#7E8292] mt-1 leading-snug whitespace-nowrap">
            ke titik tengah
          </p>
        </div>

        <div className="px-2 sm:px-2.5">
          <p className="text-[clamp(17px,4.9vw,20px)] font-bold tracking-[-0.02em] text-white leading-tight">
            {metrics.toNearestGoalMeters} m
          </p>
          <p className="text-[clamp(10px,2.85vw,11px)] text-[#7E8292] mt-1 leading-snug whitespace-nowrap">
            ke gawang terdekat
          </p>
        </div>

        <div className="pl-2 sm:pl-2.5">
          <p className="text-[clamp(17px,4.9vw,20px)] font-bold tracking-[-0.02em] text-white leading-tight">
            {metrics.abovePitchMeters} m
          </p>
          <p className="text-[clamp(10px,2.85vw,11px)] text-[#7E8292] mt-1 leading-snug whitespace-nowrap">
            di atas lapangan
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="compact-sheet-actions mt-3.5 flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onChangeSeat}
          className="compact-sheet-btn h-[48px] sm:h-[50px] px-4 sm:px-5 rounded-full border border-white/[0.14] bg-[#121318] text-[clamp(13.5px,3.8vw,14.5px)] font-semibold text-white tracking-[-0.01em] transition-all hover:bg-[#1B1D25] active:scale-[0.97] cursor-pointer shrink-0"
        >
          Ganti kursi
        </button>

        <button
          type="button"
          onClick={onBuyTicket}
          className={`compact-sheet-btn flex-1 h-[48px] sm:h-[50px] px-4 sm:px-5 rounded-full text-[clamp(13.5px,3.8vw,14.5px)] font-semibold tracking-[-0.01em] flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-[0.97] whitespace-nowrap ${
            addedToBasket
              ? 'bg-[#F5CA37] text-[#0A0A0C] shadow-[0_6px_24px_rgba(245,202,55,0.32)]'
              : 'bg-[#F5F4EF] text-[#0A0A0C] hover:bg-white'
          }`}
        >
          {addedToBasket ? (
            <>
              <Check className="w-[17px] h-[17px] stroke-[2.5] shrink-0" />
              <span>Masuk keranjang</span>
            </>
          ) : (
            <span>Beli tiket · {fullPrice}</span>
          )}
        </button>
      </div>
    </div>
  );
};
