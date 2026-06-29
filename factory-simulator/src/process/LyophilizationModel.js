/**
 * LyophilizationModel.js — Stage 3: Freeze Drying (24hr cycle)
 * Physics: Sublimation rate = (P_surface - P_chamber) / R_total, shelf temp ramp profile
 */

export class LyophilizationModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('LYOPHILIZATION');
    this.elapsed = 0;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.initialMoisture = batch.moistureContent;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;
    const totalDuration = 24 * 3600; // 24 hours
    const progress = Math.min(1, this.elapsed / totalDuration);

    // Shelf temperature ramp: -40°C → +25°C over the cycle
    // Primary drying (0-70%): hold at -40 to -20
    // Secondary drying (70-100%): ramp to +25
    let shelfTemp;
    if (progress < 0.7) {
      shelfTemp = sp.shelfTempInitial + (sp.shelfTempInitial + 20) * (progress / 0.7);
    } else {
      const secProgress = (progress - 0.7) / 0.3;
      shelfTemp = -20 + (sp.shelfTempFinal + 20) * secProgress;
    }

    // Chamber vacuum — maintained at setpoint
    const chamberPressure = sp.chamberPressure + 10 * Math.sin(this.elapsed / 600);

    // Condenser temperature — stays very cold
    const condenserTemp = sp.condenserTemp + 3 * Math.sin(this.elapsed / 900);

    // Sublimation rate: dm/dt = (P_surface - P_chamber) / R_total
    // Rate is highest during primary drying, drops during secondary
    const pSurface = 200 * Math.exp(-0.02 * (shelfTemp + 40)); // vapor pressure approximation
    const sublimationRate = Math.max(0, (pSurface - chamberPressure) / sp.sublimationResistance * 3600); // kg/hr

    // Update sensors
    this.unit.updateSensor('PT-301', faultOverrides['PT-301'] ?? chamberPressure, simTime);
    this.unit.updateSensor('TT-301', faultOverrides['TT-301'] ?? condenserTemp, simTime);
    this.unit.updateSensor('TT-302', faultOverrides['TT-302'] ?? shelfTemp, simTime);
    this.unit.updateSensor('MT-301', faultOverrides['MT-301'] ?? sublimationRate, simTime);

    // Update material batch
    batch.moistureContent = Math.max(sp.targetMoisture, this.initialMoisture * (1 - progress * 0.99));
    batch.temperature = shelfTemp;
    // Mass loss from solvent removal
    batch.currentMass -= sublimationRate * (dt / 3600) * 0.5;

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'LYOPHILIZATION',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
