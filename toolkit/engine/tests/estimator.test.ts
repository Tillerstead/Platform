import { describe, it, expect, beforeEach } from 'vitest';
import {
  estimateProject,
  calculateRoomGeometry,
  totalTileableSqft,
  toDecimalFeet,
  WASTE_PROFILES,
  totalWastePercent,
  sqInToSqFt,
  withWaste,
  packsNeeded,
  roundUp,
  resetLineCounter,
  DEFAULT_LABOR_PROFILE,
} from '../src/index';
import type { Room, ProjectLayout, TileSpec } from '../src/index';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Master Bath',
    type: 'bathroom',
    length: { feet: 10, inches: 0 },
    width: { feet: 8, inches: 0 },
    ceilingHeight: { feet: 8, inches: 0 },
    surfaces: [{ kind: 'floor', enabled: true }],
    openings: [],
    ...overrides,
  };
}

function makeProject(rooms: Room[], tileSpec?: Partial<TileSpec>): ProjectLayout {
  return {
    id: 'proj-1',
    name: 'Test Project',
    rooms,
    tileSpec: {
      widthIn: 12,
      heightIn: 12,
      tilesPerBox: 12,
      pattern: 'straight',
      ...tileSpec,
    },
    materialSelections: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────

describe('toDecimalFeet', () => {
  it('converts feet + inches to decimal feet', () => {
    expect(toDecimalFeet({ feet: 10, inches: 6 })).toBeCloseTo(10.5);
    expect(toDecimalFeet({ feet: 8, inches: 0 })).toBe(8);
    expect(toDecimalFeet({ feet: 0, inches: 3 })).toBeCloseTo(0.25);
  });
});

describe('sqInToSqFt', () => {
  it('converts square inches to square feet', () => {
    expect(sqInToSqFt(144)).toBe(1);
    expect(sqInToSqFt(288)).toBe(2);
  });
});

describe('withWaste', () => {
  it('applies waste percentage', () => {
    expect(withWaste(100, 10)).toBeCloseTo(110);
    expect(withWaste(100, 25)).toBeCloseTo(125);
  });
});

describe('packsNeeded', () => {
  it('rounds up to full packs', () => {
    expect(packsNeeded(13, 12)).toBe(2);
    expect(packsNeeded(12, 12)).toBe(1);
    expect(packsNeeded(1, 12)).toBe(1);
  });
});

describe('WASTE_PROFILES', () => {
  it('has correct total for straight pattern', () => {
    expect(totalWastePercent(WASTE_PROFILES.straight)).toBe(15);
  });

  it('has higher waste for herringbone', () => {
    expect(totalWastePercent(WASTE_PROFILES.herringbone)).toBe(30);
  });

  it('has higher waste for diagonal', () => {
    expect(totalWastePercent(WASTE_PROFILES.diagonal)).toBe(23);
  });
});

// ─── Geometry Tests ───────────────────────────────────────────────────────

describe('calculateRoomGeometry', () => {
  it('calculates floor area for a simple room', () => {
    const room = makeRoom();
    const geo = calculateRoomGeometry(room);

    expect(geo.lengthFt).toBe(10);
    expect(geo.widthFt).toBe(8);
    expect(geo.floorSqft).toBe(80);
    expect(geo.wallPerimeterFt).toBe(36);
    expect(geo.surfaces).toHaveLength(1);
    expect(geo.surfaces[0].kind).toBe('floor');
    expect(geo.surfaces[0].netSqft).toBe(80);
  });

  it('calculates full walls with opening deductions', () => {
    const room = makeRoom({
      surfaces: [{ kind: 'full-walls', enabled: true }],
      openings: [
        {
          id: 'door-1',
          name: 'Door',
          type: 'door',
          width: { feet: 3, inches: 0 },
          height: { feet: 6, inches: 8 },
        },
      ],
    });

    const geo = calculateRoomGeometry(room);
    const wallSurface = geo.surfaces[0];

    // Perimeter = 36ft × 8ft = 288 sqft gross
    // Door = 3ft × 6.67ft ≈ 20 sqft
    expect(wallSurface.grossSqft).toBe(288);
    expect(wallSurface.openingDeductions).toBeCloseTo(20, 0);
    expect(wallSurface.netSqft).toBeCloseTo(268, 0);
  });

  it('skips disabled surfaces', () => {
    const room = makeRoom({
      surfaces: [
        { kind: 'floor', enabled: true },
        { kind: 'full-walls', enabled: false },
      ],
    });
    const geo = calculateRoomGeometry(room);
    expect(geo.surfaces).toHaveLength(1);
    expect(geo.surfaces[0].kind).toBe('floor');
  });

  it('handles backsplash with default height', () => {
    const room = makeRoom({
      surfaces: [{ kind: 'backsplash', enabled: true }],
    });
    const geo = calculateRoomGeometry(room);
    // Perimeter = 36ft × 1.5ft (18 inches) = 54 sqft
    expect(geo.surfaces[0].netSqft).toBe(54);
  });

  it('handles shower walls (3-wall)', () => {
    const room = makeRoom({
      type: 'shower',
      length: { feet: 5, inches: 0 },
      width: { feet: 3, inches: 0 },
      ceilingHeight: { feet: 8, inches: 0 },
      surfaces: [{ kind: 'shower-walls', enabled: true }],
    });
    const geo = calculateRoomGeometry(room);
    // 3 walls = 2×3 + 5 = 11ft perimeter × 8ft = 88 sqft
    expect(geo.surfaces[0].grossSqft).toBe(88);
    expect(geo.surfaces[0].netSqft).toBe(88);
  });

  it('handles rooms with fractional inches', () => {
    const room = makeRoom({
      length: { feet: 10, inches: 6 },
      width: { feet: 8, inches: 3 },
    });
    const geo = calculateRoomGeometry(room);
    expect(geo.lengthFt).toBeCloseTo(10.5);
    expect(geo.widthFt).toBeCloseTo(8.25);
    expect(geo.floorSqft).toBeCloseTo(86.625);
  });
});

describe('totalTileableSqft', () => {
  it('sums all surfaces', () => {
    const room = makeRoom({
      surfaces: [
        { kind: 'floor', enabled: true },
        { kind: 'full-walls', enabled: true },
      ],
    });
    const geo = calculateRoomGeometry(room);
    // Floor = 80 sqft + Walls = 288 sqft = 368 sqft
    expect(totalTileableSqft(geo)).toBe(368);
  });
});

// ─── Estimator Integration Tests ──────────────────────────────────────────

describe('estimateProject', () => {
  beforeEach(() => resetLineCounter());

  it('estimates a single-room floor project', () => {
    const project = makeProject([makeRoom()]);
    const result = estimateProject(project);

    expect(result.totalSqft).toBe(80);
    expect(result.sections).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);

    // Should have tile + mortar + grout + waterproofing (bathroom floor)
    const section = result.sections[0];
    expect(section.lines.length).toBeGreaterThanOrEqual(3);

    // Tile line check
    const tileLine = section.lines.find(l => l.category === 'tile');
    expect(tileLine).toBeDefined();
    expect(tileLine!.rawQuantity).toBe(80); // 80 sqft / 1 sqft per tile
    // With 15% waste (10 base + 5 breakage): 80 * 1.15 = 92 tiles → ceil = 92
    expect(tileLine!.adjustedQuantity).toBe(92);
    // 92 tiles / 12 per box = 7.67 → 8 boxes
    expect(tileLine!.packsNeeded).toBe(8);
  });

  it('estimates with herringbone pattern', () => {
    const project = makeProject([makeRoom()], { pattern: 'herringbone' });
    const result = estimateProject(project);

    const tileLine = result.sections[0].lines.find(l => l.category === 'tile');
    // With 30% waste: 80 * 1.30 = 104 tiles
    expect(tileLine!.adjustedQuantity).toBe(104);
  });

  it('estimates labor hours', () => {
    const project = makeProject([makeRoom()]);
    const result = estimateProject(project);

    // 80 sqft at default rates:
    // Demo: max(80*0.05, 2) = 4h
    // WP: max(80*0.03, 2.4) = 2.4h
    // Tile: max(80*0.08, 4) = 6.4h
    // Grout: max(80*0.02, 1.6) = 1.6h
    // Total = 14.4h
    expect(result.laborHours).toBe(14.4);
    expect(result.laborCost).toBe(14.4 * 75);
  });

  it('generates scope of work text', () => {
    const project = makeProject([makeRoom()], undefined);
    project.name = 'Master Bath Remodel';
    project.customerName = 'John Doe';

    const result = estimateProject(project);

    expect(result.scopeOfWork).toContain('Master Bath Remodel');
    expect(result.scopeOfWork).toContain('John Doe');
    expect(result.scopeOfWork).toContain('Master Bath');
    expect(result.scopeOfWork).toContain('sqft');
  });

  it('warns when no rooms are provided', () => {
    const project = makeProject([]);
    const result = estimateProject(project);

    expect(result.warnings).toContain('No rooms in project.');
    expect(result.totalSqft).toBe(0);
  });

  it('warns when no surfaces are enabled', () => {
    const room = makeRoom({ surfaces: [{ kind: 'floor', enabled: false }] });
    const project = makeProject([room]);
    const result = estimateProject(project);

    expect(result.warnings.some(w => w.includes('no surfaces selected'))).toBe(true);
  });

  it('handles multi-room projects', () => {
    const rooms = [
      makeRoom({ id: 'room-1', name: 'Master Bath' }),
      makeRoom({
        id: 'room-2',
        name: 'Guest Bath',
        length: { feet: 6, inches: 0 },
        width: { feet: 5, inches: 0 },
      }),
    ];
    const project = makeProject(rooms);
    const result = estimateProject(project);

    expect(result.sections).toHaveLength(2);
    expect(result.totalSqft).toBe(110); // 80 + 30
  });

  it('includes waterproofing only for wet areas', () => {
    const dryRoom = makeRoom({
      type: 'entryway',
      surfaces: [{ kind: 'floor', enabled: true }],
    });
    const project = makeProject([dryRoom]);
    const result = estimateProject(project);

    const wpLine = result.sections[0].lines.find(l => l.category === 'waterproofing');
    expect(wpLine).toBeUndefined();
  });
});
