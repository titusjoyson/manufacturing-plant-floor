/**
 * EquipmentUnit.js — PackML state machine + sensor registry for each equipment unit.
 * Represents a single piece of manufacturing equipment (e.g., Melt Extruder).
 */

import { PACKML_STATE, isValidTransition, ACTING_STATES } from '../../../shared/packmlStates.js';
import { SensorTag } from './SensorTag.js';

export class EquipmentUnit {
  /**
   * @param {Object} config
   * @param {string} config.id - Equipment ID (e.g., "MELT_EXTRUDER")
   * @param {string} config.name - Human-readable name
   * @param {string} config.equipmentType - Type (Tank, Extruder, etc.)
   * @param {string} config.stageId - Associated manufacturing stage
   * @param {Object} config.sensorDefs - Map of tagId → { name, unit, limits }
   * @param {import('../core/EventBus.js').EventBus} config.eventBus
   */
  constructor({ id, name, equipmentType, stageId, sensorDefs, eventBus }) {
    this.id = id;
    this.name = name;
    this.equipmentType = equipmentType;
    this.stageId = stageId;
    this.eventBus = eventBus;

    // PackML state machine
    this.state = PACKML_STATE.IDLE;
    this.previousState = null;
    this.stateEnteredAt = 0;
    this.actingTimer = 0;

    // Sensor tags
    /** @type {Map<string, SensorTag>} */
    this.sensors = new Map();
    for (const [tagId, def] of Object.entries(sensorDefs)) {
      this.sensors.set(tagId, new SensorTag({
        tagId,
        name: def.name,
        unit: def.unit,
        equipmentId: this.id,
        limits: def,
      }));
    }

    // Online status
    this.online = false;
  }

  /**
   * Bring equipment online — publishes NBIRTH equivalent.
   */
  bringOnline(simTime) {
    this.online = true;
    this.state = PACKML_STATE.IDLE;
    this.stateEnteredAt = simTime;

    this.eventBus.emit('EQUIPMENT_ONLINE', {
      simTime,
      equipmentId: this.id,
      name: this.name,
      metrics: this.getAllMetrics(true), // Full metric schema for birth certificate
    });
  }

  /**
   * Take equipment offline — publishes NDEATH equivalent.
   */
  takeOffline(simTime, reason = 'Shutdown') {
    this.online = false;
    this.eventBus.emit('EQUIPMENT_OFFLINE', {
      simTime,
      equipmentId: this.id,
      name: this.name,
      reason,
    });
  }

  /**
   * Transition to a new PackML state.
   * @returns {boolean} true if transition was valid
   */
  transitionTo(targetState, simTime) {
    if (!isValidTransition(this.state, targetState)) {
      console.warn(`[${this.id}] Invalid PackML transition: ${this.state} → ${targetState}`);
      return false;
    }

    this.previousState = this.state;
    this.state = targetState;
    this.stateEnteredAt = simTime;
    this.actingTimer = 0;

    this.eventBus.emit('STATE_CHANGE', {
      simTime,
      equipmentId: this.id,
      equipmentName: this.name,
      previousState: this.previousState,
      newState: this.state,
      stageId: this.stageId,
    });

    return true;
  }

  /**
   * Tick the equipment unit — handles acting state auto-transitions.
   */
  tick(dt, simTime) {
    if (!this.online) return;

    // Handle acting states (auto-complete after duration)
    const acting = ACTING_STATES[this.state];
    if (acting) {
      this.actingTimer += dt;
      if (this.actingTimer >= acting.duration) {
        this.transitionTo(acting.next, simTime);
      }
    }
  }

  /**
   * Update a specific sensor's value.
   * @returns {Object} OPC UA data object
   */
  updateSensor(tagId, value, simTime) {
    const sensor = this.sensors.get(tagId);
    if (!sensor) return null;
    return sensor.update(value, simTime);
  }

  /**
   * Force a sensor value (fault injection).
   */
  forceSensor(tagId, value, simTime) {
    const sensor = this.sensors.get(tagId);
    if (!sensor) return null;
    return sensor.forceValue(value, simTime);
  }

  /**
   * Get all current sensor readings.
   * @param {boolean} includeProperties - Include full metadata (for NBIRTH)
   */
  getAllMetrics(includeProperties = false) {
    const metrics = [];
    for (const sensor of this.sensors.values()) {
      metrics.push(sensor.toSparkplugMetric(includeProperties));
    }
    // Add PackML state as a metric
    metrics.push({
      name: 'PackMLState',
      value: this.state,
      timestamp: Date.now(),
      dataType: 'String',
    });
    return metrics;
  }

  /**
   * Get only changed sensor readings (for NDATA).
   */
  getChangedMetrics() {
    const metrics = [];
    for (const sensor of this.sensors.values()) {
      if (sensor.hasChanged()) {
        metrics.push(sensor.toSparkplugMetric(false));
      }
    }
    return metrics;
  }

  /**
   * Get sensor value by tag ID.
   */
  getSensorValue(tagId) {
    const sensor = this.sensors.get(tagId);
    return sensor ? sensor.value : null;
  }

  /**
   * Check if equipment is in an executing state.
   */
  isExecuting() {
    return this.state === PACKML_STATE.EXECUTE;
  }
}
