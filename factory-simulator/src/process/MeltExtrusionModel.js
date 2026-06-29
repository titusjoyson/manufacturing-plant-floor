/**
 * MeltExtrusionModel.js — Stage 6: Aseptic Melt Extrusion
 * Physics: Power-law rheology η = K·γ̇^(n-1), Arrhenius thermal degradation
 * This is the most critical stage — produces the causal chain for API potency.
 */

export class MeltExtrusionModel {
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.unit = plantFloor.getUnit('MELT_EXTRUSION');
    this.elapsed = 0;
    this.zone1Temp = 22;
    this.zone2Temp = 22;
    this.zone3Temp = 22;
  }

  initialize(batch, stage) {
    this.elapsed = 0;
    this.setpoints = stage.setpoints;
    this.zone1Temp = batch.temperature;
    this.zone2Temp = batch.temperature;
    this.zone3Temp = batch.temperature;
  }

  tick(dt, simTime, batch, faultOverrides = {}) {
    this.elapsed += dt;
    const sp = this.setpoints;

    // Zone temperatures ramp to setpoints with PID-like dynamics
    const rampRate = 0.5; // °C/s
    this.zone1Temp += Math.sign(sp.zone1Temp - this.zone1Temp) * Math.min(rampRate * dt, Math.abs(sp.zone1Temp - this.zone1Temp));
    this.zone2Temp += Math.sign(sp.zone2Temp - this.zone2Temp) * Math.min(rampRate * dt, Math.abs(sp.zone2Temp - this.zone2Temp));
    this.zone3Temp += Math.sign(sp.zone3Temp - this.zone3Temp) * Math.min(rampRate * dt, Math.abs(sp.zone3Temp - this.zone3Temp));

    // Apply fault overrides (e.g., extruder overtemp)
    const actualZ1 = faultOverrides['TT-601'] ?? this.zone1Temp;
    const actualZ2 = faultOverrides['TT-602'] ?? this.zone2Temp;
    const actualZ3 = faultOverrides['TT-603'] ?? this.zone3Temp;

    // Average melt temperature
    const meltTemp = (actualZ1 + actualZ2 + actualZ3) / 3;

    // Power-law rheology: η = K × γ̇^(n-1)
    // Shear rate γ̇ ~ RPM (simplified)
    const shearRate = sp.screwRPM * 2; // approximate s^-1
    const viscosity = sp.powerLawK * Math.pow(shearRate, sp.powerLawN - 1);

    // Screw torque ~ viscosity × shear rate × geometry factor
    const torque = viscosity * shearRate * 0.0001 + 2;

    // Die pressure proportional to viscosity and flow rate
    const diePressure = viscosity * 0.005 + 10;

    // Strand diameter depends on die geometry and melt viscosity
    const strandDiameter = sp.targetStrandDiameter * (1 + 0.1 * (viscosity - 850) / 850);

    // ── ARRHENIUS THERMAL DEGRADATION ──
    // k_deg = A × e^(-Ea/RT), where R = 8.314 J/(mol·K)
    const R_gas = 8.314;
    const tempKelvin = meltTemp + 273.15;
    const k_deg = sp.degradationPreExponential * Math.exp(-sp.degradationActivationEnergy / (R_gas * tempKelvin));

    // API potency loss: dP/dt = -k_deg × P
    // Only significant above degradation threshold
    if (meltTemp > sp.degradationTempThreshold) {
      const potencyLoss = k_deg * batch.apiPotency * dt;
      batch.apiPotency = Math.max(0, batch.apiPotency - potencyLoss);
      batch.cumulativeThermalExposure += (meltTemp - sp.degradationTempThreshold) * dt;
    }

    batch.maxTemperatureSeen = Math.max(batch.maxTemperatureSeen, meltTemp);
    batch.temperature = meltTemp;
    batch.strandDiameter = strandDiameter;

    // Small mass loss from extrusion waste
    batch.currentMass -= 0.0005 * dt;

    // Update sensors
    this.unit.updateSensor('TT-601', actualZ1, simTime);
    this.unit.updateSensor('TT-602', actualZ2, simTime);
    this.unit.updateSensor('TT-603', actualZ3, simTime);
    this.unit.updateSensor('TQ-601', faultOverrides['TQ-601'] ?? torque, simTime);
    this.unit.updateSensor('PT-601', faultOverrides['PT-601'] ?? diePressure, simTime);
    this.unit.updateSensor('VS-601', faultOverrides['VS-601'] ?? viscosity, simTime);

    this._emitTelemetry(simTime);
  }

  _emitTelemetry(simTime) {
    this.eventBus.emit('SENSOR_UPDATE', {
      simTime,
      stageId: 'MELT_EXTRUSION',
      equipmentId: this.unit.id,
      sensors: Object.fromEntries(
        [...this.unit.sensors].map(([id, s]) => [id, { value: s.value, unit: s.unit, quality: s.quality }])
      ),
    });
  }
}
