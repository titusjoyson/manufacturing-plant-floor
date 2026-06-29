/**
 * SimulationClock.js — Discrete Event Simulation Clock
 * Maps real wall-clock time to simulation time with configurable acceleration.
 * Dispatches tick events at a fixed real-time interval.
 */

export class SimulationClock {
  /**
   * @param {Object} options
   * @param {number} options.timeScale - Simulation speed multiplier (1 = real-time, 10 = 10x, 300 = 300x)
   * @param {number} options.tickIntervalMs - Real-time milliseconds between ticks (default 100ms = 10Hz)
   */
  constructor({ timeScale = 10, tickIntervalMs = 100 } = {}) {
    this.timeScale = timeScale;
    this.tickIntervalMs = tickIntervalMs;
    this.simTime = 0;           // Total elapsed simulation time in seconds
    this.running = false;
    this.paused = false;
    this.tickCount = 0;
    this.intervalHandle = null;

    /** @type {Array<Function>} */
    this.tickCallbacks = [];
  }

  /**
   * Register a callback to be invoked on each tick.
   * @param {Function} fn - Called with (dt, simTime, tickCount)
   *   dt = simulation seconds elapsed this tick
   *   simTime = total sim seconds since start
   *   tickCount = integer tick number
   */
  onTick(fn) {
    this.tickCallbacks.push(fn);
  }

  /** Start the simulation clock. */
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;

    this.intervalHandle = setInterval(() => {
      if (this.paused) return;

      const dt = (this.tickIntervalMs / 1000) * this.timeScale; // sim seconds per tick
      this.simTime += dt;
      this.tickCount++;

      for (const cb of this.tickCallbacks) {
        try {
          cb(dt, this.simTime, this.tickCount);
        } catch (err) {
          console.error(`[Clock] Tick callback error:`, err.message);
        }
      }
    }, this.tickIntervalMs);

    console.log(`[Clock] Started — ${this.timeScale}x speed, ${this.tickIntervalMs}ms tick interval`);
  }

  /** Pause the clock (ticks stop advancing simTime). */
  pause() {
    this.paused = true;
    console.log('[Clock] Paused');
  }

  /** Resume from pause. */
  resume() {
    this.paused = false;
    console.log('[Clock] Resumed');
  }

  /** Stop the clock entirely. */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.running = false;
    this.paused = false;
    console.log(`[Clock] Stopped at simTime=${this.simTime.toFixed(1)}s (${this.formatSimTime()})`);
  }

  /** Change simulation speed. */
  setTimeScale(newScale) {
    this.timeScale = Math.max(1, Math.min(300, newScale));
    console.log(`[Clock] Time scale set to ${this.timeScale}x`);
  }

  /** Format simTime as HH:MM:SS. */
  formatSimTime() {
    const totalSec = Math.floor(this.simTime);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /** Get current sim datetime (starting from an arbitrary base). */
  getSimDateTime() {
    const base = new Date('2026-06-29T06:00:00Z'); // Shift start at 6 AM
    return new Date(base.getTime() + this.simTime * 1000);
  }

  /** Reset clock to zero. */
  reset() {
    this.stop();
    this.simTime = 0;
    this.tickCount = 0;
    this.tickCallbacks = [];
  }
}
