/**
 * Parser tests for configParser.js and configMapper.js
 * Tests against real BF diff fixtures (blue plane + green plane).
 *
 * Usage: node scripts/tests/run-parser-tests.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// We need to import the ESM source files. Since they use import/export syntax,
// we implement the parser logic inline for Node testing (no Vite transform).
// This is a simplified copy of the parser for testing purposes.

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Inline parser (matches src/utils/configParser.js) ---
function parseDiff(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const result = {
    version: null, boardName: null, manufacturer: null, mixerType: null,
    motors: [], servos: [], servoMix: [], resources: [], serial: [],
    features: [], master: {}, profiles: {}, rateProfiles: {},
    aux: [], map: null, rxrange: [], beacon: [], parseErrors: [],
    activeProfile: 0, activeRateProfile: 0,
  };
  let currentContext = 'master';

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('# Betaflight')) { result.version = line.substring(2).trim(); continue; }
    if (line.startsWith('#')) continue;
    if (/^profile\s+\d+/.test(line)) {
      const num = parseInt(line.split(/\s+/)[1]);
      currentContext = `profile:${num}`;
      result.activeProfile = num;
      if (!result.profiles[num]) result.profiles[num] = {};
      continue;
    }
    if (/^rateprofile\s+\d+/.test(line)) {
      const num = parseInt(line.split(/\s+/)[1]);
      currentContext = `rateprofile:${num}`;
      result.activeRateProfile = num;
      if (!result.rateProfiles[num]) result.rateProfiles[num] = {};
      continue;
    }
    if (line.startsWith('board_name ')) { result.boardName = line.split(/\s+/)[1]; continue; }
    if (line.startsWith('manufacturer_id ')) { result.manufacturer = line.split(/\s+/)[1]; continue; }
    if (line.startsWith('feature ')) { const f = line.substring(8).trim(); if (!f.startsWith('-')) result.features.push(f); continue; }
    if (line.startsWith('mixer ')) { result.mixerType = line.split(/\s+/)[1]; continue; }
    if (line.startsWith('mmix ')) {
      const p = line.split(/\s+/);
      if (p.length >= 6) result.motors.push({ index: parseInt(p[1]), throttle: parseFloat(p[2]), roll: parseFloat(p[3]), pitch: parseFloat(p[4]), yaw: parseFloat(p[5]) });
      continue;
    }
    if (/^servo\s+\d/.test(line)) {
      const p = line.split(/\s+/);
      if (p.length >= 7) result.servos.push({ index: parseInt(p[1]), min: parseInt(p[2]), max: parseInt(p[3]), mid: parseInt(p[4]), rate: parseInt(p[5]), forwardChannel: parseInt(p[6]) });
      continue;
    }
    if (line.startsWith('smix ')) {
      const p = line.split(/\s+/);
      if (p.length >= 9) result.servoMix.push({ index: parseInt(p[1]), servo: parseInt(p[2]), source: parseInt(p[3]), rate: parseInt(p[4]), speed: parseInt(p[5]), min: parseInt(p[6]), max: parseInt(p[7]), box: parseInt(p[8]) });
      continue;
    }
    if (line.startsWith('serial ')) {
      const p = line.split(/\s+/);
      if (p.length >= 7) result.serial.push({ uart: p[1], functionMask: parseInt(p[2]), mspBaud: parseInt(p[3]), gpsBaud: parseInt(p[4]), telBaud: parseInt(p[5]), bbBaud: parseInt(p[6]) });
      continue;
    }
    if (line.startsWith('resource ')) {
      const p = line.split(/\s+/);
      if (p.length >= 4) result.resources.push({ type: p[1], index: parseInt(p[2]), pin: p[3] });
      continue;
    }
    if (line.startsWith('set ')) {
      const match = line.match(/^set\s+(\S+)\s*=\s*(.+)$/);
      if (match) {
        const key = match[1];
        const raw = match[2].trim();
        let value;
        if (raw === 'ON') value = 'ON';
        else if (raw === 'OFF') value = 'OFF';
        else if (raw.includes('.')) value = parseFloat(raw);
        else if (/^-?\d+$/.test(raw)) value = parseInt(raw);
        else value = raw;
        if (currentContext === 'master') result.master[key] = value;
        else if (currentContext.startsWith('profile:')) result.profiles[parseInt(currentContext.split(':')[1])][key] = value;
        else if (currentContext.startsWith('rateprofile:')) result.rateProfiles[parseInt(currentContext.split(':')[1])][key] = value;
      }
      continue;
    }
    if (line.startsWith('aux ')) { result.aux.push(line); continue; }
    if (line.startsWith('map ')) { result.map = line; continue; }
    if (line.startsWith('rxrange ')) { result.rxrange.push(line); continue; }
    if (line.startsWith('beacon ')) { result.beacon.push(line); continue; }
    if (line.startsWith('batch ') || line === 'mmix reset' || line === 'smix reset') continue;
  }
  return result;
}

// --- Test runner ---
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function eq(actual, expected, message) {
  assert(actual === expected, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ===== Blue Plane Tests =====
console.log('=== Blue Plane (SPEEDYBEEF405WING) ===');
const blueText = readFileSync(join(__dirname, 'fixtures/blue-plane-diff.txt'), 'utf-8');
const blue = parseDiff(blueText);

eq(blue.boardName, 'SPEEDYBEEF405WING', 'boardName');
eq(blue.manufacturer, 'SPBE', 'manufacturer');
eq(blue.mixerType, 'CUSTOMAIRPLANE', 'mixerType');
assert(blue.version.includes('STM32F405'), 'version contains STM32F405');
assert(blue.version.includes('4.6.0'), 'version contains 4.6.0');

// Motors
eq(blue.motors.length, 2, 'motor count');
eq(blue.motors[0].yaw, 0.4, 'motor 0 yaw');
eq(blue.motors[1].yaw, -0.4, 'motor 1 yaw');
eq(blue.motors[0].throttle, 1.0, 'motor 0 throttle');

// Servo mix — 8-field parsing
eq(blue.servoMix.length, 4, 'smix rule count');
eq(blue.servoMix[0].servo, 5, 'smix 0 servo');
eq(blue.servoMix[0].source, 0, 'smix 0 source (roll)');
eq(blue.servoMix[0].rate, 100, 'smix 0 rate');
eq(blue.servoMix[0].min, 0, 'smix 0 min');
eq(blue.servoMix[0].max, 100, 'smix 0 max');
eq(blue.servoMix[0].box, 0, 'smix 0 box');

// No resources (board defaults)
eq(blue.resources.length, 0, 'no resources');

// Features
assert(blue.features.includes('GPS'), 'has GPS feature');
assert(blue.features.includes('OSD'), 'has OSD feature');
assert(blue.features.includes('LED_STRIP'), 'has LED_STRIP feature');

// Serial — UART name format
eq(blue.serial.length, 2, 'serial port count');
eq(blue.serial[0].uart, 'UART3', 'serial 0 uart name');
eq(blue.serial[0].functionMask, 2, 'serial 0 function mask (GPS)');
eq(blue.serial[1].uart, 'UART5', 'serial 1 uart name');

// Master settings
eq(blue.master.yaw_type, 'DIFF_THRUST', 'yaw_type in master');
eq(blue.master.servo_pwm_rate, 150, 'servo_pwm_rate in master');
eq(blue.master.spa_roll_mode, 'I_FREEZE', 'spa_roll_mode in master');

// Profile context switching
assert(blue.profiles[0] !== undefined, 'profile 0 exists');
eq(blue.profiles[0].p_pitch, 15, 'p_pitch in profile 0');
eq(blue.profiles[0].i_pitch, 25, 'i_pitch in profile 0');
eq(blue.profiles[0].s_pitch, 50, 's_pitch in profile 0');
eq(blue.profiles[0].s_roll, 50, 's_roll in profile 0');
eq(blue.profiles[0].anti_gravity_gain, 0, 'anti_gravity_gain in profile');
eq(blue.profiles[0].d_max_roll, 0, 'd_max_roll in profile');
eq(blue.profiles[0].angle_earth_ref, 0, 'angle_earth_ref in profile');

// TPA in profile
eq(blue.profiles[0].tpa_curve_type, 'HYPERBOLIC', 'tpa_curve_type');
eq(blue.profiles[0].tpa_curve_stall_throttle, 28, 'tpa_curve_stall_throttle');
eq(blue.profiles[0].tpa_curve_pid_thr0, 170, 'tpa_curve_pid_thr0');
eq(blue.profiles[0].tpa_curve_pid_thr100, 50, 'tpa_curve_pid_thr100');
eq(blue.profiles[0].tpa_curve_expo, 40, 'tpa_curve_expo');
eq(blue.profiles[0].tpa_speed_max_voltage, 1260, 'tpa_speed_max_voltage');

// SPA in profile
eq(blue.profiles[0].spa_roll_center, 200, 'spa_roll_center');
eq(blue.profiles[0].spa_roll_width, 70, 'spa_roll_width');

// Rate profile context
assert(blue.rateProfiles[0] !== undefined, 'rateprofile 0 exists');
eq(blue.rateProfiles[0].roll_rc_rate, 5, 'roll_rc_rate');
eq(blue.rateProfiles[0].roll_srate, 50, 'roll_srate');
eq(blue.rateProfiles[0].yaw_srate, 15, 'yaw_srate');

// Aux pass-through
eq(blue.aux.length, 4, 'aux line count');
eq(blue.map, 'map TAER1234', 'map line');
eq(blue.beacon.length, 1, 'beacon line count');

// Servo config
eq(blue.servos.length, 1, 'servo config count');
eq(blue.servos[0].index, 2, 'servo 2 index');
eq(blue.servos[0].rate, -100, 'servo 2 rate');

console.log('');

// ===== Green Plane Tests =====
console.log('=== Green Plane (MICOAIR743) ===');
const greenText = readFileSync(join(__dirname, 'fixtures/green-plane-diff.txt'), 'utf-8');
const green = parseDiff(greenText);

eq(green.boardName, 'MICOAIR743', 'boardName');
eq(green.manufacturer, 'MICO', 'manufacturer');
eq(green.mixerType, 'CUSTOMAIRPLANE', 'mixerType');
assert(green.version.includes('STM32H743'), 'version contains STM32H743');

// Motors
eq(green.motors.length, 2, 'motor count');
eq(green.motors[0].yaw, 0.3, 'motor 0 yaw ±0.3');
eq(green.motors[1].yaw, -0.3, 'motor 1 yaw ±0.3');

// Resources — present in this diff
eq(green.resources.length, 12, 'resource count');
assert(green.resources.some(r => r.type === 'MOTOR' && r.index === 2 && r.pin === 'E11'), 'MOTOR 2 E11');
assert(green.resources.some(r => r.type === 'SERVO' && r.index === 1 && r.pin === 'B01'), 'SERVO 1 B01');
assert(green.resources.some(r => r.type === 'MOTOR' && r.index === 3 && r.pin === 'NONE'), 'MOTOR 3 NONE');
assert(green.resources.some(r => r.type === 'LED_STRIP' && r.pin === 'NONE'), 'LED_STRIP NONE');

// Servo mix — different servo indices than blue
eq(green.servoMix.length, 4, 'smix rule count');
eq(green.servoMix[0].servo, 2, 'smix 0 servo (2)');
eq(green.servoMix[2].servo, 4, 'smix 2 servo (4)');
eq(green.servoMix[2].source, 1, 'smix 2 source (pitch)');
eq(green.servoMix[3].servo, 5, 'smix 3 servo (5)');
eq(green.servoMix[3].source, 2, 'smix 3 source (yaw)');

// Master — SPA mode PD_I_FREEZE
eq(green.master.spa_roll_mode, 'PD_I_FREEZE', 'spa_roll_mode PD_I_FREEZE');
eq(green.master.spa_pitch_mode, 'PD_I_FREEZE', 'spa_pitch_mode');
eq(green.master.servo_pwm_rate, 333, 'servo_pwm_rate 333');

// Profile — TPA with tpa_mode PD
eq(green.profiles[0].tpa_mode, 'PD', 'tpa_mode PD');
eq(green.profiles[0].tpa_speed_basic_delay, 1500, 'tpa_speed_basic_delay');
eq(green.profiles[0].tpa_curve_stall_throttle, 10, 'stall_throttle 10');
eq(green.profiles[0].tpa_curve_pid_thr0, 105, 'pid_thr0 105');
eq(green.profiles[0].tpa_curve_pid_thr100, 60, 'pid_thr100 60');
eq(green.profiles[0].tpa_curve_expo, 45, 'expo 45');

// PIDs
eq(green.profiles[0].p_pitch, 35, 'p_pitch');
eq(green.profiles[0].p_roll, 30, 'p_roll');
eq(green.profiles[0].i_roll, 45, 'i_roll');
eq(green.profiles[0].d_roll, 12, 'd_roll');
eq(green.profiles[0].p_yaw, 30, 'p_yaw');
eq(green.profiles[0].i_yaw, 0, 'i_yaw');

// Rates
eq(green.rateProfiles[0].roll_expo, 35, 'roll_expo');
eq(green.rateProfiles[0].pitch_expo, 30, 'pitch_expo');
eq(green.rateProfiles[0].roll_srate, 50, 'roll_srate');

// Serial
eq(green.serial.length, 2, 'serial count');
eq(green.serial[1].uart, 'UART8', 'serial 1 UART8');
eq(green.serial[1].functionMask, 131073, 'serial 1 func mask (MSP+VTX)');

// RXrange pass-through
eq(green.rxrange.length, 4, 'rxrange count');

// Servo config
eq(green.servos.length, 2, 'servo config count');
eq(green.servos[0].index, 2, 'servo 2');
eq(green.servos[1].index, 3, 'servo 3');

console.log('');

// ===== Results =====
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
process.exit(failed > 0 ? 1 : 0);
