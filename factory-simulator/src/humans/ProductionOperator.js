/**
 * ProductionOperator.js — Human Agent: Production Operator
 * Simulates EBR step execution, e-signatures, line clearance, parameter checks.
 * Generates digital footprints (badge scans, e-sig records, timestamps).
 */

import { EBR_STEP_TYPE, EBR_STEP_TEMPLATES, EBR_STEP_STATUS } from '../../../shared/ebrStepTypes.js';

export class ProductionOperator {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.operatorId = 'OP-001';
    this.name = 'J. Williams';
    this.badgeNumber = 'AZ-SPP5-0142';
    this.qualifications = ['Aseptic Processing', 'GMP Level 2', 'EBR Certified'];

    // Current activity
    this.currentStep = null;
    this.stepElapsed = 0;
    this.stepDuration = 0;
    this.busy = false;

    // EBR state
    /** @type {Array<Object>} */
    this.completedSteps = [];
    this.stepCounter = 0;
  }

  /**
   * Queue an EBR step for execution.
   * @param {string} stepType - From EBR_STEP_TYPE
   * @param {Object} context - Additional context (stageId, batchId, etc.)
   */
  queueStep(stepType, context = {}) {
    const template = EBR_STEP_TEMPLATES[stepType];
    if (!template) return;

    this.stepCounter++;
    this.currentStep = {
      stepNumber: this.stepCounter,
      stepType,
      instruction: template.instruction,
      requiresSignature: template.requiresSignature,
      status: EBR_STEP_STATUS.IN_PROGRESS,
      operatorId: this.operatorId,
      operatorName: this.name,
      ...context,
    };

    // Duration with human variability (log-normal)
    const baseDuration = template.nominalDuration || 60;
    this.stepDuration = baseDuration * this._logNormalFactor(0, 0.2);
    this.stepElapsed = 0;
    this.busy = true;

    this.eventBus.emit('EBR_STEP_STARTED', {
      step: { ...this.currentStep },
      expectedDuration: this.stepDuration,
    });
  }

  /**
   * Called on each tick to progress current EBR step.
   */
  tick(dt, simTime) {
    if (!this.busy || !this.currentStep) return;

    this.stepElapsed += dt;

    if (this.stepElapsed >= this.stepDuration) {
      this._completeStep(simTime);
    }
  }

  _completeStep(simTime) {
    const step = this.currentStep;
    step.status = EBR_STEP_STATUS.COMPLETED;
    step.completedAt = simTime;
    step.actualDuration = this.stepElapsed;

    // Generate e-signature if required
    if (step.requiresSignature) {
      step.eSignature = {
        operatorId: this.operatorId,
        operatorName: this.name,
        badgeNumber: this.badgeNumber,
        hash: `SHA256:${this._generateHash()}`,
        timestamp: new Date(new Date('2026-06-29T06:00:00Z').getTime() + simTime * 1000).toISOString(),
        meaning: 'I have performed and verified the above step.',
      };
    }

    this.completedSteps.push({ ...step });
    this.currentStep = null;
    this.busy = false;

    this.eventBus.emit('EBR_STEP_COMPLETED', {
      simTime,
      step: { ...step },
    });
  }

  /**
   * Log-normal factor centered around 1.
   */
  _logNormalFactor(mu = 0, sigma = 0.2) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.exp(mu + sigma * z);
  }

  _generateHash() {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}
