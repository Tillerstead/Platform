# Room Designer + Scope + Material Estimation — Phase 1 Deliverable

**Date:** 2025-06-06  
**Phase:** 1 — Scope & Quantity Engine  
**Status:** ✅ Complete  
**Scope:** `@tillerstead/engine` (shared package) + Tillerstead public planner + CCC integration stubs

---

## Table of Contents

1. [Audit Findings](#1-audit-findings)
2. [Reusable Asset Inventory](#2-reusable-asset-inventory)
3. [Architecture Plan](#3-architecture-plan)
4. [Shared Domain Model](#4-shared-domain-model)
5. [Estimating Engine Design](#5-estimating-engine-design)
6. [UI Split Strategy](#6-ui-split-strategy)
7. [File Manifest](#7-file-manifest)
8. [Phased Implementation Roadmap](#8-phased-implementation-roadmap)
9. [Editing Guide](#9-editing-guide)
10. [Risks & Limitations](#10-risks--limitations)

---

## 1. Audit Findings

Three codebases were audited before any code was written.

### Tillerstead (tillerstead.com)

- **Stack:** Jekyll 4 + vanilla JS, Cloudflare Pages / Netlify
- **Size:** 500+ files, ~40 HTML pages, full formula library
- **Existing estimating:** `assets/js/tools/formulas/` — 7 trade formula modules (tile, mortar, grout, waterproofing, leveling, slope, advanced), WASTE_FACTORS by pattern, coverage tables
- **Existing UI:** Canvas-based tile visualizer, room template HTML (L×W×H + surface checkboxes), quote system, project state manager (`enhanced-calculator-hub.js`, `project-state.js`)
- **Gap:** No dedicated room planner page; formula library is scattered across module files; no multi-room workflow

### Contractor Command Center (CCC)

- **Stack:** React 19 + TypeScript 5.7 + Vite 7 + Tailwind 4 + shadcn/ui (40+ primitives) + Zustand 5 + React Router 7
- **Existing estimating:** `FormulaRegistry` class with versioned formulas, 7 trade formula modules (18+ registered calculators), complete pricing pipeline (materials → labor → overhead → profit → contingency → tax)
- **Existing architecture:** `types.ts` master domain model (Measurement, BOMLine, LaborLine, Assembly, PricingProfile, Project), unit conversion system, rounding policies, validators
- **Gap:** No room planner / spatial layout. Calculator-to-invoice exists, but no room-driven flow.

### tillerstead-toolkit (backend)

- **Stack:** FastAPI 0.109 + SQLAlchemy 2.0 + Pydantic 2.5, Railway deployment
- **Existing:** 28+ API endpoints, Jobs/Rooms/Products CRUD, BOM export, calculator presets, product search
- **Database model:** `Room` with JSON `dimensions: {length, width, height, shapes, openings}`
- **Gap:** Calculator engines git-crypt encrypted (not directly reusable); no frontend

### Key Observations

1. Both Tillerstead and CCC have tile/material formulas but in incompatible formats (vanilla JS vs TypeScript class registry)
2. Waste factors and coverage rates are duplicated across repos with minor inconsistencies
3. No shared package existed — each repo reimplemented its own math
4. The `Room` database model in toolkit already supports the shape/opening structure we need

---

## 2. Reusable Asset Inventory

| Source                           | Asset                                              | Reuse Strategy                                            |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| CCC `formulaRegistry.ts`         | FormulaResult interface, versioned formula pattern | Inspiration for `EstimateLine` type                       |
| CCC `types.ts`                   | Measurement, BOMLine, UnitType enums               | Aligned with engine's `ImperialDimension`, `EstimateLine` |
| CCC `units.ts`                   | LengthUnit/AreaUnit conversion tables              | Ported to engine `units.ts`                               |
| CCC `rounding.ts`                | Round-up-to-pack, waste application                | `roundUp`, `packsNeeded`, `withWaste` in engine           |
| CCC `formulas/tile.ts`           | tileQuantityFormula, pattern waste map             | Consolidated into `materials.ts` WASTE_PROFILES           |
| CCC `pricing.ts`                 | Multi-stage pricing pipeline                       | Deferred to Phase 3 (full invoice integration)            |
| Tillerstead `formulas/tile.js`   | WASTE_FACTORS, calculateTileQuantity               | Source of truth for waste percentages                     |
| Tillerstead `formulas/mortar.js` | Coverage per trowel size                           | TDS-sourced rules in `materials.ts`                       |
| Tillerstead `formulas/grout.js`  | Coverage per joint width                           | Engine `GROUT_COVERAGE_RULES`                             |
| Tillerstead `room-template.html` | Surface checkbox pattern                           | Replicated in both UIs                                    |
| Toolkit `models/room.py`         | Room → JSON dimensions                             | Backend schema alignment validated                        |

---

## 3. Architecture Plan

```
┌────────────────────────────────────────────────────────────────┐
│                    @tillerstead/engine                         │
│  TypeScript strict · tsup ESM+CJS+DTS · vitest                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  types.ts  │  │ units.ts  │  │geometry.ts│  │materials.ts│  │
│  │  189 lines │  │  79 lines │  │ 120 lines │  │ 231 lines │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
│        └──────────────┼──────────────┼──────────────┘         │
│                       ▼                                       │
│              ┌─────────────────┐                              │
│              │  estimator.ts   │  271 lines                   │
│              │  (entry point)  │                               │
│              └────────┬────────┘                              │
│                       │                                       │
│              ┌────────┴────────┐                              │
│              │    index.ts     │  barrel re-export            │
│              └────────┬────────┘                              │
└───────────────────────┼───────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
  ┌───────────┐  ┌───────────┐  ┌───────────┐
  │Tillerstead│  │    CCC    │  │  Toolkit   │
  │ Jekyll +  │  │ React 19  │  │  FastAPI   │
  │ inline JS │  │ + Zustand │  │  (future)  │
  │(mirror)   │  │(npm link) │  │            │
  └───────────┘  └───────────┘  └───────────┘
```

**Key principle:** One engine, multiple interfaces.

- **Tillerstead** mirrors the engine logic in inline JS (for zero-dependency Jekyll deployment). Constants and formulas are identical; the Jekyll file is generated from the same specification.
- **CCC** will consume the engine via npm link (Phase 2) or direct import. Phase 1 stubs mirror the logic for immediate functionality.
- **Toolkit backend** can compile the engine to a Python equivalent or call it via a Node worker. Deferred to Phase 3.

---

## 4. Shared Domain Model

All types live in `engine/src/types.ts` (189 lines). Core hierarchy:

```
ProjectLayout
├── id, name, customer info
├── rooms: Room[]
│   ├── id, name, type (11 variants)
│   ├── length/width/ceilingHeight: ImperialDimension
│   ├── surfaces: Surface[]
│   │   ├── kind: SurfaceKind (7 variants)
│   │   ├── enabled: boolean
│   │   └── customHeight?: feet
│   └── openings: Opening[]
│       ├── type: 'door' | 'window' | 'niche' | 'bench'
│       └── width/height: ImperialDimension
├── tileSpec: TileSpec
│   ├── widthIn, heightIn, tilesPerBox
│   └── pattern: TilePattern (7 variants)
└── materialSelections: Record<MaterialCategory, string>

EstimateResult
├── project (ref)
├── sections: ScopeSection[]
│   ├── title, roomId
│   ├── lines: EstimateLine[]
│   │   ├── surfaceKind, category, description
│   │   ├── rawQuantity → waste% → adjustedQuantity
│   │   ├── packUnit, packsNeeded
│   │   ├── formula (transparency string)
│   │   └── assumptions: string[]
│   └── subtotalSqft
├── totalSqft, laborHours, laborCost
├── scopeOfWork (markdown text)
├── warnings[], assumptions[]
└── generatedAt
```

**ImperialDimension** is the fundamental measurement type: `{ feet: number; inches: number }` with `toDecimalFeet()` conversion. This matches how US contractors communicate dimensions.

### Room Types (11)

`bathroom | shower | kitchen | laundry | mudroom | entryway | living-room | hallway | basement | commercial | other`

### Surface Kinds (7)

`floor | full-walls | half-walls | backsplash | ceiling | shower-walls | tub-surround`

### Tile Patterns (7)

`straight | offset-third | offset-half | running-bond | diagonal | herringbone | mosaic`

### Material Categories (10)

`tile | mortar | grout | waterproofing | backer-board | self-leveler | trim | sealant | membrane | other`

---

## 5. Estimating Engine Design

### Pipeline

```
Room[] + TileSpec
    │
    ▼
calculateRoomGeometry(room)          ← geometry.ts
    │  Decomposes room into SurfaceArea[]
    │  Each surface: grossSqft - openingDeductions = netSqft
    │
    ▼
For each enabled surface:
    ├── estimateTileForSurface()      ← estimator.ts
    │   tileSqFt = netSqft × (1 + wastePercent)
    │   tilePerBox = (W × H) / 144 × tilesPerBox
    │   boxes = ⌈tileSqFt / tilePerBox⌉
    │
    ├── estimateSupportMaterial()     ← estimator.ts
    │   For each relevant category (mortar, grout, waterproofing):
    │   qty = netSqft / coveragePerUnit × (1 + materialWaste)
    │   packs = ⌈qty⌉
    │
    └── Collect EstimateLine[]
    │
    ▼
estimateLabor(totalSqft, profile)    ← estimator.ts
    4 phases: demolition, waterproofing, tile install, grouting
    Each: max(sqft × ratePerSqft, minimumHours)
    │
    ▼
generateScopeOfWork(project, sections, labor)  ← estimator.ts
    Markdown text with room summaries, line items, totals
    │
    ▼
EstimateResult
```

### Geometry Logic (`geometry.ts`, 120 lines)

| Surface      | Formula                                          |
| ------------ | ------------------------------------------------ |
| Floor        | L × W                                            |
| Full walls   | perimeter × ceilingHeight − openings             |
| Half walls   | perimeter × 4ft                                  |
| Backsplash   | perimeter × 1.5ft                                |
| Ceiling      | L × W                                            |
| Shower walls | (2W + L) × ceilingHeight − niche/window openings |
| Tub surround | (2W + L) × 5ft                                   |

Opening deductions only apply to `full-walls`, `shower-walls`, and `tub-surround`.

### Material Coverage Rules (`materials.ts`, 231 lines)

All sourced from manufacturer Technical Data Sheets (TDS):

| Material      | Product           | Coverage | Unit      |
| ------------- | ----------------- | -------- | --------- |
| Mortar        | ¼×¼ trowel        | 95 sqft  | 50 lb bag |
| Mortar        | ¼×⅜ trowel        | 70 sqft  | 50 lb bag |
| Mortar        | ½×½ trowel        | 40 sqft  | 50 lb bag |
| Grout         | Sanded (⅛″ joint) | 95 sqft  | 25 lb bag |
| Grout         | Unsanded (1/16″)  | 125 sqft | 10 lb bag |
| Waterproofing | RedGard           | 55 sqft  | gallon    |
| Waterproofing | KERDI             | 54 sqft  | roll      |
| Backer board  | ½″ × 3×5 sheet    | 15 sqft  | sheet     |
| Self-leveler  | ⅛″ depth          | 25 sqft  | bag       |

### Waste Profiles

| Pattern        | Base ÷ Breakage | Total |
| -------------- | --------------- | ----- |
| Straight       | 10% + 5%        | 15%   |
| Offset (⅓)     | 12% + 5%        | 17%   |
| Offset (½)     | 15% + 5%        | 20%   |
| Running bond   | 12% + 5%        | 17%   |
| Diagonal (45°) | 18% + 5%        | 23%   |
| Herringbone    | 25% + 5%        | 30%   |
| Mosaic         | 10% + 5%        | 15%   |

### Labor Profile (default)

| Phase             | Rate (sqft/hr) | Minimum |
| ----------------- | -------------- | ------- |
| Demolition        | 0.05           | 2 hours |
| Waterproofing     | 0.03           | 1 hour  |
| Tile installation | 0.08           | 4 hours |
| Grouting          | 0.02           | 1 hour  |

Hourly rate: **$75/hr** (override via `LaborProfile`)

---

## 6. UI Split Strategy

### Tillerstead Public Planner (`room-planner.html`)

- **Audience:** Homeowners, DIYers, property managers
- **Tone:** Friendly, confidence-building, minimal jargon
- **Features:**
  - Dynamic room CRUD (add/remove rooms)
  - Room type selector (10 options)
  - Feet + inches dimension inputs (L × W × H)
  - 7 surface toggles (visual pills)
  - Tile spec inputs (dimensions, tiles/box, pattern)
  - Instant inline calculation (no server round-trip)
  - Per-room results table (material, quantity, packs)
  - Strong CTA → /contact/ for professional quote
  - Disclaimer: "estimates for planning purposes only"
  - Mobile-responsive, zero dependencies

### CCC Professional Planner (`features/room-planner/`)

- **Audience:** Contractors, estimators, project managers
- **Tone:** Dense, professional, precise, revision-aware
- **Features:**
  - Inline-editable project header (name, customer, address)
  - Room cards with inline name editing
  - Contractor notes per room
  - All surface toggles with pill UI
  - Full estimate table with surface-level breakdowns
  - Copy-ready scope of work text (collapsible)
  - Warning display for edge cases
  - Phase 2: save/version, convert to invoice, export PDF

### Key Constraint

Both UIs execute identical math. The Tillerstead inline JS mirrors `@tillerstead/engine` exactly. Phase 2 will npm-link the engine directly into CCC; the public planner will continue to use a mirrored inline version (zero-dependency Jekyll constraint).

---

## 7. File Manifest

### `@tillerstead/engine` — NEW PACKAGE

Location: `tillerstead-toolkit/engine/`

| File                      |     Lines | Purpose                                       |
| ------------------------- | --------: | --------------------------------------------- |
| `package.json`            |        31 | Package manifest, tsup + vitest config        |
| `tsconfig.json`           |        17 | TypeScript strict, ES2022, bundler resolution |
| `src/types.ts`            |       189 | Complete domain model (all types)             |
| `src/units.ts`            |        79 | Unit conversion + rounding utilities          |
| `src/geometry.ts`         |       120 | Room → SurfaceArea[] decomposition            |
| `src/materials.ts`        |       231 | TDS-sourced coverage rules + waste profiles   |
| `src/estimator.ts`        |       271 | Core estimation pipeline + labor + scope      |
| `src/index.ts`            |        85 | Barrel export                                 |
| `tests/estimator.test.ts` |       306 | 22 tests (all passing)                        |
| **Total**                 | **1,329** |                                               |

### Tillerstead Public Planner — NEW PAGE

Location: `Tillerstead/room-planner.html`

| File                | Lines | Purpose                              |
| ------------------- | ----: | ------------------------------------ |
| `room-planner.html` |   406 | Jekyll page with inline JS estimator |

### CCC Integration — NEW FEATURE MODULE

Location: `contractor-command-center/src/features/room-planner/`

| File                    |   Lines | Purpose                                          |
| ----------------------- | ------: | ------------------------------------------------ |
| `types.ts`              |     118 | CCC-local type definitions (aligned with engine) |
| `useRoomPlanner.ts`     |     283 | React state hook (room CRUD + inline estimation) |
| `RoomPlannerScreen.tsx` |     339 | Professional planner UI component                |
| `index.ts`              |      15 | Barrel export                                    |
| **Total**               | **755** |                                                  |

### Grand Total

**2,490 lines** of new code across 14 files.

### Build Output

- Engine ESM: 16.55 KB (`dist/index.js`)
- Engine CJS: 18.58 KB (`dist/index.cjs`)
- Engine DTS: 6.99 KB (`dist/index.d.ts`)
- Tests: 22/22 passing (781ms)
- Lint: 0 errors across all files

---

## 8. Phased Implementation Roadmap

### Phase 1 — Scope & Quantity Engine ✅ COMPLETE

- [x] Audit all three codebases
- [x] Design shared domain model
- [x] Implement `@tillerstead/engine` (types, geometry, materials, estimator)
- [x] 22 tests with full coverage of surfaces, patterns, multi-room, labor
- [x] Tillerstead public planner page (inline JS)
- [x] CCC integration stubs (types, hook, screen component)
- [x] Build validation (ESM + CJS + DTS clean)

### Phase 2 — 2D Room Designer (Next)

- [ ] Interactive SVG/Canvas room layout editor
- [ ] Drag-to-resize walls, place openings (doors/windows)
- [ ] Grid snap, measurement annotations
- [ ] Surface selection by clicking/tapping wall segments
- [ ] Technology: `react-konva` (CCC) or vanilla Canvas (Tillerstead)
- [ ] npm-link `@tillerstead/engine` into CCC (replace mirrored logic)
- [ ] Room shapes beyond rectangular (L-shaped, alcove)

### Phase 3 — Full CCC Integration

- [ ] Save/load projects from Zustand store → API
- [ ] Version history (revision tracking)
- [ ] Convert estimate → invoice via existing pricing pipeline
- [ ] Export: PDF scope, CSV BOM, print-ready layout
- [ ] Multi-tile-spec (different tiles per surface/room)
- [ ] Assembly template integration (tie into CCC assembly system)
- [ ] Sync with toolkit backend Room model (FastAPI CRUD)

### Phase 4 — Visual Enhancements

- [ ] Tile pattern preview (Canvas/SVG floor patterns)
- [ ] 3D room preview (Three.js or CSS3D for simple visualization)
- [ ] Color/texture selection with material library
- [ ] Printable layout sheet with dimensions + materials
- [ ] Photo overlay (upload bathroom photo, overlay tile pattern)
- [ ] Mobile-optimized drag interactions

---

## 9. Editing Guide

### Changing Waste Percentages

Edit `engine/src/materials.ts` → `WASTE_PROFILES` object:

```typescript
straight: { base: 0.10, breakage: 0.05, complexity: 0 },
// Change base to 0.12 for a more conservative straight-lay estimate
```

Then rebuild (`npm run build`) and update the mirrored constants in:

- `Tillerstead/room-planner.html` → `WASTE` object in the `<script>` block
- `contractor-command-center/src/features/room-planner/useRoomPlanner.ts` → `WASTE` object

### Adding a New Material Category

1. Add the category string to `MaterialCategory` in `engine/src/types.ts`
2. Add coverage rules to `materials.ts` (follow existing array pattern)
3. Add handling in `estimator.ts` → `estimateRoom()` to generate lines for the new material
4. Add tests in `tests/estimator.test.ts`

### Adding a Room Type

Add the type string to `RoomType` union in `engine/src/types.ts`. No other changes needed unless special geometry logic is required (most room types share the same rectangular geometry).

### Adding a Surface Kind

1. Add to `SurfaceKind` union in `types.ts`
2. Add geometry logic in `geometry.ts` → `calculateRoomGeometry()` switch block
3. Add label in both UIs (Tillerstead `room-planner.html` and CCC `RoomPlannerScreen.tsx`)

### Changing Labor Rates

Edit `estimator.ts` → `DEFAULT_LABOR_PROFILE`:

```typescript
hourlyRate: 75,  // Change this
phases: [
  { name: 'Tile Installation', ratePerSqft: 0.08, minimumHours: 4 },
  // Adjust ratePerSqft to change how fast a phase is estimated
]
```

### Running Tests

```bash
cd tillerstead-toolkit/engine
npm test          # One-shot run
npm run test:watch  # Watch mode
```

---

## 10. Risks & Limitations

### Current Limitations

1. **Rectangular rooms only.** L-shaped, hexagonal, or irregular rooms are not supported. Phase 2 will add non-rectangular shapes via the 2D editor.
2. **Single tile spec.** All rooms share one tile spec. Phase 3 will support per-room or per-surface tile selection.
3. **No pricing.** Phase 1 calculates quantities only — no material costs, markup, or invoice generation. CCC's existing pricing pipeline will be connected in Phase 3.
4. **Mirrored math.** Tillerstead (inline JS) and CCC (hook) each contain a copy of the estimation logic. Changes must be synchronized manually until Phase 2 npm-links the engine.
5. **No persistence.** Neither UI saves projects. CCC Phase 3 adds Zustand store + API save.
6. **Coverage rules are approximations.** Real coverage depends on substrate, tile size, mortar type, climate, and technique. The disclaimer in both UIs is critical.

### Risks

| Risk                                                  | Likelihood | Mitigation                                                                      |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Math divergence between engine and mirrors            | Medium     | Phase 2 eliminates mirrors via npm-link; tests catch regressions                |
| Contractor rejects automated labor estimates          | Medium     | Labor profile is fully overridable; CTA encourages professional review          |
| Tile pattern waste factors disputed                   | Low        | All rates sourced from TCNA/TDS; exposed as configurable constants              |
| Jekyll inline JS grows unwieldy                       | Low        | Phase 2 can compile engine to IIFE bundle for Jekyll consumption                |
| CCC feature module conflicts with existing calculator | Low        | Room planner is isolated in `features/room-planner/`; no existing file modified |

### Security Notes

- No user authentication in Phase 1 (both UIs are client-only)
- No PII storage (customer name/address are ephemeral in browser state)
- No server-side computation (all math runs client-side)
- All inputs are numeric with min/max constraints; no injection surface
