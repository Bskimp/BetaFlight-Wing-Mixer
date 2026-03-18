import { WING_DEFAULTS, TPA_DEFAULTS, SPA_DEFAULTS, PID_DEFAULTS, RATE_DEFAULTS } from '../data/defaults';

/**
 * Map a parsed BF diff config into the tool's state format.
 * Returns an object with all the state fields App.jsx needs.
 */
export function mapConfigToState(parsed) {
  const profile = parsed.profiles[parsed.activeProfile] || {};
  const rateProfile = parsed.rateProfiles[parsed.activeRateProfile] || {};

  // Motors
  const motors = parsed.motors.map(m => ({
    id: m.index,
    label: `Motor ${m.index + 1}`,
    throttle: m.throttle,
    roll: m.roll,
    pitch: m.pitch,
    yaw: m.yaw,
  }));

  // Servo mix: group smix rules by servo index to reconstruct per-servo axis weights
  const servoMap = {};
  for (const rule of parsed.servoMix) {
    if (!servoMap[rule.servo]) {
      servoMap[rule.servo] = { id: rule.servo, label: `Servo ${rule.servo}`, roll: 0, pitch: 0, yaw: 0 };
    }
    const sources = { 0: 'roll', 1: 'pitch', 2: 'yaw' };
    const axis = sources[rule.source];
    if (axis) servoMap[rule.servo][axis] = rule.rate;
  }
  const servos = Object.values(servoMap).sort((a, b) => a.id - b.id);

  // Detect diff thrust
  const diffThrust = parsed.master.yaw_type === 'DIFF_THRUST' ||
                     motors.some(m => m.yaw !== 0);

  // Detect preset from mixer type
  let preset = 'flying_wing_dt';
  if (parsed.mixerType === 'FLYING_WING') {
    preset = 'flying_wing';
  } else if (parsed.mixerType === 'AIRPLANE') {
    preset = diffThrust ? 'airplane_dt' : 'airplane';
  } else if (parsed.mixerType === 'CUSTOMAIRPLANE') {
    if (servos.length <= 2) {
      preset = diffThrust ? 'flying_wing_dt' : 'flying_wing';
    } else {
      preset = diffThrust ? 'airplane_dt' : 'airplane';
    }
  }

  // PIDs
  const pids = {
    roll:  { p: profile.p_roll  ?? PID_DEFAULTS.roll.p,  i: profile.i_roll  ?? PID_DEFAULTS.roll.i,  d: profile.d_roll  ?? PID_DEFAULTS.roll.d,  f: profile.f_roll  ?? PID_DEFAULTS.roll.f },
    pitch: { p: profile.p_pitch ?? PID_DEFAULTS.pitch.p, i: profile.i_pitch ?? PID_DEFAULTS.pitch.i, d: profile.d_pitch ?? PID_DEFAULTS.pitch.d, f: profile.f_pitch ?? PID_DEFAULTS.pitch.f },
    yaw:   { p: profile.p_yaw   ?? PID_DEFAULTS.yaw.p,   i: profile.i_yaw   ?? PID_DEFAULTS.yaw.i,   d: profile.d_yaw   ?? PID_DEFAULTS.yaw.d,   f: profile.f_yaw   ?? PID_DEFAULTS.yaw.f },
  };

  // Rates — BF stores rc_rate as value/10, so multiply to get deg/s for UI
  const rates = {
    roll:  (rateProfile.roll_rc_rate  ?? Math.round(RATE_DEFAULTS.roll / 10)) * 10,
    pitch: (rateProfile.pitch_rc_rate ?? Math.round(RATE_DEFAULTS.pitch / 10)) * 10,
    yaw:   (rateProfile.yaw_rc_rate   ?? Math.round(RATE_DEFAULTS.yaw / 10)) * 10,
  };

  // Wing settings
  const wingSettings = {
    s_pitch: profile.s_pitch ?? WING_DEFAULTS.s_pitch,
    s_roll: profile.s_roll ?? WING_DEFAULTS.s_roll,
    s_yaw: profile.s_yaw ?? WING_DEFAULTS.s_yaw,
    servo_pwm_rate: parsed.master.servo_pwm_rate ?? WING_DEFAULTS.servo_pwm_rate,
    iterm_relax_cutoff: profile.iterm_relax_cutoff ?? WING_DEFAULTS.iterm_relax_cutoff,
    gps_use_3d_speed: parsed.master.gps_use_3d_speed ?? WING_DEFAULTS.gps_use_3d_speed,
    dterm_lpf1_dyn_expo: profile.dterm_lpf1_dyn_expo ?? WING_DEFAULTS.dterm_lpf1_dyn_expo,
  };

  // TPA settings
  const tpaSettings = {
    tpa_mode: profile.tpa_mode ?? TPA_DEFAULTS.tpa_mode,
    tpa_curve_type: profile.tpa_curve_type ?? TPA_DEFAULTS.tpa_curve_type,
    tpa_speed_type: 'BASIC',
    tpa_speed_max_voltage: profile.tpa_speed_max_voltage ?? TPA_DEFAULTS.tpa_speed_max_voltage,
    tpa_speed_basic_delay: profile.tpa_speed_basic_delay ?? TPA_DEFAULTS.tpa_speed_basic_delay,
    tpa_speed_basic_gravity: profile.tpa_speed_basic_gravity ?? TPA_DEFAULTS.tpa_speed_basic_gravity,
    tpa_curve_stall_throttle: profile.tpa_curve_stall_throttle ?? TPA_DEFAULTS.tpa_curve_stall_throttle,
    tpa_curve_pid_thr0: profile.tpa_curve_pid_thr0 ?? TPA_DEFAULTS.tpa_curve_pid_thr0,
    tpa_curve_pid_thr100: profile.tpa_curve_pid_thr100 ?? TPA_DEFAULTS.tpa_curve_pid_thr100,
    tpa_curve_expo: profile.tpa_curve_expo ?? TPA_DEFAULTS.tpa_curve_expo,
  };

  // SPA settings — modes from master, center/width from profile
  const spaSettings = {
    spa_roll_mode: parsed.master.spa_roll_mode ?? SPA_DEFAULTS.spa_roll_mode,
    spa_pitch_mode: parsed.master.spa_pitch_mode ?? SPA_DEFAULTS.spa_pitch_mode,
    spa_yaw_mode: parsed.master.spa_yaw_mode ?? SPA_DEFAULTS.spa_yaw_mode,
    spa_roll_center: profile.spa_roll_center ?? SPA_DEFAULTS.spa_roll_center,
    spa_roll_width: profile.spa_roll_width ?? SPA_DEFAULTS.spa_roll_width,
    spa_pitch_center: profile.spa_pitch_center ?? SPA_DEFAULTS.spa_pitch_center,
    spa_pitch_width: profile.spa_pitch_width ?? SPA_DEFAULTS.spa_pitch_width,
    spa_yaw_center: profile.spa_yaw_center ?? SPA_DEFAULTS.spa_yaw_center,
    spa_yaw_width: profile.spa_yaw_width ?? SPA_DEFAULTS.spa_yaw_width,
  };

  // Pass-through sections (preserved verbatim in CLI output)
  const passthrough = {
    aux: parsed.aux,
    map: parsed.map,
    rxrange: parsed.rxrange,
    beacon: parsed.beacon,
    features: parsed.features,
    serial: parsed.serial,
    servoConfig: parsed.servos,
    resources: parsed.resources,
  };

  return {
    boardName: parsed.boardName,
    manufacturer: parsed.manufacturer,
    version: parsed.version,
    preset,
    motors,
    servos,
    diffThrust,
    pids,
    rates,
    wingSettings,
    tpaSettings,
    spaSettings,
    passthrough,
  };
}

/**
 * Build a summary of what was parsed for display in the import dialog.
 */
export function buildImportSummary(parsed) {
  const profile = parsed.profiles[parsed.activeProfile] || {};
  const lines = [];

  if (parsed.boardName) {
    lines.push(`Board: ${parsed.boardName}${parsed.manufacturer ? ` (${parsed.manufacturer})` : ''}`);
  }
  if (parsed.version) {
    lines.push(`Firmware: ${parsed.version}`);
  }
  if (parsed.mixerType) {
    lines.push(`Mixer: ${parsed.mixerType}, ${parsed.motors.length} motor(s), ${parsed.servoMix.length} servo mix rule(s)`);
  }
  if (parsed.resources.length > 0) {
    lines.push(`Resources: ${parsed.resources.length} remapped`);
  }
  if (parsed.features.length > 0) {
    lines.push(`Features: ${parsed.features.join(', ')}`);
  }
  if (profile.p_pitch !== undefined) {
    lines.push(`PIDs: P${profile.p_pitch}/I${profile.i_pitch}/D${profile.d_pitch} pitch, P${profile.p_roll}/I${profile.i_roll}/D${profile.d_roll} roll`);
  }
  if (profile.tpa_curve_type) {
    lines.push(`TPA: ${profile.tpa_curve_type}, stall=${profile.tpa_curve_stall_throttle ?? '?'}%`);
  }
  if (parsed.master.spa_roll_mode && parsed.master.spa_roll_mode !== 'OFF') {
    lines.push(`SPA: ${parsed.master.spa_roll_mode}`);
  }
  if (parsed.master.yaw_type === 'DIFF_THRUST' || parsed.motors.some(m => m.yaw !== 0)) {
    lines.push('Differential thrust: enabled');
  }
  if (parsed.serial.length > 0) {
    lines.push(`Serial ports: ${parsed.serial.length} configured`);
  }

  return lines;
}
