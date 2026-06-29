/**
 * PackagingModel.js — Stage 9: Primary Packaging (Syringe Assembly)
 * Physics: Assembly rate model, torque distribution, label accuracy
 */

export class PackagingModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('PACKAGING');
    this.elapsed = 0;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Throughput: limited by supply of accepted depots and line capacity
    const availableDepots = batch.weightAccepted - batch.packagedCount;
    const maxThisTickByCapacity = sp.lineCapacity * (dt / 60);
    const packaged = Math.min(availableDepots, maxThisTickByCapacity);
    const actualThroughput = (packaged / dt) * 60; // units/min

    // Cap torque for each unit — from normal distribution
    const capTorque = sp.capTorqueTarget + this._gaussianRandom() * sp.capTorqueStdDev;

    // Label verification — Bernoulli process
    let labelPassed = 0;
    let labelFailed = 0;
    for (let i = 0; i < Math.floor(packaged); i++) {
      if (Math.random() < sp.labelPassRate) {
        labelPassed++;
      } else {
        labelFailed++;
      }
    }

    batch.packagedCount += labelPassed; // Only fully packaged + labeled units count
    batch.labelPassed += labelPassed;
    batch.labelFailed += labelFailed;

    // Label verification rate as percentage
    const labelRate = (labelPassed + labelFailed) > 0
      ? (labelPassed / (labelPassed + labelFailed)) * 100
      : 100;

    // Update sensors
    this.unit.updateSensor('TP-901', faultOverrides['TP-901'] ?? actualThroughput, simTime);
    this.unit.updateSensor('CT-901', faultOverrides['CT-901'] ?? capTorque, simTime);
    this.unit.updateSensor('LV-901', faultOverrides['LV-901'] ?? labelRate, simTime);

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'PACKAGING',
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
