// test-mqtt.js — A simple MQTT subscriber to verify Unified Namespace data
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://127.0.0.1:1883');

client.on('connect', () => {
  console.log('✅ Connected to Zoladex MQTT Broker (Unified Namespace)');
  
  // Subscribe to all topics
  client.subscribe('#', (err) => {
    if (!err) {
      console.log('📡 Subscribed to all topics (#). Waiting for IT/OT/ET data...\n');
    } else {
      console.error('❌ Failed to subscribe:', err);
    }
  });
});

client.on('message', (topic, message) => {
  // Try to parse as JSON for pretty printing
  let payload = message.toString();
  try {
    payload = JSON.stringify(JSON.parse(payload), null, 2);
  } catch (e) {
    // leave as string
  }

  // Add some color coding for IT vs OT
  let color = '\x1b[36m'; // Cyan for OT
  if (topic.includes('/it/')) color = '\x1b[32m'; // Green for IT
  if (topic.includes('spBv1.0')) color = '\x1b[33m'; // Yellow for Sparkplug B

  console.log(`${color}═══════════════════════════════════════════\x1b[0m`);
  console.log(`${color}TOPIC: ${topic}\x1b[0m`);
  console.log(`${payload}\n`);
});

client.on('error', (err) => {
  console.error('MQTT Error:', err);
});

setTimeout(() => {
  console.log('Test complete. Exiting...');
  process.exit(0);
}, 60000);
