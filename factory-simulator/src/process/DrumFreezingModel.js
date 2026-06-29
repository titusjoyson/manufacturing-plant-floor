/**
 * DrumFreezingModel.js — Stage 2: Cryogenic Drum Freezing
 * Physics: Convective heat transfer, nucleation rate
 */

export class DrumFreezingModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('DRUM_FREEZING');
    this.elapsed = 0;
    this.solutionTemp = 22; // starts at room temp
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.solutionTemp = batch.temperature;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Convective heat transfer: dT/dt = -h × A × (T_solution - T_drum) / (m × Cp)
    const mass = batch.currentMass;
    const dTdt = -sp.heatTransferCoeff * sp.drumSurfaceArea * (this.solutionTemp - sp.drumTemperature) / (mass * sp.solutionCp);
    this.solutionTemp += dTdt * dt;

    // Drum surface temp stays near setpoint with slight variation
    const drumTemp = sp.drumTemperature + 2 * Math.sin(this.elapsed / 120);

    // RPM stays at setpoint
    const rpm = sp.drumRPM + 0.5 * Math.sin(this.elapsed / 60);

    // Feed rate controlled by pump
    const feedRate = sp.feedRate * (1 - 0.05 * Math.sin(this.elapsed / 180));

    // Vibration — increases slightly as ice builds up
    const progress = Math.min(1, this.elapsed / (60 * 60));
    const vibration = 0.3 + 0.15 * progress + 0.05 * Math.random();

    // Update sensors
    this.unit.updateSensor('TT-201', faultOverrides['TT-201'] ?? drumTemp, simTime);
    this.unit.updateSensor('ST-201', faultOverrides['ST-201'] ?? rpm, simTime);
    this.unit.updateSensor('FT-201', faultOverrides['FT-201'] ?? feedRate, simTime);
    this.unit.updateSensor('VT-201', faultOverrides['VT-201'] ?? vibration, simTime);

    // Update material batch
    batch.temperature = this.solutionTemp;
    // Small mass loss from incomplete collection
    batch.currentMass -= 0.001 * dt;

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'DRUM_FREEZING',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
