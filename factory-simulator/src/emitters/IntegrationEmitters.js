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
   * @param {import('./MqttBroker.js').MqttBroker} mqttBroker - Optional MQTT broker
   */
  constructor(eventBus, broadcastFn, apisBaseUrl = 'http://localhost:3001', mqttBroker = null) {
    this.eventBus = eventBus;
    this.broadcast = broadcastFn;
    this.apisBaseUrl = apisBaseUrl;
    this.mqtt = mqttBroker;

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
    const data = event.data;
    const xmlPayload = `
<ProductionSchedule>
  <ID>${data.orderId}</ID>
  <ProductionRequest>
    <ID>${data.batchId}</ID>
    <ProductProductionRule>
      <ProductID>ZOLADEX-3.6MG</ProductID>
    </ProductProductionRule>
    <SegmentRequirement>
      <Quantity>5000</Quantity>
      <UnitOfMeasure>EA</UnitOfMeasure>
    </SegmentRequirement>
    <StartTime>${new Date().toISOString()}</StartTime>
  </ProductionRequest>
</ProductionSchedule>`.trim();

    const msg = {
      type: INTEGRATION_TYPE.B2MML_PRODUCTION_SCHEDULE,
      protocol: 'B2MML',
      direction: 'ERP → MES',
      timestamp: new Date().toISOString(),
      payload: xmlPayload,
    };
    if (this.mqtt) this.mqtt.publish(`zoladex/it/mes/b2mml/schedule/${event.data.batchId}`, msg.payload, true);
    this._record(msg);
  }

  _emitB2MLProductionPerformance(event) {
    const batch = event.data.materialBatch;
    const xmlPayload = `
<ProductionPerformance>
  <ID>${batch.batchId}</ID>
  <ProductionResponse>
    <ProductionRequestID>${batch.orderId}</ProductionRequestID>
    <SegmentResponse>
      <MaterialActual>
        <MaterialDefinitionID>ZOLADEX-3.6MG</MaterialDefinitionID>
        <Quantity>${batch.packagedCount}</Quantity>
        <UnitOfMeasure>EA</UnitOfMeasure>
      </MaterialActual>
      <ScrapQuantity>${batch.weightRejected + batch.visionRejected}</ScrapQuantity>
      <YieldPercent>${batch.yieldPercent}</YieldPercent>
    </SegmentResponse>
    <StartTime>${batch.stageHistory[0]?.startTime}</StartTime>
    <EndTime>${event.data.simTime}</EndTime>
  </ProductionResponse>
</ProductionPerformance>`.trim();

    const msg = {
      type: INTEGRATION_TYPE.B2MML_PRODUCTION_PERFORMANCE,
      protocol: 'B2MML',
      direction: 'MES → ERP',
      timestamp: new Date().toISOString(),
      payload: xmlPayload,
    };
    if (this.mqtt) this.mqtt.publish(`zoladex/it/mes/b2mml/performance/${batch.batchId}`, msg.payload, true);
    this._record(msg);

    // Also post directly to /api/batches for L4 REST consumption
    fetch(`${this.apisBaseUrl}/api/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => {});
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
    if (this.mqtt) this.mqtt.publish(`zoladex/ot/state/${event.data.stageId}`, msg.payload, true);
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
    if (this.mqtt) this.mqtt.publish(`zoladex/ot/alarms/${alarm.unit}`, msg.payload, true);
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
    if (this.mqtt) {
      this.mqtt.publish(msg.topic, msg.payload);
      this.mqtt.publish(`zoladex/ot/telemetry/${event.data.stageId}`, event.data.sensors);
    }
    
    // Broadcast for live UI
    this.broadcast({ type: 'INTEGRATION_MSG', data: msg });

    // Post to /api/telemetry for REST querying (ring-buffered to 50k in server)
    fetch(`${this.apisBaseUrl}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.payload),
    }).catch(() => {});
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
    if (this.mqtt) this.mqtt.publish(`zoladex/it/ebr/steps/${event.data.step.batchId}`, msg.payload, true);
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
    if (this.mqtt) this.mqtt.publish(`zoladex/it/lims/samples/${event.data.sample.sampleId}`, msg.payload, true);
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
    if (this.mqtt) this.mqtt.publish(`zoladex/it/lims/results/${event.data.sampleId || 'unknown'}`, msg.payload, true);
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
    if (this.mqtt) this.mqtt.publish(`zoladex/it/ewm/staging/${event.data.batchId}`, msg.payload, true);
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
    if (this.mqtt) this.mqtt.publish(`zoladex/it/qm/decision/${event.data.batchId}`, msg.payload, true);
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
