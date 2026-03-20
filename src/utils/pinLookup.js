import { pinToCli } from './timerCheck';

// Reverse-lookup: find pin assigned to a given type+index
export function findPin(assignments, type, index) {
  if (!assignments) return null;
  for (const [pin, a] of Object.entries(assignments)) {
    if (a.type === type && a.index === index) return pinToCli(pin);
  }
  return null;
}
