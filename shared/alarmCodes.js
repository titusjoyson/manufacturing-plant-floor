/**
 * alarmCodes.js — Alarm Registry
 * Every alarm that can be raised by the simulation, with ID, severity, and affected unit.
 */

export const ALARM_SEVERITY = {
  INFO: 'Info',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
};

export const ALARMS = {
  // Solution Prep
  'ALM-101': { id: 'ALM-101', severity: ALARM_SEVERITY.WARNING, stage: 'SOLUTION_PREP', unit: 'Mixing Tank', description: 'Solution temperature out of range', sensorTag: 'TT-101' },
  'ALM-102': { id: 'ALM-102', severity: ALARM_SEVERITY.CRITICAL, stage: 'SOLUTION_PREP', unit: 'Mixing Tank', description: 'Pump pressure exceeds limit', sensorTag: 'PT-101' },
  'ALM-103': { id: 'ALM-103', severity: ALARM_SEVERITY.WARNING, stage: 'SOLUTION_PREP', unit: 'Mixing Tank', description: 'pH deviation detected', sensorTag: 'AT-101' },
  'ALM-104': { id: 'ALM-104', severity: ALARM_SEVERITY.CRITICAL, stage: 'SOLUTION_PREP', unit: 'Cleanroom', description: 'Grade A particle count exceeded', sensorTag: 'PC-101' },

  // Drum Freezing
  'ALM-201': { id: 'ALM-201', severity: ALARM_SEVERITY.WARNING, stage: 'DRUM_FREEZING', unit: 'Cryogenic Drum', description: 'Drum surface temperature rising', sensorTag: 'TT-201' },
  'ALM-202': { id: 'ALM-202', severity: ALARM_SEVERITY.WARNING, stage: 'DRUM_FREEZING', unit: 'Cryogenic Drum', description: 'Drum speed deviation', sensorTag: 'ST-201' },
  'ALM-203': { id: 'ALM-203', severity: ALARM_SEVERITY.CRITICAL, stage: 'DRUM_FREEZING', unit: 'Cryogenic Drum', description: 'Excessive vibration detected', sensorTag: 'VT-201' },

  // Lyophilization
  'ALM-301': { id: 'ALM-301', severity: ALARM_SEVERITY.CRITICAL, stage: 'LYOPHILIZATION', unit: 'Freeze Dryer', description: 'Chamber vacuum loss', sensorTag: 'PT-301' },
  'ALM-302': { id: 'ALM-302', severity: ALARM_SEVERITY.WARNING, stage: 'LYOPHILIZATION', unit: 'Freeze Dryer', description: 'Condenser temperature rising', sensorTag: 'TT-301' },
  'ALM-303': { id: 'ALM-303', severity: ALARM_SEVERITY.WARNING, stage: 'LYOPHILIZATION', unit: 'Freeze Dryer', description: 'Shelf temperature deviation', sensorTag: 'TT-302' },

  // Equilibration
  'ALM-401': { id: 'ALM-401', severity: ALARM_SEVERITY.WARNING, stage: 'EQUILIBRATION', unit: 'Equilibration Cabinet', description: 'Ambient temperature out of range', sensorTag: 'TT-401' },

  // Compaction
  'ALM-501': { id: 'ALM-501', severity: ALARM_SEVERITY.WARNING, stage: 'COMPACTION', unit: 'Compaction Press', description: 'Piston pressure deviation', sensorTag: 'PT-501' },
  'ALM-502': { id: 'ALM-502', severity: ALARM_SEVERITY.CRITICAL, stage: 'COMPACTION', unit: 'Compaction Press', description: 'Load cell overload', sensorTag: 'LT-501' },

  // Melt Extrusion
  'ALM-601': { id: 'ALM-601', severity: ALARM_SEVERITY.WARNING, stage: 'MELT_EXTRUSION', unit: 'Melt Extruder', description: 'Zone 1 barrel temperature high', sensorTag: 'TT-601' },
  'ALM-602': { id: 'ALM-602', severity: ALARM_SEVERITY.WARNING, stage: 'MELT_EXTRUSION', unit: 'Melt Extruder', description: 'Zone 2 barrel temperature high', sensorTag: 'TT-602' },
  'ALM-603': { id: 'ALM-603', severity: ALARM_SEVERITY.CRITICAL, stage: 'MELT_EXTRUSION', unit: 'Melt Extruder', description: 'Zone 3 barrel over-temperature', sensorTag: 'TT-603' },
  'ALM-604': { id: 'ALM-604', severity: ALARM_SEVERITY.WARNING, stage: 'MELT_EXTRUSION', unit: 'Melt Extruder', description: 'Screw torque exceeds limit', sensorTag: 'TQ-601' },
  'ALM-605': { id: 'ALM-605', severity: ALARM_SEVERITY.CRITICAL, stage: 'MELT_EXTRUSION', unit: 'Melt Extruder', description: 'Die pressure critical', sensorTag: 'PT-601' },

  // Cutting
  'ALM-701': { id: 'ALM-701', severity: ALARM_SEVERITY.WARNING, stage: 'CUTTING', unit: 'Cutting Station', description: 'Blade velocity out of range', sensorTag: 'BV-701' },
  'ALM-702': { id: 'ALM-702', severity: ALARM_SEVERITY.WARNING, stage: 'CUTTING', unit: 'Cutting Station', description: 'Dimensional conformity declining', sensorTag: 'DC-701' },
  'ALM-703': { id: 'ALM-703', severity: ALARM_SEVERITY.INFO, stage: 'CUTTING', unit: 'Cutting Station', description: 'Micro-stoppage event', sensorTag: 'MS-701' },

  // Checkweighing
  'ALM-801': { id: 'ALM-801', severity: ALARM_SEVERITY.WARNING, stage: 'CHECKWEIGHING', unit: 'Checkweigher', description: 'Depot mass out of specification', sensorTag: 'WT-801' },
  'ALM-802': { id: 'ALM-802', severity: ALARM_SEVERITY.WARNING, stage: 'CHECKWEIGHING', unit: 'Checkweigher', description: 'Reject rate elevated', sensorTag: 'AR-801' },
  'ALM-803': { id: 'ALM-803', severity: ALARM_SEVERITY.CRITICAL, stage: 'CHECKWEIGHING', unit: 'Checkweigher', description: 'SPC control limit breach', sensorTag: 'SP-801' },

  // Packaging
  'ALM-901': { id: 'ALM-901', severity: ALARM_SEVERITY.WARNING, stage: 'PACKAGING', unit: 'Packaging Station', description: 'Throughput below minimum', sensorTag: 'TP-901' },
  'ALM-902': { id: 'ALM-902', severity: ALARM_SEVERITY.WARNING, stage: 'PACKAGING', unit: 'Packaging Station', description: 'Cap torque out of range', sensorTag: 'CT-901' },
  'ALM-903': { id: 'ALM-903', severity: ALARM_SEVERITY.INFO, stage: 'PACKAGING', unit: 'Packaging Station', description: 'Label verification failure', sensorTag: 'LV-901' },

  // Environmental / Aseptic
  'ALM-E01': { id: 'ALM-E01', severity: ALARM_SEVERITY.CRITICAL, stage: 'ENVIRONMENT', unit: 'Cleanroom', description: 'Grade A particle count 0.5µm exceeded', sensorTag: 'PC-ENV-05' },
  'ALM-E02': { id: 'ALM-E02', severity: ALARM_SEVERITY.CRITICAL, stage: 'ENVIRONMENT', unit: 'Cleanroom', description: 'Grade A particle count 5.0µm exceeded', sensorTag: 'PC-ENV-50' },
  'ALM-E03': { id: 'ALM-E03', severity: ALARM_SEVERITY.CRITICAL, stage: 'ENVIRONMENT', unit: 'Cleanroom', description: 'ASEPTIC BREACH — Line halt required', sensorTag: null },
};

/** Downtime classification codes used by Operations Coordinator */
export const DOWNTIME_REASONS = [
  { code: 'DT-001', description: 'Sensor fault', category: 'Equipment' },
  { code: 'DT-002', description: 'Material jam', category: 'Material' },
  { code: 'DT-003', description: 'Heater failure', category: 'Equipment' },
  { code: 'DT-004', description: 'Pressure loss', category: 'Equipment' },
  { code: 'DT-005', description: 'Blade wear', category: 'Equipment' },
  { code: 'DT-006', description: 'Conveyor fault', category: 'Equipment' },
  { code: 'DT-007', description: 'Label misalignment', category: 'Quality' },
  { code: 'DT-008', description: 'Operator error', category: 'Human' },
  { code: 'DT-009', description: 'Scheduled maintenance', category: 'Planned' },
  { code: 'DT-010', description: 'Environmental deviation', category: 'Environmental' },
];
