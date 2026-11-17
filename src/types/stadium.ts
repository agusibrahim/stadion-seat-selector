export type CategoryId = 1 | 2 | 3;

export type TierType = 'lower' | 'upper';

export type ViewStage =
  | 'overview'
  | 'section'
  | 'diving-to-3d'
  | 'pov3d'
  | 'returning-to-2d';

export interface TicketCategory {
  id: CategoryId;
  label: string;
  price: number;
  shortPrice: string; // e.g. "Rp450rb" for compact mobile pills
  fullPrice: string; // e.g. "Rp450.000" for bottom bar & ticket CTA
  mapColor: string;
  hoverColor: string;
  dotColor: string;
}

export interface SectionDefinition {
  id: number;
  slotIndex: number; // 0..35 around the 36-sector SUGBK elliptical loop
  zona: number; // Zona 1..12 authentic SUGBK zone numbering
  tier: TierType;
  category: CategoryId;
  available: boolean; // false for 4 marathon gates & VVIP broadcast box
  standLabel: string; // e.g. "Tribun Barat · Zona 1"
  zoneBadge: string; // e.g. "VIP BARAT · ZONA 1", "TRIBUN UTARA · ZONA 4"
  rows: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface SectionGeometry2D {
  id: number;
  polygon: Point2D[];
  svgPath: string;
  center: Point2D;
  /** Angle in radians pointing from section center toward the pitch (inward normal) */
  inwardAngleRad: number;
  /** Rotation in degrees applied to the stadium SVG so inwardAngleRad points straight UP (-90 deg) */
  focusRotationDeg: number;
  /** Inner (pitch-side) & outer (back-wall) arc sample points for placing seats accurately */
  innerEdge: Point2D[];
  outerEdge: Point2D[];
}

export type SeatStatus = 'available' | 'taken';

export interface SeatItem {
  id: string;
  sectionId: number;
  row: number; // 1-indexed from pitch outward
  seat: number; // 1-indexed right-to-left when facing pitch
  seatsInRow: number;
  status: SeatStatus;
  /** Position in stadium 2D SVG coordinates */
  pos2d: Point2D;
  /** Normalized u in [0,1] (left-to-right when facing pitch) and v in [0,1] (front-to-back row) */
  u: number;
  v: number;
}

export interface SeatButtonScreenMetrics {
  btnCenterX: number;
  btnCenterY: number;
  btnWidth: number;
  btnNdcX: number;
  btnNdcY: number;
}

export interface SeatSpatialMetrics {
  /** 3D eye position in Three.js world meters (X: West-East, Y: height above pitch, Z: North-South) */
  eyePosition: [number, number, number];
  /** Default 3D look-at target on the pitch */
  lookAtTarget: [number, number, number];
  /** Exact 3D seat step/base position for highlighting the selected seat in yellow during zoom */
  seatWorldPosition: [number, number, number];
  /** Seat rotation around Y so the yellow 3D target chair faces inward toward the pitch */
  seatRotationY: number;
  /** Outward horizontal unit normal (nx, nz) of the section (used for orthonormal ray-pinning basis) */
  sectionOutwardNormal: [number, number];
  /** Seat ID string (e.g. "217-12-17") used to hide the underlying blue instance */
  seatId: string;
  /** Seat number displayed on the 3D target seat cushion badge during zoom */
  seatNumber: number;
  /** Distance in meters to the centre spot (0, 0, 0) */
  toCentreSpotMeters: number;
  /** Distance in meters to the nearest goal line center */
  toNearestGoalMeters: number;
  /** Elevation in meters above the pitch surface */
  abovePitchMeters: number;
}
