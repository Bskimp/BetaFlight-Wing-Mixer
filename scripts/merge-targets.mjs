/**
 * Merge target sources with mcu-timers.json to produce the final targets.json.
 * Supports dual sources: config.h (betaflight/config) and unified-targets.
 * Config.h targets take priority; unified-targets fill gaps.
 *
 * Resolves timer pins using:
 * 1. Pre-resolved timer/channel from unified-targets comments (exact)
 * 2. AF-to-timer family mapping + MCU timer table lookup (fallback)
 *
 * Usage: node scripts/merge-targets.mjs
 * Reads: scripts/targets-raw.json, scripts/config-raw.json, scripts/mcu-timers.json
 * Output: src/data/targets.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AF_TIMER_FAMILIES = {
  STM32F4: {
    1: ['TIM1', 'TIM2'],
    2: ['TIM3', 'TIM4', 'TIM5'],
    3: ['TIM8', 'TIM9', 'TIM10', 'TIM11'],
  },
  STM32F7: {
    1: ['TIM1', 'TIM2'],
    2: ['TIM3', 'TIM4', 'TIM5'],
    3: ['TIM8', 'TIM9', 'TIM10', 'TIM11'],
  },
  STM32H7: {
    1: ['TIM1', 'TIM2'],
    2: ['TIM3', 'TIM4', 'TIM5'],
    3: ['TIM8'],
  },
};

/**
 * Resolve a single timer pin entry against the MCU timer table.
 * If the entry has resolvedTimer/resolvedChannel (from unified-targets comments),
 * use those directly for exact resolution.
 */
export function resolveTimerPin(entry, mcuFamily, mcuTimerTable) {
  const { pin, af, resolvedTimer, resolvedChannel } = entry;

  // Use pre-resolved timer from comment if available
  if (resolvedTimer && resolvedChannel != null) {
    return {
      pin,
      timer: resolvedTimer,
      channel: resolvedChannel,
      dmaOpt: entry.dmaOpt || 0,
      exact: true,
    };
  }

  // Fall back to AF + MCU table lookup
  const candidates = mcuTimerTable[pin];
  if (!candidates || candidates.length === 0) return null;

  const afTimers = AF_TIMER_FAMILIES[mcuFamily]?.[af];
  if (!afTimers) {
    return {
      pin,
      timerFamily: `AF${af}`,
      possibleTimers: candidates.map(c => c.timer),
      exact: false,
    };
  }

  const match = candidates.find(c => afTimers.includes(c.timer));
  if (match) {
    return {
      pin,
      timer: match.timer,
      channel: match.channel,
      dmaOpt: match.dmaOpt,
      exact: true,
    };
  }

  return {
    pin,
    timerFamily: `AF${af}`,
    possibleTimers: afTimers,
    exact: false,
  };
}

/**
 * Group timer pins by timer name or timer family.
 */
export function computeTimerGroups(timerPins) {
  const groups = {};
  for (const tp of timerPins) {
    const key = tp.exact ? tp.timer : tp.timerFamily;
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tp.pin);
  }
  return groups;
}

/**
 * Determine resolution status: exact, partial, or unresolved.
 */
export function computeResolutionStatus(timerPins, timerMapCount) {
  if (timerPins.length === 0) return 'unresolved';
  const allExact = timerPins.every(tp => tp.exact);
  if (allExact && timerPins.length === timerMapCount) return 'exact';
  return 'partial';
}

/**
 * Check wing capability.
 */
function isWingCapable(timerGroups, timerPins, resolutionStatus) {
  if (resolutionStatus !== 'exact') return null;
  const groupCount = Object.keys(timerGroups).length;
  return groupCount >= 2 && timerPins.length >= 3;
}

/**
 * Classify pin accessibility based on peripheral pin data.
 * Only classifies pins that appear in timerPins or uarts.
 *
 * Returns { pin: 'accessible' | 'blocked' | 'maybe' | 'unknown' }
 */
function classifyPins(target, timerPins) {
  const pp = target.peripheralPins || {};
  const access = {};

  // Collect all Tier 1 pins (user-facing, definitely have pads)
  const tier1Pins = new Set();
  for (const m of target.motors || []) tier1Pins.add(m.pin);
  for (const s of target.servos || []) tier1Pins.add(s.pin);
  for (const u of target.uarts || []) {
    if (u.tx) tier1Pins.add(u.tx);
    if (u.rx) tier1Pins.add(u.rx);
  }
  if (target.ledStrip) tier1Pins.add(target.ledStrip);
  if (pp.beeper) tier1Pins.add(pp.beeper);
  for (const p of pp.pinio || []) tier1Pins.add(p);

  // Collect all Tier 2 pins (on-board peripherals, not user-accessible)
  const tier2Pins = new Set();
  for (const p of pp.spi || []) tier2Pins.add(p);
  for (const p of pp.gyroCs || []) tier2Pins.add(p);
  if (pp.osdCs) tier2Pins.add(pp.osdCs);
  if (pp.sdCs) tier2Pins.add(pp.sdCs);
  if (pp.flashCs) tier2Pins.add(pp.flashCs);
  if (pp.adcVbat) tier2Pins.add(pp.adcVbat);
  if (pp.adcCurr) tier2Pins.add(pp.adcCurr);
  for (const p of pp.statusLeds || []) tier2Pins.add(p);

  // Tier 2b "maybe" pins (I2C, ADC_RSSI — sometimes broken out)
  const maybePins = new Set();
  for (const p of pp.i2c || []) maybePins.add(p);
  if (pp.adcRssi) maybePins.add(pp.adcRssi);

  // Classify every pin that appears in timerPins or uarts
  const relevantPins = new Set();
  for (const tp of timerPins) relevantPins.add(tp.pin);
  for (const u of target.uarts || []) {
    if (u.tx) relevantPins.add(u.tx);
    if (u.rx) relevantPins.add(u.rx);
  }

  for (const pin of relevantPins) {
    if (tier1Pins.has(pin)) {
      access[pin] = 'accessible';
    } else if (maybePins.has(pin) && !tier1Pins.has(pin)) {
      access[pin] = 'maybe';
    } else if (tier2Pins.has(pin) && !tier1Pins.has(pin)) {
      access[pin] = 'blocked';
    } else {
      access[pin] = 'unknown';
    }
  }

  return access;
}

/**
 * Reverse-lookup AF number from timer name and MCU family.
 * e.g., TIM3 on STM32F4 → AF2
 */
function timerToAf(timer, mcuFamily) {
  const families = AF_TIMER_FAMILIES[mcuFamily];
  if (!families) return null;
  for (const [af, timers] of Object.entries(families)) {
    if (timers.includes(timer)) return parseInt(af, 10);
  }
  return null;
}

/**
 * Enrich UART entries with timer options from the MCU timer table.
 * For each UART TX/RX pin, look up available timers and compute AF.
 */
function enrichUartTimerOptions(uarts, mcuFamily, mcuTimerTable) {
  return uarts.map(u => {
    const txTimers = [];
    const rxTimers = [];

    if (u.tx && mcuTimerTable[u.tx]) {
      for (const opt of mcuTimerTable[u.tx]) {
        const af = timerToAf(opt.timer, mcuFamily);
        if (af !== null) {
          txTimers.push({ timer: opt.timer, channel: opt.channel, af });
        }
      }
    }

    if (u.rx && mcuTimerTable[u.rx]) {
      for (const opt of mcuTimerTable[u.rx]) {
        const af = timerToAf(opt.timer, mcuFamily);
        if (af !== null) {
          rxTimers.push({ timer: opt.timer, channel: opt.channel, af });
        }
      }
    }

    return { ...u, txTimers, rxTimers };
  });
}

/**
 * Process a single raw target: resolve timers, compute groups, determine wing capability.
 */
function processTarget(target, mcuTimers, source) {
  const mcuTable = mcuTimers[target.mcu] || {};
  const timerPins = [];

  if (target.timerMap) {
    for (const entry of target.timerMap) {
      const resolved = resolveTimerPin(entry, target.mcu, mcuTable);
      if (resolved) timerPins.push(resolved);
    }
  }

  const timerGroups = computeTimerGroups(timerPins);
  const resolutionStatus = computeResolutionStatus(
    timerPins,
    target.timerMap ? target.timerMap.length : 0
  );
  const wingCapable = isWingCapable(timerGroups, timerPins, resolutionStatus);

  // Pin accessibility classification
  const pinAccess = classifyPins(target, timerPins);

  // Enrich UARTs with timer options
  const enrichedUarts = enrichUartTimerOptions(target.uarts || [], target.mcu, mcuTable);

  return {
    boardName: target.boardName,
    mcu: target.mcu,
    mcuRaw: target.mcuRaw,
    manufacturer: target.manufacturer,
    motors: target.motors,
    servos: target.servos,
    uarts: enrichedUarts,
    timerPins,
    timerGroups,
    resolutionStatus,
    wingCapable,
    ledStrip: target.ledStrip,
    features: target.features,
    gyroAlign: target.gyroAlign,
    pinAccess,
    serialrxUart: target.serialrxUart || null,
    mspUart: target.mspUart || null,
    source,
  };
}

/**
 * Enhance config.h timer entries with resolved info from unified-targets comments.
 * Config.h only has AF numbers; unified-targets comments have exact timer/channel.
 * Match by pin to copy resolvedTimer/resolvedChannel onto config.h entries.
 */
function supplementTimerResolution(configTarget, unifiedTarget) {
  if (!configTarget.timerMap || !unifiedTarget?.timerMap) return configTarget;

  // Build lookup: pin → {resolvedTimer, resolvedChannel} from unified-targets
  const resolvedByPin = {};
  for (const entry of unifiedTarget.timerMap) {
    if (entry.resolvedTimer && entry.resolvedChannel != null) {
      resolvedByPin[entry.pin] = {
        resolvedTimer: entry.resolvedTimer,
        resolvedChannel: entry.resolvedChannel,
      };
    }
  }

  // Enhance config.h entries with resolved info
  const enhanced = {
    ...configTarget,
    timerMap: configTarget.timerMap.map(entry => {
      if (entry.resolvedTimer) return entry; // already resolved
      const supplement = resolvedByPin[entry.pin];
      if (supplement) {
        return { ...entry, ...supplement };
      }
      return entry;
    }),
  };

  return enhanced;
}

/**
 * Merge raw targets with MCU timer data.
 * Config.h targets take priority for pin/resource definitions.
 * Timer resolution is supplemented from unified-targets comments when available.
 */
export function mergeTargets(unifiedTargets, mcuTimers, configTargets) {
  const result = {};
  let exactCount = 0;
  let wingCount = 0;
  let fromConfig = 0;
  let fromUnified = 0;
  let skippedDuplicate = 0;

  // Process config.h targets first (they take priority for structure)
  if (configTargets) {
    for (const [name, target] of Object.entries(configTargets)) {
      // Supplement timer resolution from unified-targets if available
      const enhanced = supplementTimerResolution(target, unifiedTargets[name]);
      const processed = processTarget(enhanced, mcuTimers, 'config');
      result[name] = processed;
      fromConfig++;
      if (processed.resolutionStatus === 'exact') exactCount++;
      if (processed.wingCapable === true) wingCount++;
    }
  }

  // Process unified-targets, only adding boards not already present
  for (const [name, target] of Object.entries(unifiedTargets)) {
    if (result[name]) {
      skippedDuplicate++;
      continue;
    }
    const processed = processTarget(target, mcuTimers, 'unified-targets');
    result[name] = processed;
    fromUnified++;
    if (processed.resolutionStatus === 'exact') exactCount++;
    if (processed.wingCapable === true) wingCount++;
  }

  return { targets: result, exactCount, wingCount, fromConfig, fromUnified, skippedDuplicate };
}

// CLI entry point
const scriptPath = process.argv[1] ? fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`)).replace(/\\/g, '/') : '';
const thisPath = fileURLToPath(import.meta.url).replace(/\\/g, '/');
if (scriptPath === thisPath) {
  const unifiedRawPath = join(__dirname, 'targets-raw.json');
  const configRawPath = join(__dirname, 'config-raw.json');
  const timersPath = join(__dirname, 'mcu-timers.json');
  const outPath = join(__dirname, '..', 'src', 'data', 'targets.json');

  const unifiedRaw = JSON.parse(readFileSync(unifiedRawPath, 'utf-8'));
  const mcuTimers = JSON.parse(readFileSync(timersPath, 'utf-8'));
  const configRaw = existsSync(configRawPath)
    ? JSON.parse(readFileSync(configRawPath, 'utf-8'))
    : null;

  const { targets, exactCount, wingCount, fromConfig, fromUnified, skippedDuplicate } =
    mergeTargets(unifiedRaw, mcuTimers, configRaw);

  writeFileSync(outPath, JSON.stringify(targets, null, 2));
  const total = Object.keys(targets).length;
  console.log(`Merged ${total} targets: ${exactCount} exact, ${wingCount} wing-capable`);
  if (configRaw) {
    console.log(`  ${fromConfig} from config.h, ${fromUnified} from unified-targets, ${skippedDuplicate} duplicates skipped`);
  }
  console.log(`Output: ${outPath}`);
}
