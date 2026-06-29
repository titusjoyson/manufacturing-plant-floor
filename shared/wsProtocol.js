/**
 * wsProtocol.js — WebSocket Message Protocol
 * Defines all message types and payload schemas for simulator ↔ client communication.
 */

export const WS_MSG = {
  // Telemetry & Equipment
  TELEMETRY_UPDATE: 'TELEMETRY_UPDATE',       // Batch of sensor readings
  STATE_CHANGE: 'STATE_CHANGE',               // PackML state transition
  EQUIPMENT_BIRTH: 'EQUIPMENT_BIRTH',         // Equipment comes online (Sparkplug B NBIRTH analog)
  EQUIPMENT_DEATH: 'EQUIPMENT_DEATH',         // Equipment goes offline (NDEATH)

  // Campaign & Batch
  CAMPAIGN_STATUS: 'CAMPAIGN_STATUS',         // Campaign phase change
  BATCH_STARTED: 'BATCH_STARTED',             // New batch begins
  BATCH_COMPLETED: 'BATCH_COMPLETED',         // Batch finishes
  STAGE_STARTED: 'STAGE_STARTED',             // Manufacturing stage begins
  STAGE_COMPLETED: 'STAGE_COMPLETED',         // Manufacturing stage ends

  // Alarms
  ALARM_RAISED: 'ALARM_RAISED',               // New alarm
  ALARM_ACKNOWLEDGED: 'ALARM_ACKNOWLEDGED',   // Alarm acknowledged by operator
  ALARM_CLEARED: 'ALARM_CLEARED',             // Alarm condition resolved

  // Human Actions
  HUMAN_ACTION: 'HUMAN_ACTION',               // Human agent performed an action
  EBR_STEP: 'EBR_STEP',                       // EBR step transition

  // Integration Messages (forwarded to client for display)
  INTEGRATION_MSG: 'INTEGRATION_MSG',         // B2MML, MSI, OPC UA, Sparkplug B message generated

  // Material
  MATERIAL_UPDATED: 'MATERIAL_UPDATED',       // MaterialBatch properties changed

  // Environment
  ENVIRONMENT_UPDATE: 'ENVIRONMENT_UPDATE',   // Cleanroom metrics

  // Event Frames
  EVENT_FRAME_OPENED: 'EVENT_FRAME_OPENED',   // PI Event Frame started
  EVENT_FRAME_CLOSED: 'EVENT_FRAME_CLOSED',   // PI Event Frame ended

  // Deviation (Gap 1)
  DEVIATION_RAISED: 'DEVIATION_RAISED',       // Procedural deviation detected
  DEVIATION_RESOLVED: 'DEVIATION_RESOLVED',   // Deviation investigation closed

  // SPC (Gap 4)
  SPC_UPDATE: 'SPC_UPDATE',                   // SPC chart data point
  SPC_OUT_OF_CONTROL: 'SPC_OUT_OF_CONTROL',   // SPC run rule violated

  // Client → Simulator commands
  CMD_START_CAMPAIGN: 'CMD_START_CAMPAIGN',     // Client requests campaign start
  CMD_PAUSE: 'CMD_PAUSE',                       // Pause simulation
  CMD_RESUME: 'CMD_RESUME',                     // Resume simulation
  CMD_SET_SPEED: 'CMD_SET_SPEED',               // Change time acceleration
  CMD_INJECT_FAULT: 'CMD_INJECT_FAULT',         // Inject a fault scenario
  CMD_ACKNOWLEDGE_ALARM: 'CMD_ACKNOWLEDGE_ALARM', // Operator acknowledges alarm
  CMD_TOGGLE_APPRENTICE: 'CMD_TOGGLE_APPRENTICE', // Toggle apprentice mode
};

/** Integration message sub-types for INTEGRATION_MSG */
export const INTEGRATION_TYPE = {
  B2MML_PRODUCTION_SCHEDULE: 'B2MML_ProductionSchedule',
  B2MML_PRODUCTION_PERFORMANCE: 'B2MML_ProductionPerformance',
  MSI_ORDER_PARAMETER: 'MSI_OrderParameter',
  MSI_ORDER_STATUS: 'MSI_OrderStatus',
  MSI_EXCEPTION: 'MSI_Exception',
  MSI_ORDER_ABORT: 'MSI_OrderAbort',
  OPCUA_NODE_UPDATE: 'OPCUA_NodeUpdate',
  SPARKPLUG_NBIRTH: 'SparkplugB_NBIRTH',
  SPARKPLUG_NDATA: 'SparkplugB_NDATA',
  SPARKPLUG_NDEATH: 'SparkplugB_NDEATH',
  PI_EVENT_FRAME_OPEN: 'PI_EventFrame_Open',
  PI_EVENT_FRAME_CLOSE: 'PI_EventFrame_Close',
  EBR_STEP_RECORD: 'EBR_StepRecord',
  LIMS_SAMPLE_SUBMIT: 'LIMS_SampleSubmit',
  LIMS_TEST_RESULT: 'LIMS_TestResult',
  EWM_STAGING: 'EWM_Staging',
  EWM_GOODS_MOVEMENT: 'EWM_GoodsMovement',
  QM_INSPECTION_LOT: 'QM_InspectionLot',
  QM_USAGE_DECISION: 'QM_UsageDecision',
};

/** Injectable fault scenarios */
export const FAULT_SCENARIOS = {
  EXTRUDER_OVERTEMP: {
    id: 'EXTRUDER_OVERTEMP',
    name: 'Extruder Zone 3 Over-temperature',
    description: 'Zone 3 barrel temperature exceeds 85°C, triggering API thermal degradation',
    affectedStage: 'MELT_EXTRUSION',
    affectedTag: 'TT-603',
    faultValue: 88,
  },
  ASEPTIC_BREACH: {
    id: 'ASEPTIC_BREACH',
    name: 'Grade A Aseptic Breach',
    description: 'Particle count exceeds Grade A limits — line halt and OrderAbort required',
    affectedStage: 'ENVIRONMENT',
    affectedTag: 'PC-ENV-05',
    faultValue: 10000,
  },
  VACUUM_LOSS: {
    id: 'VACUUM_LOSS',
    name: 'Lyophilizer Vacuum Loss',
    description: 'Chamber vacuum drops to 800 mTorr, halting sublimation',
    affectedStage: 'LYOPHILIZATION',
    affectedTag: 'PT-301',
    faultValue: 800,
  },
  BLADE_WEAR: {
    id: 'BLADE_WEAR',
    name: 'Cutting Blade Wear',
    description: 'Blade degradation causes dimensional conformity to drop below 90%',
    affectedStage: 'CUTTING',
    affectedTag: 'DC-701',
    faultValue: 88,
  },
  MATERIAL_JAM: {
    id: 'MATERIAL_JAM',
    name: 'Material Jam at Packaging',
    description: 'Syringe feed jam causes micro-stoppage, throughput drops to zero',
    affectedStage: 'PACKAGING',
    affectedTag: 'TP-901',
    faultValue: 0,
  },
};
