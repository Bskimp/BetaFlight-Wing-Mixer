/**
 * Merge targets-raw.json with mcu-timers.json to produce the final targets.json.
 * Resolves timer pins using AF-to-timer family mapping, computes timer groups,
 * resolution status, and wing capability.
 *
 * Usage: node scripts/merge-targets.mjs
 * Reads: scripts/targets-raw.json, scripts/mcu-timers.json
 * Output: src/data/targets.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
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
 */
export function resolveTimerPin(pin, af, mcuFamily, mcuTimerTable) {
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
 * Merge raw targets with MCU timer data.
 */
export function mergeTargets(targetsRaw, mcuTimers) {
  const result = {};
  let exactCount = 0;
  let wingCount = 0;

  for (const [name, target] of Object.entries(targetsRaw)) {
    const mcuTable = mcuTimers[target.mcu] || {};
    const timerPins = [];

    if (target.timerMap) {
      for (const entry of target.timerMap) {
        const resolved = resolveTimerPin(entry.pin, entry.af, target.mcu, mcuTable);
        if (resolved) timerPins.push(resolved);
      }
    }

    const timerGroups = computeTimerGroups(timerPins);
    const resolutionStatus = computeResolutionStatus(
      timerPins,
      target.timerMap ? target.timerMap.length : 0
    );
    const wingCapable = isWingCapable(timerGroups, timerPins, resolutionStatus);

    if (resolutionStatus === 'exact') exactCount++;
    if (wingCapable === true) wingCount++;

    result[name] = {
      boardName: target.boardName,
      mcu: target.mcu,
      mcuRaw: target.mcuRaw,
      manufacturer: target.manufacturer,
      motors: target.motors,
      servos: target.servos,
      uarts: target.uarts,
      timerPins,
      timerGroups,
      resolutionStatus,
      wingCapable,
      ledStrip: target.ledStrip,
      features: target.features,
      gyroAlign: target.gyroAlign,
    };
  }

  return { targets: result, exactCount, wingCount };
}

// CLI entry point
const scriptPath = process.argv[1] ? fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`)).replace(/\\/g, '/') : '';
const thisPath = fileURLToPath(import.meta.url).replace(/\\/g, '/');
if (scriptPath === thisPath) {
  const rawPath = join(__dirname, 'targets-raw.json');
  const timersPath = join(__dirname, 'mcu-timers.json');
  const outPath = join(__dirname, '..', 'src', 'data', 'targets.json');

  const targetsRaw = JSON.parse(readFileSync(rawPath, 'utf-8'));
  const mcuTimers = JSON.parse(readFileSync(timersPath, 'utf-8'));

  const { targets, exactCount, wingCount } = mergeTargets(targetsRaw, mcuTimers);

  writeFileSync(outPath, JSON.stringify(targets, null, 2));
  const total = Object.keys(targets).length;
  console.log(`Merged ${total} targets: ${exactCount} exact resolution, ${wingCount} wing-capable → ${outPath}`);
}
