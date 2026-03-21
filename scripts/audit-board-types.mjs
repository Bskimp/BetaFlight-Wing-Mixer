/**
 * Audit boardType classification in targets.json against BF config source files.
 *
 * Cross-references our targets.json boardType ("fc", "aio", "wing", "unknown")
 * against the betaflight/config repo's config.h files to identify misclassifications.
 *
 * Key signals for AIO detection:
 * - USE_ONBOARD_ESC define (definitive)
 * - Board name contains "AIO"
 * - Motor pin count vs timer pin count patterns
 * - Feature flags like USE_ESC_SENSOR (common on AIOs)
 *
 * Usage: node scripts/audit-board-types.mjs <path-to-config-repo>
 * Example: node scripts/audit-board-types.mjs ../../config-master
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load our targets.json
const targetsPath = join(__dirname, '..', 'src', 'data', 'targets.json');
const ourTargets = JSON.parse(readFileSync(targetsPath, 'utf-8'));

const configRepoPath = process.argv[2];
if (!configRepoPath) {
  console.error('Usage: node scripts/audit-board-types.mjs <path-to-config-repo>');
  console.error('Example: node scripts/audit-board-types.mjs ../../config-master');
  process.exit(1);
}

// --- Parse config.h files ---

function parseConfigForAudit(content) {
  const defines = new Set();
  const defineMap = {};
  const joined = content.replace(/\\\r?\n/g, ' ');
  const defineRegex = /^#define\s+(\w+)(?:\s+(.+?))?$/gm;
  let m;
  while ((m = defineRegex.exec(joined)) !== null) {
    defines.add(m[1]);
    if (m[2]) defineMap[m[1]] = m[2].trim();
  }

  const boardName = defineMap['BOARD_NAME'] || 'UNKNOWN';
  const manufacturer = defineMap['MANUFACTURER_ID'] || '';

  // MCU
  const mcuRaw = defineMap['FC_TARGET_MCU'] || '';

  // Motor pins
  const motorPins = [];
  for (let i = 1; i <= 12; i++) {
    const key = `MOTOR${i}_PIN`;
    if (defineMap[key]) motorPins.push(defineMap[key]);
  }

  // Servo pins
  const servoPins = [];
  for (let i = 1; i <= 8; i++) {
    const key = `SERVO${i}_PIN`;
    if (defineMap[key]) servoPins.push(defineMap[key]);
  }

  // Key features for AIO detection
  const hasOnboardEsc = defines.has('USE_ONBOARD_ESC');
  const hasEscSensor = defines.has('USE_ESC_SENSOR');
  const hasServos = defines.has('USE_SERVOS');
  const hasWing = defines.has('USE_WING');
  const hasGyro = defines.has('USE_GYRO');
  const hasAcc = defines.has('USE_ACC');

  // Timer pin mapping for counting total timer outputs
  const timerPinCount = (defineMap['TIMER_PIN_MAPPING'] || '').split('TIMER_PIN_MAP').length - 1;

  // ESC-related set commands
  const escProtocol = content.match(/^set\s+motor_pwm_protocol\s*=\s*(\S+)/m)?.[1];

  // Name-based heuristics
  const nameHasAio = /AIO/i.test(boardName);
  const nameHasWing = /WING/i.test(boardName);
  const nameHasTwing = /TWING/i.test(boardName);

  return {
    boardName, manufacturer, mcuRaw,
    motorCount: motorPins.length,
    servoCount: servoPins.length,
    timerPinCount,
    hasOnboardEsc, hasEscSensor, hasServos, hasWing, hasGyro, hasAcc,
    escProtocol,
    nameHasAio, nameHasWing, nameHasTwing,
    motorPins, servoPins,
  };
}

// --- Scan config repo ---

const configsDir = join(configRepoPath, 'configs');
const configData = {};
let parsed = 0;
let skipped = 0;

for (const dir of readdirSync(configsDir)) {
  const configPath = join(configsDir, dir, 'config.h');
  try {
    if (!statSync(configPath).isFile()) continue;
  } catch {
    continue;
  }

  const content = readFileSync(configPath, 'utf-8');
  const data = parseConfigForAudit(content);
  configData[data.boardName] = data;
  parsed++;
}

console.log(`\nParsed ${parsed} config.h files from ${configRepoPath}`);
console.log(`Our targets.json has ${Object.keys(ourTargets).length} boards\n`);

// --- Cross-reference ---

const report = {
  matched: 0,
  notInConfig: [],
  notInTargets: [],
  aioSignals: [],       // Boards with AIO indicators in config.h
  mismatches: [],        // boardType disagrees with config.h signals
  confirmed: [],         // boardType agrees with config.h signals
  ambiguous: [],         // Can't determine from config.h alone
};

// Classify each board from config.h
function classifyFromConfig(cfg) {
  // Definitive: USE_ONBOARD_ESC
  if (cfg.hasOnboardEsc) return 'aio';

  // Wing boards
  if (cfg.hasWing || (cfg.nameHasWing && !cfg.nameHasTwing)) return 'wing';

  // Name-based AIO
  if (cfg.nameHasAio) return 'likely_aio';

  // Heuristic: 4 motor pins, no servos, ESC sensor = likely AIO
  if (cfg.motorCount === 4 && cfg.servoCount === 0 && cfg.hasEscSensor) return 'likely_aio';

  // Heuristic: 4 motor pins with few timer pins = likely AIO (tight MCU, built-in ESCs)
  if (cfg.motorCount === 4 && cfg.timerPinCount <= 5) return 'likely_aio';

  // Boards with many timer pins and many motors = standalone FC
  if (cfg.motorCount >= 6 && cfg.timerPinCount >= 8) return 'likely_fc';

  // Boards with servos defined = FC or wing
  if (cfg.servoCount > 0) return cfg.hasWing ? 'wing' : 'likely_fc';

  // Default: can't determine
  return 'ambiguous';
}

// Audit each board in our targets.json
for (const [name, target] of Object.entries(ourTargets)) {
  const cfg = configData[name];
  if (!cfg) {
    report.notInConfig.push(name);
    continue;
  }

  report.matched++;
  const configClass = classifyFromConfig(cfg);
  const ourType = target.boardType;

  const entry = {
    board: name,
    ourType,
    configClass,
    motors: cfg.motorCount,
    servos: cfg.servoCount,
    timers: cfg.timerPinCount,
    hasOnboardEsc: cfg.hasOnboardEsc,
    hasEscSensor: cfg.hasEscSensor,
    nameHasAio: cfg.nameHasAio,
    hasWing: cfg.hasWing,
  };

  if (configClass === 'ambiguous') {
    report.ambiguous.push(entry);
    continue;
  }

  // Check for mismatches
  const configIsAio = configClass === 'aio' || configClass === 'likely_aio';
  const configIsFc = configClass === 'likely_fc';
  const configIsWing = configClass === 'wing';

  const ourIsAio = ourType === 'aio';
  const ourIsFc = ourType === 'fc';
  const ourIsWing = ourType === 'wing';

  let match = false;
  if (configIsAio && ourIsAio) match = true;
  if (configIsFc && ourIsFc) match = true;
  if (configIsWing && ourIsWing) match = true;

  if (match) {
    report.confirmed.push(entry);
  } else {
    report.mismatches.push(entry);
  }
}

// Boards in config repo but not in our targets
for (const name of Object.keys(configData)) {
  if (!ourTargets[name]) {
    report.notInTargets.push(name);
  }
}

// --- Print report ---

console.log('='.repeat(80));
console.log('BOARD TYPE AUDIT REPORT');
console.log('='.repeat(80));

console.log(`\n## Coverage`);
console.log(`  Matched:          ${report.matched} / ${Object.keys(ourTargets).length} boards in targets.json`);
console.log(`  Not in config:    ${report.notInConfig.length} (in targets.json but missing from config repo)`);
console.log(`  Not in targets:   ${report.notInTargets.length} (in config repo but not in targets.json)`);
console.log(`  Confirmed:        ${report.confirmed.length}`);
console.log(`  Mismatches:       ${report.mismatches.length}`);
console.log(`  Ambiguous:        ${report.ambiguous.length}`);

if (report.mismatches.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('MISMATCHES — boardType disagrees with config.h signals');
  console.log('='.repeat(80));

  // Group by type of mismatch
  const markedFcButLikelyAio = report.mismatches.filter(e => e.ourType === 'fc' && (e.configClass === 'aio' || e.configClass === 'likely_aio'));
  const markedAioButLikelyFc = report.mismatches.filter(e => e.ourType === 'aio' && e.configClass === 'likely_fc');
  const markedAioButAmbiguous = report.mismatches.filter(e => e.ourType === 'aio' && e.configClass === 'ambiguous');
  const wingMismatches = report.mismatches.filter(e => e.configClass === 'wing' && e.ourType !== 'wing');
  const other = report.mismatches.filter(e =>
    !markedFcButLikelyAio.includes(e) &&
    !markedAioButLikelyFc.includes(e) &&
    !markedAioButAmbiguous.includes(e) &&
    !wingMismatches.includes(e)
  );

  if (markedFcButLikelyAio.length > 0) {
    console.log(`\n### Marked as FC but config.h suggests AIO (${markedFcButLikelyAio.length})`);
    console.log('These boards might have built-in ESCs that we\'re not flagging:');
    for (const e of markedFcButLikelyAio) {
      console.log(`  ${e.board.padEnd(35)} motors=${e.motors} servos=${e.servos} timers=${e.timers} onboardESC=${e.hasOnboardEsc} escSensor=${e.hasEscSensor} nameAIO=${e.nameHasAio} configClass=${e.configClass}`);
    }
  }

  if (markedAioButLikelyFc.length > 0) {
    console.log(`\n### Marked as AIO but config.h suggests FC (${markedAioButLikelyFc.length})`);
    console.log('These boards might be standalone FCs incorrectly marked as AIO:');
    for (const e of markedAioButLikelyFc) {
      console.log(`  ${e.board.padEnd(35)} motors=${e.motors} servos=${e.servos} timers=${e.timers} onboardESC=${e.hasOnboardEsc} escSensor=${e.hasEscSensor} nameAIO=${e.nameHasAio} configClass=${e.configClass}`);
    }
  }

  if (wingMismatches.length > 0) {
    console.log(`\n### Config says wing but we don't have it as wing (${wingMismatches.length})`);
    for (const e of wingMismatches) {
      console.log(`  ${e.board.padEnd(35)} ourType=${e.ourType} motors=${e.motors} servos=${e.servos} hasWing=${e.hasWing}`);
    }
  }

  if (other.length > 0) {
    console.log(`\n### Other mismatches (${other.length})`);
    for (const e of other) {
      console.log(`  ${e.board.padEnd(35)} ourType=${e.ourType} configClass=${e.configClass} motors=${e.motors} servos=${e.servos} timers=${e.timers}`);
    }
  }
}

if (report.ambiguous.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`AMBIGUOUS — Can't determine from config.h alone (${report.ambiguous.length})`);
  console.log('='.repeat(80));

  // Split into groups by our current type
  const ambByType = {};
  for (const e of report.ambiguous) {
    if (!ambByType[e.ourType]) ambByType[e.ourType] = [];
    ambByType[e.ourType].push(e);
  }

  for (const [type, entries] of Object.entries(ambByType)) {
    console.log(`\n### Currently marked as "${type}" (${entries.length})`);
    for (const e of entries) {
      console.log(`  ${e.board.padEnd(35)} motors=${e.motors} servos=${e.servos} timers=${e.timers} escSensor=${e.hasEscSensor} nameAIO=${e.nameHasAio}`);
    }
  }
}

// Definitive AIO detections (USE_ONBOARD_ESC)
const definitiveAios = Object.values(configData).filter(c => c.hasOnboardEsc);
if (definitiveAios.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`DEFINITIVE AIOs — Boards with USE_ONBOARD_ESC (${definitiveAios.length})`);
  console.log('='.repeat(80));
  for (const c of definitiveAios) {
    const inOurs = ourTargets[c.boardName];
    const ourType = inOurs ? inOurs.boardType : 'NOT IN TARGETS';
    const status = ourType === 'aio' ? 'OK' : `MISMATCH (we have: ${ourType})`;
    console.log(`  ${c.boardName.padEnd(35)} ${status}`);
  }
}

// Summary of boards with ESC sensor (strong AIO indicator)
const escSensorBoards = Object.values(configData).filter(c => c.hasEscSensor && !c.hasOnboardEsc);
if (escSensorBoards.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ESC SENSOR BOARDS (no USE_ONBOARD_ESC but has USE_ESC_SENSOR) — ${escSensorBoards.length}`);
  console.log('Strong AIO indicator but not definitive (some standalone FCs support ESC telemetry)');
  console.log('='.repeat(80));
  for (const c of escSensorBoards) {
    const inOurs = ourTargets[c.boardName];
    const ourType = inOurs ? inOurs.boardType : 'NOT IN TARGETS';
    console.log(`  ${c.boardName.padEnd(35)} ourType=${ourType.padEnd(8)} motors=${c.motorCount} timers=${c.timerPinCount}`);
  }
}

// Not in config repo
if (report.notInConfig.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`NOT IN CONFIG REPO — ${report.notInConfig.length} boards`);
  console.log('These are in our targets.json but have no matching config.h');
  console.log('='.repeat(80));
  for (const name of report.notInConfig.sort()) {
    const t = ourTargets[name];
    console.log(`  ${name.padEnd(35)} boardType=${t.boardType}`);
  }
}

// Save full report as JSON for further analysis
const reportPath = join(__dirname, 'audit-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nFull report saved to ${reportPath}`);
