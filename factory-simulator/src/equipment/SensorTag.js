/**
 * SensorTag.js — Self-describing sensor with noise model.
 * Each sensor produces OPC UA-compatible data objects.
 */

export class SensorTag {
  /**
   * @param {Object} config
   * @param {string} config.tagId - e.g., "TT-601"
   * @param {string} config.name - Human-readable name
   * @param {string} config.unit - Engineering unit symbol
   * @param {string} config.equipmentId - Parent equipment unit
   * @param {Object} config.limits - { lo, loLo, hi, hiHi }
   * @param {number} config.noiseStdDev - Gaussian noise σ (default 0.1% of range)
   */
  constructor({ tagId, name, unit, equipmentId, limits, noiseStdDev = null }) {
    this.tagId = tagId;
    this.name = name;
    this.unit = unit;
    this.equipmentId = equipmentId;
    this.limits = limits;

    // Calculate noise from range if not specified
    const range = Math.abs((limits.hiHi || 100) - (limits.loLo || 0));
    this.noiseStdDev = noiseStdDev ?? range * 0.001;

    // Current state
    this.value = 0;
    this.previousValue = 0;
    this.quality = 'Good'; // Good, Bad, Uncertain
    this.timestamp = null;
    this.sourceTimestamp = null;
  }

  /**
   * Update the sensor value with realistic noise.
   * @param {number} trueValue - The "real" physics-computed value
   * @param {number} simTime - Simulation time
   * @returns {Object} OPC UA-compatible data object
   */
  update(trueValue, simTime) {
    this.previousValue = this.value;

    // Add Gaussian sensor noise
    const noise = this._gaussianRandom() * this.noiseStdDev;
    this.value = trueValue + noise;

    this.sourceTimestamp = new Date(new Date('2026-06-29T06:00:00Z').getTime() + simTime * 1000).toISOString();
    this.timestamp = this.sourceTimestamp;

    // Determine quality
    if (this.value >= this.limits.hiHi || this.value <= this.limits.loLo) {
      this.quality = 'Bad';
    } else if (this.value >= this.limits.hi || this.value <= this.limits.lo) {
      this.quality = 'Uncertain';
    } else {
      this.quality = 'Good';
    }

    return this.toOPCUA();
  }

  /**
   * Force a specific value (for fault injection).
   */
  forceValue(value, simTime) {
    this.previousValue = this.value;
    this.value = value;
    this.sourceTimestamp = new Date(new Date('2026-06-29T06:00:00Z').getTime() + simTime * 1000).toISOString();
    this.timestamp = this.sourceTimestamp;
    this.quality = 'Good';
    return this.toOPCUA();
  }

  /**
   * Check if value has changed significantly since last reading.
   */
  hasChanged(threshold = 0.01) {
    return Math.abs(this.value - this.previousValue) > threshold;
  }

  /**
   * OPC UA self-describing node format.
   */
  toOPCUA() {
    return {
      nodeId: `ns=2;s=SPP5.${this.equipmentId}.${this.tagId}`,
      displayName: this.name,
      value: parseFloat(this.value.toFixed(4)),
      engineeringUnit: this.unit,
      dataType: 'Double',
      timestamp: this.timestamp,
      sourceTimestamp: this.sourceTimestamp,
      serverTimestamp: this.timestamp,
      statusCode: this.quality,
      range: { low: this.limits.loLo, high: this.limits.hiHi },
      alarmLimits: {
        hiHi: this.limits.hiHi,
        hi: this.limits.hi,
        lo: this.limits.lo,
        loLo: this.limits.loLo,
      },
    };
  }

  /**
   * Sparkplug B metric format.
   */
  toSparkplugMetric(includeProperties = false) {
    const metric = {
      name: this.tagId,
      value: parseFloat(this.value.toFixed(4)),
      timestamp: Date.now(),
      dataType: 'Double',
    };

    if (includeProperties) {
      metric.properties = {
        engUnit: this.unit,
        displayName: this.name,
        hiHi: this.limits.hiHi,
        hi: this.limits.hi,
        lo: this.limits.lo,
        loLo: this.limits.loLo,
      };
    }

    return metric;
  }

  /** Box-Muller Gaussian random number generator */
  _gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
