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

/**
 * Parse SERIAL_PORT_USARTx / SERIAL_PORT_UARTx / numeric string → UART index.
 */
function parseSerialPort(val) {
  if (!val) return null;
  const m = val.match(/SERIAL_PORT_U(?:S?ART)(\d+)/i);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

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
    const tpmRegex = /TIMER_PIN_MAP\(\s*(\d+)\s*,\s*(\w+)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*\)/g;
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

  const FEATURE_WHITELIST = new Set([
    'USE_GYRO', 'USE_ACC', 'USE_BARO',
    'USE_FLASH', 'USE_MAX7456', 'USE_SDCARD',
    'USE_GPS', 'USE_SERVOS', 'USE_WING',
    'USE_RX_SPI', 'USE_RX_EXPRESSLRS', 'USE_RX_CC2500',
    'USE_RX_FRSKY_SPI', 'USE_RX_FLYSKY',
  ]);
  const features = [];
  // Check defineMap (defines with values) and also scan for bare #define flags
  const bareDefineRegex = /^#define\s+(\w+)\s*$/gm;
  const allDefines = new Set(Object.keys(defineMap));
  let bd;
  while ((bd = bareDefineRegex.exec(joined)) !== null) {
    allDefines.add(bd[1]);
  }
  for (const key of allDefines) {
    if (FEATURE_WHITELIST.has(key)) {
      features.push(key);
    }
  }

  const gyroAlign = defineMap['GYRO_1_ALIGN'] || null;

  // Peripheral pins — for pin accessibility classification
  const peripheralPins = extractPeripheralPinsFromDefines(defineMap, resolveDefine);

  // UART default functions — value may be a number or SERIAL_PORT_USARTx/SERIAL_PORT_UARTx
  const serialrxUart = parseSerialPort(defineMap['SERIALRX_UART']);
  const mspUart = parseSerialPort(defineMap['MSP_UART']);

  // On-board RX detection
  const hasRxSpi = features.some(f => f.startsWith('USE_RX_'));
  const rxSpiProtocol = defineMap['RX_SPI_DEFAULT_PROTOCOL'] || null;

  return {
    boardName, mcu, mcuRaw: mcuRaw || '', manufacturer,
    motors, servos, uarts, timerMap, ledStrip, features, gyroAlign,
    peripheralPins, serialrxUart, mspUart, hasRxSpi, rxSpiProtocol,
  };
}

/**
 * Extract peripheral pin assignments from config.h defines.
 * Used for pin accessibility classification (which pins are on-board vs user pads).
 */
function extractPeripheralPinsFromDefines(defineMap, resolveDefine) {
  const pp = { spi: [], gyroCs: [], osdCs: null, sdCs: null, flashCs: null, i2c: [], adcVbat: null, adcCurr: null, adcRssi: null, beeper: null, pinio: [], statusLeds: [] };

  // SPI bus pins
  for (let i = 1; i <= 4; i++) {
    for (const suffix of ['SCK', 'SDI', 'SDO', 'MISO', 'MOSI']) {
      const key = `SPI${i}_${suffix}_PIN`;
      if (defineMap[key]) {
        const pin = normalizePin(resolveDefine(defineMap[key]));
        if (pin && !pp.spi.includes(pin)) pp.spi.push(pin);
      }
    }
  }

  // Gyro chip selects
  for (let i = 1; i <= 2; i++) {
    const key = `GYRO_${i}_CS_PIN`;
    if (defineMap[key]) {
      const pin = normalizePin(resolveDefine(defineMap[key]));
      if (pin && !pp.gyroCs.includes(pin)) pp.gyroCs.push(pin);
    }
  }

  // OSD / SD / Flash chip selects
  if (defineMap['MAX7456_SPI_CS_PIN']) pp.osdCs = normalizePin(resolveDefine(defineMap['MAX7456_SPI_CS_PIN']));
  if (defineMap['SDCARD_SPI_CS_PIN']) pp.sdCs = normalizePin(resolveDefine(defineMap['SDCARD_SPI_CS_PIN']));
  if (defineMap['FLASH_CS_PIN']) pp.flashCs = normalizePin(resolveDefine(defineMap['FLASH_CS_PIN']));

  // I2C bus pins
  for (let i = 1; i <= 3; i++) {
    for (const suffix of ['SCL', 'SDA']) {
      const key = `I2C${i}_${suffix}_PIN`;
      if (defineMap[key]) {
        const pin = normalizePin(resolveDefine(defineMap[key]));
        if (pin && !pp.i2c.includes(pin)) pp.i2c.push(pin);
      }
    }
  }

  // ADC pins
  if (defineMap['ADC_VBAT_PIN']) pp.adcVbat = normalizePin(resolveDefine(defineMap['ADC_VBAT_PIN']));
  if (defineMap['ADC_CURR_PIN']) pp.adcCurr = normalizePin(resolveDefine(defineMap['ADC_CURR_PIN']));
  if (defineMap['ADC_RSSI_PIN']) pp.adcRssi = normalizePin(resolveDefine(defineMap['ADC_RSSI_PIN']));

  // Beeper
  if (defineMap['BEEPER_PIN']) pp.beeper = normalizePin(resolveDefine(defineMap['BEEPER_PIN']));

  // PINIO (user-controllable outputs like VTX power)
  for (let i = 1; i <= 4; i++) {
    const key = `PINIO${i}_PIN`;
    if (defineMap[key]) {
      const pin = normalizePin(resolveDefine(defineMap[key]));
      if (pin) pp.pinio.push(pin);
    }
  }

  // Onboard status LEDs (not LED strip)
  for (let i = 0; i <= 3; i++) {
    const key = `LED${i}_PIN`;
    if (defineMap[key]) {
      const pin = normalizePin(resolveDefine(defineMap[key]));
      if (pin) pp.statusLeds.push(pin);
    }
  }

  return pp;
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
  const spiPins = [];
  const gyroCsPins = [];
  let osdCs = null, sdCs = null, flashCs = null;
  const i2cPins = [];
  let adcVbat = null, adcCurr = null, adcRssi = null;
  let beeperPin = null;
  const pinioPins = [];
  const statusLeds = [];

  // Two-word resource types: "resource SPI_SCK 1 A05" or "resource GYRO_CS 1 A04"
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
    else if (type === 'SPI_SCK' || type === 'SPI_SDI' || type === 'SPI_SDO' || type === 'SPI_MISO' || type === 'SPI_MOSI') {
      if (!spiPins.includes(pin)) spiPins.push(pin);
    }
    else if (type === 'GYRO_CS') { if (!gyroCsPins.includes(pin)) gyroCsPins.push(pin); }
    else if (type === 'OSD_CS') osdCs = pin;
    else if (type === 'FLASH_CS') flashCs = pin;
    else if (type === 'SDCARD_CS') sdCs = pin;
    else if (type === 'I2C_SCL' || type === 'I2C_SDA') { if (!i2cPins.includes(pin)) i2cPins.push(pin); }
    else if (type === 'ADC_BATT') adcVbat = pin;
    else if (type === 'ADC_CURR') adcCurr = pin;
    else if (type === 'ADC_RSSI') adcRssi = pin;
    else if (type === 'BEEPER') beeperPin = pin;
    else if (type === 'PINIO') pinioPins.push(pin);
    else if (type === 'LED') statusLeds.push(pin);
  }

  // Build UART list
  const uartIndices = new Set([...Object.keys(uartTx), ...Object.keys(uartRx)].map(Number));
  const uarts = [...uartIndices].sort((a, b) => a - b).map(i => ({
    index: i,
    tx: uartTx[i] || null,
    rx: uartRx[i] || null,
  }));

  // Timer comment lines: "# pin B06: TIM4 CH1 (AF2)" — gives exact timer resolution
  const timerComments = {};
  const timerCommentRegex = /^#\s*pin\s+(\w+):\s+(\w+)\s+CH(\d+)\s+\(AF(\d+)\)/gm;
  let tc;
  while ((tc = timerCommentRegex.exec(content)) !== null) {
    const pin = normalizePin(tc[1]);
    if (pin) {
      timerComments[pin] = {
        timer: tc[2],              // e.g. "TIM4"
        channel: parseInt(tc[3]),  // e.g. 1
      };
    }
  }

  // Timer entries: "timer B00 AF2"
  const timerMap = [];
  const timerRegex = /^timer\s+(\w+)\s+AF(\d+)/gm;
  let idx = 0;
  let tm;
  while ((tm = timerRegex.exec(content)) !== null) {
    const pin = normalizePin(tm[1]);
    const af = parseInt(tm[2], 10);
    if (pin) {
      const entry = { index: idx++, pin, af, dmaOpt: 0 };
      // Attach exact timer/channel from comment if available
      if (timerComments[pin]) {
        entry.resolvedTimer = timerComments[pin].timer;
        entry.resolvedChannel = timerComments[pin].channel;
      }
      timerMap.push(entry);
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
  const FEATURE_WHITELIST = new Set([
    'USE_GYRO', 'USE_ACC', 'USE_BARO',
    'USE_FLASH', 'USE_MAX7456', 'USE_SDCARD',
    'USE_GPS', 'USE_SERVOS', 'USE_WING',
    'USE_RX_SPI', 'USE_RX_EXPRESSLRS', 'USE_RX_CC2500',
    'USE_RX_FRSKY_SPI', 'USE_RX_FLYSKY',
  ]);
  const features = [];
  const featureRegex = /^#define\s+(USE_\w+)/gm;
  let fm;
  while ((fm = featureRegex.exec(content)) !== null) {
    if (FEATURE_WHITELIST.has(fm[1])) {
      features.push(fm[1]);
    }
  }

  // Gyro alignment: "set gyro_1_align = CW90_DEG"
  const gyroMatch = content.match(/^set\s+gyro_1_align\s*=\s*(\S+)/m);
  const gyroAlign = gyroMatch ? gyroMatch[1] : null;

  // UART default functions: "set serialrx_uart = 4"
  const serialrxMatch = content.match(/^set\s+serialrx_uart\s*=\s*(\d+)/m);
  const serialrxUart = serialrxMatch ? parseInt(serialrxMatch[1], 10) : null;
  const mspMatch = content.match(/^set\s+msp_uart\s*=\s*(\d+)/m);
  const mspUart = mspMatch ? parseInt(mspMatch[1], 10) : null;

  const peripheralPins = {
    spi: spiPins, gyroCs: gyroCsPins, osdCs, sdCs, flashCs,
    i2c: i2cPins, adcVbat, adcCurr, adcRssi,
    beeper: beeperPin, pinio: pinioPins, statusLeds,
  };

  // On-board RX detection
  const hasRxSpi = features.some(f => f.startsWith('USE_RX_'));
  const rxSpiMatch = content.match(/^set\s+rx_spi_protocol\s*=\s*(\S+)/m);
  const rxSpiProtocol = rxSpiMatch ? rxSpiMatch[1] : null;

  return {
    boardName, mcu, mcuRaw: mcuRaw || '', manufacturer,
    motors, servos, uarts, timerMap, ledStrip, features, gyroAlign,
    peripheralPins, serialrxUart, mspUart, hasRxSpi, rxSpiProtocol,
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
    return parseAllConfigH(configRepoPath);
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

/**
 * Parse all config.h files from the betaflight/config repo.
 * Structure: configs/BOARDNAME/config.h
 */
export function parseAllConfigH(configRepoPath) {
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
