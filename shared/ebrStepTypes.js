/**
 * ebrStepTypes.js — Electronic Batch Record Step Types
 * Defines every type of step that can appear in a PAS-X EBR.
 */

export const EBR_STEP_TYPE = {
  LINE_CLEARANCE: 'LINE_CLEARANCE',
  MATERIAL_VERIFICATION: 'MATERIAL_VERIFICATION',
  PARAMETER_SETPOINT: 'PARAMETER_SETPOINT',
  PROCESS_EXECUTION: 'PROCESS_EXECUTION',
  PARAMETER_CHECK: 'PARAMETER_CHECK',
  E_SIGNATURE: 'E_SIGNATURE',
  SAMPLE_COLLECTION: 'SAMPLE_COLLECTION',
  CLEAN_VERIFICATION: 'CLEAN_VERIFICATION',
};

export const EBR_STEP_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  DEVIATED: 'Deviated',
  SKIPPED: 'Skipped',
};

/** Step template definitions — instructions for each step type */
export const EBR_STEP_TEMPLATES = {
  [EBR_STEP_TYPE.LINE_CLEARANCE]: {
    instruction: 'Verify previous product has been removed. Check all surfaces are clean and clear.',
    requiresSignature: true,
    nominalDuration: 600, // 10 min
  },
  [EBR_STEP_TYPE.MATERIAL_VERIFICATION]: {
    instruction: 'Scan material barcode. Verify material ID, lot number, expiry date, and quantity against BOM.',
    requiresSignature: true,
    nominalDuration: 180, // 3 min
  },
  [EBR_STEP_TYPE.PARAMETER_SETPOINT]: {
    instruction: 'Verify equipment setpoints match recipe parameters. Confirm via MSI OrderParameter.',
    requiresSignature: false,
    nominalDuration: 30, // 30s — automated
  },
  [EBR_STEP_TYPE.PROCESS_EXECUTION]: {
    instruction: 'Equipment is executing the process phase. Monitor via MSI OrderStatus.',
    requiresSignature: false,
    nominalDuration: null, // duration depends on stage
  },
  [EBR_STEP_TYPE.PARAMETER_CHECK]: {
    instruction: 'Verify critical process parameter is within specified limits.',
    requiresSignature: true,
    nominalDuration: 90, // 1.5 min
  },
  [EBR_STEP_TYPE.E_SIGNATURE]: {
    instruction: 'Sign off completion of current step. 21 CFR Part 11 electronic signature required.',
    requiresSignature: true,
    nominalDuration: 30, // 30s
  },
  [EBR_STEP_TYPE.SAMPLE_COLLECTION]: {
    instruction: 'Collect in-process or finished sample. Label with batch ID and sample number. Submit to LIMS.',
    requiresSignature: true,
    nominalDuration: 300, // 5 min
  },
  [EBR_STEP_TYPE.CLEAN_VERIFICATION]: {
    instruction: 'Verify CIP/SIP cycle completion. Check conductivity, visual cleanliness, and sanitizer residuals.',
    requiresSignature: true,
    nominalDuration: 600, // 10 min
  },
};

/**
 * Generate the standard EBR step sequence for a manufacturing stage.
 * Each stage gets: PARAMETER_SETPOINT → PROCESS_EXECUTION → PARAMETER_CHECK → E_SIGNATURE
 */
export function generateStageEBRSteps(stageId, stageName) {
  return [
    { stepType: EBR_STEP_TYPE.PARAMETER_SETPOINT, description: `Set ${stageName} parameters` },
    { stepType: EBR_STEP_TYPE.PROCESS_EXECUTION, description: `Execute ${stageName}` },
    { stepType: EBR_STEP_TYPE.PARAMETER_CHECK, description: `Verify ${stageName} critical parameters` },
    { stepType: EBR_STEP_TYPE.E_SIGNATURE, description: `Sign off ${stageName} completion` },
  ];
}

/** Process Order states (Gap 3) */
export const PROCESS_ORDER_STATUS = {
  CREATED: 'Created',
  RELEASED: 'Released',
  STARTED: 'Started',
  CONFIRMED: 'TechnicallyComplete',
  CLOSED: 'Closed',
};
