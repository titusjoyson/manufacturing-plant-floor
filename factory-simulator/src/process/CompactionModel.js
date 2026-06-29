/**
 * CompactionModel.js — Stage 5: High-Pressure Piston Compaction
 * Physics: Heckel equation ln(1/(1-D)) = K×P + A
 */

export class CompactionModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('COMPACTION');
    this.elapsed = 0;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.cycleCount = 0;
    this.cycleDuration = 5; // 5 sec per compaction cycle
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Compaction operates in cycles — each cycle compacts a portion
    const cyclePhase = (this.elapsed % this.cycleDuration) / this.cycleDuration;

    // Piston pressure ramps up then releases per cycle
    let pressure, displacement;
    if (cyclePhase < 0.6) {
      // Compression phase
      pressure = sp.pistonPressure * (cyclePhase / 0.6);
      displacement = sp.pistonStroke * (cyclePhase / 0.6);
    } else {
      // Release phase
      pressure = sp.pistonPressure * (1 - (cyclePhase - 0.6) / 0.4);
      displacement = sp.pistonStroke * (1 - (cyclePhase - 0.6) / 0.4);
    }

    // Heckel equation: ln(1/(1-D)) = K×P + A
    const heckelLHS = sp.heckelK * pressure + sp.heckelA;
    const relativeDensity = Math.min(0.98, 1 - Math.exp(-heckelLHS));

    // Load cell force proportional to pressure × area
    const loadForce = pressure * 0.08; // kN (approximate piston area factor)

    // Update sensors
    this.unit.updateSensor('PT-501', faultOverrides['PT-501'] ?? pressure, simTime);
    this.unit.updateSensor('DT-501', faultOverrides['DT-501'] ?? displacement, simTime);
    this.unit.updateSensor('LT-501', faultOverrides['LT-501'] ?? loadForce, simTime);

    // Update material batch — density increases to target
    const progress = Math.min(1, this.elapsed / (30 * 60));
    batch.density = 0.3 + (sp.targetDensity - 0.3) * progress;
    batch.temperature += 0.001 * dt; // slight heating from compression

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'COMPACTION',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
