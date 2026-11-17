import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MoveHorizontal } from 'lucide-react';
import { computeSeatSpatialMetrics } from '../../geometry/spatialMetrics';
import {
  StadiumSceneManager,
  type SceneMode,
} from '../../three/StadiumSceneManager';
import type {
  SeatButtonScreenMetrics,
  SeatItem,
  SectionDefinition,
} from '../../types/stadium';
import { SeatDetailSheet } from './SeatDetailSheet';

export interface SeatPovStageHandle {
  zoomTo3D: (seat: SeatItem, btnMetrics: SeatButtonScreenMetrics) => void;
  zoomTo2D: () => void;
}

interface SeatPovStageProps {
  map2DLayerRef: React.RefObject<HTMLDivElement | null>;
  section: SectionDefinition | null;
  seat: SeatItem | null;
  addedToBasket: boolean;
  onSceneModeChange: (mode: SceneMode) => void;
  onToggleBuyTicket: () => void;
}

export const SeatPovStage = React.forwardRef<SeatPovStageHandle, SeatPovStageProps>(
  (
    {
      map2DLayerRef,
      section,
      seat,
      addedToBasket,
      onSceneModeChange,
      onToggleBuyTicket,
    },
    ref,
  ) => {
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const managerRef = useRef<StadiumSceneManager | null>(null);

    const [topHudActive, setTopHudActive] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [showDragHint, setShowDragHint] = useState(true);
    const [yawOffsetRad, setYawOffsetRad] = useState(0);

    const onSceneModeChangeRef = useRef(onSceneModeChange);
    onSceneModeChangeRef.current = onSceneModeChange;

    // Persistently mount WebGL stadium once (0ms shader/mesh init latency on Continue!)
    useEffect(() => {
      const host = canvasHostRef.current;
      if (!host) return;

      host.style.opacity = '0';
      host.style.pointerEvents = 'none';

      const manager = new StadiumSceneManager(host, {
        onFirstDrag: () => setShowDragHint(false),
        onYawOffsetChange: (yaw) => setYawOffsetRad(yaw),
        onHudStateChange: (topActive, isSheetVis) => {
          setTopHudActive(topActive);
          setSheetVisible(isSheetVis);
        },
        onModeChange: (mode) => {
          onSceneModeChangeRef.current(mode);
        },
      });
      manager.setMap2DLayerElement(map2DLayerRef.current);
      managerRef.current = manager;

      return () => {
        manager.dispose();
        managerRef.current = null;
      };
    }, [map2DLayerRef]);

    useImperativeHandle(
      ref,
      () => ({
        zoomTo3D: (targetSeat: SeatItem, btnMetrics: SeatButtonScreenMetrics) => {
          setShowDragHint(true);
          setYawOffsetRad(0);
          managerRef.current?.setMap2DLayerElement(map2DLayerRef.current);
          const seatMetrics = computeSeatSpatialMetrics(targetSeat);
          managerRef.current?.startZoomTo3D(seatMetrics, btnMetrics);
        },
        zoomTo2D: () => {
          managerRef.current?.startZoomTo2D();
        },
      }),
      [map2DLayerRef],
    );

    const metrics = useMemo(
      () => (seat ? computeSeatSpatialMetrics(seat) : null),
      [seat],
    );

    const handleTriggerBack = () => {
      managerRef.current?.startZoomTo2D();
    };

    return (
      <>
        {/* Persistent Full-Bleed WebGL Stadium Layer (z-10, directly underneath 2D map z-20) */}
        <div ref={canvasHostRef} className="absolute inset-0 z-10 w-full h-full" />

        {/* 3D POV HUD & Bottom Sheet Layer (z-30) */}
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {/* Top Floating HUD — adapts to OS safe-area on real phones */}
          <div
            className={`pov-top-hud absolute left-3.5 right-3.5 sm:left-4 sm:right-4 flex items-center gap-2 transition-all duration-300 ease-out ${
              topHudActive
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-3 pointer-events-none'
            }`}
          >
            <button
              type="button"
              onClick={handleTriggerBack}
              aria-label="Back to seat map"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#14151B]/75 backdrop-blur-md border border-white/[0.1] flex items-center justify-center text-white transition-all hover:bg-[#1E2029]/90 active:scale-95 cursor-pointer shrink-0 ${
                topHudActive ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.1]" />
            </button>

            {section && seat && (
              <div className="flex-1 flex justify-center pr-9 sm:pr-10 min-w-0">
                <div className="h-[36px] sm:h-[38px] px-3.5 sm:px-4 rounded-full bg-[#14151B]/75 backdrop-blur-md border border-white/[0.1] flex items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.35)] max-w-full">
                  <span className="w-2 h-2 rounded-full bg-[#F5CA37] shadow-[0_0_8px_#F5CA37] shrink-0" />
                  <span className="text-[clamp(12px,3.4vw,13px)] font-medium text-white tracking-[-0.01em] truncate">
                    Pandangan {section.id} · Baris {seat.row} · Kursi {seat.seat}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sliding Bottom Seat Details Sheet + Auto-Anchored "Drag to look around" Pill */}
          <div
            className={`absolute bottom-0 inset-x-0 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              sheetVisible
                ? 'translate-y-0 pointer-events-auto'
                : 'translate-y-[105%] pointer-events-none'
            }`}
          >
            {/* Anchored 14px directly above the sheet top edge on EVERY screen height! */}
            <div
              className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 transition-all duration-400 ${
                sheetVisible && showDragHint
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-3'
              }`}
            >
              <div className="h-[33px] px-3.5 rounded-full bg-[#101218]/78 backdrop-blur-md border border-white/[0.1] flex items-center gap-2 text-[12px] font-medium text-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.4)] whitespace-nowrap">
                <MoveHorizontal className="w-4 h-4 text-white/80 stroke-[1.9]" />
                <span>Geser untuk melihat sekeliling</span>
              </div>
            </div>

            {section && seat && metrics && (
              <SeatDetailSheet
                section={section}
                seat={seat}
                metrics={metrics}
                yawOffsetRad={yawOffsetRad}
                addedToBasket={addedToBasket}
                onChangeSeat={handleTriggerBack}
                onBuyTicket={onToggleBuyTicket}
              />
            )}
          </div>
        </div>
      </>
    );
  },
);

SeatPovStage.displayName = 'SeatPovStage';
