/**
 * EquilibrationModel.js — Stage 4: Thermal & Moisture Equilibration
 * Physics: Exponential thermal equilibration T(t) = T_amb + (T_init - T_amb) × e^(-t/τ)
 */

export class EquilibrationModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('EQUILIBRATION');
    this.elapsed = 0;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.initialTemp = batch.temperature;
    this.initialMoisture = batch.moistureContent;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Thermal equilibration: T(t) = T_amb + (T_init - T_amb) × e^(-t/τ)
    const materialTemp = sp.ambientTemp + (this.initialTemp - sp.ambientTemp) * Math.exp(-this.elapsed / sp.thermalTimeConstant);

    // Ambient temp with minor HVAC fluctuation
    const ambientTemp = sp.ambientTemp + 0.5 * Math.sin(this.elapsed / 300);

    // Humidity controlled by HVAC
    const humidity = sp.targetHumidity + 3 * Math.sin(this.elapsed / 400);

    // Update sensors
    this.unit.updateSensor('TT-401', faultOverrides['TT-401'] ?? ambientTemp, simTime);
    this.unit.updateSensor('HT-401', faultOverrides['HT-401'] ?? humidity, simTime);
    this.unit.updateSensor('TT-402', faultOverrides['TT-402'] ?? materialTemp, simTime);

    // Update material batch
    batch.temperature = materialTemp;
    // Moisture slowly equilibrates to target
    const moistureProgress = 1 - Math.exp(-this.elapsed / (sp.thermalTimeConstant * 0.8));
    batch.moistureContent = this.initialMoisture + (sp.equilibriumMoisture - this.initialMoisture) * moistureProgress;

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'EQUILIBRATION',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
