// ─── Unit System ───────────────────────────────────────────────────────────

export type LengthUnit = 'ft' | 'in' | 'm' | 'cm' | 'yd';
export type AreaUnit = 'sqft' | 'sqm' | 'sqyd';
export type VolumeUnit = 'cuyd' | 'cuft' | 'gal' | 'L';
export type WeightUnit = 'lb' | 'kg';
export type CountUnit = 'ea' | 'box' | 'bag' | 'sheet' | 'roll' | 'bundle';
export type TimeUnit = 'hours' | 'days';
export type Unit = LengthUnit | AreaUnit | VolumeUnit | WeightUnit | CountUnit | TimeUnit;

// ─── Room Model ────────────────────────────────────────────────────────────

/** Imperial dimension: feet + inches for user-friendly input */
export interface ImperialDimension {
  feet: number;
  inches: number;
}

/** Convert an ImperialDimension to total decimal feet */
export function toDecimalFeet(d: ImperialDimension): number {
  return d.feet + d.inches / 12;
}

export type RoomType =
  | 'bathroom'
  | 'shower'
  | 'kitchen'
  | 'laundry'
  | 'mudroom'
  | 'entryway'
  | 'living-room'
  | 'hallway'
  | 'basement'
  | 'commercial'
  | 'other';

export interface Opening {
  id: string;
  name: string;
  /** e.g. 'door', 'window', 'niche', 'bench' */
  type: 'door' | 'window' | 'niche' | 'bench' | 'other';
  width: ImperialDimension;
  height: ImperialDimension;
  /** Which wall index this opening is on (0-based) */
  wallIndex?: number;
}

export type SurfaceKind =
  | 'floor'
  | 'full-walls'
  | 'half-walls'
  | 'backsplash'
  | 'ceiling'
  | 'shower-walls'
  | 'tub-surround';

export interface Surface {
  kind: SurfaceKind;
  enabled: boolean;
  /** Custom height override for partial walls (e.g. backsplash = 18in, half-wall = 48in) */
  customHeight?: ImperialDimension;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  length: ImperialDimension;
  width: ImperialDimension;
  ceilingHeight: ImperialDimension;
  surfaces: Surface[];
  openings: Opening[];
  notes?: string;
}

// ─── Material Model ────────────────────────────────────────────────────────

export type MaterialCategory =
  | 'tile'
  | 'mortar'
  | 'grout'
  | 'waterproofing'
  | 'backer-board'
  | 'self-leveler'
  | 'trim'
  | 'sealer'
  | 'membrane'
  | 'other';

export type TilePattern =
  | 'straight'
  | 'offset-third'
  | 'offset-half'
  | 'running-bond'
  | 'diagonal'
  | 'herringbone'
  | 'mosaic';

export interface TileSpec {
  widthIn: number;
  heightIn: number;
  tilesPerBox: number;
  sqftPerBox?: number;
  pattern: TilePattern;
}

export interface MaterialCoverageRule {
  category: MaterialCategory;
  productName: string;
  coveragePerUnit: number;
  coverageUnit: AreaUnit | VolumeUnit;
  packUnit: CountUnit;
  packSize: number;
  /** Source: manufacturer TDS URL or standard reference */
  source?: string;
}

export interface WasteProfile {
  pattern: TilePattern;
  baseWastePercent: number;
  breakagePercent: number;
  complexityAdjustmentPercent: number;
}

// ─── Estimate Model ────────────────────────────────────────────────────────

export interface EstimateLine {
  id: string;
  roomId: string;
  surfaceKind: SurfaceKind;
  category: MaterialCategory;
  description: string;
  rawQuantity: number;
  wastePercent: number;
  adjustedQuantity: number;
  packUnit: CountUnit;
  packsNeeded: number;
  unitCost?: number;
  totalCost?: number;
  formula: string;
  assumptions: string[];
}

export interface ScopeSection {
  title: string;
  roomId: string;
  lines: EstimateLine[];
  subtotalSqft: number;
  notes: string[];
}

export interface ProjectLayout {
  id: string;
  name: string;
  customerName?: string;
  address?: string;
  rooms: Room[];
  tileSpec: TileSpec;
  /** Material selections per category */
  materialSelections: Partial<Record<MaterialCategory, string>>;
  createdAt: number;
  updatedAt: number;
}

// ─── Labor Model ───────────────────────────────────────────────────────────

export interface LaborPhase {
  name: string;
  /** Hours per sqft for this phase */
  ratePerSqft: number;
  /** Minimum hours regardless of area */
  minimumHours: number;
  notes?: string;
}

export interface LaborProfile {
  name: string;
  hourlyRate: number;
  phases: LaborPhase[];
}

// ─── Full Estimate ─────────────────────────────────────────────────────────

export interface EstimateResult {
  project: ProjectLayout;
  sections: ScopeSection[];
  totalSqft: number;
  totalEstimateLines: EstimateLine[];
  laborHours: number;
  materialsCost: number;
  laborCost: number;
  scopeOfWork: string;
  generatedAt: number;
  warnings: string[];
  assumptions: string[];
}
