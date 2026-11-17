import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SECTIONS_BY_ID } from './data/stadiumConfig';
import type {
  CategoryId,
  SeatButtonScreenMetrics,
  SeatItem,
  SectionDefinition,
  ViewStage,
} from './types/stadium';
import type { SceneMode } from './three/StadiumSceneManager';
import { MobileViewport } from './components/layout/MobileViewport';
import { TopHeader } from './components/layout/TopHeader';
import { BottomActionBar } from './components/layout/BottomActionBar';
import { MatchInfoModal } from './components/layout/MatchInfoModal';
import { StadiumMapCanvas } from './components/map2d/StadiumMapCanvas';
import { SeatPovStage, type SeatPovStageHandle } from './components/view3d/SeatPovStage';

export const App: React.FC = () => {
  const [mapStage, setMapStage] = useState<'overview' | 'section'>('overview');
  const [sceneMode, setSceneMode] = useState<SceneMode>('MAP_2D');
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatItem | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CategoryId | null>(null);
  const [addedSeatIds, setAddedSeatIds] = useState<Set<string>>(() => new Set());
  const [infoOpen, setInfoOpen] = useState(false);

  const phoneFrameRef = useRef<HTMLDivElement | null>(null);
  const map2DLayerRef = useRef<HTMLDivElement | null>(null);
  const povStageRef = useRef<SeatPovStageHandle | null>(null);
  const zoomTimerRef = useRef<number | null>(null);
  const sceneModeRef = useRef<SceneMode>('MAP_2D');
  sceneModeRef.current = sceneMode;
  const mapStageRef = useRef<'overview' | 'section'>('overview');
  mapStageRef.current = mapStage;

  useEffect(() => {
    return () => {
      if (zoomTimerRef.current !== null) {
        window.clearTimeout(zoomTimerRef.current);
      }
    };
  }, []);

  // Native Android Hardware Back & iOS/Android Swipe-Back Gesture Support
  useEffect(() => {
    const onPopState = () => {
      if (
        sceneModeRef.current === 'POV_3D' ||
        sceneModeRef.current === 'TRANSITION_TO_3D'
      ) {
        povStageRef.current?.zoomTo2D();
        return;
      }
      if (mapStageRef.current === 'section') {
        setMapStage('overview');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleToggleCategory = useCallback((catId: CategoryId) => {
    setActiveCategoryFilter((prev) => (prev === catId ? null : catId));
  }, []);

  const handleSelectSection = useCallback(
    (section: SectionDefinition) => {
      if (sceneMode !== 'MAP_2D') return;

      if (zoomTimerRef.current !== null) {
        window.clearTimeout(zoomTimerRef.current);
        zoomTimerRef.current = null;
      }

      setHighlightedSectionId(section.id);
      setActiveSectionId(section.id);
      setSelectedSeat((prev) => (prev && prev.sectionId === section.id ? prev : null));

      if (mapStage === 'overview') {
        window.history.pushState({ stadiumStage: 'section', sec: section.id }, '');
        zoomTimerRef.current = window.setTimeout(() => {
          setMapStage('section');
          zoomTimerRef.current = null;
        }, 150);
      } else {
        setMapStage('section');
      }
    },
    [mapStage, sceneMode],
  );

  const handleSelectSeat = useCallback((seat: SeatItem) => {
    setSelectedSeat(seat);
    setHighlightedSectionId(seat.sectionId);
  }, []);

  const handleBackFromHeader = useCallback(() => {
    if (zoomTimerRef.current !== null) {
      window.clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = null;
    }

    if (mapStage === 'section') {
      setMapStage('overview');
      return;
    }

    if (activeCategoryFilter !== null) {
      setActiveCategoryFilter(null);
    }
  }, [mapStage, activeCategoryFilter]);

  /**
   * Measures the exact screen pixel center & width of the selected 2D yellow seat `<rect>`
   * inside `phoneFrameRef` and launches the Ray-Pinned Exponential Zoom-In to 3D POV!
   */
  const measureSeatButtonMetrics = useCallback(
    (seat: SeatItem): SeatButtonScreenMetrics => {
      const frameEl = phoneFrameRef.current;
      const mapEl = map2DLayerRef.current;

      if (frameEl && mapEl) {
        mapEl.style.transform = 'none';
        const frameRect = frameEl.getBoundingClientRect();
        const seatNode = frameEl.querySelector(
          `[data-seat-id="${seat.id}"] [data-seat-visual="true"]`,
        );

        if (seatNode) {
          const r = seatNode.getBoundingClientRect();
          const cx = r.left + r.width * 0.5 - frameRect.left;
          const cy = r.top + r.height * 0.5 - frameRect.top;
          return {
            btnCenterX: cx,
            btnCenterY: cy,
            btnWidth: Math.max(6, r.width),
            btnNdcX: (cx / frameRect.width) * 2 - 1,
            btnNdcY: -((cy / frameRect.height) * 2 - 1),
          };
        }

        return {
          btnCenterX: frameRect.width * 0.5,
          btnCenterY: frameRect.height * 0.46,
          btnWidth: 9,
          btnNdcX: 0,
          btnNdcY: 0.08,
        };
      }

      return {
        btnCenterX: 195,
        btnCenterY: 390,
        btnWidth: 9,
        btnNdcX: 0,
        btnNdcY: 0.08,
      };
    },
    [],
  );

  const handleContinueTo3D = useCallback(() => {
    if (!selectedSeat || sceneMode !== 'MAP_2D') return;

    const launchZoom = () => {
      window.history.pushState({ stadiumStage: 'pov3d', seat: selectedSeat.id }, '');
      const btnMetrics = measureSeatButtonMetrics(selectedSeat);
      povStageRef.current?.zoomTo3D(selectedSeat, btnMetrics);
    };

    // If user clicked Continue from Overview with a remembered seat, zoom to its section first or launch cleanly
    if (mapStage !== 'section') {
      setActiveSectionId(selectedSeat.sectionId);
      setHighlightedSectionId(selectedSeat.sectionId);
      setMapStage('section');
      window.setTimeout(launchZoom, 560);
    } else {
      launchZoom();
    }
  }, [selectedSeat, sceneMode, mapStage, measureSeatButtonMetrics]);

  const handleToggleBuyTicket = useCallback(() => {
    if (!selectedSeat) return;
    setAddedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(selectedSeat.id)) {
        next.delete(selectedSeat.id);
      } else {
        next.add(selectedSeat.id);
      }
      return next;
    });
  }, [selectedSeat]);

  const activeSection =
    activeSectionId !== null ? SECTIONS_BY_ID.get(activeSectionId) ?? null : null;
  const selectedSeatSection = selectedSeat
    ? SECTIONS_BY_ID.get(selectedSeat.sectionId) ?? null
    : null;

  const effectiveViewStage: ViewStage =
    sceneMode === 'POV_3D'
      ? 'pov3d'
      : sceneMode === 'TRANSITION_TO_3D'
        ? 'diving-to-3d'
        : sceneMode === 'TRANSITION_TO_2D'
          ? 'returning-to-2d'
          : mapStage;

  return (
    <MobileViewport frameRef={phoneFrameRef}>
      {/* Persistent 3D WebGL Stadium + POV HUD Layer (underneath 2D map at z-10, HUD at z-30) */}
      <SeatPovStage
        ref={povStageRef}
        map2DLayerRef={map2DLayerRef}
        section={selectedSeatSection}
        seat={selectedSeat}
        addedToBasket={selectedSeat ? addedSeatIds.has(selectedSeat.id) : false}
        onSceneModeChange={setSceneMode}
        onToggleBuyTicket={handleToggleBuyTicket}
      />

      {/* 2D Seat Map Layer (z-20: scales 1x -> ~10x with perspective tilt & blur into the selected seat!) */}
      <div
        ref={map2DLayerRef}
        className="absolute inset-0 z-20 flex flex-col bg-[#0A0A0C] will-change-[transform,opacity]"
      >
        <TopHeader
          stage={effectiveViewStage}
          activeCategoryFilter={activeCategoryFilter}
          onToggleCategory={handleToggleCategory}
          onBack={handleBackFromHeader}
          onOpenInfo={() => setInfoOpen(true)}
        />

        <StadiumMapCanvas
          stage={mapStage}
          activeSectionId={activeSectionId}
          highlightedSectionId={highlightedSectionId}
          selectedSeat={selectedSeat}
          activeCategoryFilter={activeCategoryFilter}
          onSelectSection={handleSelectSection}
          onSelectSeat={handleSelectSeat}
          onBackToOverview={() => setMapStage('overview')}
        />

        <BottomActionBar
          activeSection={mapStage === 'section' ? activeSection : null}
          selectedSeat={selectedSeat}
          selectedSeatSection={selectedSeatSection}
          onContinue={handleContinueTo3D}
        />
      </div>

      <MatchInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </MobileViewport>
  );
};

export default App;
