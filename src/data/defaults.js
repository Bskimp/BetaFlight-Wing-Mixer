// Wing-recommended defaults (used as initial state)
export const WING_DEFAULTS = {
  s_pitch: 50,
  s_roll: 50,
  s_yaw: 0,
  servo_pwm_rate: 150,
  iterm_relax_cutoff: 5,
  gps_use_3d_speed: 'ON',
  dterm_lpf1_dyn_expo: 8,
};

// TPA defaults for wings
export const TPA_DEFAULTS = {
  tpa_mode: 'PDS',
  tpa_curve_type: 'HYPERBOLIC',
  tpa_speed_type: 'BASIC',
  tpa_speed_max_voltage: 1260,
  tpa_speed_basic_delay: 0,
  tpa_speed_basic_gravity: 50,
  tpa_curve_stall_throttle: 30,
  tpa_curve_pid_thr0: 200,
  tpa_curve_pid_thr100: 70,
  tpa_curve_expo: 20,
};

// SPA defaults for wings
export const SPA_DEFAULTS = {
  spa_roll_mode: 'I_FREEZE',
  spa_pitch_mode: 'I_FREEZE',
  spa_yaw_mode: 'I_FREEZE',
  spa_roll_center: 200,
  spa_roll_width: 70,
  spa_pitch_center: 150,
  spa_pitch_width: 70,
  spa_yaw_center: 150,
  spa_yaw_width: 70,
};

// Wing PID defaults — NOT quad defaults
// Yaw I = 0 for diff thrust to avoid I-term buildup at high airspeed
export const PID_DEFAULTS = {
  roll:  { p: 10, i: 10, d: 10, f: 0 },
  pitch: { p: 10, i: 10, d: 10, f: 0 },
  yaw:   { p: 10, i: 0, d: 10, f: 0 },
};

// Wing rate defaults
export const RATE_DEFAULTS = {
  roll: 500,
  pitch: 250,
  yaw: 150,
};

// BF firmware factory defaults — used for delta-only CLI output.
// Only settings that differ from these will be emitted.
export const BF_DEFAULTS = {
  // PIDs (quad defaults)
  p_roll: 45, i_roll: 80, d_roll: 40, f_roll: 120,
  p_pitch: 47, i_pitch: 84, d_pitch: 46, f_pitch: 125,
  p_yaw: 45, i_yaw: 80, d_yaw: 0, f_yaw: 0,
  // Rates
  roll_rc_rate: 7,
  pitch_rc_rate: 7,
  yaw_rc_rate: 7,
  roll_srate: 0,
  pitch_srate: 0,
  yaw_srate: 0,
  roll_expo: 0,
  pitch_expo: 0,
  // Master context
  servo_pwm_rate: 50,
  gps_use_3d_speed: 'OFF',
  yaw_type: 'CW',
  spa_roll_mode: 'OFF',
  spa_pitch_mode: 'OFF',
  spa_yaw_mode: 'OFF',
  // Profile context
  s_pitch: 0,
  s_roll: 0,
  s_yaw: 0,
  iterm_relax_cutoff: 15,
  anti_gravity_gain: 80,
  d_max_roll: 20,
  d_max_pitch: 22,
  angle_earth_ref: 100,
  dterm_lpf1_dyn_expo: 5,
  // TPA
  tpa_mode: 'D',
  tpa_curve_type: 'NORMAL',
  tpa_speed_type: 'BASIC',
  tpa_speed_max_voltage: 2520,
  tpa_speed_basic_delay: 0,
  tpa_speed_basic_gravity: 50,
  tpa_curve_stall_throttle: 30,
  tpa_curve_pid_thr0: 200,
  tpa_curve_pid_thr100: 70,
  tpa_curve_expo: 20,
  // SPA (profile context)
  spa_roll_center: 0,
  spa_roll_width: 0,
  spa_pitch_center: 0,
  spa_pitch_width: 0,
  spa_yaw_center: 0,
  spa_yaw_width: 0,
};
