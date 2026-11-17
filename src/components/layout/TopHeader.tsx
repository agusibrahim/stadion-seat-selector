import React from 'react';
import { ChevronLeft, Info } from 'lucide-react';
import { CATEGORY_LIST, MATCH_INFO } from '../../data/matchInfo';
import type { CategoryId, ViewStage } from '../../types/stadium';

interface TopHeaderProps {
  stage: ViewStage;
  hiddenFor3D?: boolean;
  activeCategoryFilter: CategoryId | null;
  onToggleCategory: (catId: CategoryId) => void;
  onBack: () => void;
  onOpenInfo: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  stage,
  hiddenFor3D = false,
  activeCategoryFilter,
  onToggleCategory,
  onBack,
  onOpenInfo,
}) => {
  return (
    <header
      className={`top-safe-offset relative z-30 shrink-0 pb-2 px-3.5 sm:px-4 bg-gradient-to-b from-[#0A0A0C] via-[#0A0A0C]/95 to-transparent transition-all duration-200 ${
        hiddenFor3D ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Match bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#17181D] border border-white/[0.06] flex items-center justify-center text-white/90 transition-all active:scale-92 hover:bg-[#22242B] cursor-pointer shrink-0 ${
            stage === 'overview' && activeCategoryFilter === null
              ? 'opacity-85'
              : 'opacity-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.1]" />
        </button>

        <div className="text-center min-w-0">
          <h1 className="text-[clamp(15.5px,4.3vw,17px)] font-semibold tracking-[-0.02em] text-white leading-tight truncate">
            {MATCH_INFO.title}
          </h1>
          <p className="text-[clamp(11.5px,3.2vw,12.5px)] text-[#838694] font-normal mt-0.5 tracking-[-0.01em] truncate">
            {MATCH_INFO.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenInfo}
          aria-label="Match information"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#17181D] border border-white/[0.06] flex items-center justify-center text-white/90 transition-all active:scale-92 hover:bg-[#22242B] cursor-pointer shrink-0"
        >
          <Info className="w-[18px] h-[18px] stroke-[1.9]" />
        </button>
      </div>

      {/* Category filter pills — fluid width so 320px..430px phones never wrap */}
      <div className="mt-2.5 sm:mt-3.5 flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
        {CATEGORY_LIST.map((cat) => {
          const isSelected = activeCategoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggleCategory(cat.id)}
              className={`h-[32px] sm:h-[34px] px-2.5 sm:px-3 rounded-full border flex items-center gap-1.5 text-[clamp(11px,3.15vw,12.5px)] whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-[#1C1D24] border-[#F5CA37]/80 shadow-[0_0_12px_rgba(245,202,55,0.18)]'
                  : 'bg-[#0E0F13] border-white/[0.12] hover:border-white/25'
              }`}
            >
              <span
                className="w-[8px] h-[8px] rounded-[2.5px] shrink-0 transition-colors"
                style={{
                  backgroundColor: isSelected ? '#F5CA37' : cat.dotColor,
                }}
              />
              <span className="text-[#A0A3B1] font-medium">{cat.label}</span>
              <span className="text-white font-semibold">
                {MATCH_INFO.currency}
                {cat.price}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
