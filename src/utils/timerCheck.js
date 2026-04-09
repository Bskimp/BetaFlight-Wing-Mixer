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
  if (target.boardType === 'aio') {
    return autoAssignAioResources(presetData, target);
  }

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

  // Collect all available servo pins from non-motor groups, plus unused motor group pins
  const remainingGroups = groups.filter((_, i) => i !== motorGroupIdx);

  // Sort remaining groups: prefer exact fit first, then smallest that fits
  const sortedForServo = [...remainingGroups].sort((a, b) => {
    const aExact = a.pins.length === servoCount ? 0 : 1;
    const bExact = b.pins.length === servoCount ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return a.pins.length - b.pins.length;
  });

  // Gather servo-eligible pins: sorted groups first, then unused motor group pins
  const servoPins = [];
  for (const g of sortedForServo) {
    for (const pin of g.pins) {
      if (!assignments[pin]) servoPins.push(pin);
    }
  }
  // Add unused pins from motor group (if motor group had spares)
  for (const pin of motorGroup.pins) {
    if (!assignments[pin]) servoPins.push(pin);
  }

  // Assign servos (with slotId from preset for correct BF resource mapping)
  for (let i = 0; i < Math.min(servoCount, servoPins.length); i++) {
    assignments[servoPins[i]] = {
      type: 'servo',
      index: i + 1,
      slotId: presetData.servos[i].id,
    };
  }

  return assignments;
}

/**
 * Auto-assign resources for AIO boards.
 * Motor pins are locked to the on-board ESC — assign preset motors to them.
 * Servos go to non-locked, non-blocked timer pins only.
 */
function autoAssignAioResources(presetData, target) {
  const assignments = {};
  const motorCount = presetData.motors.length;
  const servoCount = presetData.servos.length;

  // Motors: assign to the board's existing motor pins (locked but still motor outputs)
  for (let i = 0; i < Math.min(motorCount, target.motors.length); i++) {
    assignments[target.motors[i].pin] = { type: 'motor', index: i + 1 };
  }

  // Servos: only from non-locked, non-blocked timer pins
  const availableForServo = [];
  for (const [, pins] of Object.entries(target.timerGroups || {})) {
    for (const pin of pins) {
      const access = target.pinAccess?.[pin];
      if (access === 'locked' || access === 'blocked') continue;
      if (assignments[pin]) continue; // already assigned as motor
      availableForServo.push(pin);
    }
  }

  for (let i = 0; i < Math.min(servoCount, availableForServo.length); i++) {
    assignments[availableForServo[i]] = {
      type: 'servo',
      index: i + 1,
      slotId: presetData.servos[i].id,
    };
  }

  return assignments;
}

/**
 * Compute pin budget: how many outputs the preset needs vs what the target has.
 *
 * @param {Object} presetData - { motors: [...], servos: [...] }
 * @param {Object} target - target with timerPins and pinAccess
 * @returns {{ needed: number, available: number, shortfall: number }}
 */
export function computePinBudget(presetData, target) {
  const needed = presetData.motors.length + presetData.servos.length;
  const available = (target.timerPins || []).filter(tp => {
    const access = target.pinAccess?.[tp.pin];
    return access !== 'blocked';
  }).length;
  return { needed, available, shortfall: Math.max(0, needed - available) };
}

/**
 * Find UARTs that have at least one pin with timer options (remappable).
 * Excludes pins that are Tier 2 blocked.
 * Sorted: UARTs where both TX+RX are remappable on the same timer first.
 *
 * @param {Object} target - target with enriched uarts and pinAccess
 * @returns {Array} filtered and sorted UART entries
 */
export function findRemappableUarts(target) {
  const uarts = target.uarts || [];
  const remappable = uarts.filter(u => {
    const txOk = u.txTimers?.length > 0 && target.pinAccess?.[u.tx] !== 'blocked';
    const rxOk = u.rxTimers?.length > 0 && target.pinAccess?.[u.rx] !== 'blocked';
    return txOk || rxOk;
  });

  // Sort: prefer UARTs where both pins share a common timer
  remappable.sort((a, b) => {
    const aShared = hasSharedTimer(a);
    const bShared = hasSharedTimer(b);
    if (aShared && !bShared) return -1;
    if (!aShared && bShared) return 1;
    return a.index - b.index;
  });

  return remappable;
}

function hasSharedTimer(uart) {
  if (!uart.txTimers?.length || !uart.rxTimers?.length) return false;
  const txTimers = new Set(uart.txTimers.map(t => t.timer));
  return uart.rxTimers.some(t => txTimers.has(t.timer));
}

/**
 * Pick the best timer option for a UART pin being remapped to servo.
 *
 * Priority:
 * 1. Timer already used for other servos (same timer = no new conflict)
 * 2. Avoid timer used for motors (Dshot/PWM conflict)
 * 3. Prefer lower-numbered timers
 *
 * @param {Array} timerOptions - [{timer, channel, af}] from UART enrichment
 * @param {Object} assignments - current pin assignments
 * @param {Array} timerPins - target's timerPins
 * @returns {Object|null} best {timer, channel, af} or null
 */
export function pickBestTimer(timerOptions, assignments, timerPins) {
  if (!timerOptions || timerOptions.length === 0) return null;
  if (timerOptions.length === 1) return timerOptions[0];

  // Build set of timers used by motors, servos, and LED strip
  const motorTimers = new Set();
  const servoTimers = new Set();
  const ledTimers = new Set();
  for (const tp of timerPins || []) {
    const a = assignments[tp.pin];
    if (!a) continue;
    const timerKey = tp.exact ? tp.timer : tp.timerFamily;
    if (a.type === 'motor') motorTimers.add(timerKey);
    if (a.type === 'servo') servoTimers.add(timerKey);
    if (a.type === 'led') ledTimers.add(timerKey);
  }

  // Score each option (lower = better)
  const scored = timerOptions.map(opt => {
    let score = 0;
    if (servoTimers.has(opt.timer)) score -= 10; // prefer servo timer
    if (motorTimers.has(opt.timer)) score += 20; // avoid motor timer
    if (ledTimers.has(opt.timer)) score += 20;   // avoid LED timer
    // Prefer lower timer number
    const num = parseInt(opt.timer.replace('TIM', ''), 10) || 99;
    score += num;
    return { ...opt, score };
  });

  scored.sort((a, b) => a.score - b.score);
  const { score: _, ...best } = scored[0];
  return best;
}

/**
 * Detect timer conflicts, optionally including UART-remapped pins.
 * Extends the existing conflict detection to check remapped pins too.
 *
 * @param {Object} assignments - {pin: {type: 'motor'|'servo'|'led', index: number}}
 * @param {Array} timerPins - target's timerPins array
 * @param {Object} [uartRemaps] - {pin: {timer, type: 'servo', ...}}
 * @returns {Array} [{timer, pins, exact, message}]
 */
export function detectConflicts(assignments, timerPins, uartRemaps) {
  if (!timerPins || timerPins.length === 0) return [];

  // Build timer/family → assigned pins with their types
  const groupMap = {};
  for (const tp of timerPins) {
    const key = tp.exact ? tp.timer : tp.timerFamily;
    if (!key) continue;
    const assignment = assignments[tp.pin];
    if (!assignment) continue;

    if (!groupMap[key]) {
      groupMap[key] = { exact: tp.exact !== false, pins: [] };
    }
    groupMap[key].pins.push({ pin: tp.pin, type: assignment.type });
    if (!tp.exact) groupMap[key].exact = false;
  }

  // Include UART-remapped pins in conflict checking
  if (uartRemaps) {
    for (const [pin, remap] of Object.entries(uartRemaps)) {
      const key = remap.timer;
      if (!key) continue;
      if (!groupMap[key]) {
        groupMap[key] = { exact: true, pins: [] };
      }
      groupMap[key].pins.push({ pin, type: 'servo' });
    }
  }

  const conflicts = [];
  for (const [timer, group] of Object.entries(groupMap)) {
    const hasMotor = group.pins.some(p => p.type === 'motor');
    const hasServo = group.pins.some(p => p.type === 'servo');
    const hasLed = group.pins.some(p => p.type === 'led');
    const pinList = group.pins.map(p => p.pin);

    if (hasMotor && hasServo) {
      const message = group.exact
        ? `${timer} has both Dshot motors and PWM servos — they cannot share a timer`
        : `${timer} pins may share a timer — verify with CLI \`timer\` command`;
      conflicts.push({ timer, pins: pinList, exact: group.exact, message });
    } else if (hasLed && hasServo) {
      const message = group.exact
        ? `${timer} has both LED strip and PWM servos — LED strip will block servo output on this timer`
        : `${timer} pins may share a timer — LED strip could block servo output`;
      conflicts.push({ timer, pins: pinList, exact: group.exact, message });
    } else if (hasLed && hasMotor) {
      const message = group.exact
        ? `${timer} has both LED strip and Dshot motors — they cannot share a timer`
        : `${timer} pins may share a timer — LED strip could conflict with motor output`;
      conflicts.push({ timer, pins: pinList, exact: group.exact, message });
    }
  }

  return conflicts;
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
  servos.forEach((pin, i) => {
    result[pin] = { type: 'servo', index: i + 1, slotId: assignments[pin].slotId };
  });

  return result;
}
