/**
 * Parse Betaflight target config files.
 * Supports two formats:
 * 1. config.h (#define style) — used by test fixtures and older repos
 * 2. unified-targets .config (resource/timer command style) — betaflight/unified-targets repo
 *
 * Usage: node scripts/parse-targets.mjs <path-to-unified-targets-repo>
 * Output: scripts/targets-raw.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizePin(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().match(/^P?([A-Ia-i])(\d{1,2})$/i);
  if (!m) return null;
  const port = m[1].toUpperCase();
  const num = m[2].padStart(2, '0');
  return `P${port}${num}`;
}

function normalizeMcu(raw) {
  if (!raw) return null;
  if (/^STM32F4/i.test(raw)) return 'STM32F4';
  if (/^STM32F7/i.test(raw)) return 'STM32F7';
  if (/^STM32H7/i.test(raw)) return 'STM32H7';
  return null;
}

/**
 * Parse a config.h file (test fixtures, #define style).
 * Returns null if the target should be skipped (non-STM32 F4/F7/H7).
 */
export function parseConfigH(content) {
  const defineMap = {};
  const joined = content.replace(/\\\r?\n/g, ' ');
  const defineRegex = /^#define\s+(\w+)\s+(.+?)$/gm;
  let m;
  while ((m = defineRegex.exec(joined)) !== null) {
    defineMap[m[1]] = m[2].trim();
  }

  const mcuRaw = defineMap['FC_TARGET_MCU'];
  const mcu = normalizeMcu(mcuRaw);
  if (!mcu) return null;

  const boardName = defineMap['BOARD_NAME'] || 'UNKNOWN';
  const manufacturer = defineMap['MANUFACTURER_ID'] || '';

  function resolveDefine(expr) {
    if (!expr) return expr;
    if (defineMap[expr] !== undefined && expr !== defineMap[expr]) {
      return defineMap[expr];
    }
    return expr;
  }

  const motors = [];
  for (let i = 1; i <= 8; i++) {
    const key = `MOTOR${i}_PIN`;
    if (defineMap[key]) {
      const pin = normalizePin(resolveDefine(defineMap[key]));
      if (pin) motors.push({ index: i, pin });
    }
  }

  const servos = [];
  for (let i = 1; i <= 8; i++) {
    const key = `SERVO${i}_PIN`;
    if (defineMap[key]) {
      const pin = normalizePin(resolveDefine(defineMap[key]));
      if (pin) servos.push({ index: i, pin });
    }
  }

  const uarts = [];
  for (let i = 1; i <= 10; i++) {
    const txKey = `UART${i}_TX_PIN`;
    const rxKey = `UART${i}_RX_PIN`;
    const hasTx = defineMap[txKey] !== undefined;
    const hasRx = defineMap[rxKey] !== undefined;
    if (hasTx || hasRx) {
      const tx = hasTx ? normalizePin(resolveDefine(defineMap[txKey])) : null;
      const rx = hasRx ? normalizePin(resolveDefine(defineMap[rxKey])) : null;
      uarts.push({ index: i, tx, rx });
    }
  }

  const timerMap = [];
  const timerPinMapping = defineMap['TIMER_PIN_MAPPING'];
  if (timerPinMapping) {
    const tpmRegex = /TIMER_PIN_MAP\(\s*(\d+)\s*,\s*(\w+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
    let tm;
    while ((tm = tpmRegex.exec(timerPinMapping)) !== null) {
      const index = parseInt(tm[1], 10);
      const pinExpr = tm[2];
      const af = parseInt(tm[3], 10);
      const dmaOpt = parseInt(tm[4], 10);
      const resolved = resolveDefine(pinExpr);
      const pin = normalizePin(resolved);
      if (pin) timerMap.push({ index, pin, af, dmaOpt });
    }
  }

  const ledStrip = defineMap['LED_STRIP_PIN'] ? normalizePin(resolveDefine(defineMap['LED_STRIP_PIN'])) : null;

  const features = [];
  for (const key of Object.keys(defineMap)) {
    if (key === 'USE_GYRO' || key === 'USE_ACC' || key === 'USE_BARO' ||
        key === 'USE_FLASH' || key === 'USE_MAX7456' || key === 'USE_SDCARD' ||
        key === 'USE_GPS' || key === 'USE_SERVOS' || key === 'USE_WING') {
      features.push(key);
    }
  }

  const gyroAlign = defineMap['GYRO_1_ALIGN'] || null;

  return {
    boardName, mcu, mcuRaw: mcuRaw || '', manufacturer,
    motors, servos, uarts, timerMap, ledStrip, features, gyroAlign,
  };
}

/**
 * Parse a unified-targets .config file.
 * Format: resource/timer/dma commands + #define for features.
 * Returns null if the target should be skipped.
 */
export function parseUnifiedConfig(content, filename) {
  // MCU from first comment line: "# Betaflight / STM32F405 (S405) 4.3.0 ..."
  const mcuMatch = content.match(/^#\s*Betaflight\s*\/\s*(\w+)/m);
  const mcuRaw = mcuMatch ? mcuMatch[1] : null;
  const mcu = normalizeMcu(mcuRaw);
  if (!mcu) return null;

  // board_name and manufacturer_id
  const boardMatch = content.match(/^board_name\s+(\S+)/m);
  const mfgMatch = content.match(/^manufacturer_id\s+(\S+)/m);
  const boardName = boardMatch ? boardMatch[1] : 'UNKNOWN';
  const manufacturer = mfgMatch ? mfgMatch[1] : '';

  // Resources: "resource MOTOR 1 B00"
  const motors = [];
  const servos = [];
  const uartTx = {};
  const uartRx = {};
  let ledStrip = null;

  const resourceRegex = /^resource\s+(\w+)\s+(\d+)\s+(\w+)/gm;
  let rm;
  while ((rm = resourceRegex.exec(content)) !== null) {
    const type = rm[1].toUpperCase();
    const index = parseInt(rm[2], 10);
    const pin = normalizePin(rm[3]);
    if (!pin) continue;

    if (type === 'MOTOR') motors.push({ index, pin });
    else if (type === 'SERVO') servos.push({ index, pin });
    else if (type === 'SERIAL_TX') uartTx[index] = pin;
    else if (type === 'SERIAL_RX') uartRx[index] = pin;
    else if (type === 'LED_STRIP') ledStrip = pin;
  }

  // Build UART list
  const uartIndices = new Set([...Object.keys(uartTx), ...Object.keys(uartRx)].map(Number));
  const uarts = [...uartIndices].sort((a, b) => a - b).map(i => ({
    index: i,
    tx: uartTx[i] || null,
    rx: uartRx[i] || null,
  }));

  // Timer entries: "timer B00 AF2"
  const timerMap = [];
  const timerRegex = /^timer\s+(\w+)\s+AF(\d+)/gm;
  let idx = 0;
  let tm;
  while ((tm = timerRegex.exec(content)) !== null) {
    const pin = normalizePin(tm[1]);
    const af = parseInt(tm[2], 10);
    if (pin) {
      timerMap.push({ index: idx++, pin, af, dmaOpt: 0 });
    }
  }

  // DMA opt overrides: "dma pin B00 0"
  const dmaRegex = /^dma\s+pin\s+(\w+)\s+(\d+)/gm;
  let dm;
  while ((dm = dmaRegex.exec(content)) !== null) {
    const pin = normalizePin(dm[1]);
    const opt = parseInt(dm[2], 10);
    if (pin) {
      const entry = timerMap.find(t => t.pin === pin);
      if (entry) entry.dmaOpt = opt;
    }
  }

  // Features from #define lines
  const features = [];
  const featureRegex = /^#define\s+(USE_\w+)/gm;
  let fm;
  while ((fm = featureRegex.exec(content)) !== null) {
    const key = fm[1];
    if (key === 'USE_GYRO' || key === 'USE_ACC' || key === 'USE_BARO' ||
        key === 'USE_FLASH' || key === 'USE_MAX7456' || key === 'USE_SDCARD' ||
        key === 'USE_GPS' || key === 'USE_SERVOS' || key === 'USE_WING') {
      features.push(key);
    }
  }

  // Gyro alignment: "set gyro_1_align = CW90_DEG"
  const gyroMatch = content.match(/^set\s+gyro_1_align\s*=\s*(\S+)/m);
  const gyroAlign = gyroMatch ? gyroMatch[1] : null;

  return {
    boardName, mcu, mcuRaw: mcuRaw || '', manufacturer,
    motors, servos, uarts, timerMap, ledStrip, features, gyroAlign,
  };
}

/**
 * Parse all unified-targets .config files from a repo directory.
 */
export function parseAllTargets(configRepoPath) {
  // Try unified-targets format: configs/default/*.config
  const defaultDir = join(configRepoPath, 'configs', 'default');
  const results = {};
  let skipped = 0;

  let files;
  try {
    files = readdirSync(defaultDir).filter(f => f.endsWith('.config'));
  } catch {
    // Fallback: try configs/*/config.h (old format)
    return parseAllTargetsConfigH(configRepoPath);
  }

  for (const file of files) {
    const filePath = join(defaultDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const target = parseUnifiedConfig(content, file);
    if (!target) {
      skipped++;
      continue;
    }
    results[target.boardName] = target;
  }

  return { targets: results, skipped };
}

// Fallback: parse configs subdirectory config.h format.
function parseAllTargetsConfigH(configRepoPath) {
  const configsDir = join(configRepoPath, 'configs');
  const results = {};
  let skipped = 0;

  let dirs;
  try {
    dirs = readdirSync(configsDir);
  } catch {
    console.error(`Could not read ${configsDir}`);
    return { targets: results, skipped };
  }

  for (const dir of dirs) {
    const configPath = join(configsDir, dir, 'config.h');
    try {
      if (!statSync(configPath).isFile()) continue;
    } catch {
      continue;
    }

    const content = readFileSync(configPath, 'utf-8');
    const target = parseConfigH(content);
    if (!target) {
      skipped++;
      continue;
    }
    results[target.boardName] = target;
  }

  return { targets: results, skipped };
}

// CLI entry point
const scriptPath = process.argv[1] ? fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`)).replace(/\\/g, '/') : '';
const thisPath = fileURLToPath(import.meta.url).replace(/\\/g, '/');
if (scriptPath === thisPath) {
  const configRepoPath = process.argv[2];
  if (!configRepoPath) {
    console.error('Usage: node scripts/parse-targets.mjs <path-to-unified-targets-repo>');
    process.exit(1);
  }

  const { targets, skipped } = parseAllTargets(configRepoPath);
  const outPath = join(__dirname, 'targets-raw.json');
  writeFileSync(outPath, JSON.stringify(targets, null, 2));
  console.log(`Parsed ${Object.keys(targets).length} targets (${skipped} skipped non-STM32) → ${outPath}`);
}
