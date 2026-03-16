/**
 * Fixture-based parser tests.
 * Runs each fixture through parse-targets and merge-targets, asserts expected outputs.
 *
 * Usage: node scripts/tests/run-tests.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigH } from '../parse-targets.mjs';
import { resolveTimerPin, computeTimerGroups, computeResolutionStatus } from '../merge-targets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.log(`  FAIL: ${message}`);
  }
}

function readFixture(name) {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

// Mock MCU timer table for F4 (subset for testing)
const mockMcuTimers = {
  STM32F4: {
    PB00: [
      { timer: 'TIM3', channel: 3, dmaOpt: 0 },
      { timer: 'TIM1', channel: 2, dmaOpt: 0 },
    ],
    PB01: [
      { timer: 'TIM3', channel: 4, dmaOpt: 0 },
      { timer: 'TIM1', channel: 3, dmaOpt: 0 },
    ],
    PA02: [
      { timer: 'TIM2', channel: 3, dmaOpt: 0 },
      { timer: 'TIM5', channel: 3, dmaOpt: 0 },
    ],
    PA03: [
      { timer: 'TIM2', channel: 4, dmaOpt: 0 },
      { timer: 'TIM5', channel: 4, dmaOpt: 0 },
    ],
    PB05: [
      { timer: 'TIM3', channel: 2, dmaOpt: 0 },
    ],
    PC09: [
      { timer: 'TIM8', channel: 4, dmaOpt: 0 },
      { timer: 'TIM3', channel: 4, dmaOpt: 0 },
    ],
    PB04: [
      { timer: 'TIM3', channel: 1, dmaOpt: 0 },
    ],
    PC08: [
      { timer: 'TIM8', channel: 3, dmaOpt: 0 },
      { timer: 'TIM3', channel: 3, dmaOpt: 0 },
    ],
  },
};

// Test 1: Alias resolution
console.log('\nTest 1: Alias resolution');
{
  const content = readFixture('alias-resolution.h');
  const target = parseConfigH(content);
  assert(target !== null, 'Target parsed successfully');
  assert(target.boardName === 'TESTBOARD_ALIAS', `Board name: ${target.boardName}`);

  // Timer map should have resolved pin aliases
  assert(target.timerMap.length === 3, `Timer map has 3 entries (got ${target.timerMap.length})`);
  assert(target.timerMap[0].pin === 'PB00', `Timer map[0].pin resolved to PB00 (got ${target.timerMap[0].pin})`);
  assert(target.timerMap[1].pin === 'PB01', `Timer map[1].pin resolved to PB01 (got ${target.timerMap[1].pin})`);
  assert(target.timerMap[2].pin === 'PA02', `Timer map[2].pin resolved to PA02 (got ${target.timerMap[2].pin})`);
}

// Test 2: Non-STM32 skip
console.log('\nTest 2: Non-STM32 skip');
{
  const content = readFixture('non-stm32-skip.h');
  const target = parseConfigH(content);
  assert(target === null, 'AT32F435G target skipped (returned null)');
}

// Test 3: Flywoo F405 — full pipeline
console.log('\nTest 3: Flywoo F405 — full timer resolution');
{
  const content = readFixture('flywoo-f405.h');
  const target = parseConfigH(content);
  assert(target !== null, 'Target parsed successfully');
  assert(target.boardName === 'FLYWOOF405NANO', `Board name: ${target.boardName}`);
  assert(target.mcu === 'STM32F4', `MCU: ${target.mcu}`);
  assert(target.motors.length === 8, `8 motors (got ${target.motors.length})`);
  assert(target.timerMap.length === 8, `8 timer map entries (got ${target.timerMap.length})`);

  // Resolve timers
  const timerPins = [];
  for (const entry of target.timerMap) {
    const resolved = resolveTimerPin(entry.pin, entry.af, target.mcu, mockMcuTimers.STM32F4);
    if (resolved) timerPins.push(resolved);
  }

  const timerGroups = computeTimerGroups(timerPins);
  const status = computeResolutionStatus(timerPins, target.timerMap.length);

  assert(timerPins.length === 8, `8 timer pins resolved (got ${timerPins.length})`);
  assert(status === 'exact', `Resolution status: exact (got ${status})`);

  const groupNames = Object.keys(timerGroups).sort();
  assert(groupNames.length === 3, `3 timer groups (got ${groupNames.length}: ${groupNames.join(', ')})`);
  assert(groupNames.includes('TIM2'), 'Has TIM2 group');
  assert(groupNames.includes('TIM3'), 'Has TIM3 group');
  assert(groupNames.includes('TIM8'), 'Has TIM8 group');
  assert(timerGroups['TIM2'].length === 2, `TIM2 has 2 pins (got ${timerGroups['TIM2'].length})`);
  assert(timerGroups['TIM3'].length === 4, `TIM3 has 4 pins (got ${timerGroups['TIM3'].length})`);
  assert(timerGroups['TIM8'].length === 2, `TIM8 has 2 pins (got ${timerGroups['TIM8'].length})`);

  // Wing capable check
  const wingCapable = groupNames.length >= 2 && timerPins.length >= 3;
  assert(wingCapable === true, 'Wing capable: true');
}

// Test 4: No timer map
console.log('\nTest 4: No timer map — unresolved');
{
  const content = readFixture('no-timer-map.h');
  const target = parseConfigH(content);
  assert(target !== null, 'Target parsed successfully');
  assert(target.boardName === 'TESTBOARD_NOTIMER', `Board name: ${target.boardName}`);
  assert(target.motors.length === 4, `4 motors (got ${target.motors.length})`);
  assert(target.timerMap.length === 0, `0 timer map entries (got ${target.timerMap.length})`);

  const status = computeResolutionStatus([], 0);
  assert(status === 'unresolved', `Resolution status: unresolved (got ${status})`);
}

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
}
