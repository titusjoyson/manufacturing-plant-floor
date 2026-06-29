/**
 * CleanroomModel.js — Continuous Environmental Monitoring (Grade A)
 * Runs across all stages. Tracks particles, temperature, humidity.
 */

export class CleanroomModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('ENVIRONMENT');
    this.elapsed = 0;
    // Grade A limits (EU GMP Annex 1)
    this.gradeA_05um = 3520;  // max particles ≥0.5µm per m³
    this.gradeA_50um = 20;    // max particles ≥5.0µm per m³
  }

  tick(dt, simTime, faultOverrides = {}) {
    this.elapsed += dt;

    // Particle counts — normally well below limits with Brownian fluctuation
    const baseParticles05 = 1500 + 500 * Math.sin(this.elapsed / 600) + this._gaussianRandom() * 200;
    const baseParticles50 = 5 + 3 * Math.sin(this.elapsed / 800) + Math.abs(this._gaussianRandom() * 2);

    // Temperature controlled by HVAC
    const ambientTemp = 22 + 0.3 * Math.sin(this.elapsed / 450);

    // Humidity controlled
    const humidity = 45 + 3 * Math.sin(this.elapsed / 550);

    this.unit.updateSensor('PC-ENV-05', faultOverrides['PC-ENV-05'] ?? Math.max(0, baseParticles05), simTime);
    this.unit.updateSensor('PC-ENV-50', faultOverrides['PC-ENV-50'] ?? Math.max(0, baseParticles50), simTime);
    this.unit.updateSensor('TT-ENV', faultOverrides['TT-ENV'] ?? ambientTemp, simTime);
    this.unit.updateSensor('HT-ENV', faultOverrides['HT-ENV'] ?? humidity, simTime);

    // Check for aseptic breach
    const pc05 = this.unit.getSensorValue('PC-ENV-05');
    const pc50 = this.unit.getSensorValue('PC-ENV-50');

    if (pc05 > this.gradeA_05um || pc50 > this.gradeA_50um) {
      this.eventBus.emit('ASEPTIC_BREACH', {
        simTime,
        particleCount05: pc05,
        particleCount50: pc50,
        limit05: this.gradeA_05um,
        limit50: this.gradeA_50um,
      });
    }

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'ENVIRONMENT',
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
