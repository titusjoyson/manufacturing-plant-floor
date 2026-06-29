/**
 * CheckweighingModel.js — Stage 8: 100% Automated Depot Weighing
 * Physics: Mass distribution N(μ, σ²) where μ = f(strand_diameter, cut_length, density)
 * Includes SPC X-bar and R chart monitoring.
 */

export class CheckweighingModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('CHECKWEIGHING');
    this.elapsed = 0;
    this.spcBuffer = [];
    this.spcSubgroupSize = 5;
    this.consecutiveAboveMean = 0;
    this.consecutiveBelowMean = 0;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.spcBuffer = [];
    this.consecutiveAboveMean = 0;
    this.consecutiveBelowMean = 0;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Mean mass depends on extrusion parameters (causal chain)
    // If strand diameter deviated, mean mass shifts
    const diameterRatio = batch.strandDiameter / 1.5; // ratio to nominal
    const meanMass = sp.targetMass * diameterRatio * diameterRatio; // mass ~ d²

    // Sigma depends on extrusion stability + cutting precision
    const sigma = sp.massStdDev * (1 + 0.5 * Math.abs(diameterRatio - 1));

    // Weigh depots that passed vision (from cutting stage)
    const depotsToWeigh = Math.floor(50 * (dt / 60)); // ~50 depots/min throughput

    let accepted = 0;
    let rejected = 0;
    let massSum = 0;

    for (let i = 0; i < depotsToWeigh; i++) {
      // Each depot mass drawn from the distribution
      const depotMass = meanMass + this._gaussianRandom() * sigma;
      massSum += depotMass;

      if (Math.abs(depotMass - sp.targetMass) <= sp.massTolerance) {
        accepted++;
      } else {
        rejected++;
      }

      // SPC tracking
      this.spcBuffer.push(depotMass);
    }

    batch.weightAccepted += accepted;
    batch.weightRejected += rejected;

    const rejectRate = depotsToWeigh > 0 ? (rejected / depotsToWeigh) * 100 : 0;
    const avgMass = depotsToWeigh > 0 ? massSum / depotsToWeigh : sp.targetMass;

    // SPC deviation (how many σ from target)
    const spcDeviation = (avgMass - sp.targetMass) / sp.massStdDev;

    // SPC run rule: 7 consecutive points above or below mean
    if (avgMass > sp.targetMass) {
      this.consecutiveAboveMean++;
      this.consecutiveBelowMean = 0;
    } else {
      this.consecutiveBelowMean++;
      this.consecutiveAboveMean = 0;
    }

    if (this.consecutiveAboveMean >= sp.spcRunLength || this.consecutiveBelowMean >= sp.spcRunLength) {
      batch.spcDeviations++;
      this.eventBus.emit('SPC_OUT_OF_CONTROL', {
        simTime,
        stageId: 'CHECKWEIGHING',
        rule: 'Run of 7',
        direction: this.consecutiveAboveMean >= sp.spcRunLength ? 'above' : 'below',
        value: avgMass,
        target: sp.targetMass,
      });
      // Reset counter after firing
      this.consecutiveAboveMean = 0;
      this.consecutiveBelowMean = 0;
    }

    // Update sensors
    this.unit.updateSensor('WT-801', faultOverrides['WT-801'] ?? avgMass, simTime);
    this.unit.updateSensor('AR-801', faultOverrides['AR-801'] ?? rejectRate, simTime);
    this.unit.updateSensor('SP-801', faultOverrides['SP-801'] ?? spcDeviation, simTime);

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'CHECKWEIGHING',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }

  _gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
