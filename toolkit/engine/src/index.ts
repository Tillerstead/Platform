// @tillerstead/engine — Shared Room Estimating Engine
// Single source of truth for material quantity calculations.
// Used by: Tillerstead (public planner), CCC (professional editor), toolkit backend

// Domain types
export type {
  // Units
  LengthUnit,
  AreaUnit,
  VolumeUnit,
  WeightUnit,
  CountUnit,
  TimeUnit,
  Unit,

  // Room
  ImperialDimension,
  RoomType,
  Opening,
  SurfaceKind,
  Surface,
  Room,

  // Material
  MaterialCategory,
  TilePattern,
  TileSpec,
  MaterialCoverageRule,
  WasteProfile,

  // Estimate
  EstimateLine,
  ScopeSection,
  ProjectLayout,

  // Labor
  LaborPhase,
  LaborProfile,

  // Result
  EstimateResult,
} from './types';

export { toDecimalFeet } from './types';

// Geometry
export { calculateRoomGeometry, totalTileableSqft } from './geometry';
export type { SurfaceArea, RoomGeometry } from './geometry';

// Units & rounding
export {
  lengthToFeet,
  feetToLength,
  areaToSqft,
  sqftToArea,
  volumeToCuft,
  sqInToSqFt,
  roundUp,
  roundUpToPack,
  packsNeeded,
  withWaste,
  formatNumber,
} from './units';

// Materials database
export {
  WASTE_PROFILES,
  totalWastePercent,
  MORTAR_COVERAGE_RULES,
  GROUT_COVERAGE_RULES,
  WATERPROOFING_COVERAGE_RULES,
  BACKER_BOARD_COVERAGE_RULES,
  SELF_LEVELER_COVERAGE_RULES,
  findCoverageRule,
} from './materials';

// Estimator (main entry point)
export { estimateProject, DEFAULT_LABOR_PROFILE, resetLineCounter } from './estimator';
