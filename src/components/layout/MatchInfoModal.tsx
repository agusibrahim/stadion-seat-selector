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
            <p className="text-[13px] text-[#8B8E9E] mt-0.5">
              {MATCH_INFO.venueName} · {MATCH_INFO.venueCity}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup informasi"
            className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-white/80 hover:bg-white/[0.14] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-white/[0.08] pt-4">
          <p className="text-[12px] font-medium text-[#8B8E9E] uppercase tracking-wider">
            Kategori Tiket SUGBK (Zona 1–12)
          </p>
          {CATEGORY_LIST.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between py-1.5 text-[13.5px] gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-[3px] shrink-0"
                  style={{ backgroundColor: cat.mapColor }}
                />
                <span className="text-white font-medium shrink-0">{cat.label}</span>
                <span className="text-[#7F8393] text-[12px] truncate">
                  {cat.id === 1
                    ? 'VIP Barat & Timur Bawah'
                    : cat.id === 2
                      ? 'Utara/Selatan Bawah & Barat/Timur Atas'
                      : 'Tribun Atas Utara, Selatan & Sudut'}
                </span>
              </div>
              <span className="text-white font-semibold shrink-0">{cat.fullPrice}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[12px] text-[#757989] leading-relaxed">
          Pilih sektor pada denah oval Gelora Bung Karno, tentukan kursi yang tersedia,
          lalu tekan <strong className="text-white/90">Lanjut</strong> untuk zoom-in nyata ke pandangan 3D dari kursi Anda.
        </p>
      </div>
    </div>
  );
};
