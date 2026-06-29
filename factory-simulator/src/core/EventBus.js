/**
 * EventBus.js — Internal pub/sub for decoupling simulation components.
 * Process models emit events, integration emitters subscribe to them.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 1000;
  }

  /**
   * Subscribe to an event type.
   * @param {string} eventType
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) set.delete(callback);
    };
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} eventType
   * @param {Object} data
   */
  emit(eventType, data) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      simTime: data.simTime || null,
      data,
    };

    // Store in history
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Notify subscribers
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(event);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${eventType}:`, err.message);
        }
      }
    }
  }

  /**
   * Get recent events, optionally filtered by type.
   */
  getHistory(eventType = null, limit = 50) {
    const filtered = eventType
      ? this.history.filter(e => e.type === eventType)
      : this.history;
    return filtered.slice(-limit);
  }

  /** Remove all listeners */
  clear() {
    this.listeners.clear();
    this.history = [];
  }
}
