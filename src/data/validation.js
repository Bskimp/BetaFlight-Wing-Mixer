export function validateMotorYaw(value) {
  if (Math.abs(value) > 0.5) {
    return { level: 'danger', message: 'Yaw mix above 0.5 causes violent over-control on most wings' };
  }
  return null;
}

export function validateSTermYaw(sYaw, diffThrust) {
  if (diffThrust && sYaw > 0) {
    return { level: 'danger', message: 'S-term yaw should be 0 with differential thrust' };
  }
  return null;
}

export function validatePidValue(term, value) {
  const thresholds = { p: 100, i: 100, d: 80 };
  const limit = thresholds[term];
  if (limit && value > limit) {
    return { level: 'warn', message: `Very high — increase gradually and test` };
  }
  return null;
}

export function validateElevonSymmetry(servos) {
  if (servos.length < 2) return null;
  const first = servos[0];
  const second = servos[1];
  if (first.roll !== 0 && second.roll !== 0 && Math.sign(first.roll) === Math.sign(second.roll)) {
    return { level: 'warn', message: 'Left and right surfaces should have opposite roll directions' };
  }
  return null;
}

export function hasDiffThrust(motors) {
  return motors.some(m => m.yaw !== 0);
}
