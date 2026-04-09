import { pinToCli } from './timerCheck';

// Reverse-lookup: find pin assigned to a given type+index
export function findPin(assignments, type, index) {
  if (!assignments) return null;
  for (const [pin, a] of Object.entries(assignments)) {
    if (a.type === type && a.index === index) return pinToCli(pin);
  }
  return null;
}

// Reverse-lookup: find pin assigned to a servo with a given slotId
export function findPinBySlotId(assignments, slotId) {
  if (!assignments) return null;
  for (const [pin, a] of Object.entries(assignments)) {
    if (a.type === 'servo' && a.slotId === slotId) return pinToCli(pin);
  }
  return null;
}

/**
 * Build a map of pin → { type, index, label } from target's stock motor/servo arrays.
 * Represents the board's factory default resource assignments.
 */
export function buildStockResources(target) {
  const map = {};
  if (target.motors) {
    for (const m of target.motors) {
      map[m.pin] = { type: 'motor', index: m.index, label: `Motor ${m.index}` };
    }
  }
  if (target.servos) {
    for (const s of target.servos) {
      map[s.pin] = { type: 'servo', index: s.index, label: `Servo ${s.index}` };
    }
  }
  return map;
}

/**
 * Build a label for a resource assignment, using preset function names when available.
 */
export function assignmentLabel(a, presetData) {
  if (!a) return null;
  if (a.type === 'motor') {
    const m = presetData?.motors?.[a.index - 1];
    return m ? (m.shortLabel || m.label) : `Motor ${a.index}`;
  }
  if (a.type === 'servo' && a.slotId != null && presetData) {
    const s = presetData.servos?.find(sv => sv.id === a.slotId);
    return s ? (s.shortLabel || s.label) : `Servo ${a.index}`;
  }
  if (a.type === 'servo') return `Servo ${a.index}`;
  if (a.type === 'led') return 'LED';
  return null;
}
