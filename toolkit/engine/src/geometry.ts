import type { Room, SurfaceKind, Opening } from './types';
import { toDecimalFeet } from './types';

// ─── Computed Surface Area ─────────────────────────────────────────────────

export interface SurfaceArea {
  kind: SurfaceKind;
  grossSqft: number;
  openingDeductions: number;
  netSqft: number;
  perimeter?: number;
}

export interface RoomGeometry {
  lengthFt: number;
  widthFt: number;
  ceilingHeightFt: number;
  floorSqft: number;
  wallPerimeterFt: number;
  totalWallSqft: number;
  surfaces: SurfaceArea[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function openingArea(o: Opening): number {
  return toDecimalFeet(o.width) * toDecimalFeet(o.height);
}

function openingsOnWalls(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + openingArea(o), 0);
}

// ─── Main Calculator ──────────────────────────────────────────────────────

export function calculateRoomGeometry(room: Room): RoomGeometry {
  const lengthFt = toDecimalFeet(room.length);
  const widthFt = toDecimalFeet(room.width);
  const ceilingHeightFt = toDecimalFeet(room.ceilingHeight);
  const perimeter = 2 * (lengthFt + widthFt);

  const surfaces: SurfaceArea[] = [];

  for (const surface of room.surfaces) {
    if (!surface.enabled) continue;

    let grossSqft = 0;
    let deductions = 0;

    switch (surface.kind) {
      case 'floor': {
        grossSqft = lengthFt * widthFt;
        // No opening deductions for floors
        break;
      }
      case 'full-walls': {
        grossSqft = perimeter * ceilingHeightFt;
        deductions = openingsOnWalls(room.openings);
        break;
      }
      case 'half-walls': {
        const halfHeight = surface.customHeight ?? { feet: 4, inches: 0 };
        grossSqft = perimeter * toDecimalFeet(halfHeight);
        deductions = room.openings
          .filter(o => toDecimalFeet(o.height) <= toDecimalFeet(halfHeight))
          .reduce((sum, o) => sum + openingArea(o), 0);
        break;
      }
      case 'backsplash': {
        const splashHeight = surface.customHeight ?? { feet: 1, inches: 6 };
        grossSqft = perimeter * toDecimalFeet(splashHeight);
        break;
      }
      case 'ceiling': {
        grossSqft = lengthFt * widthFt;
        break;
      }
      case 'shower-walls': {
        grossSqft = (2 * widthFt + lengthFt) * ceilingHeightFt;
        deductions = room.openings
          .filter(o => o.type === 'niche' || o.type === 'window')
          .reduce((sum, o) => sum + openingArea(o), 0);
        break;
      }
      case 'tub-surround': {
        const surroundHeight = surface.customHeight ?? { feet: 5, inches: 0 };
        grossSqft = (2 * widthFt + lengthFt) * toDecimalFeet(surroundHeight);
        deductions = room.openings
          .filter(o => o.type === 'niche' || o.type === 'window')
          .reduce((sum, o) => sum + openingArea(o), 0);
        break;
      }
    }

    surfaces.push({
      kind: surface.kind,
      grossSqft: Math.round(grossSqft * 100) / 100,
      openingDeductions: Math.round(deductions * 100) / 100,
      netSqft: Math.round(Math.max(0, grossSqft - deductions) * 100) / 100,
      perimeter: surface.kind === 'floor' ? perimeter : undefined,
    });
  }

  return {
    lengthFt,
    widthFt,
    ceilingHeightFt,
    floorSqft: lengthFt * widthFt,
    wallPerimeterFt: perimeter,
    totalWallSqft: perimeter * ceilingHeightFt,
    surfaces,
  };
}

/** Sum all enabled surface areas in a room */
export function totalTileableSqft(geometry: RoomGeometry): number {
  return geometry.surfaces.reduce((sum, s) => sum + s.netSqft, 0);
}
