import type { MaterialCoverageRule, WasteProfile, TilePattern } from './types';

// ─── Tile Waste Profiles ──────────────────────────────────────────────────
// Sourced from Tillerstead formula library + industry practice
// All values are starting points — user should adjust for room complexity

export const WASTE_PROFILES: Record<TilePattern, WasteProfile> = {
  straight: {
    pattern: 'straight',
    baseWastePercent: 10,
    breakagePercent: 5,
    complexityAdjustmentPercent: 0,
  },
  'offset-third': {
    pattern: 'offset-third',
    baseWastePercent: 12,
    breakagePercent: 5,
    complexityAdjustmentPercent: 0,
  },
  'offset-half': {
    pattern: 'offset-half',
    baseWastePercent: 15,
    breakagePercent: 5,
    complexityAdjustmentPercent: 0,
  },
  'running-bond': {
    pattern: 'running-bond',
    baseWastePercent: 12,
    breakagePercent: 5,
    complexityAdjustmentPercent: 0,
  },
  diagonal: {
    pattern: 'diagonal',
    baseWastePercent: 18,
    breakagePercent: 5,
    complexityAdjustmentPercent: 0,
  },
  herringbone: {
    pattern: 'herringbone',
    baseWastePercent: 25,
    breakagePercent: 5,
    complexityAdjustmentPercent: 0,
  },
  mosaic: {
    pattern: 'mosaic',
    baseWastePercent: 12,
    breakagePercent: 3,
    complexityAdjustmentPercent: 0,
  },
};

export function totalWastePercent(profile: WasteProfile): number {
  return profile.baseWastePercent + profile.breakagePercent + profile.complexityAdjustmentPercent;
}

// ─── Material Coverage Rules ──────────────────────────────────────────────
// All coverage rates sourced from manufacturer TDS documents

export const MORTAR_COVERAGE_RULES: MaterialCoverageRule[] = [
  {
    category: 'mortar',
    productName: 'Modified Thinset (1/4" × 1/4" V-notch)',
    coveragePerUnit: 95,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 50,
    source: 'Custom Building Products TDS — 1/4" × 1/4" V-notch trowel',
  },
  {
    category: 'mortar',
    productName: 'Modified Thinset (1/4" × 3/8" square)',
    coveragePerUnit: 70,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 50,
    source: 'Custom Building Products TDS — 1/4" × 3/8" square notch trowel',
  },
  {
    category: 'mortar',
    productName: 'Modified Thinset (1/2" × 1/2" square)',
    coveragePerUnit: 40,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 50,
    source: 'Custom Building Products TDS — 1/2" × 1/2" square notch trowel',
  },
  {
    category: 'mortar',
    productName: 'Large Format Tile Mortar (1/2" × 1/2" square)',
    coveragePerUnit: 38,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 50,
    source: 'Mapei Kerabond T TDS — 1/2" × 1/2" square notch, back-buttered',
  },
];

export const GROUT_COVERAGE_RULES: MaterialCoverageRule[] = [
  {
    category: 'grout',
    productName: 'Sanded Grout (1/8" joint, 12×12 tile)',
    coveragePerUnit: 95,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 25,
    source: 'Custom Building Products Polyblend TDS',
  },
  {
    category: 'grout',
    productName: 'Sanded Grout (3/16" joint, 12×12 tile)',
    coveragePerUnit: 60,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 25,
    source: 'Custom Building Products Polyblend TDS',
  },
  {
    category: 'grout',
    productName: 'Unsanded Grout (1/16" joint, mosaic)',
    coveragePerUnit: 125,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 10,
    source: 'Custom Building Products Polyblend TDS',
  },
];

export const WATERPROOFING_COVERAGE_RULES: MaterialCoverageRule[] = [
  {
    category: 'waterproofing',
    productName: 'RedGard (liquid membrane)',
    coveragePerUnit: 55,
    coverageUnit: 'sqft',
    packUnit: 'gal' as any,
    packSize: 1,
    source: 'Custom Building Products RedGard TDS — 2 coats',
  },
  {
    category: 'waterproofing',
    productName: 'Laticrete Hydro Ban',
    coveragePerUnit: 55,
    coverageUnit: 'sqft',
    packUnit: 'gal' as any,
    packSize: 1,
    source: 'Laticrete Hydro Ban TDS — 2 coats',
  },
  {
    category: 'waterproofing',
    productName: 'Mapei AquaDefense',
    coveragePerUnit: 75,
    coverageUnit: 'sqft',
    packUnit: 'gal' as any,
    packSize: 1,
    source: 'Mapei AquaDefense TDS — 2 coats',
  },
  {
    category: 'waterproofing',
    productName: 'Schluter KERDI (sheet membrane)',
    coveragePerUnit: 54,
    coverageUnit: 'sqft',
    packUnit: 'roll',
    packSize: 1,
    source: 'Schluter KERDI — 3\'3" × 16\'5" roll = 54 sqft',
  },
];

export const BACKER_BOARD_COVERAGE_RULES: MaterialCoverageRule[] = [
  {
    category: 'backer-board',
    productName: 'Cement Board (3×5 sheet)',
    coveragePerUnit: 15,
    coverageUnit: 'sqft',
    packUnit: 'sheet',
    packSize: 1,
    source: 'Standard 3ft × 5ft cement board sheet',
  },
  {
    category: 'backer-board',
    productName: 'Schluter KERDI-BOARD (3×5 panel)',
    coveragePerUnit: 15,
    coverageUnit: 'sqft',
    packUnit: 'sheet',
    packSize: 1,
    source: 'Schluter KERDI-BOARD panel',
  },
];

export const SELF_LEVELER_COVERAGE_RULES: MaterialCoverageRule[] = [
  {
    category: 'self-leveler',
    productName: 'Mapei Self-Leveler Plus (1/8" depth)',
    coveragePerUnit: 25,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 50,
    source: 'Mapei Self-Leveler Plus TDS — 1/8" pour depth',
  },
  {
    category: 'self-leveler',
    productName: 'Mapei Self-Leveler Plus (1/4" depth)',
    coveragePerUnit: 12.5,
    coverageUnit: 'sqft',
    packUnit: 'bag',
    packSize: 50,
    source: 'Mapei Self-Leveler Plus TDS — 1/4" pour depth',
  },
];

// ─── Lookup helper ────────────────────────────────────────────────────────

export function findCoverageRule(
  category: string,
  productName?: string
): MaterialCoverageRule | undefined {
  const allRules = [
    ...MORTAR_COVERAGE_RULES,
    ...GROUT_COVERAGE_RULES,
    ...WATERPROOFING_COVERAGE_RULES,
    ...BACKER_BOARD_COVERAGE_RULES,
    ...SELF_LEVELER_COVERAGE_RULES,
  ];

  if (productName) {
    return allRules.find(
      r =>
        r.category === category && r.productName.toLowerCase().includes(productName.toLowerCase())
    );
  }

  // Return the first rule for the category (default product)
  return allRules.find(r => r.category === category);
}
