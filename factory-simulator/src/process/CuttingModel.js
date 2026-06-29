/**
 * CuttingModel.js — Stage 7: Cutting & Visual Inspection
 * Physics: Depot geometry from strand parameters, Poisson micro-stoppage process
 */

export class CuttingModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('CUTTING');
    this.elapsed = 0;
    this.depotCounter = 0;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.depotCounter = 0;
    this.lastMicroStoppage = 0;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Blade velocity
    const bladeVelocity = faultOverrides['BV-701'] ?? sp.bladeFrequency;

    // Depot length: L = strand_velocity / blade_frequency
    // strand_velocity derived from extrusion parameters
    const strandVelocity = 200; // mm/min (simplified)
    batch.depotLength = strandVelocity / bladeVelocity;

    // Depots produced per tick
    const depotsThisTick = Math.floor(bladeVelocity * (dt / 60));

    // Dimensional conformity — depends on strand diameter consistency
    const diameterDeviation = Math.abs(batch.strandDiameter - sp.targetDepotLength * 1.5) / (sp.targetDepotLength * 1.5);
    let conformity = sp.visionPassRate * 100 - diameterDeviation * 50;
    conformity = Math.max(80, Math.min(100, faultOverrides['DC-701'] ?? conformity));

    // Vision system accept/reject
    const passRate = conformity / 100;
    let accepted = 0;
    let rejected = 0;
    for (let i = 0; i < depotsThisTick; i++) {
      if (Math.random() < passRate) {
        accepted++;
      } else {
        rejected++;
      }
    }

    batch.totalDepots += depotsThisTick;
    batch.visionAccepted += accepted;
    batch.visionRejected += rejected;

    // Micro-stoppages — Poisson process
    const microStopRate = faultOverrides['MS-701'] ?? sp.microStoppageRate;
    const lambdaPerTick = microStopRate * (dt / 3600);
    if (Math.random() < lambdaPerTick) {
      batch.microStoppages++;
      this.eventBus.emit('MICRO_STOPPAGE', {
        simTime,
        stageId: 'CUTTING',
        equipmentId: this.unit.id,
        count: batch.microStoppages,
      });
    }

    // Update sensors
    this.unit.updateSensor('BV-701', bladeVelocity, simTime);
    this.unit.updateSensor('DC-701', conformity, simTime);
    this.unit.updateSensor('MS-701', microStopRate, simTime);

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'CUTTING',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
