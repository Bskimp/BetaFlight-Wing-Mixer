/**
 * Pin normalization, timer conflict detection, and resource auto-assignment.
 */

/**
 * Normalize a raw pin string to canonical format: PA02, PB00, etc.
 * Handles: PB0, B00, PB00, pb0, b0
 */
export function normalizePin(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().match(/^P?([A-Ia-i])(\d{1,2})$/);
  if (!m) return null;
  const port = m[1].toUpperCase();
  const num = m[2].padStart(2, '0');
  return `P${port}${num}`;
}

/**
 * Convert canonical pin (PA02) to CLI format (A02).
 */
export function pinToCli(pin) {
  return pin.substring(1);
}

/**
 * Normalize MCU family string. Returns null for unsupported families.
 */
export function normalizeMcu(raw) {
  if (!raw) return null;
  if (/^STM32F4/i.test(raw)) return 'STM32F4';
  if (/^STM32F7/i.test(raw)) return 'STM32F7';
  if (/^STM32H7/i.test(raw)) return 'STM32H7';
  return null;
}

/**
 * Check if a target is wing-capable:
 * - 2+ distinct timer groups
 * - 3+ timer-mapped pins
 */
export function isWingCapable(target) {
  const timerGroupCount = Object.keys(target.timerGroups || {}).length;
  const timerPinCount = (target.timerPins || []).length;
  return timerGroupCount >= 2 && timerPinCount >= 3;
}

/**
 * Detect timer conflicts in resource assignments.
 * A conflict is when a motor and servo share the same timer (or timerFamily).
 * Motor+motor or servo+servo on the same timer is fine.
 *
 * @param {Object} assignments - {pin: {type: 'motor'|'servo'|'led', index: number}}
 * @param {Array} timerPins - target's timerPins array
 * @returns {Array} [{timer, pins, exact, message}]
 */
export function detectConflicts(assignments, timerPins) {
  if (!timerPins || timerPins.length === 0) return [];

  // Build timer/family → assigned pins with their types
  const groupMap = {};
  for (const tp of timerPins) {
    const key = tp.exact ? tp.timer : tp.timerFamily;
    if (!key) continue;
    const assignment = assignments[tp.pin];
    if (!assignment || assignment.type === 'led') continue;

    if (!groupMap[key]) {
      groupMap[key] = { exact: tp.exact !== false, pins: [] };
    }
    groupMap[key].pins.push({ pin: tp.pin, type: assignment.type });
    if (!tp.exact) groupMap[key].exact = false;
  }

  const conflicts = [];
  for (const [timer, group] of Object.entries(groupMap)) {
    const hasMotor = group.pins.some(p => p.type === 'motor');
    const hasServo = group.pins.some(p => p.type === 'servo');
    if (hasMotor && hasServo) {
      const pinList = group.pins.map(p => p.pin);
      const message = group.exact
        ? `${timer} has both Dshot motors and PWM servos \u2014 they cannot share a timer`
        : `${timer} pins may share a timer \u2014 verify with CLI \`timer\` command`;
      conflicts.push({ timer, pins: pinList, exact: group.exact, message });
    }
  }

  return conflicts;
}

/**
 * Auto-assign motor and servo pins from different timer groups.
 *
 * Strategy:
 * 1. Motors assigned first, preferring a timer group with exactly the right pin count
 * 2. Servos assigned next, from a different timer group
 *
 * @param {Object} presetData - { motors: [...], servos: [...] } from AIRFRAME_PRESETS
 * @param {Object} target - target object with timerGroups
 * @returns {Object} {pin: {type, index}} assignment map
 */
export function autoAssignResources(presetData, target) {
  const assignments = {};
  const motorCount = presetData.motors.length;
  const servoCount = presetData.servos.length;

  if (!target.timerGroups || Object.keys(target.timerGroups).length === 0) {
    return assignments;
  }

  // Sort groups by pin count for best-fit selection
  const groups = Object.entries(target.timerGroups)
    .map(([timer, pins]) => ({ timer, pins: [...pins] }))
    .sort((a, b) => a.pins.length - b.pins.length);

  // Pick motor group: prefer exact fit, then smallest group that fits
  let motorGroup = null;
  let motorGroupIdx = -1;
  // First pass: exact fit
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].pins.length === motorCount) {
      motorGroup = groups[i];
      motorGroupIdx = i;
      break;
    }
  }
  // Second pass: smallest group that fits
  if (!motorGroup) {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].pins.length >= motorCount) {
        motorGroup = groups[i];
        motorGroupIdx = i;
        break;
      }
    }
  }
  // Fallback: largest group
  if (!motorGroup) {
    motorGroupIdx = groups.length - 1;
    motorGroup = groups[motorGroupIdx];
  }

  // Assign motors
  for (let i = 0; i < Math.min(motorCount, motorGroup.pins.length); i++) {
    assignments[motorGroup.pins[i]] = { type: 'motor', index: i + 1 };
  }

  // Pick servo group: different from motor group, prefer exact fit
  const remainingGroups = groups.filter((_, i) => i !== motorGroupIdx);
  let servoGroup = null;
  // Exact fit
  for (const g of remainingGroups) {
    if (g.pins.length === servoCount) {
      servoGroup = g;
      break;
    }
  }
  // Smallest that fits
  if (!servoGroup) {
    for (const g of remainingGroups) {
      if (g.pins.length >= servoCount) {
        servoGroup = g;
        break;
      }
    }
  }
  // Fallback: largest remaining
  if (!servoGroup && remainingGroups.length > 0) {
    servoGroup = remainingGroups[remainingGroups.length - 1];
  }

  // Assign servos
  if (servoGroup) {
    for (let i = 0; i < Math.min(servoCount, servoGroup.pins.length); i++) {
      assignments[servoGroup.pins[i]] = { type: 'servo', index: i + 1 };
    }
  }

  return assignments;
}

/**
 * Renumber assignments after a removal. Motors and servos each
 * get contiguous 1-based indexes.
 */
export function renumberAssignments(assignments) {
  const motors = [];
  const servos = [];
  const result = {};

  for (const [pin, a] of Object.entries(assignments)) {
    if (a.type === 'motor') motors.push(pin);
    else if (a.type === 'servo') servos.push(pin);
    else result[pin] = { ...a };
  }

  // Sort by current index to preserve order
  motors.sort((a, b) => assignments[a].index - assignments[b].index);
  servos.sort((a, b) => assignments[a].index - assignments[b].index);

  motors.forEach((pin, i) => { result[pin] = { type: 'motor', index: i + 1 }; });
  servos.forEach((pin, i) => { result[pin] = { type: 'servo', index: i + 1 }; });

  return result;
}
