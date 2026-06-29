/**
 * OperationsCoordinator.js — Human Agent: Shift Manager (SF&A)
 * Simulates alarm response with log-normal latency, downtime classification, equipment reset.
 */

import { DOWNTIME_REASONS } from '../../../shared/alarmCodes.js';

export class OperationsCoordinator {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.operatorId = 'OC-001';
    this.name = 'S. Richardson';
    this.role = 'Operations Coordinator / Shift Manager';

    // Response latency parameters (log-normal)
    this.responseLatencyMu = Math.log(90);   // median 90 seconds
    this.responseLatencySigma = 0.5;          // σ = 45s

    // Pending alarm queue
    this.pendingAlarms = [];
    this.responseTimers = new Map();

    this._setupListeners();
  }

  _setupListeners() {
    this.eventBus.on('ALARM_RAISED', (event) => {
      const alarm = event.data.alarm;
      // Generate log-normal response delay
      const delay = this._logNormalSample(this.responseLatencyMu, this.responseLatencySigma);
      this.responseTimers.set(alarm.alarmId, {
        alarm,
        delay,
        elapsed: 0,
        raisedAt: event.data.simTime,
      });
    });
  }

  tick(dt, simTime) {
    // Process pending alarm responses
    for (const [alarmId, timer] of this.responseTimers) {
      timer.elapsed += dt;
      if (timer.elapsed >= timer.delay) {
        this._respondToAlarm(alarmId, timer, simTime);
        this.responseTimers.delete(alarmId);
      }
    }
  }

  _respondToAlarm(alarmId, timer, simTime) {
    // Select a downtime reason (weighted random)
    const reason = DOWNTIME_REASONS[Math.floor(Math.random() * DOWNTIME_REASONS.length)];

    const response = {
      alarmId,
      operatorId: this.operatorId,
      operatorName: this.name,
      responseLatency: parseFloat(timer.elapsed.toFixed(1)),
      downtimeClassification: reason,
      action: 'Acknowledged and classified',
      simTime,
    };

    this.eventBus.emit('ALARM_RESPONSE', {
      simTime,
      ...response,
    });

    this.eventBus.emit('HUMAN_ACTION', {
      simTime,
      role: 'OperationsCoordinator',
      action: 'Alarm Response',
      details: response,
    });
  }

  _logNormalSample(mu, sigma) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.exp(mu + sigma * z);
  }
}
