/**
 * CampaignRunner.js — Orchestrates the full campaign lifecycle.
 * Setup → Batch 1 → Clean → Batch 2 → Clean → Batch 3 → Terminal Sanitization
 */

import { STAGES, STAGE_ORDER } from '../../../shared/stages.js';
import { PROCESS_ORDER_STATUS } from '../../../shared/ebrStepTypes.js';
import { MaterialBatch, generateBatchId } from './MaterialBatch.js';

/** Campaign phases */
const CAMPAIGN_PHASE = {
  NOT_STARTED: 'NOT_STARTED',
  SETUP: 'SETUP',
  BATCH_RUNNING: 'BATCH_RUNNING',
  INTER_BATCH_CLEAN: 'INTER_BATCH_CLEAN',
  TERMINAL_SANITIZATION: 'TERMINAL_SANITIZATION',
  COMPLETE: 'COMPLETE',
};

/** Timing constants (simulation seconds) */
const SETUP_DURATION = 30 * 60;           // 30 min
const INTER_BATCH_CLEAN_DURATION = 22.5 * 60; // 22.5 min
const TERMINAL_SANITIZATION_DURATION = 40 * 60; // 40 min

export class CampaignRunner {
  /**
   * @param {Object} options
   * @param {import('./EventBus.js').EventBus} options.eventBus
   * @param {Object} options.processModels - Map of stageId → process model instances
   * @param {Object} options.plantFloor - PlantFloor instance (equipment units)
   * @param {number} options.batchCount - Number of batches in campaign (default 3)
   */
  constructor({ eventBus, processModels, plantFloor, batchCount = 3 }) {
    this.eventBus = eventBus;
    this.processModels = processModels;
    this.plantFloor = plantFloor;
    this.batchCount = batchCount;

    // Campaign state
    this.campaignId = `CAMP-${Date.now()}`;
    this.orderId = `PO-${Date.now().toString(36).toUpperCase()}`;
    this.phase = CAMPAIGN_PHASE.NOT_STARTED;
    this.currentBatchIndex = -1;
    this.currentStageIndex = -1;
    this.batches = [];
    this.activeBatch = null;
    this.processOrderStatus = PROCESS_ORDER_STATUS.CREATED;

    // Timing
    this.phaseElapsed = 0;     // seconds elapsed in current phase
    this.phaseDuration = 0;    // expected duration of current phase
    this.stageElapsed = 0;     // seconds elapsed in current stage
    this.stageDuration = 0;    // expected duration of current stage
    this.totalElapsed = 0;     // total campaign elapsed

    // Fault injection
    this.activeFaults = new Map();
    this.aborted = false;
  }

  /** Initialize and start the campaign. */
  start() {
    console.log(`[Campaign] Starting campaign ${this.campaignId} with ${this.batchCount} batches`);
    this.processOrderStatus = PROCESS_ORDER_STATUS.RELEASED;
    this.eventBus.emit('PROCESS_ORDER_STATUS', {
      orderId: this.orderId,
      status: this.processOrderStatus,
      campaignId: this.campaignId,
    });

    this._enterPhase(CAMPAIGN_PHASE.SETUP, SETUP_DURATION);
  }

  /**
   * Main tick function — called by SimulationClock on every tick.
   * @param {number} dt - Simulation seconds elapsed this tick
   * @param {number} simTime - Total simulation time
   */
  tick(dt, simTime) {
    if (this.phase === CAMPAIGN_PHASE.NOT_STARTED || this.phase === CAMPAIGN_PHASE.COMPLETE) return;
    if (this.aborted) return;

    this.phaseElapsed += dt;
    this.totalElapsed += dt;

    switch (this.phase) {
      case CAMPAIGN_PHASE.SETUP:
        this._tickSetup(dt, simTime);
        break;
      case CAMPAIGN_PHASE.BATCH_RUNNING:
        this._tickBatch(dt, simTime);
        break;
      case CAMPAIGN_PHASE.INTER_BATCH_CLEAN:
        this._tickClean(dt, simTime);
        break;
      case CAMPAIGN_PHASE.TERMINAL_SANITIZATION:
        this._tickSanitize(dt, simTime);
        break;
    }
  }

  // ── Phase Handlers ──

  _tickSetup(dt, simTime) {
    if (this.phaseElapsed >= this.phaseDuration) {
      this.processOrderStatus = PROCESS_ORDER_STATUS.STARTED;
      this.eventBus.emit('PROCESS_ORDER_STATUS', {
        orderId: this.orderId,
        status: this.processOrderStatus,
      });
      this._startNextBatch(simTime);
    }
  }

  _tickBatch(dt, simTime) {
    this.stageElapsed += dt;

    // Run the active process model
    const stageId = STAGE_ORDER[this.currentStageIndex];
    const model = this.processModels[stageId];

    if (model) {
      // Apply any active faults
      const faultOverrides = {};
      for (const [faultId, fault] of this.activeFaults) {
        if (fault.affectedStage === stageId || fault.affectedStage === 'ENVIRONMENT') {
          faultOverrides[fault.affectedTag] = fault.faultValue;
        }
      }

      model.tick(dt, simTime, this.activeBatch, faultOverrides);
    }

    // Emit material update periodically (every ~1 sim second)
    if (Math.floor(this.stageElapsed) !== Math.floor(this.stageElapsed - dt)) {
      this.eventBus.emit('MATERIAL_UPDATED', {
        simTime,
        batchId: this.activeBatch.batchId,
        snapshot: this.activeBatch.snapshot(),
      });
    }

    // Check if stage is complete
    if (this.stageElapsed >= this.stageDuration) {
      this._completeCurrentStage(simTime);
      this._advanceToNextStage(simTime);
    }
  }

  _tickClean(dt, simTime) {
    if (this.phaseElapsed >= this.phaseDuration) {
      this._startNextBatch(simTime);
    }
  }

  _tickSanitize(dt, simTime) {
    if (this.phaseElapsed >= this.phaseDuration) {
      this._enterPhase(CAMPAIGN_PHASE.COMPLETE, 0);
      this.processOrderStatus = PROCESS_ORDER_STATUS.CONFIRMED;
      this.eventBus.emit('PROCESS_ORDER_STATUS', {
        orderId: this.orderId,
        status: this.processOrderStatus,
      });
      this.eventBus.emit('CAMPAIGN_COMPLETE', {
        campaignId: this.campaignId,
        orderId: this.orderId,
        batches: this.batches.map(b => b.toJSON()),
        simTime,
      });
      console.log(`[Campaign] Complete — ${this.batches.length} batches processed`);
    }
  }

  // ── Batch & Stage Management ──

  _startNextBatch(simTime) {
    this.currentBatchIndex++;
    if (this.currentBatchIndex >= this.batchCount) {
      // All batches done — enter terminal sanitization
      this._enterPhase(CAMPAIGN_PHASE.TERMINAL_SANITIZATION, TERMINAL_SANITIZATION_DURATION);
      return;
    }

    const batchId = generateBatchId(this.currentBatchIndex);
    this.activeBatch = new MaterialBatch(batchId, this.orderId, this.currentBatchIndex);
    this.batches.push(this.activeBatch);
    this.currentStageIndex = -1;

    this._enterPhase(CAMPAIGN_PHASE.BATCH_RUNNING, 0);

    this.eventBus.emit('BATCH_STARTED', {
      simTime,
      batchId,
      orderId: this.orderId,
      batchIndex: this.currentBatchIndex,
      batchCount: this.batchCount,
      materialBatch: this.activeBatch.snapshot(),
    });

    console.log(`[Campaign] Batch ${this.currentBatchIndex + 1}/${this.batchCount} started: ${batchId}`);

    this._advanceToNextStage(simTime);
  }

  _advanceToNextStage(simTime) {
    this.currentStageIndex++;

    if (this.currentStageIndex >= STAGE_ORDER.length) {
      // All stages complete for this batch
      this._completeBatch(simTime);
      return;
    }

    const stageId = STAGE_ORDER[this.currentStageIndex];
    const stage = STAGES[stageId];
    this.stageElapsed = 0;
    this.stageDuration = stage.nominalDuration;

    this.activeBatch.enterStage(stageId, stage.name, simTime);

    // Initialize the process model for this stage
    const model = this.processModels[stageId];
    if (model && model.initialize) {
      model.initialize(this.activeBatch, stage);
    }

    this.eventBus.emit('STAGE_STARTED', {
      simTime,
      batchId: this.activeBatch.batchId,
      stageId,
      stageName: stage.name,
      stageIndex: this.currentStageIndex,
      duration: this.stageDuration,
    });

    console.log(`  [Stage ${this.currentStageIndex + 1}/9] ${stage.shortName} started`);
  }

  _completeCurrentStage(simTime) {
    const stageId = STAGE_ORDER[this.currentStageIndex];
    const stage = STAGES[stageId];

    this.activeBatch.exitStage(simTime);

    this.eventBus.emit('STAGE_COMPLETED', {
      simTime,
      batchId: this.activeBatch.batchId,
      stageId,
      stageName: stage.name,
      stageIndex: this.currentStageIndex,
      exitProperties: this.activeBatch.snapshot(),
    });

    console.log(`  [Stage ${this.currentStageIndex + 1}/9] ${stage.shortName} completed`);
  }

  _completeBatch(simTime) {
    this.activeBatch.complete();

    this.eventBus.emit('BATCH_COMPLETED', {
      simTime,
      batchId: this.activeBatch.batchId,
      orderId: this.orderId,
      batchIndex: this.currentBatchIndex,
      materialBatch: this.activeBatch.toJSON(),
    });

    console.log(`[Campaign] Batch ${this.currentBatchIndex + 1} complete — yield: ${this.activeBatch.yieldPercent}%`);

    // If more batches remain, enter inter-batch clean
    if (this.currentBatchIndex < this.batchCount - 1) {
      this._enterPhase(CAMPAIGN_PHASE.INTER_BATCH_CLEAN, INTER_BATCH_CLEAN_DURATION);
    } else {
      this._enterPhase(CAMPAIGN_PHASE.TERMINAL_SANITIZATION, TERMINAL_SANITIZATION_DURATION);
    }
  }

  // ── Phase Transition ──

  _enterPhase(phase, duration) {
    this.phase = phase;
    this.phaseElapsed = 0;
    this.phaseDuration = duration;

    this.eventBus.emit('CAMPAIGN_STATUS', {
      campaignId: this.campaignId,
      phase,
      currentBatch: this.currentBatchIndex + 1,
      totalBatches: this.batchCount,
      totalElapsed: this.totalElapsed,
    });
  }

  // ── Fault Injection ──

  injectFault(fault) {
    this.activeFaults.set(fault.id, fault);
    this.eventBus.emit('FAULT_INJECTED', { fault });
    console.log(`[Campaign] Fault injected: ${fault.name}`);
  }

  clearFault(faultId) {
    this.activeFaults.delete(faultId);
  }

  /** Abort the campaign (e.g., aseptic breach). */
  abort(reason, simTime) {
    this.aborted = true;
    this.phase = CAMPAIGN_PHASE.COMPLETE;
    this.eventBus.emit('CAMPAIGN_ABORTED', {
      campaignId: this.campaignId,
      reason,
      simTime,
      batchesCompleted: this.batches.filter(b => b.status === 'Complete').length,
    });
    console.log(`[Campaign] ABORTED: ${reason}`);
  }

  /** Get full campaign status for client sync. */
  getStatus() {
    return {
      campaignId: this.campaignId,
      orderId: this.orderId,
      phase: this.phase,
      processOrderStatus: this.processOrderStatus,
      currentBatch: this.currentBatchIndex + 1,
      totalBatches: this.batchCount,
      currentStage: this.currentStageIndex >= 0 ? STAGE_ORDER[this.currentStageIndex] : null,
      currentStageName: this.activeBatch?.currentStageName || null,
      stageProgress: this.stageDuration > 0 ? Math.min(1, this.stageElapsed / this.stageDuration) : 0,
      phaseProgress: this.phaseDuration > 0 ? Math.min(1, this.phaseElapsed / this.phaseDuration) : 0,
      totalElapsed: this.totalElapsed,
      activeBatch: this.activeBatch?.snapshot() || null,
      batchCount: this.batches.length,
      aborted: this.aborted,
    };
  }
}

export { CAMPAIGN_PHASE };
