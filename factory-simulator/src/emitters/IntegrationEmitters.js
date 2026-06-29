/**
 * IntegrationEmitters.js — Produces all enterprise integration messages as side-effects
 * of simulation events. Listens on EventBus and emits formatted messages.
 *
 * Covers: B2MML, MSI, OPC UA, Sparkplug B, Event Frames, EBR, LIMS, EWM
 */

import { INTEGRATION_TYPE } from '../../../shared/wsProtocol.js';

export class IntegrationEmitters {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {Function} broadcastFn - Function to broadcast messages to WebSocket clients
   * @param {string} apisBaseUrl - Base URL of the APIs service
   */
  constructor(eventBus, broadcastFn, apisBaseUrl = 'http://localhost:3001') {
    this.eventBus = eventBus;
    this.broadcast = broadcastFn;
    this.apisBaseUrl = apisBaseUrl;

    /** @type {Array<Object>} All integration messages produced */
    this.messageLog = [];

    this._setupListeners();
  }

  _setupListeners() {
    // ── B2MML ──
    this.eventBus.on('BATCH_STARTED', (event) => this._emitB2MLProductionSchedule(event));
    this.eventBus.on('BATCH_COMPLETED', (event) => this._emitB2MLProductionPerformance(event));

    // ── MSI ──
    this.eventBus.on('STAGE_STARTED', (event) => this._emitMSIOrderParameter(event));
    this.eventBus.on('STATE_CHANGE', (event) => this._emitMSIOrderStatus(event));
    this.eventBus.on('ALARM_RAISED', (event) => this._emitMSIException(event));

    // ── Event Frames ──
    this.eventBus.on('STAGE_STARTED', (event) => this._emitEventFrameOpen(event));
    this.eventBus.on('STAGE_COMPLETED', (event) => this._emitEventFrameClose(event));

    // ── Sparkplug B ──
    this.eventBus.on('EQUIPMENT_ONLINE', (event) => this._emitSparkplugNBIRTH(event));
    this.eventBus.on('EQUIPMENT_OFFLINE', (event) => this._emitSparkplugNDEATH(event));
    this.eventBus.on('SENSOR_UPDATE', (event) => this._emitSparkplugNDATA(event));

    // ── EBR ──
    this.eventBus.on('EBR_STEP_COMPLETED', (event) => this._emitEBRStepRecord(event));

    // ── LIMS ──
    this.eventBus.on('LIMS_SAMPLE_SUBMITTED', (event) => this._emitLIMSSampleSubmit(event));
    this.eventBus.on('LIMS_RESULT_APPROVED', (event) => this._emitLIMSTestResult(event));

    // ── EWM ──
    this.eventBus.on('MATERIAL_STAGED', (event) => this._emitEWMStaging(event));
    this.eventBus.on('USAGE_DECISION', (event) => this._emitUsageDecision(event));
  }

  // ── B2MML ──

  _emitB2MLProductionSchedule(event) {
    const msg = {
      type: INTEGRATION_TYPE.B2MML_PRODUCTION_SCHEDULE,
      protocol: 'B2MML',
      direction: 'ERP → MES',
      timestamp: new Date().toISOString(),
      payload: {
        productionSchedule: {
          orderId: event.data.orderId,
          batchId: event.data.batchId,
          productName: 'Zoladex 3.6mg',
          materialId: 'ZOLADEX-3.6MG',
          targetQuantity: 5000,
          uom: 'EA',
          scheduledStart: new Date().toISOString(),
        },
      },
    };
    this._record(msg);
  }

  _emitB2MLProductionPerformance(event) {
    const batch = event.data.materialBatch;
    const msg = {
      type: INTEGRATION_TYPE.B2MML_PRODUCTION_PERFORMANCE,
      protocol: 'B2MML',
      direction: 'MES → ERP',
      timestamp: new Date().toISOString(),
      payload: {
        productionPerformance: {
          orderId: batch.orderId,
          batchId: batch.batchId,
          actualQuantity: batch.packagedCount,
          scrapQuantity: batch.weightRejected + batch.visionRejected,
          yieldPercent: batch.yieldPercent,
          materialsConsumed: batch.rawMaterialLots,
          startTime: batch.stageHistory[0]?.startTime,
          endTime: event.data.simTime,
        },
      },
    };
    this._record(msg);
  }

  // ── MSI ──

  _emitMSIOrderParameter(event) {
    const msg = {
      type: INTEGRATION_TYPE.MSI_ORDER_PARAMETER,
      protocol: 'MSI',
      direction: 'MES → Equipment',
      timestamp: new Date().toISOString(),
      payload: {
        orderId: event.data.batchId,
        equipmentId: event.data.stageId,
        parameters: [], // Would contain setpoints for the stage
      },
    };
    this._record(msg);
  }

  _emitMSIOrderStatus(event) {
    const msg = {
      type: INTEGRATION_TYPE.MSI_ORDER_STATUS,
      protocol: 'MSI',
      direction: 'Equipment → MES',
      timestamp: new Date().toISOString(),
      payload: {
        equipmentId: event.data.equipmentId,
        previousState: event.data.previousState,
        newState: event.data.newState,
        stageId: event.data.stageId,
      },
    };
    this._record(msg);
  }

  _emitMSIException(event) {
    const alarm = event.data.alarm;
    const msg = {
      type: INTEGRATION_TYPE.MSI_EXCEPTION,
      protocol: 'MSI',
      direction: 'Equipment → MES',
      timestamp: new Date().toISOString(),
      payload: {
        alarmId: alarm.alarmId,
        severity: alarm.severity,
        equipmentId: alarm.unit,
        description: alarm.description,
        triggerValue: alarm.triggerValue,
        limit: alarm.limit,
      },
    };
    this._record(msg);
  }

  // ── Sparkplug B ──

  _emitSparkplugNBIRTH(event) {
    const msg = {
      type: INTEGRATION_TYPE.SPARKPLUG_NBIRTH,
      protocol: 'SparkplugB',
      topic: `spBv1.0/Macclesfield/NBIRTH/ZoladexLine/${event.data.equipmentId}`,
      timestamp: new Date().toISOString(),
      payload: {
        timestamp: Date.now(),
        metrics: event.data.metrics,
      },
    };
    this._record(msg);
  }

  _emitSparkplugNDATA(event) {
    const msg = {
      type: INTEGRATION_TYPE.SPARKPLUG_NDATA,
      protocol: 'SparkplugB',
      topic: `spBv1.0/Macclesfield/NDATA/ZoladexLine/${event.data.equipmentId}`,
      timestamp: new Date().toISOString(),
      payload: {
        timestamp: Date.now(),
        stageId: event.data.stageId,
        sensors: event.data.sensors,
      },
    };
    // Don't record every NDATA — too frequent. Only broadcast.
    this.broadcast({ type: 'INTEGRATION_MSG', data: msg });
  }

  _emitSparkplugNDEATH(event) {
    const msg = {
      type: INTEGRATION_TYPE.SPARKPLUG_NDEATH,
      protocol: 'SparkplugB',
      topic: `spBv1.0/Macclesfield/NDEATH/ZoladexLine/${event.data.equipmentId}`,
      timestamp: new Date().toISOString(),
      payload: { reason: event.data.reason },
    };
    this._record(msg);
  }

  // ── Event Frames ──

  _emitEventFrameOpen(event) {
    const msg = {
      type: INTEGRATION_TYPE.PI_EVENT_FRAME_OPEN,
      protocol: 'PI_EventFrame',
      timestamp: new Date().toISOString(),
      payload: {
        batchId: event.data.batchId,
        phaseName: event.data.stageName,
        stageId: event.data.stageId,
        startTime: event.data.simTime,
        productName: 'Zoladex 3.6mg',
      },
    };
    this._record(msg);
  }

  _emitEventFrameClose(event) {
    const msg = {
      type: INTEGRATION_TYPE.PI_EVENT_FRAME_CLOSE,
      protocol: 'PI_EventFrame',
      timestamp: new Date().toISOString(),
      payload: {
        batchId: event.data.batchId,
        phaseName: event.data.stageName,
        stageId: event.data.stageId,
        endTime: event.data.simTime,
        exitProperties: event.data.exitProperties,
      },
    };
    this._record(msg);
  }

  // ── EBR ──

  _emitEBRStepRecord(event) {
    const msg = {
      type: INTEGRATION_TYPE.EBR_STEP_RECORD,
      protocol: 'EBR',
      timestamp: new Date().toISOString(),
      payload: event.data.step,
    };
    this._record(msg);
  }

  // ── LIMS ──

  _emitLIMSSampleSubmit(event) {
    const msg = {
      type: INTEGRATION_TYPE.LIMS_SAMPLE_SUBMIT,
      protocol: 'LIMS',
      direction: 'MES → LIMS',
      timestamp: new Date().toISOString(),
      payload: event.data.sample,
    };
    this._record(msg);
  }

  _emitLIMSTestResult(event) {
    const msg = {
      type: INTEGRATION_TYPE.LIMS_TEST_RESULT,
      protocol: 'LIMS',
      direction: 'LIMS → MES',
      timestamp: new Date().toISOString(),
      payload: event.data,
    };
    this._record(msg);
  }

  // ── EWM ──

  _emitEWMStaging(event) {
    const msg = {
      type: INTEGRATION_TYPE.EWM_STAGING,
      protocol: 'EWM',
      direction: 'EWM → MaterialCoordinator',
      timestamp: new Date().toISOString(),
      payload: {
        batchId: event.data.batchId,
        stagingRecords: event.data.stagingRecords,
      },
    };
    this._record(msg);
  }

  _emitUsageDecision(event) {
    const msg = {
      type: INTEGRATION_TYPE.QM_USAGE_DECISION,
      protocol: 'QM',
      direction: 'QA → ERP',
      timestamp: new Date().toISOString(),
      payload: event.data,
    };
    this._record(msg);
  }

  // ── Internal ──

  _record(msg) {
    this.messageLog.push(msg);
    // Keep log bounded
    if (this.messageLog.length > 5000) {
      this.messageLog = this.messageLog.slice(-2500);
    }
    // Broadcast to WebSocket clients
    this.broadcast({ type: 'INTEGRATION_MSG', data: msg });
    // POST to APIs service for persistence
    this._postToAPIs(msg);
  }

  async _postToAPIs(msg) {
    try {
      await fetch(`${this.apisBaseUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
    } catch {
      // APIs service might not be ready — silently continue
    }
  }

  getMessageLog(limit = 100) {
    return this.messageLog.slice(-limit);
  }
}
