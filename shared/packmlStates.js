/**
 * packmlStates.js — ISA-TR88.00.02 PackML State Model
 * Defines all valid equipment states and their allowed transitions.
 */

export const PACKML_STATE = {
  IDLE: 'Idle',
  STARTING: 'Starting',
  EXECUTE: 'Execute',
  COMPLETING: 'Completing',
  COMPLETE: 'Complete',
  HELD: 'Held',
  HOLDING: 'Holding',
  UNHOLDING: 'Unholding',
  SUSPENDED: 'Suspended',
  SUSPENDING: 'Suspending',
  UNSUSPENDING: 'Unsuspending',
  STOPPED: 'Stopped',
  STOPPING: 'Stopping',
  ABORTING: 'Aborting',
  ABORTED: 'Aborted',
  CLEARING: 'Clearing',
  RESETTING: 'Resetting',
};

/**
 * Valid state transitions per ISA-TR88.00.02.
 * Key = current state, Value = array of valid next states.
 */
export const PACKML_TRANSITIONS = {
  [PACKML_STATE.IDLE]:          [PACKML_STATE.STARTING, PACKML_STATE.STOPPING],
  [PACKML_STATE.STARTING]:      [PACKML_STATE.EXECUTE, PACKML_STATE.STOPPING],
  [PACKML_STATE.EXECUTE]:       [PACKML_STATE.COMPLETING, PACKML_STATE.HOLDING, PACKML_STATE.SUSPENDING, PACKML_STATE.STOPPING, PACKML_STATE.ABORTING],
  [PACKML_STATE.COMPLETING]:    [PACKML_STATE.COMPLETE],
  [PACKML_STATE.COMPLETE]:      [PACKML_STATE.RESETTING, PACKML_STATE.STOPPING],
  [PACKML_STATE.HOLDING]:       [PACKML_STATE.HELD],
  [PACKML_STATE.HELD]:          [PACKML_STATE.UNHOLDING, PACKML_STATE.STOPPING, PACKML_STATE.ABORTING],
  [PACKML_STATE.UNHOLDING]:     [PACKML_STATE.EXECUTE],
  [PACKML_STATE.SUSPENDING]:    [PACKML_STATE.SUSPENDED],
  [PACKML_STATE.SUSPENDED]:     [PACKML_STATE.UNSUSPENDING, PACKML_STATE.STOPPING, PACKML_STATE.ABORTING],
  [PACKML_STATE.UNSUSPENDING]:  [PACKML_STATE.EXECUTE],
  [PACKML_STATE.STOPPING]:      [PACKML_STATE.STOPPED],
  [PACKML_STATE.STOPPED]:       [PACKML_STATE.RESETTING, PACKML_STATE.ABORTING],
  [PACKML_STATE.ABORTING]:      [PACKML_STATE.ABORTED],
  [PACKML_STATE.ABORTED]:       [PACKML_STATE.CLEARING],
  [PACKML_STATE.CLEARING]:      [PACKML_STATE.STOPPED],
  [PACKML_STATE.RESETTING]:     [PACKML_STATE.IDLE],
};

/**
 * Check if a transition from currentState to targetState is valid.
 */
export function isValidTransition(currentState, targetState) {
  const allowed = PACKML_TRANSITIONS[currentState];
  return allowed ? allowed.includes(targetState) : false;
}

/**
 * Acting states (automatic transitions after a duration).
 * These states auto-complete to the next state after a brief transition period.
 */
export const ACTING_STATES = {
  [PACKML_STATE.STARTING]:     { next: PACKML_STATE.EXECUTE, duration: 5 },
  [PACKML_STATE.COMPLETING]:   { next: PACKML_STATE.COMPLETE, duration: 3 },
  [PACKML_STATE.HOLDING]:      { next: PACKML_STATE.HELD, duration: 2 },
  [PACKML_STATE.UNHOLDING]:    { next: PACKML_STATE.EXECUTE, duration: 3 },
  [PACKML_STATE.SUSPENDING]:   { next: PACKML_STATE.SUSPENDED, duration: 2 },
  [PACKML_STATE.UNSUSPENDING]: { next: PACKML_STATE.EXECUTE, duration: 3 },
  [PACKML_STATE.STOPPING]:     { next: PACKML_STATE.STOPPED, duration: 5 },
  [PACKML_STATE.ABORTING]:     { next: PACKML_STATE.ABORTED, duration: 2 },
  [PACKML_STATE.CLEARING]:     { next: PACKML_STATE.STOPPED, duration: 5 },
  [PACKML_STATE.RESETTING]:    { next: PACKML_STATE.IDLE, duration: 3 },
};
