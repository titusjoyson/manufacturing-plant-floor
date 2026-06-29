/**
 * MaterialCoordinator.js — Human Agent: Material Coordinator
 * Simulates staging delays, goods receipt scanning, order release review.
 */

export class MaterialCoordinator {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.operatorId = 'MC-001';
    this.name = 'R. Thompson';
    this.role = 'Material Coordinator';

    // Timing parameters
    this.stagingDelayMu = Math.log(15 * 60);  // median 15 min
    this.stagingDelaySigma = 0.3;
    this.scanTimeMu = Math.log(180);           // median 3 min per material
    this.scanTimeSigma = 0.25;
  }

  /**
   * Perform material staging for a batch.
   * Returns staging records after a simulated delay.
   */
  performStaging(batch, simTime) {
    const stagingDelay = this._logNormalSample(this.stagingDelayMu, this.stagingDelaySigma);
    const stagingRecords = [];

    for (const lot of batch.rawMaterialLots) {
      const scanTime = this._logNormalSample(this.scanTimeMu, this.scanTimeSigma);
      stagingRecords.push({
        type: 'STAGING_CONFIRMATION',
        materialId: lot.materialId,
        lotNumber: lot.lotNumber,
        quantity: lot.qtyUsed,
        uom: lot.uom,
        operatorId: this.operatorId,
        operatorName: this.name,
        scanDuration: parseFloat(scanTime.toFixed(1)),
        timestamp: simTime + stagingDelay,
        sourceBin: `WH-${Math.floor(Math.random() * 20 + 1).toString().padStart(3, '0')}`,
        destBin: 'SPP5-LINE-1',
        barcodeVerified: true,
      });
    }

    this.eventBus.emit('MATERIAL_STAGED', {
      simTime: simTime + stagingDelay,
      batchId: batch.batchId,
      operatorId: this.operatorId,
      stagingRecords,
      totalStagingTime: parseFloat(stagingDelay.toFixed(1)),
    });

    this.eventBus.emit('HUMAN_ACTION', {
      simTime: simTime + stagingDelay,
      role: 'MaterialCoordinator',
      action: 'Material Staging Complete',
      details: {
        batchId: batch.batchId,
        materialsStaged: stagingRecords.length,
        totalTime: stagingDelay,
      },
    });

    return stagingRecords;
  }

  _logNormalSample(mu, sigma) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.exp(mu + sigma * z);
  }
}
