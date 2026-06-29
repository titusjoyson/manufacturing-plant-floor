/**
 * CIPModel.js — Cleaning-in-Place (Inter-batch and Terminal Sanitization)
 * Physics: First-order detergent concentration decay, rinse conductivity
 */

export class CIPModel {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.elapsed = 0;
    this.phase = 'idle'; // idle, preRinse, caustic, acidRinse, finalRinse, sanitize
    this.phaseDuration = 0;
    this.phaseElapsed = 0;
  }

  /**
   * Start a CIP cycle.
   * @param {'inter_batch' | 'terminal'} type
   * @param {number} simTime
   */
  startCycle(type, simTime) {
    this.elapsed = 0;
    this.type = type;
    this.phases = type === 'terminal'
      ? [
          { name: 'preRinse', duration: 300, temp: 45, flowRate: 80 },
          { name: 'caustic', duration: 600, temp: 75, flowRate: 60, detergent: 2.0 },
          { name: 'acidRinse', duration: 300, temp: 50, flowRate: 70, detergent: 0.5 },
          { name: 'finalRinse', duration: 300, temp: 25, flowRate: 90, detergent: 0 },
          { name: 'sanitize', duration: 900, temp: 121, flowRate: 0 }, // SIP
        ]
      : [
          { name: 'preRinse', duration: 180, temp: 40, flowRate: 80 },
          { name: 'caustic', duration: 300, temp: 70, flowRate: 60, detergent: 1.5 },
          { name: 'finalRinse', duration: 180, temp: 25, flowRate: 90, detergent: 0 },
        ];

    this.currentPhaseIndex = 0;
    this._enterPhase(0, simTime);

    this.eventBus.emit('CIP_STARTED', {
      simTime,
      type,
      phases: this.phases.map(p => p.name),
    });
  }

  _enterPhase(index, simTime) {
    if (index >= this.phases.length) {
      this.phase = 'complete';
      this.eventBus.emit('CIP_COMPLETED', { simTime, type: this.type });
      return;
    }
    this.currentPhaseIndex = index;
    const p = this.phases[index];
    this.phase = p.name;
    this.phaseElapsed = 0;
    this.phaseDuration = p.duration;

    this.eventBus.emit('CIP_PHASE_CHANGE', {
      simTime,
      phase: p.name,
      temp: p.temp,
      flowRate: p.flowRate,
    });
  }

  tick(dt, simTime) {
    if (this.phase === 'idle' || this.phase === 'complete') return;

    this.elapsed += dt;
    this.phaseElapsed += dt;

    const p = this.phases[this.currentPhaseIndex];

    // Generate telemetry
    const progress = this.phaseElapsed / this.phaseDuration;

    // Conductivity drops during rinse (shows cleanliness)
    const conductivity = p.detergent
      ? p.detergent * 1000 * (1 - progress * 0.9) // µS/cm — drops during cleaning
      : 5 + Math.random() * 3; // clean water baseline

    // Temperature follows setpoint with ramp
    const temp = p.temp + Math.sin(this.elapsed / 60) * 1.5;

    this.eventBus.emit('CIP_TELEMETRY', {
      simTime,
      phase: p.name,
      temperature: parseFloat(temp.toFixed(1)),
      flowRate: p.flowRate + Math.random() * 5 - 2.5,
      conductivity: parseFloat(conductivity.toFixed(1)),
      progress: parseFloat(progress.toFixed(2)),
    });

    if (this.phaseElapsed >= this.phaseDuration) {
      this._enterPhase(this.currentPhaseIndex + 1, simTime);
    }
  }
}
