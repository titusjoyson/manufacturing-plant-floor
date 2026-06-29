/**
 * AlarmEngine.js — Monitors all sensor tags against configured limits.
 * Manages alarm lifecycle: Raised → Acknowledged → Cleared.
 */

import { ALARMS, ALARM_SEVERITY } from '../../../shared/alarmCodes.js';

export class AlarmEngine {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../equipment/PlantFloor.js').PlantFloor} plantFloor
   */
  constructor(eventBus, plantFloor) {
    this.eventBus = eventBus;
    this.plantFloor = plantFloor;

    /** @type {Map<string, Object>} Active alarms by alarm ID */
    this.activeAlarms = new Map();
    this.alarmHistory = [];
    this.alarmCounter = 0;
  }

  /**
   * Called every tick — checks all sensors against configured alarm limits.
   */
  tick(dt, simTime) {
    for (const [alarmId, alarmDef] of Object.entries(ALARMS)) {
      if (!alarmDef.sensorTag) continue;

      const unit = this.plantFloor.getUnit(alarmDef.stage);
      if (!unit || !unit.online) continue;

      const sensorValue = unit.getSensorValue(alarmDef.sensorTag);
      if (sensorValue === null) continue;

      const stage = alarmDef.stage;
      const limits = unit.sensors.get(alarmDef.sensorTag)?.limits;
      if (!limits) continue;

      // Determine if alarm condition exists
      let isAlarming = false;
      let alarmType = '';

      if (alarmDef.severity === ALARM_SEVERITY.CRITICAL) {
        isAlarming = sensorValue >= limits.hiHi || sensorValue <= limits.loLo;
        alarmType = sensorValue >= limits.hiHi ? 'HiHi' : 'LoLo';
      } else {
        isAlarming = sensorValue >= limits.hi || sensorValue <= limits.lo;
        alarmType = sensorValue >= limits.hi ? 'Hi' : 'Lo';
      }

      if (isAlarming && !this.activeAlarms.has(alarmId)) {
        // RAISE new alarm
        this.alarmCounter++;
        const alarm = {
          instanceId: `ALM-${this.alarmCounter}`,
          alarmId,
          ...alarmDef,
          alarmType,
          triggerValue: parseFloat(sensorValue.toFixed(4)),
          limit: alarmType.includes('Hi') ? (alarmType === 'HiHi' ? limits.hiHi : limits.hi) : (alarmType === 'LoLo' ? limits.loLo : limits.lo),
          raisedAt: simTime,
          acknowledgedAt: null,
          clearedAt: null,
          status: 'Raised',
        };

        this.activeAlarms.set(alarmId, alarm);
        this.alarmHistory.push(alarm);

        this.eventBus.emit('ALARM_RAISED', {
          simTime,
          alarm: { ...alarm },
        });

      } else if (!isAlarming && this.activeAlarms.has(alarmId)) {
        // CLEAR alarm — condition no longer exists
        const alarm = this.activeAlarms.get(alarmId);
        alarm.clearedAt = simTime;
        alarm.status = 'Cleared';
        this.activeAlarms.delete(alarmId);

        this.eventBus.emit('ALARM_CLEARED', {
          simTime,
          alarm: { ...alarm },
        });
      }
    }
  }

  /**
   * Acknowledge an active alarm (called by Operations Coordinator).
   */
  acknowledge(alarmId, operatorId, simTime) {
    const alarm = this.activeAlarms.get(alarmId);
    if (!alarm) return false;

    alarm.acknowledgedAt = simTime;
    alarm.acknowledgedBy = operatorId;
    alarm.status = 'Acknowledged';

    this.eventBus.emit('ALARM_ACKNOWLEDGED', {
      simTime,
      alarm: { ...alarm },
      operatorId,
    });

    return true;
  }

  /**
   * Get all active alarms for the client.
   */
  getActiveAlarms() {
    return Array.from(this.activeAlarms.values());
  }

  /**
   * Get alarm history.
   */
  getHistory(limit = 100) {
    return this.alarmHistory.slice(-limit);
  }
}
