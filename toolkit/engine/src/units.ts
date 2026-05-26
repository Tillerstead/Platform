import type { LengthUnit, AreaUnit, VolumeUnit } from './types';

// ─── Conversion Tables ────────────────────────────────────────────────────

const LENGTH_TO_FT: Record<LengthUnit, number> = {
  ft: 1,
  in: 1 / 12,
  m: 3.28084,
  cm: 0.0328084,
  yd: 3,
};

const AREA_TO_SQFT: Record<AreaUnit, number> = {
  sqft: 1,
  sqm: 10.7639,
  sqyd: 9,
};

const VOLUME_TO_CUFT: Record<VolumeUnit, number> = {
  cuft: 1,
  cuyd: 27,
  gal: 0.133681,
  L: 0.0353147,
};

// ─── Converters ───────────────────────────────────────────────────────────

export function lengthToFeet(value: number, from: LengthUnit): number {
  return value * LENGTH_TO_FT[from];
}

export function feetToLength(valueFt: number, to: LengthUnit): number {
  return valueFt / LENGTH_TO_FT[to];
}

export function areaToSqft(value: number, from: AreaUnit): number {
  return value * AREA_TO_SQFT[from];
}

export function sqftToArea(valueSqft: number, to: AreaUnit): number {
  return valueSqft / AREA_TO_SQFT[to];
}

export function volumeToCuft(value: number, from: VolumeUnit): number {
  return value * VOLUME_TO_CUFT[from];
}

export function sqInToSqFt(sqIn: number): number {
  return sqIn / 144;
}

// ─── Rounding ─────────────────────────────────────────────────────────────

/** Always round up for materials — never short the job */
export function roundUp(value: number): number {
  return Math.ceil(value);
}

/** Round up to nearest pack/box/bag */
export function roundUpToPack(quantity: number, packSize: number): number {
  if (packSize <= 0) return roundUp(quantity);
  return Math.ceil(quantity / packSize) * packSize;
}

/** Number of packs needed (rounded up) */
export function packsNeeded(quantity: number, packSize: number): number {
  if (packSize <= 0) return roundUp(quantity);
  return Math.ceil(quantity / packSize);
}

/** Apply waste factor and round up */
export function withWaste(value: number, wastePercent: number): number {
  return value * (1 + wastePercent / 100);
}

/** Format number to specified precision */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
