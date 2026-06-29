/**
 * apis/server.js — Data Recording & Query Service
 * Receives integration messages from the factory-simulator and stores them.
 * Provides REST endpoints for querying recorded data.
 *
 * This is NOT a mock. It records real data produced by the simulation engine.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(STORE_DIR, 'store.json');

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ══════════════════════════════════════════
// In-Memory & Local File Store
// ══════════════════════════════════════════

const stores = {
  messages: [],       // All integration messages (B2MML, MSI, Sparkplug, etc.)
  batches: [],        // Completed batch records
  telemetry: [],      // Time-series sensor data (bounded ring buffer)
  alarms: [],         // Alarm history
  ebrSteps: [],       // Electronic Batch Record steps
  eventFrames: [],    // PI Event Frames
  samples: [],        // LIMS samples and results
  stagingRecords: [], // EWM staging confirmations
  usageDecisions: [], // QM usage decisions
  humanActions: [],   // Human agent actions log
};

const MAX_TELEMETRY = 50000;  // Ring buffer for telemetry
const MAX_MESSAGES = 10000;

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const loaded = JSON.parse(raw);
      Object.keys(stores).forEach(key => {
        if (Array.isArray(loaded[key])) {
          stores[key] = loaded[key];
        }
      });
      console.log(`[DB] Loaded state from ${STORE_PATH}`);
    }
  } catch (err) {
    console.error('[DB] Error loading state:', err.message);
  }
}

let saveTimeout = null;
function triggerSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveStore();
  }, 2000); // Debounce write at max once every 2 seconds
}

function saveStore() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    // Limit telemetry/message sizes stored on disk to prevent bloated files
    const serialized = {
      ...stores,
      telemetry: stores.telemetry.slice(-1000),
      messages: stores.messages.slice(-5000),
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(serialized, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Error saving state:', err.message);
  }
}

// Load database state at startup
loadStore();

// ══════════════════════════════════════════
// Data Recording Endpoints (POST)
// ══════════════════════════════════════════

/** Record any integration message */
app.post('/api/messages', (req, res) => {
  const msg = { ...req.body, recordedAt: new Date().toISOString() };
  stores.messages.push(msg);
  if (stores.messages.length > MAX_MESSAGES) {
    stores.messages = stores.messages.slice(-MAX_MESSAGES / 2);
  }

  // Route to specific stores based on message type
  routeMessage(msg);
  triggerSave();

  res.status(201).json({ status: 'recorded', id: stores.messages.length - 1 });
});

/** Record a batch completion */
app.post('/api/batches', (req, res) => {
  stores.batches.push({ ...req.body, recordedAt: new Date().toISOString() });
  triggerSave();
  res.status(201).json({ status: 'recorded' });
});

/** Record telemetry snapshot */
app.post('/api/telemetry', (req, res) => {
  stores.telemetry.push({ ...req.body, recordedAt: new Date().toISOString() });
  if (stores.telemetry.length > MAX_TELEMETRY) {
    stores.telemetry = stores.telemetry.slice(-MAX_TELEMETRY / 2);
  }
  triggerSave();
  res.status(201).json({ status: 'recorded' });
});

/** Record alarm */
app.post('/api/alarms', (req, res) => {
  stores.alarms.push({ ...req.body, recordedAt: new Date().toISOString() });
  triggerSave();
  res.status(201).json({ status: 'recorded' });
});

/** Reset all database stores */
app.post('/api/reset', (req, res) => {
  Object.keys(stores).forEach(key => {
    stores[key] = [];
  });
  try {
    if (fs.existsSync(STORE_PATH)) {
      fs.unlinkSync(STORE_PATH);
    }
    console.log('[DB] Database reset and store file deleted');
  } catch (err) {
    console.error('[DB] Error resetting database file:', err.message);
  }
  res.json({ status: 'reset' });
});

// ══════════════════════════════════════════
// Query Endpoints (GET)
// ══════════════════════════════════════════

/** Get all integration messages (paginated) */
app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit || '100');
  const offset = parseInt(req.query.offset || '0');
  const type = req.query.type;

  let filtered = stores.messages;
  if (type) {
    filtered = filtered.filter(m => m.type === type);
  }

  res.json({
    total: filtered.length,
    data: filtered.slice(offset, offset + limit),
  });
});

/** Get messages by protocol */
app.get('/api/messages/protocol/:protocol', (req, res) => {
  const filtered = stores.messages.filter(m => m.protocol === req.params.protocol);
  const limit = parseInt(req.query.limit || '100');
  res.json({
    total: filtered.length,
    data: filtered.slice(-limit),
  });
});

/** Get all batch records */
app.get('/api/batches', (req, res) => {
  res.json({ total: stores.batches.length, data: stores.batches });
});

/** Get specific batch by ID */
app.get('/api/batches/:batchId', (req, res) => {
  const batch = stores.batches.find(b => b.batchId === req.params.batchId);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
});

/** Get telemetry (latest N entries, optionally by stage) */
app.get('/api/telemetry', (req, res) => {
  const limit = parseInt(req.query.limit || '500');
  const stageId = req.query.stageId;

  let filtered = stores.telemetry;
  if (stageId) {
    filtered = filtered.filter(t => t.stageId === stageId);
  }

  res.json({
    total: filtered.length,
    data: filtered.slice(-limit),
  });
});

/** Get alarm history */
app.get('/api/alarms', (req, res) => {
  const limit = parseInt(req.query.limit || '100');
  const severity = req.query.severity;

  let filtered = stores.alarms;
  if (severity) {
    filtered = filtered.filter(a => a.severity === severity);
  }

  res.json({
    total: filtered.length,
    data: filtered.slice(-limit),
  });
});

/** Get EBR steps */
app.get('/api/ebr', (req, res) => {
  const batchId = req.query.batchId;
  let filtered = stores.ebrSteps;
  if (batchId) {
    filtered = filtered.filter(s => s.batchId === batchId);
  }
  res.json({ total: filtered.length, data: filtered });
});

/** Get Event Frames */
app.get('/api/event-frames', (req, res) => {
  const batchId = req.query.batchId;
  let filtered = stores.eventFrames;
  if (batchId) {
    filtered = filtered.filter(e => e.payload?.batchId === batchId);
  }
  res.json({ total: filtered.length, data: filtered });
});

/** Get LIMS samples and results */
app.get('/api/lims/samples', (req, res) => {
  const batchId = req.query.batchId;
  let filtered = stores.samples;
  if (batchId) {
    filtered = filtered.filter(s => s.payload?.batchId === batchId);
  }
  res.json({ total: filtered.length, data: filtered });
});

/** Get EWM staging records */
app.get('/api/ewm/staging', (req, res) => {
  res.json({ total: stores.stagingRecords.length, data: stores.stagingRecords });
});

/** Get usage decisions */
app.get('/api/qm/decisions', (req, res) => {
  res.json({ total: stores.usageDecisions.length, data: stores.usageDecisions });
});

/** Get human action log */
app.get('/api/humans/actions', (req, res) => {
  const role = req.query.role;
  const limit = parseInt(req.query.limit || '100');
  let filtered = stores.humanActions;
  if (role) {
    filtered = filtered.filter(a => a.role === role);
  }
  res.json({ total: filtered.length, data: filtered.slice(-limit) });
});

/** Health check */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    stores: Object.fromEntries(
      Object.entries(stores).map(([k, v]) => [k, v.length])
    ),
  });
});

/** Dashboard stats summary */
app.get('/api/stats', (req, res) => {
  res.json({
    batchesRecorded: stores.batches.length,
    totalMessages: stores.messages.length,
    totalAlarms: stores.alarms.length,
    totalEBRSteps: stores.ebrSteps.length,
    telemetryPoints: stores.telemetry.length,
    protocols: [...new Set(stores.messages.map(m => m.protocol))],
  });
});

// ══════════════════════════════════════════
// Message Router
// ══════════════════════════════════════════

function routeMessage(msg) {
  const type = msg.type;

  if (type?.includes('EBR')) {
    stores.ebrSteps.push(msg);
  }
  if (type?.includes('EventFrame')) {
    stores.eventFrames.push(msg);
  }
  if (type?.includes('LIMS')) {
    stores.samples.push(msg);
  }
  if (type?.includes('EWM')) {
    stores.stagingRecords.push(msg);
  }
  if (type?.includes('UsageDecision')) {
    stores.usageDecisions.push(msg);
  }
  if (type?.includes('Exception')) {
    stores.alarms.push(msg);
  }
}

// ══════════════════════════════════════════
// Start
// ══════════════════════════════════════════
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════');
  console.log('  DATA RECORDING & QUERY SERVICE v1.0');
  console.log(`  http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════');
  console.log('[APIs] Endpoints:');
  console.log('  POST /api/messages     — Record integration message');
  console.log('  GET  /api/messages     — Query messages (paginated)');
  console.log('  GET  /api/batches      — Query batch records');
  console.log('  GET  /api/telemetry    — Query time-series');
  console.log('  GET  /api/alarms       — Query alarm history');
  console.log('  GET  /api/ebr          — Query EBR steps');
  console.log('  GET  /api/event-frames — Query PI Event Frames');
  console.log('  GET  /api/lims/samples — Query LIMS data');
  console.log('  GET  /api/health       — Health check');
  console.log('');
});
