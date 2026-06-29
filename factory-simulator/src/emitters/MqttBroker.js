/**
 * MqttBroker.js — Embedded MQTT Broker (Aedes) for Unified Namespace
 * Exposes IT, OT, and ET data to external software subscriptions on port 1883.
 */

import { Aedes } from 'aedes';
import { createServer } from 'net';

export class MqttBroker {
  /**
   * @param {number} port - MQTT port (default 1883)
   */
  constructor(port = 1883) {
    this.port = port;
    this.aedes = null;
    this.server = null;
    this.ready = false;
  }

  async start() {
    // Aedes v0.51.x removes default constructor in favor of createBroker
    this.aedes = await Aedes.createBroker();
    this.server = createServer(this.aedes.handle);

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`[MQTT] Broker listening on mqtt://0.0.0.0:${this.port}`);
        this.ready = true;
        resolve();
      });

      this.server.on('error', (err) => {
        console.error('[MQTT] Server error:', err);
        reject(err);
      });

      this.aedes.on('client', (client) => {
        console.log(`[MQTT] Client connected: ${client.id}`);
      });

      this.aedes.on('clientDisconnect', (client) => {
        console.log(`[MQTT] Client disconnected: ${client.id}`);
      });
      
      this.aedes.on('subscribe', (subscriptions, client) => {
        console.log(`[MQTT] Client ${client.id} subscribed to ${subscriptions.map(s => s.topic).join(', ')}`);
      });
    });
  }

  /**
   * Publish a message to a topic.
   * @param {string} topic 
   * @param {Object} payload 
   * @param {boolean} retain 
   */
  publish(topic, payload, retain = false) {
    if (!this.ready) return;

    this.aedes.publish({
      topic,
      payload: JSON.stringify(payload),
      qos: 0,
      retain,
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.aedes.close(() => {
        this.server.close(() => {
          console.log('[MQTT] Broker shut down');
          this.ready = false;
          resolve();
        });
      });
    });
  }
}
