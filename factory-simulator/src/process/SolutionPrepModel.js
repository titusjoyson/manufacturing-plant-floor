/**
 * SolutionPrepModel.js — Stage 1: Solution Preparation & Filtration
 * Physics: Dissolution kinetics (first-order), filtration pressure drop
 */

export class SolutionPrepModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('SOLUTION_PREP');
    this.elapsed = 0;
    this.initialized = false;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.initialized = true;
    this.setpoints = stage.setpoints;
    this.batch = batch;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    if (!this.initialized) return;
    this.elapsed += dt;

    const sp = this.setpoints;
    const progress = Math.min(1, this.elapsed / (45 * 60)); // normalized 0-1

    // Dissolution kinetics: C(t) = C_target × (1 - e^(-k × t))
    const concentration = sp.targetConcentration * (1 - Math.exp(-sp.dissolutionRateConstant * this.elapsed));

    // Flow rate varies slightly with viscosity increase
    const flowRate = sp.pumpFlowRate * (1 - 0.1 * concentration / sp.targetConcentration);

    // Filtration pressure drop: ΔP = (μ × Q × R) / A (increases as filter loads)
    const filterLoading = 1 + 0.3 * progress; // filter resistance increases over time
    const pumpPressure = (0.001 * flowRate * sp.filterMembraneResistance * filterLoading) / sp.filterArea / 1e9;

    // pH drops slightly as acid dissolves polymer
    const pH = sp.targetPH + 0.2 * (1 - progress);

    // Grade A particle count — normally very low, spikes if contamination
    const particleCount = 200 + Math.random() * 300;

    // Update sensors
    this.unit.updateSensor('TT-101', faultOverrides['TT-101'] ?? (22 + 2 * Math.sin(this.elapsed / 300)), simTime);
    this.unit.updateSensor('FT-101', faultOverrides['FT-101'] ?? flowRate, simTime);
    this.unit.updateSensor('PT-101', faultOverrides['PT-101'] ?? pumpPressure, simTime);
    this.unit.updateSensor('AT-101', faultOverrides['AT-101'] ?? pH, simTime);
    this.unit.updateSensor('PC-101', faultOverrides['PC-101'] ?? particleCount, simTime);

    // Update material batch
    batch.solutionConcentration = concentration;
    batch.temperature = 22 + 2 * Math.sin(this.elapsed / 300);

    // Emit telemetry
    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'SOLUTION_PREP',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
