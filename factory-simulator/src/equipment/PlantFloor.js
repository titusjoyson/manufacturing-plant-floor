/**
 * PlantFloor.js — Instantiates all 9 equipment units + cleanroom environment.
 * Creates the full PI AF hierarchy with sensor tags from shared definitions.
 */

import { STAGES, STAGE_ORDER } from '../../../shared/stages.js';
import { UNIT_MAP } from '../../../shared/equipmentHierarchy.js';
import { EquipmentUnit } from './EquipmentUnit.js';

export class PlantFloor {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;

    /** @type {Map<string, EquipmentUnit>} */
    this.units = new Map();

    this._createUnits();
  }

  _createUnits() {
    // Create equipment units for each manufacturing stage
    for (const stageId of STAGE_ORDER) {
      const stage = STAGES[stageId];
      // Find the unit definition from hierarchy
      const unitDef = Object.values(UNIT_MAP).find(u => u.stageId === stageId);
      if (!unitDef) continue;

      const sensorDefs = {};
      for (const tagId of stage.sensorTags) {
        const limDef = stage.limits[tagId];
        if (limDef) {
          sensorDefs[tagId] = limDef;
        }
      }

      const unit = new EquipmentUnit({
        id: unitDef.id,
        name: unitDef.name,
        equipmentType: unitDef.equipmentType,
        stageId,
        sensorDefs,
        eventBus: this.eventBus,
      });

      this.units.set(stageId, unit);
    }

    // Create environmental monitoring unit
    const envSensors = {
      'PC-ENV-05': { lo: 0, loLo: 0, hi: 3520, hiHi: 5000, unit: 'particles/m³', name: 'Particle Count 0.5µm' },
      'PC-ENV-50': { lo: 0, loLo: 0, hi: 20, hiHi: 50, unit: 'particles/m³', name: 'Particle Count 5.0µm' },
      'TT-ENV': { lo: 20, loLo: 18, hi: 24, hiHi: 26, unit: '°C', name: 'Cleanroom Ambient Temp' },
      'HT-ENV': { lo: 30, loLo: 20, hi: 65, hiHi: 75, unit: '%RH', name: 'Cleanroom Humidity' },
    };

    const envUnit = new EquipmentUnit({
      id: 'ENV_MONITOR',
      name: 'Environmental Monitoring System',
      equipmentType: 'Environment',
      stageId: 'ENVIRONMENT',
      sensorDefs: envSensors,
      eventBus: this.eventBus,
    });

    this.units.set('ENVIRONMENT', envUnit);
  }

  /**
   * Bring all units online (publishes NBIRTH for each).
   */
  bringAllOnline(simTime) {
    for (const unit of this.units.values()) {
      unit.bringOnline(simTime);
    }
    console.log(`[PlantFloor] All ${this.units.size} equipment units online`);
  }

  /**
   * Get equipment unit by stage ID.
   * @param {string} stageId
   * @returns {EquipmentUnit|undefined}
   */
  getUnit(stageId) {
    return this.units.get(stageId);
  }

  /**
   * Tick all equipment units (handles PackML acting state auto-transitions).
   */
  tickAll(dt, simTime) {
    for (const unit of this.units.values()) {
      unit.tick(dt, simTime);
    }
  }

  /**
   * Get all units as an array for serialization.
   */
  getAllUnitsStatus() {
    const result = {};
    for (const [stageId, unit] of this.units) {
      result[stageId] = {
        id: unit.id,
        name: unit.name,
        state: unit.state,
        online: unit.online,
        sensors: {},
      };
      for (const [tagId, sensor] of unit.sensors) {
        result[stageId].sensors[tagId] = {
          value: parseFloat(sensor.value.toFixed(4)),
          unit: sensor.unit,
          quality: sensor.quality,
          name: sensor.name,
        };
      }
    }
    return result;
  }
}
