import React from 'react';
import { X } from 'lucide-react';
import { CATEGORY_LIST, MATCH_INFO } from '../../data/matchInfo';

interface MatchInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const MatchInfoModal: React.FC<MatchInfoModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-[fadeIn_180ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full rounded-[26px] bg-[#13141A] border border-white/[0.1] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#F5CA37] uppercase">
              {MATCH_INFO.stageTitle}
            </p>
            <h3 className="text-[20px] font-bold text-white mt-0.5">
              {MATCH_INFO.title}
            </h3>
            <p className="text-[13px] text-[#8B8E9E] mt-0.5">{MATCH_INFO.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-white/80 hover:bg-white/[0.14] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-white/[0.08] pt-4">
          <p className="text-[12px] font-medium text-[#8B8E9E] uppercase tracking-wider">
            Ticket Categories
          </p>
          {CATEGORY_LIST.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between py-1.5 text-[13.5px]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-[3px]"
                  style={{ backgroundColor: cat.mapColor }}
                />
                <span className="text-white font-medium">{cat.label}</span>
                <span className="text-[#7F8393] text-[12.5px]">
                  {cat.id === 1
                    ? 'Lower sideline stands'
                    : cat.id === 2
                      ? 'Lower goal ends & upper sidelines'
                      : 'Upper corners & goal ends'}
                </span>
              </div>
              <span className="text-white font-semibold">
                {MATCH_INFO.currency}
                {cat.price}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[12px] text-[#757989] leading-relaxed">
          Tap any stadium section to auto-orient toward the pitch, pick an available seat,
          and preview the exact 3D sightline before adding to basket.
        </p>
      </div>
    </div>
  );
};
