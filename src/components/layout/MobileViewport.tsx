import React from 'react';

interface MobileViewportProps {
  frameRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export const MobileViewport: React.FC<MobileViewportProps> = ({ frameRef, children }) => {
  return (
    <div className="w-screen h-dvh bg-[#050507] flex items-center justify-center overflow-hidden select-none">
      <div ref={frameRef} className="phone-shell">
        {/* Desktop mockup status bar ONLY — automatically hidden on real mobile/touch devices via `.desktop-chrome-only` */}
        <div className="desktop-chrome-only absolute top-0 inset-x-0 z-40 h-11 px-7 flex items-center justify-between pointer-events-none text-white">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
              <rect x="0.5" y="7" width="3" height="3.5" rx="0.8" fill="white" />
              <rect x="4.8" y="5" width="3" height="5.5" rx="0.8" fill="white" />
              <rect x="9.1" y="2.8" width="3" height="7.7" rx="0.8" fill="white" />
              <rect x="13.4" y="0.5" width="3" height="10" rx="0.8" fill="white" fillOpacity="0.35" />
            </svg>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              <path
                d="M8 8.6a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Zm-3.1-1.7a4.6 4.6 0 0 1 6.2 0l1.15-1.18a6.25 6.25 0 0 0-8.5 0L4.9 6.9Zm-2.55-2.55a8.25 8.25 0 0 1 11.3 0l1.15-1.18a9.9 9.9 0 0 0-13.6 0l1.15 1.18Z"
                fill="white"
              />
            </svg>
            <div className="flex items-center">
              <div className="w-[23px] h-[11.5px] rounded-[3.5px] border border-white/40 p-[1.5px] flex items-center">
                <div className="w-full h-full bg-white rounded-[1.5px]" />
              </div>
              <div className="w-[1.5px] h-[4px] bg-white/45 rounded-r-full ml-[1px]" />
            </div>
          </div>
        </div>

        {/* Main interactive content */}
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Desktop mockup home indicator ONLY — hidden on real phones */}
        <div className="desktop-chrome-only pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-50 w-[134px] h-[5px] rounded-full bg-white/85" />
      </div>
    </div>
  );
};
