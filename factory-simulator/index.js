/**
 * factory-simulator/index.js — Entry Point
 * Boots the simulation clock, creates all components, and starts the WebSocket server.
 */

import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_DIR = path.join(__dirname, 'data');
const SAVE_PATH = path.join(SAVE_DIR, 'campaign_state.json');

// Core
import { SimulationClock } from './src/core/SimulationClock.js';
import { EventBus } from './src/core/EventBus.js';
import { CampaignRunner } from './src/core/CampaignRunner.js';

// Equipment
import { PlantFloor } from './src/equipment/PlantFloor.js';
import { AlarmEngine } from './src/equipment/AlarmEngine.js';

// Process Models
import { SolutionPrepModel } from './src/process/SolutionPrepModel.js';
import { DrumFreezingModel } from './src/process/DrumFreezingModel.js';
import { LyophilizationModel } from './src/process/LyophilizationModel.js';
import { EquilibrationModel } from './src/process/EquilibrationModel.js';
import { CompactionModel } from './src/process/CompactionModel.js';
import { MeltExtrusionModel } from './src/process/MeltExtrusionModel.js';
import { CuttingModel } from './src/process/CuttingModel.js';
import { CheckweighingModel } from './src/process/CheckweighingModel.js';
import { PackagingModel } from './src/process/PackagingModel.js';
import { CleanroomModel } from './src/process/CleanroomModel.js';

// Humans
import { ProductionOperator } from './src/humans/ProductionOperator.js';
import { OperationsCoordinator } from './src/humans/OperationsCoordinator.js';
import { MaterialCoordinator } from './src/humans/MaterialCoordinator.js';
import { QCAnalyst } from './src/humans/QCAnalyst.js';
import { DeviationWorkflow } from './src/humans/DeviationWorkflow.js';

// CIP
import { CIPModel } from './src/process/CIPModel.js';

// Emitters
import { IntegrationEmitters } from './src/emitters/IntegrationEmitters.js';
import { MqttBroker } from './src/emitters/MqttBroker.js';

// Shared
import { WS_MSG, FAULT_SCENARIOS } from '../shared/wsProtocol.js';
import { STAGES, STAGE_ORDER } from '../shared/stages.js';

// ══════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════
const WS_PORT = parseInt(process.env.WS_PORT || '8080');
const APIS_URL = process.env.APIS_URL || 'http://localhost:3001';
const TIME_SCALE = parseInt(process.env.TIME_SCALE || '50'); // 50x default

// ══════════════════════════════════════════
// Initialize Components
// ══════════════════════════════════════════
console.log('═══════════════════════════════════════════');
console.log('  ZOLADEX MANUFACTURING SIMULATOR v1.0');
console.log('  Macclesfield SPP5 Facility');
console.log('═══════════════════════════════════════════');

const eventBus = new EventBus();
const clock = new SimulationClock({ timeScale: TIME_SCALE, tickIntervalMs: 100 });
const plantFloor = new PlantFloor(eventBus);
const alarmEngine = new AlarmEngine(eventBus, plantFloor);

// Process Models
const processModels = {
  SOLUTION_PREP: new SolutionPrepModel(eventBus, plantFloor),
  DRUM_FREEZING: new DrumFreezingModel(eventBus, plantFloor),
  LYOPHILIZATION: new LyophilizationModel(eventBus, plantFloor),
  EQUILIBRATION: new EquilibrationModel(eventBus, plantFloor),
  COMPACTION: new CompactionModel(eventBus, plantFloor),
  MELT_EXTRUSION: new MeltExtrusionModel(eventBus, plantFloor),
  CUTTING: new CuttingModel(eventBus, plantFloor),
  CHECKWEIGHING: new CheckweighingModel(eventBus, plantFloor),
  PACKAGING: new PackagingModel(eventBus, plantFloor),
};

const cleanroomModel = new CleanroomModel(eventBus, plantFloor);

// Human Agents
const productionOperator = new ProductionOperator(eventBus);
const opsCoordinator = new OperationsCoordinator(eventBus);
const materialCoordinator = new MaterialCoordinator(eventBus);
const qcAnalyst = new QCAnalyst(eventBus);
const deviationWorkflow = new DeviationWorkflow(eventBus);

// CIP
const cipModel = new CIPModel(eventBus);

// Campaign Runner
const campaignRunner = new CampaignRunner({
  eventBus,
  processModels,
  plantFloor,
  batchCount: 3,
});

function loadCampaignState() {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      const raw = fs.readFileSync(SAVE_PATH, 'utf8');
      const state = JSON.parse(raw);
      
      clock.simTime = state.clock.simTime;
      clock.timeScale = state.clock.timeScale;
      clock.paused = state.clock.paused;
      const wasRunning = state.clock.running;
      clock.running = false; // Reset to false so clock.start() can start the interval

      campaignRunner.importState(state.campaign);
      console.log(`[Simulator] Active run state recovered from ${SAVE_PATH} (simTime: ${clock.simTime}s, phase: ${campaignRunner.phase})`);

      // If campaign has started, bring units online and sync states
      if (campaignRunner.phase !== 'NOT_STARTED' && campaignRunner.phase !== 'COMPLETE') {
        plantFloor.bringAllOnline(clock.simTime);
        
        // Restore active stage process model and equipment unit state
        if (campaignRunner.currentStageIndex >= 0) {
          const stageId = STAGE_ORDER[campaignRunner.currentStageIndex];
          const model = processModels[stageId];
          const stage = STAGES[stageId];
          
          if (model && campaignRunner.activeBatch) {
            model.initialize(campaignRunner.activeBatch, stage);
            model.elapsed = campaignRunner.stageElapsed; 
          }
          
          const unit = plantFloor.getUnit(stageId);
          if (unit) {
            unit.state = 'Execute';
          }
        }
      }

      if (wasRunning && !clock.paused) {
        clock.start();
      }
    }
  } catch (err) {
    console.error('[Simulator] Error recovering campaign state:', err.message);
  }
}

function saveCampaignState() {
  try {
    // If not started or already complete, don't persist active run state
    if (campaignRunner.phase === 'NOT_STARTED' || campaignRunner.phase === 'COMPLETE') return;

    if (!fs.existsSync(SAVE_DIR)) {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
    }
    const state = {
      clock: {
        simTime: clock.simTime,
        timeScale: clock.timeScale,
        paused: clock.paused,
        running: clock.running,
      },
      campaign: campaignRunner.exportState(),
    };
    fs.writeFileSync(SAVE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[Simulator] Error saving campaign state:', err.message);
  }
}

function clearCampaignState() {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      fs.unlinkSync(SAVE_PATH);
      console.log('[Simulator] Persistent campaign state cleared (campaign complete/aborted)');
    }
  } catch (err) {
    console.error('[Simulator] Error clearing campaign state:', err.message);
  }
}

// Load campaign state at startup
loadCampaignState();

// Save state on key campaign transitions
eventBus.on('CAMPAIGN_STATUS', () => saveCampaignState());
eventBus.on('BATCH_STARTED', () => saveCampaignState());
eventBus.on('BATCH_COMPLETED', () => saveCampaignState());
eventBus.on('STAGE_STARTED', () => saveCampaignState());
eventBus.on('STAGE_COMPLETED', () => saveCampaignState());
eventBus.on('FAULT_INJECTED', () => saveCampaignState());

// Clear state when campaign completes or aborts
eventBus.on('CAMPAIGN_COMPLETE', () => clearCampaignState());
eventBus.on('CAMPAIGN_ABORTED', () => clearCampaignState());

// ══════════════════════════════════════════
// WebSocket Server
// ══════════════════════════════════════════
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  }
}

// Start MQTT Broker
const mqttBroker = new MqttBroker(1883);
mqttBroker.start().catch(console.error);

// Integration Emitters (connect to broadcast, APIs, and MQTT)
const integrationEmitters = new IntegrationEmitters(eventBus, broadcast, APIS_URL, mqttBroker);

// Wire up event→WebSocket forwarding
eventBus.on('CAMPAIGN_STATUS', (e) => broadcast({ type: WS_MSG.CAMPAIGN_STATUS, data: e.data }));
eventBus.on('BATCH_STARTED', (e) => broadcast({ type: WS_MSG.BATCH_STARTED, data: e.data }));
eventBus.on('BATCH_COMPLETED', (e) => broadcast({ type: WS_MSG.BATCH_COMPLETED, data: e.data }));
eventBus.on('STAGE_STARTED', (e) => broadcast({ type: WS_MSG.STAGE_STARTED, data: e.data }));
eventBus.on('STAGE_COMPLETED', (e) => broadcast({ type: WS_MSG.STAGE_COMPLETED, data: e.data }));
eventBus.on('ALARM_RAISED', (e) => broadcast({ type: WS_MSG.ALARM_RAISED, data: e.data }));
eventBus.on('ALARM_ACKNOWLEDGED', (e) => broadcast({ type: WS_MSG.ALARM_ACKNOWLEDGED, data: e.data }));
eventBus.on('ALARM_CLEARED', (e) => broadcast({ type: WS_MSG.ALARM_CLEARED, data: e.data }));
eventBus.on('MATERIAL_UPDATED', (e) => broadcast({ type: WS_MSG.MATERIAL_UPDATED, data: e.data }));
eventBus.on('EBR_STEP_COMPLETED', (e) => broadcast({ type: WS_MSG.EBR_STEP, data: e.data }));
eventBus.on('HUMAN_ACTION', (e) => broadcast({ type: WS_MSG.HUMAN_ACTION, data: e.data }));
eventBus.on('SPC_OUT_OF_CONTROL', (e) => broadcast({ type: WS_MSG.SPC_OUT_OF_CONTROL, data: e.data }));

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  // Send initial state sync
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: {
      campaign: campaignRunner.getStatus(),
      equipment: plantFloor.getAllUnitsStatus(),
      alarms: alarmEngine.getActiveAlarms(),
      clock: {
        simTime: clock.simTime,
        timeScale: clock.timeScale,
        running: clock.running,
        paused: clock.paused,
      },
    },
  }));

  // Handle commands from client
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handleClientCommand(msg);
    } catch (err) {
      console.error('[WS] Invalid message:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });
});

function handleClientCommand(msg) {
  switch (msg.type) {
    case WS_MSG.CMD_START_CAMPAIGN:
      if (campaignRunner.phase === 'NOT_STARTED' || campaignRunner.phase === 'COMPLETE') {
        plantFloor.bringAllOnline(clock.simTime);
        materialCoordinator.performStaging(
          campaignRunner.batches[0] || { batchId: 'INIT', rawMaterialLots: [] },
          clock.simTime
        );
        campaignRunner.start();
        clock.start();
      }
      break;

    case WS_MSG.CMD_PAUSE:
      clock.pause();
      broadcast({ type: 'CLOCK_UPDATE', data: { paused: true, simTime: clock.simTime } });
      break;

    case WS_MSG.CMD_RESUME:
      clock.resume();
      broadcast({ type: 'CLOCK_UPDATE', data: { paused: false, simTime: clock.simTime } });
      break;

    case WS_MSG.CMD_SET_SPEED:
      clock.setTimeScale(msg.data?.speed || 50);
      broadcast({ type: 'CLOCK_UPDATE', data: { timeScale: clock.timeScale, simTime: clock.simTime } });
      break;

    case WS_MSG.CMD_INJECT_FAULT:
      const fault = FAULT_SCENARIOS[msg.data?.faultId];
      if (fault) campaignRunner.injectFault(fault);
      break;

    case WS_MSG.CMD_ACKNOWLEDGE_ALARM:
      alarmEngine.acknowledge(msg.data?.alarmId, 'OC-001', clock.simTime);
      break;

    default:
      console.log('[WS] Unknown command:', msg.type);
  }
}

// ══════════════════════════════════════════
// Main Tick Loop
// ══════════════════════════════════════════
let telemetryCounter = 0;

clock.onTick((dt, simTime, tickCount) => {
  // 1. Campaign logic (stages, batches)
  campaignRunner.tick(dt, simTime);

  // 2. Equipment PackML state management
  plantFloor.tickAll(dt, simTime);

  // 3. Cleanroom monitoring (runs continuously)
  cleanroomModel.tick(dt, simTime, campaignRunner.activeFaults ? Object.fromEntries(
    [...campaignRunner.activeFaults].filter(([, f]) => f.affectedStage === 'ENVIRONMENT')
      .map(([, f]) => [f.affectedTag, f.faultValue])
  ) : {});

  // 4. Alarm monitoring
  alarmEngine.tick(dt, simTime);

  // 5. Human agents
  productionOperator.tick(dt, simTime);
  opsCoordinator.tick(dt, simTime);
  qcAnalyst.tick(dt, simTime);

  // 6. Deviation workflow (Gap 1)
  deviationWorkflow.tick(dt, simTime);

  // 7. CIP model (inter-batch clean / terminal sanitization)
  cipModel.tick(dt, simTime);

  // 6. Periodic telemetry broadcast (every 10 ticks = 1 second real time)
  telemetryCounter++;
  if (telemetryCounter % 10 === 0) {
    saveCampaignState(); // Auto-save state periodically
    broadcast({
      type: WS_MSG.TELEMETRY_UPDATE,
      data: {
        simTime,
        simDateTime: clock.getSimDateTime().toISOString(),
        formattedTime: clock.formatSimTime(),
        equipment: plantFloor.getAllUnitsStatus(),
        campaign: campaignRunner.getStatus(),
      },
    });
  }
});

// ── Event: Batch complete → trigger QC ──
eventBus.on('BATCH_COMPLETED', (event) => {
  if (event.data.materialBatch) {
    const batch = campaignRunner.batches.find(b => b.batchId === event.data.batchId);
    if (batch) {
      qcAnalyst.submitSample(batch, event.data.simTime);
    }
  }
});

// ── Event: Stage started → trigger operator EBR steps ──
eventBus.on('STAGE_STARTED', (event) => {
  productionOperator.queueStep('PARAMETER_SETPOINT', {
    batchId: event.data.batchId,
    stageId: event.data.stageId,
    simTime: event.data.simTime,
  });
});

eventBus.on('STAGE_COMPLETED', (event) => {
  productionOperator.queueStep('E_SIGNATURE', {
    batchId: event.data.batchId,
    stageId: event.data.stageId,
    simTime: event.data.simTime,
  });
});

// ══════════════════════════════════════════
// Startup
// ══════════════════════════════════════════
console.log(`[WS] Server listening on ws://localhost:${WS_PORT}`);
console.log(`[Sim] Time scale: ${TIME_SCALE}x`);
console.log(`[Sim] APIs endpoint: ${APIS_URL}`);
console.log('[Sim] Waiting for client CMD_START_CAMPAIGN...');
console.log('');
