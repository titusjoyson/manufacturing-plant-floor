/**
 * DeviationWorkflow.js — Gap 1: Procedural deviation lifecycle
 * Tracks deviation from detection → investigation → CAPA → resolution
 */

export const DEVIATION_STATUS = {
  DETECTED: 'Detected',
  UNDER_INVESTIGATION: 'UnderInvestigation',
  ROOT_CAUSE_IDENTIFIED: 'RootCauseIdentified',
  CAPA_ASSIGNED: 'CAPAAssigned',
  RESOLVED: 'Resolved',
};

export const DEVIATION_CATEGORY = {
  PARAMETER_EXCURSION: 'ParameterExcursion',
  PROCEDURAL_ERROR: 'ProceduralError',
  EQUIPMENT_MALFUNCTION: 'EquipmentMalfunction',
  ENVIRONMENTAL: 'Environmental',
  MATERIAL: 'Material',
};

let deviationCounter = 0;

export class DeviationWorkflow {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;

    /** @type {Map<string, Object>} */
    this.activeDeviations = new Map();
    this.resolvedDeviations = [];

    this._setupListeners();
  }

  _setupListeners() {
    // Auto-detect deviations from alarm events
    this.eventBus.on('ALARM_RAISED', (event) => {
      const alarm = event.data.alarm;
      if (alarm.severity === 'Critical') {
        this.raiseDeviation({
          category: DEVIATION_CATEGORY.PARAMETER_EXCURSION,
          description: `Critical alarm: ${alarm.description}`,
          source: alarm.alarmId,
          batchId: null, // will be populated if batch is active
          stageId: alarm.stage,
          triggerValue: alarm.triggerValue,
          simTime: event.data.simTime,
        });
      }
    });

    // Auto-detect from SPC out-of-control
    this.eventBus.on('SPC_OUT_OF_CONTROL', (event) => {
      this.raiseDeviation({
        category: DEVIATION_CATEGORY.PARAMETER_EXCURSION,
        description: `SPC out-of-control: ${event.data.rule} (${event.data.direction} mean)`,
        source: 'SPC_MONITOR',
        stageId: event.data.stageId,
        triggerValue: event.data.value,
        simTime: event.data.simTime,
      });
    });

    // Auto-detect from aseptic breach
    this.eventBus.on('ASEPTIC_BREACH', (event) => {
      this.raiseDeviation({
        category: DEVIATION_CATEGORY.ENVIRONMENTAL,
        description: `Aseptic breach — particle count ${event.data.particleCount05} (limit: ${event.data.limit05})`,
        source: 'ENV_MONITOR',
        stageId: 'ENVIRONMENT',
        triggerValue: event.data.particleCount05,
        simTime: event.data.simTime,
      });
    });
  }

  /**
   * Raise a new deviation.
   */
  raiseDeviation({ category, description, source, batchId, stageId, triggerValue, simTime }) {
    deviationCounter++;
    const deviationId = `DEV-${String(deviationCounter).padStart(4, '0')}`;

    const deviation = {
      deviationId,
      category,
      description,
      source,
      batchId,
      stageId,
      triggerValue,
      status: DEVIATION_STATUS.DETECTED,
      raisedAt: simTime,
      investigationStarted: null,
      rootCauseIdentified: null,
      capaAssigned: null,
      resolvedAt: null,
      rootCause: null,
      capaAction: null,
      investigator: null,
      timeline: [
        { status: DEVIATION_STATUS.DETECTED, timestamp: simTime, notes: description },
      ],
    };

    this.activeDeviations.set(deviationId, deviation);

    this.eventBus.emit('DEVIATION_RAISED', {
      simTime,
      deviation: { ...deviation },
    });

    // Auto-progress through workflow stages with delays
    this._scheduleInvestigation(deviationId, simTime);

    return deviationId;
  }

  _scheduleInvestigation(deviationId, simTime) {
    // Will be progressed by tick()
    const dev = this.activeDeviations.get(deviationId);
    if (dev) {
      dev._nextTransitionAt = simTime + 300 + Math.random() * 300; // 5-10 min
      dev._nextStatus = DEVIATION_STATUS.UNDER_INVESTIGATION;
    }
  }

  /**
   * Tick — progress deviation workflows.
   */
  tick(dt, simTime) {
    for (const [id, dev] of this.activeDeviations) {
      if (dev._nextTransitionAt && simTime >= dev._nextTransitionAt) {
        this._progressDeviation(id, dev, simTime);
      }
    }
  }

  _progressDeviation(id, dev, simTime) {
    switch (dev._nextStatus) {
      case DEVIATION_STATUS.UNDER_INVESTIGATION:
        dev.status = DEVIATION_STATUS.UNDER_INVESTIGATION;
        dev.investigationStarted = simTime;
        dev.investigator = 'QA-001';
        dev.timeline.push({ status: dev.status, timestamp: simTime, notes: 'Investigation started by QA' });
        dev._nextTransitionAt = simTime + 600 + Math.random() * 600;
        dev._nextStatus = DEVIATION_STATUS.ROOT_CAUSE_IDENTIFIED;
        break;

      case DEVIATION_STATUS.ROOT_CAUSE_IDENTIFIED:
        dev.status = DEVIATION_STATUS.ROOT_CAUSE_IDENTIFIED;
        dev.rootCauseIdentified = simTime;
        dev.rootCause = this._generateRootCause(dev.category);
        dev.timeline.push({ status: dev.status, timestamp: simTime, notes: `Root cause: ${dev.rootCause}` });
        dev._nextTransitionAt = simTime + 300 + Math.random() * 300;
        dev._nextStatus = DEVIATION_STATUS.CAPA_ASSIGNED;
        break;

      case DEVIATION_STATUS.CAPA_ASSIGNED:
        dev.status = DEVIATION_STATUS.CAPA_ASSIGNED;
        dev.capaAssigned = simTime;
        dev.capaAction = this._generateCAPAAction(dev.category);
        dev.timeline.push({ status: dev.status, timestamp: simTime, notes: `CAPA: ${dev.capaAction}` });
        dev._nextTransitionAt = simTime + 900 + Math.random() * 600;
        dev._nextStatus = DEVIATION_STATUS.RESOLVED;
        break;

      case DEVIATION_STATUS.RESOLVED:
        dev.status = DEVIATION_STATUS.RESOLVED;
        dev.resolvedAt = simTime;
        dev.timeline.push({ status: dev.status, timestamp: simTime, notes: 'Deviation resolved and closed' });
        delete dev._nextTransitionAt;
        delete dev._nextStatus;
        this.activeDeviations.delete(id);
        this.resolvedDeviations.push(dev);

        this.eventBus.emit('DEVIATION_RESOLVED', {
          simTime,
          deviation: { ...dev },
        });
        break;
    }

    this.eventBus.emit('DEVIATION_STATUS_CHANGE', {
      simTime,
      deviationId: id,
      status: dev.status,
    });
  }

  _generateRootCause(category) {
    const causes = {
      [DEVIATION_CATEGORY.PARAMETER_EXCURSION]: 'PID controller tuning drift causing setpoint overshoot',
      [DEVIATION_CATEGORY.PROCEDURAL_ERROR]: 'Operator skipped verification step in EBR',
      [DEVIATION_CATEGORY.EQUIPMENT_MALFUNCTION]: 'Sensor calibration drift exceeding tolerance',
      [DEVIATION_CATEGORY.ENVIRONMENTAL]: 'HVAC filter differential pressure exceeded maintenance threshold',
      [DEVIATION_CATEGORY.MATERIAL]: 'Raw material lot viscosity outside incoming spec',
    };
    return causes[category] || 'Under investigation';
  }

  _generateCAPAAction(category) {
    const actions = {
      [DEVIATION_CATEGORY.PARAMETER_EXCURSION]: 'Re-tune PID loop, add predictive maintenance alert',
      [DEVIATION_CATEGORY.PROCEDURAL_ERROR]: 'Retrain operator, add interlock to EBR step',
      [DEVIATION_CATEGORY.EQUIPMENT_MALFUNCTION]: 'Recalibrate sensor, update PM schedule',
      [DEVIATION_CATEGORY.ENVIRONMENTAL]: 'Replace HVAC filters, increase monitoring frequency',
      [DEVIATION_CATEGORY.MATERIAL]: 'Tighten incoming QC spec, notify supplier',
    };
    return actions[category] || 'Investigate and implement corrective action';
  }

  getActiveDeviations() {
    return Array.from(this.activeDeviations.values());
  }

  getAllDeviations() {
    return [...this.getActiveDeviations(), ...this.resolvedDeviations];
  }
}
