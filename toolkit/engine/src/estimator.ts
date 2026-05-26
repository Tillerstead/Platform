import type {
  Room,
  TileSpec,
  EstimateLine,
  ScopeSection,
  MaterialCategory,
  ProjectLayout,
  LaborProfile,
  EstimateResult,
} from './types';
import { calculateRoomGeometry, totalTileableSqft } from './geometry';
import type { SurfaceArea } from './geometry';
import { WASTE_PROFILES, totalWastePercent, findCoverageRule } from './materials';
import { sqInToSqFt, withWaste, packsNeeded, roundUp } from './units';

// ─── Line ID generator ────────────────────────────────────────────────────

let lineCounter = 0;

function nextLineId(): string {
  return `line-${++lineCounter}`;
}

/** Reset counter (for testing) */
export function resetLineCounter(): void {
  lineCounter = 0;
}

// ─── Tile Quantity ────────────────────────────────────────────────────────

function estimateTileForSurface(
  surface: SurfaceArea,
  tileSpec: TileSpec,
  roomId: string
): EstimateLine {
  const tileAreaSqFt = sqInToSqFt(tileSpec.widthIn * tileSpec.heightIn);
  const wasteProfile = WASTE_PROFILES[tileSpec.pattern];
  const waste = totalWastePercent(wasteProfile);

  const rawTiles = surface.netSqft / tileAreaSqFt;
  const adjustedTiles = withWaste(rawTiles, waste);
  const tilesNeeded = roundUp(adjustedTiles);
  const boxes = packsNeeded(tilesNeeded, tileSpec.tilesPerBox);

  return {
    id: nextLineId(),
    roomId,
    surfaceKind: surface.kind,
    category: 'tile',
    description: `${tileSpec.widthIn}"×${tileSpec.heightIn}" tile — ${tileSpec.pattern} layout`,
    rawQuantity: Math.round(rawTiles * 100) / 100,
    wastePercent: waste,
    adjustedQuantity: tilesNeeded,
    packUnit: 'box',
    packsNeeded: boxes,
    formula: `${surface.netSqft} sqft ÷ ${tileAreaSqFt.toFixed(4)} sqft/tile × (1 + ${waste}%) = ${tilesNeeded} tiles → ${boxes} boxes`,
    assumptions: [
      `Tile area: ${tileSpec.widthIn}" × ${tileSpec.heightIn}" = ${(tileAreaSqFt * 144).toFixed(0)} sq in`,
      `Waste: ${wasteProfile.baseWastePercent}% base + ${wasteProfile.breakagePercent}% breakage + ${wasteProfile.complexityAdjustmentPercent}% complexity = ${waste}%`,
      `${tileSpec.tilesPerBox} tiles per box`,
    ],
  };
}

// ─── Support Material Quantity ────────────────────────────────────────────

function estimateSupportMaterial(
  surface: SurfaceArea,
  category: MaterialCategory,
  roomId: string,
  productName?: string
): EstimateLine | null {
  const rule = findCoverageRule(category, productName);
  if (!rule) return null;

  const waste = category === 'waterproofing' ? 10 : 5;
  const rawQty = surface.netSqft / rule.coveragePerUnit;
  const adjustedQty = withWaste(rawQty, waste);
  const packs = packsNeeded(adjustedQty, 1); // Each unit is one pack for these materials

  return {
    id: nextLineId(),
    roomId,
    surfaceKind: surface.kind,
    category,
    description: rule.productName,
    rawQuantity: Math.round(rawQty * 100) / 100,
    wastePercent: waste,
    adjustedQuantity: Math.round(adjustedQty * 100) / 100,
    packUnit: rule.packUnit,
    packsNeeded: packs,
    formula: `${surface.netSqft} sqft ÷ ${rule.coveragePerUnit} sqft/${rule.packUnit} × (1 + ${waste}%) = ${packs} ${rule.packUnit}s`,
    assumptions: [
      `Coverage: ${rule.coveragePerUnit} sqft per ${rule.packUnit}`,
      rule.source ?? 'Industry standard',
    ],
  };
}

// ─── Room Estimator ───────────────────────────────────────────────────────

function estimateRoom(
  room: Room,
  tileSpec: TileSpec,
  materialSelections: Partial<Record<MaterialCategory, string>>
): ScopeSection {
  const geometry = calculateRoomGeometry(room);
  const lines: EstimateLine[] = [];
  const notes: string[] = [];

  for (const surface of geometry.surfaces) {
    // Tile
    lines.push(estimateTileForSurface(surface, tileSpec, room.id));

    // Mortar/thinset
    const mortar = estimateSupportMaterial(surface, 'mortar', room.id, materialSelections.mortar);
    if (mortar) lines.push(mortar);

    // Grout
    const grout = estimateSupportMaterial(surface, 'grout', room.id, materialSelections.grout);
    if (grout) lines.push(grout);

    // Waterproofing for wet areas
    const isWetArea =
      ['shower-walls', 'tub-surround', 'floor'].includes(surface.kind) &&
      ['bathroom', 'shower', 'laundry'].includes(room.type);
    if (isWetArea) {
      const wp = estimateSupportMaterial(
        surface,
        'waterproofing',
        room.id,
        materialSelections.waterproofing
      );
      if (wp) lines.push(wp);
    }
  }

  if (geometry.surfaces.length === 0) {
    notes.push('No surfaces selected for tiling in this room.');
  }

  return {
    title: room.name,
    roomId: room.id,
    lines,
    subtotalSqft: totalTileableSqft(geometry),
    notes,
  };
}

// ─── Labor Estimator ──────────────────────────────────────────────────────

export const DEFAULT_LABOR_PROFILE: LaborProfile = {
  name: 'Standard Tile Installation',
  hourlyRate: 75,
  phases: [
    { name: 'Demolition & Prep', ratePerSqft: 0.05, minimumHours: 2 },
    { name: 'Waterproofing', ratePerSqft: 0.03, minimumHours: 1 },
    { name: 'Tile Installation', ratePerSqft: 0.08, minimumHours: 4 },
    { name: 'Grouting & Cleanup', ratePerSqft: 0.02, minimumHours: 1 },
  ],
};

function estimateLabor(totalSqft: number, profile: LaborProfile): { hours: number; cost: number } {
  let totalHours = 0;
  for (const phase of profile.phases) {
    const phaseHours = Math.max(totalSqft * phase.ratePerSqft, phase.minimumHours);
    totalHours += phaseHours;
  }
  return {
    hours: Math.round(totalHours * 10) / 10,
    cost: Math.round(totalHours * profile.hourlyRate * 100) / 100,
  };
}

// ─── Scope of Work Generator ──────────────────────────────────────────────

function generateScopeOfWork(sections: ScopeSection[], project: ProjectLayout): string {
  const lines: string[] = [
    `SCOPE OF WORK — ${project.name}`,
    project.address ? `Location: ${project.address}` : '',
    project.customerName ? `Customer: ${project.customerName}` : '',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    '---',
    '',
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push(`Tile area: ${section.subtotalSqft.toFixed(1)} sqft`);
    lines.push('');

    const tileLines = section.lines.filter(l => l.category === 'tile');
    const materialLines = section.lines.filter(l => l.category !== 'tile');

    if (tileLines.length > 0) {
      lines.push('### Tile');
      for (const line of tileLines) {
        lines.push(
          `- ${line.description}: ${line.packsNeeded} ${line.packUnit}(s) (${line.adjustedQuantity} tiles)`
        );
      }
      lines.push('');
    }

    if (materialLines.length > 0) {
      lines.push('### Support Materials');
      for (const line of materialLines) {
        lines.push(`- ${line.description}: ${line.packsNeeded} ${line.packUnit}(s)`);
      }
      lines.push('');
    }

    for (const note of section.notes) {
      lines.push(`> ${note}`);
    }
    lines.push('');
  }

  return lines.filter(l => l !== undefined).join('\n');
}

// ─── Main Entry Point ─────────────────────────────────────────────────────

export function estimateProject(
  project: ProjectLayout,
  laborProfile: LaborProfile = DEFAULT_LABOR_PROFILE
): EstimateResult {
  resetLineCounter();
  const warnings: string[] = [];
  const assumptions: string[] = [
    'All measurements are nominal — verify on-site before ordering.',
    'Waste factors include cuts, breakage, and pattern waste.',
    'Material quantities rounded up to full packs.',
    'Labor rates are estimates — actual may vary by complexity.',
  ];

  const sections: ScopeSection[] = [];

  for (const room of project.rooms) {
    if (room.surfaces.every(s => !s.enabled)) {
      warnings.push(`Room "${room.name}" has no surfaces selected — skipped.`);
      continue;
    }
    sections.push(estimateRoom(room, project.tileSpec, project.materialSelections));
  }

  const allLines = sections.flatMap(s => s.lines);
  const totalSqft = sections.reduce((sum, s) => sum + s.subtotalSqft, 0);
  const labor = estimateLabor(totalSqft, laborProfile);

  // Material cost (only if unit costs are set)
  const materialsCost = allLines.reduce((sum, l) => sum + (l.totalCost ?? 0), 0);

  const scopeOfWork = generateScopeOfWork(sections, project);

  if (totalSqft === 0) {
    warnings.push('Total tileable area is 0 sqft — check room dimensions and surface selections.');
  }

  if (project.rooms.length === 0) {
    warnings.push('No rooms in project.');
  }

  return {
    project,
    sections,
    totalSqft,
    totalEstimateLines: allLines,
    laborHours: labor.hours,
    materialsCost,
    laborCost: labor.cost,
    scopeOfWork,
    generatedAt: Date.now(),
    warnings,
    assumptions,
  };
}
