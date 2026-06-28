# Task Tracker — Pharma Manufacturing Simulator

## Phase 1: Project Scaffolding
- [ ] Initialize root package.json with concurrently
- [ ] Create shared/ package with constants
- [ ] Initialize factory-simulator/ (Node.js)
- [ ] Initialize apis/ (Express)
- [ ] Initialize client/ (Vite + React)
- [ ] Install all dependencies

## Phase 2: Shared Constants
- [ ] stages.js — 9-stage enum, durations, setpoints
- [ ] packmlStates.js — PackML state enum + transitions
- [ ] alarmCodes.js — Alarm registry
- [ ] equipmentHierarchy.js — ISA-95 PI AF tree
- [ ] materials.js — BOM with lot tracking
- [ ] ebrStepTypes.js — EBR step type enum
- [ ] wsProtocol.js — WebSocket message types
- [ ] units.js — Engineering units

## Phase 3: Factory Simulator — Core
- [ ] SimulationClock.js — DES clock with time acceleration
- [ ] EventBus.js — Internal pub/sub
- [ ] MaterialBatch.js — First-class batch entity
- [ ] CampaignRunner.js — Campaign lifecycle orchestrator

## Phase 4: Factory Simulator — Process Models
- [ ] SolutionPrepModel.js
- [ ] DrumFreezingModel.js
- [ ] LyophilizationModel.js
- [ ] EquilibrationModel.js
- [ ] CompactionModel.js
- [ ] MeltExtrusionModel.js
- [ ] CuttingModel.js
- [ ] CheckweighingModel.js
- [ ] PackagingModel.js
- [ ] CleanroomModel.js
- [ ] CIPModel.js

## Phase 5: Factory Simulator — Equipment & Alarms
- [ ] SensorTag.js — Self-describing sensor
- [ ] EquipmentUnit.js — PackML state machine + sensors
- [ ] PlantFloor.js — Instantiates all units
- [ ] AlarmEngine.js — Threshold monitoring + lifecycle
- [ ] SPCMonitor.js — Cross-cutting SPC (Gap 4)

## Phase 6: Factory Simulator — Human Agents
- [ ] MaterialCoordinator.js — Staging, goods receipt, barcode verify (Gap 2)
- [ ] ProductionOperator.js — EBR steps, e-sigs, line clearance
- [ ] OperationsCoordinator.js — Alarm ack, downtime classification
- [ ] QCAnalyst.js — Sample submission, result review, usage decision
- [ ] ApprenticeModifier.js — Variance + deviation triggers
- [ ] DeviationWorkflow.js — Investigation → CAPA → resolution (Gap 1)

## Phase 7: Factory Simulator — Integration Emitters
- [ ] B2MMLEmitter.js — ProductionSchedule / ProductionPerformance XML
- [ ] MSIEmitter.js — OrderParameter, OrderStatus, Exception, OrderAbort
- [ ] OPCUAEmitter.js — Self-describing OPC UA nodes
- [ ] SparkplugEmitter.js — NBIRTH/NDATA/NDEATH on UNS topics
- [ ] EventFrameEmitter.js — PI Event Frame open/close
- [ ] EBREmitter.js — Batch record steps + e-sigs
- [ ] LIMSEmitter.js — Sample submission + QC results
- [ ] EWMEmitter.js — Staging + goods movements

## Phase 8: Factory Simulator — Entry Point & WebSocket
- [ ] index.js — Boot clock, WS server, connect to APIs

## Phase 9: APIs — Data Recording & Query Service
- [ ] server.js — Express entry
- [ ] xmlParser.js middleware
- [ ] In-memory stores (Batch, Telemetry, Alarm, Message, EventFrame, EBR)
- [ ] ERP routes + controller (PP-PI, QM, EWM)
- [ ] MES routes + controller (MSI, EBR)
- [ ] LIMS routes + controller
- [ ] Historian routes + controller
- [ ] Query controller (GET endpoints)

## Phase 10: Client — React + Three.js
- [ ] App.jsx + routing
- [ ] index.css — Dark-mode glassmorphism design system
- [ ] SimulationContext.jsx — WS + state
- [ ] DashboardShell.jsx — Main layout
- [ ] PlantFloorView.jsx — R3F canvas
- [ ] 3D machine models (9 machines)
- [ ] ConveyorSystem.jsx + MaterialPayload.jsx
- [ ] StageInspector.jsx
- [ ] HumanOperations.jsx
- [ ] MessageConsole.jsx
- [ ] BatchRecordViewer.jsx
- [ ] CampaignTimeline.jsx
- [ ] EnvironmentMonitor.jsx
- [ ] AlarmBanner.jsx
- [ ] MaterialTracker.jsx

## Phase 11: Verification
- [ ] All 3 services boot concurrently
- [ ] Campaign runs end-to-end
- [ ] Integration messages flow correctly
- [ ] 3D scene renders + interaction works
