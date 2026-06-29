/**
 * MaterialBatch.js — First-class batch entity tracking physical properties.
 * Flows through all 9 stages. Properties are TRANSFORMED by each stage's process model.
 * This is the thread that creates causal chains in the data.
 */

import { PRODUCT, STANDARD_BOM, generateLotNumber } from '../../../shared/materials.js';

export class MaterialBatch {
  /**
   * @param {string} batchId - Unique batch identifier (e.g., "ZOL-20260629-001")
   * @param {string} orderId - Parent process order ID
   * @param {number} batchIndex - Batch number within campaign (0-based)
   */
  constructor(batchId, orderId, batchIndex = 0) {
    this.batchId = batchId;
    this.orderId = orderId;
    this.batchIndex = batchIndex;
    this.product = PRODUCT;
    this.createdAt = new Date().toISOString();

    // ── Physical Properties (transformed by process models) ──
    this.initialMass = 45.5;        // kg (PLGA + API + solvent)
    this.currentMass = 45.5;        // kg — decreases through losses
    this.apiPotency = 100.0;        // % — degrades via Arrhenius if overheated
    this.moistureContent = 100.0;   // % — starts fully wet, drops during lyophilization
    this.solutionConcentration = 0; // g/mL — builds during solution prep
    this.temperature = 22.0;        // °C — current material temperature
    this.density = 0.3;             // relative density (0-1) — increases at compaction
    this.strandDiameter = 0;        // mm — set during extrusion
    this.depotLength = 0;           // mm — set during cutting

    // ── Counts (updated by cutting, checkweighing, packaging) ──
    this.totalDepots = 0;           // Total depots cut
    this.visionAccepted = 0;        // Passed dimensional inspection
    this.visionRejected = 0;        // Failed dimensional inspection
    this.weightAccepted = 0;        // Passed checkweigh
    this.weightRejected = 0;        // Failed checkweigh
    this.packagedCount = 0;         // Finished syringes
    this.labelPassed = 0;           // Labels passed verification
    this.labelFailed = 0;           // Labels failed verification

    // ── Quality Tracking ──
    this.cumulativeThermalExposure = 0;  // °C·seconds above threshold
    this.maxTemperatureSeen = 22.0;      // °C peak
    this.spcDeviations = 0;              // Number of SPC control limit breaches
    this.deviationCount = 0;             // Procedural deviations (apprentice)
    this.microStoppages = 0;             // Total micro-stoppages during this batch

    // ── Lot Traceability (Gap 5) ──
    this.rawMaterialLots = STANDARD_BOM.map(item => ({
      materialId: item.materialId,
      lotNumber: generateLotNumber(item.materialId, batchIndex),
      qtyUsed: item.qtyPerBatch,
      uom: item.uom,
    }));

    // ── Stage Progress ──
    this.currentStageIndex = -1;    // -1 = not started
    this.currentStageName = null;
    this.stageHistory = [];         // { stageId, startTime, endTime, metrics }
    this.status = 'Created';        // Created → InProgress → Complete → Released / Rejected

    // ── Computed Yields ──
    this.theoreticalYield = 0;
    this.actualYield = 0;
    this.yieldPercent = 0;
  }

  /**
   * Record entry into a new stage.
   */
  enterStage(stageId, stageName, simTime) {
    this.currentStageIndex++;
    this.currentStageName = stageName;
    this.status = 'InProgress';
    this.stageHistory.push({
      stageId,
      stageName,
      startTime: simTime,
      endTime: null,
      entryProperties: this.snapshot(),
      exitProperties: null,
    });
  }

  /**
   * Record exit from current stage.
   */
  exitStage(simTime) {
    const current = this.stageHistory[this.stageHistory.length - 1];
    if (current) {
      current.endTime = simTime;
      current.exitProperties = this.snapshot();
    }
  }

  /**
   * Mark batch as complete — compute final yields.
   */
  complete() {
    this.status = 'Complete';
    this.actualYield = this.packagedCount;
    this.theoreticalYield = Math.round(this.initialMass * 1000 / this.product.targetDepotMass);
    this.yieldPercent = this.theoreticalYield > 0
      ? ((this.actualYield / this.theoreticalYield) * 100).toFixed(1)
      : 0;
  }

  /**
   * Snapshot current state for event frame records and EBR.
   */
  snapshot() {
    return {
      mass: parseFloat(this.currentMass.toFixed(3)),
      apiPotency: parseFloat(this.apiPotency.toFixed(2)),
      moistureContent: parseFloat(this.moistureContent.toFixed(2)),
      temperature: parseFloat(this.temperature.toFixed(1)),
      density: parseFloat(this.density.toFixed(3)),
      strandDiameter: parseFloat(this.strandDiameter.toFixed(3)),
      totalDepots: this.totalDepots,
      weightAccepted: this.weightAccepted,
      weightRejected: this.weightRejected,
      packagedCount: this.packagedCount,
    };
  }

  /**
   * Serialize full batch record for API storage.
   */
  toJSON() {
    return {
      batchId: this.batchId,
      orderId: this.orderId,
      product: this.product,
      status: this.status,
      createdAt: this.createdAt,
      initialMass: this.initialMass,
      currentMass: parseFloat(this.currentMass.toFixed(3)),
      apiPotency: parseFloat(this.apiPotency.toFixed(2)),
      moistureContent: parseFloat(this.moistureContent.toFixed(2)),
      density: parseFloat(this.density.toFixed(3)),
      strandDiameter: parseFloat(this.strandDiameter.toFixed(3)),
      depotLength: parseFloat(this.depotLength.toFixed(3)),
      totalDepots: this.totalDepots,
      visionAccepted: this.visionAccepted,
      visionRejected: this.visionRejected,
      weightAccepted: this.weightAccepted,
      weightRejected: this.weightRejected,
      packagedCount: this.packagedCount,
      labelPassed: this.labelPassed,
      labelFailed: this.labelFailed,
      cumulativeThermalExposure: parseFloat(this.cumulativeThermalExposure.toFixed(1)),
      maxTemperatureSeen: parseFloat(this.maxTemperatureSeen.toFixed(1)),
      spcDeviations: this.spcDeviations,
      deviationCount: this.deviationCount,
      microStoppages: this.microStoppages,
      rawMaterialLots: this.rawMaterialLots,
      stageHistory: this.stageHistory,
      theoreticalYield: this.theoreticalYield,
      actualYield: this.actualYield,
      yieldPercent: this.yieldPercent,
    };
  }

  static fromJSON(json) {
    if (!json) return null;
    const batch = new MaterialBatch(json.batchId, json.orderId, json.batchIndex);
    Object.assign(batch, json);
    return batch;
  }
}

/** Generate a batch ID from date and campaign index */
export function generateBatchId(batchIndex) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ZOL-${dateStr}-${String(batchIndex + 1).padStart(3, '0')}`;
}
