# Pharmaceutical Manufacturing Simulator — Project Instructions

## Project Overview
An autonomous simulation engine that mirrors the Zoladex (goserelin acetate) PLGA polymer extrusion line at the AstraZeneca Macclesfield SPP5 facility. The simulator produces real, causally-linked data across IT/OT/ET domains — **zero mocked data**.

## Key Documents
- **Research Document**: `Docs/Pharma Plant Simulator Research.docx` — Source of truth for process, ISA-95 architecture, and integration protocols
- **Implementation Plan**: `Docs/implementation_plan.md` — Detailed technical design with data models, system flows, and folder structure

---

## Architecture — Three Services

| Service | Path | Runtime | Port | Purpose |
|---|---|---|---|---|
| **Shared** | `shared/` | N/A (imported) | — | Cross-service constants, enums, and type definitions |
| **Factory Simulator** | `factory-simulator/` | Node.js | 8080 (WS) | DES engine: physics models, human agents, integration emitters |
| **APIs** | `apis/` | Node.js + Express | 3001 | Data recording & query service (NOT a mock) |
| **Client** | `client/` | React + Vite | 5173 | 3D plant floor visualization + interactive dashboard |

### Core Principle: Simulation-Driven Data
- The `factory-simulator` is the **single source of truth**
- Every data point is produced by mechanistic process models (physics equations)
- A `MaterialBatch` object flows through 9 stages, accumulating real physical properties
- Integration messages (B2MML, MSI, OPC UA, Sparkplug B) are **side-effects** of state transitions, not templates
- The `apis/` service **records and serves** real data — it does NOT mock enterprise systems
- **No OEE calculations** — data is generated for downstream consumers to calculate

---

## The 9 Manufacturing Stages

1. **Solution Preparation & Filtration** — PLGA + goserelin dissolved in acetic acid, filtered
2. **Drum Freezing** — Cryogenic drum at −60°C, frozen flakes collected
3. **Lyophilization** — 24hr freeze-drying cycle, sublimation of solvent
4. **Equilibration** — Ambient equilibration in Grade A laminar flow cabinet
5. **Compaction** — High-pressure piston compaction into cylinders
6. **Aseptic Melt Extrusion** — Heated barrel extrusion (60-70°C zones), power-law rheology
7. **Cutting & Visual Inspection** — Precision cutting to 1-1.5mm depots, vision system
8. **Checkweighing** — 100% automated weighing, SPC control charts
9. **Primary Packaging** — Depot → syringe → label → foil pouch with desiccant

---

## ISA-95 Enterprise Systems Modeled

| Level | System | Role in Simulator |
|---|---|---|
| L4 | SAP S/4HANA PP-PI | Process Orders, Master Recipes, BOM |
| L4 | SAP QM | Inspection Lots, Usage Decisions |
| L4 | SAP EWM | Material Staging, Transfer Orders, Goods Receipt/Issue |
| L3 | Werum PAS-X MES | EBR (e-signatures, line clearance, SOPs), MSI messages |
| L3 | LabWare LIMS | QC testing (dissolution, assay, sterility), result approval |
| L3 | TrackSYS | Performance dashboards, SPC, downtime tracking |
| L2 | OSIsoft PI Historian | PI AF hierarchy, Event Frames, time-series archive |
| L2 | Emerson DeltaV DCS | Sequence logic, PID control (modeled inside process models) |
| L1 | PLCs | OPC UA self-describing nodes, PackML states |
| L0 | Field Devices | Sensors (thermocouples, load cells, flow meters, etc.) |
| IIoT | MQTT Broker | Sparkplug B UNS (NBIRTH/NDATA/NDEATH) |

## Integration Protocols
- **ERP ↔ MES**: B2MML XML (ISA-95) — `ProductionSchedule` down, `ProductionPerformance` up
- **MES ↔ Equipment**: PAS-X MSI JSON — `OrderParameter`, `OrderStatus`, `Exception`, `OrderAbort`
- **MES ↔ Historian**: PI Event Frame API — phase start/end with batch context
- **PLC ↔ SCADA**: OPC UA — self-describing nodes (value + unit + meaning + timestamp + statusCode)
- **Edge → Cloud**: MQTT Sparkplug B — `spBv1.0/{group}/{msgType}/{edgeNode}/{device}`

---

## Human Roles

| Role | Key Behaviors | Systems Touched |
|---|---|---|
| Material Coordinator | Staging delay, goods receipt, barcode scan, order release | SAP EWM, SAP PP-PI |
| Production Operator | EBR step execution, e-signatures, line clearance, parameter checks | PAS-X MES |
| Operations Coordinator | Alarm acknowledgment (log-normal latency), downtime classification | PAS-X MES, TrackSYS |
| QC Analyst | Sample submission, result review, usage decision | LabWare LIMS, SAP QM |
| Apprentice (modifier) | +50% variance, +15% micro-stops, 5% deviation chance | Modifies Production Operator |

---

## Technology Choices

### Factory Simulator & APIs
- **Runtime**: Node.js (ES Modules — use `"type": "module"` in package.json)
- **WebSocket**: `ws` library for real-time telemetry broadcast
- **HTTP**: `express` for APIs, `node-fetch` or native fetch for emitter→API calls
- **XML**: Generate B2MML XML strings directly (no heavy XML library needed)

### Client
- **Framework**: React 19+ via Vite
- **3D Rendering**: `three`, `@react-three/fiber`, `@react-three/drei`
- **Styling**: Vanilla CSS — dark mode, glassmorphism, neon accents (HSL palette), Inter + JetBrains Mono fonts
- **Charts**: Chart.js or lightweight alternative for telemetry trends
- **No Tailwind** unless explicitly requested

### Shared Package
- Pure JavaScript, no dependencies
- Imported via relative paths (`../shared/stages.js`)

---

## Coding Conventions

- **ES Modules** everywhere (`import`/`export`, not `require`)
- **Class-based** for stateful objects (EquipmentUnit, MaterialBatch, SensorTag, human agents)
- **Functional** for pure transformations (process model tick functions, message formatters)
- **Event-driven** architecture — EventBus decouples process models from integration emitters
- **Naming**: PascalCase for classes/components, camelCase for functions/variables, UPPER_SNAKE for constants
- **Sensor tag IDs** follow ISA conventions: `TT-101` (temperature), `PT-101` (pressure), `FT-101` (flow), etc.
- **PackML states**: Use the shared enum, never hardcode state strings

---

## Key Physics Models (Reference)

| Stage | Model | Key Equation |
|---|---|---|
| Solution Prep | Dissolution kinetics | `C(t) = C_target × (1 - e^(-k × t))` |
| Drum Freezing | Convective heat transfer | `dT/dt = -h×A×(T_sol - T_drum) / (m×Cp)` |
| Lyophilization | Sublimation rate | `dm/dt = (P_surface - P_chamber) / R_total` |
| Compaction | Heckel equation | `ln(1/(1-D)) = K×P + A` |
| Melt Extrusion | Power-law rheology | `η = K × γ̇^(n-1)`, n ≈ 0.4 for PLGA |
| Melt Extrusion | Arrhenius degradation | `k_deg = A × e^(-Ea/RT)` |
| Checkweighing | Mass distribution | `m_depot ~ N(μ, σ²)` where μ = f(diameter, length, density) |

---

## Campaign Lifecycle

```
Campaign Start
├── Initial Aseptic Setup (30 min) — SIP, line clearance
├── Batch 1 — 9 stages
├── Minor Inter-Batch Clean (22.5 min) — CIP
├── Batch 2 — 9 stages
├── Minor Inter-Batch Clean (22.5 min) — CIP
├── Batch 3 — 9 stages
└── Major Terminal Sanitization (40 min)
Campaign End → B2MML ProductionPerformance → EWM Finished Goods Receipt
```

---

## Gap Items (Incorporated from Review)
These 5 items from the gap analysis are included in the implementation scope:
1. **Deviation Management Workflow** — Deviation → Investigation → CAPA → Resolution
2. **Material Barcode Verification** — Scan vs BOM verification with lot/expiry checks
3. **Process Order State Machine** — Created → Released → Started → Confirmed → Closed
4. **SPC Cross-Cutting Monitor** — X-bar/R charts across multiple parameters
5. **Lot-Level Traceability** — Raw material lots tracked through to finished product
