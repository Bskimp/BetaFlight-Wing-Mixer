/**
 * Parse STM32 timer definition files from the Betaflight firmware repo.
 * Extracts DEF_TIM() entries and builds a pin→timer lookup per MCU family.
 *
 * Usage: node scripts/parse-timer-defs.mjs <path-to-bf-firmware-repo>
 * Output: scripts/mcu-timers.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MCU_FILES = {
  STM32F4: 'src/platform/STM32/timer_stm32f4xx.c',
  STM32F7: 'src/platform/STM32/timer_stm32f7xx.c',
  STM32H7: 'src/platform/STM32/timer_stm32h7xx.c',
};

// Matches both old 6-arg format: DEF_TIM(TIM2, CH1, PA0, TIM_USE_ANY, 0, 0)
// and new 5-arg format: DEF_TIM(TIM2, CH1, PA0, 0, 0)
const DEF_TIM_REGEX = /DEF_TIM\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(?:\w+\s*,\s*)?(\d+)\s*,\s*(\d+)\s*\)/g;

function normalizePin(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().match(/^P?([A-Ia-i])(\d{1,2})$/i);
  if (!m) return null;
  const port = m[1].toUpperCase();
  const num = m[2].padStart(2, '0');
  return `P${port}${num}`;
}

function parseChannel(ch) {
  // CH1 → 1, CH2 → 2, etc.
  const m = ch.match(/CH(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export function parseTimerDefs(firmwarePath) {
  const result = {};

  for (const [family, relPath] of Object.entries(MCU_FILES)) {
    result[family] = {};
    let content;
    try {
      content = readFileSync(join(firmwarePath, relPath), 'utf-8');
    } catch {
      console.warn(`Warning: Could not read ${relPath} — skipping ${family}`);
      continue;
    }

    let match;
    DEF_TIM_REGEX.lastIndex = 0;
    while ((match = DEF_TIM_REGEX.exec(content)) !== null) {
      const timer = match[1];   // e.g. TIM3
      const channel = parseChannel(match[2]); // e.g. CH3 → 3
      const pin = normalizePin(match[3]);     // e.g. PB0 → PB00
      const dmaOpt = parseInt(match[5], 10);

      if (!pin) continue;

      if (!result[family][pin]) {
        result[family][pin] = [];
      }
      result[family][pin].push({ timer, channel, dmaOpt });
    }
  }

  return result;
}

// CLI entry point
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const firmwarePath = process.argv[2];
  if (!firmwarePath) {
    console.error('Usage: node scripts/parse-timer-defs.mjs <path-to-bf-firmware-repo>');
    process.exit(1);
  }

  const result = parseTimerDefs(firmwarePath);
  const outPath = join(__dirname, 'mcu-timers.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));

  let total = 0;
  for (const fam of Object.keys(result)) {
    const count = Object.keys(result[fam]).length;
    total += count;
    console.log(`${fam}: ${count} pins`);
  }
  console.log(`Total: ${total} pin entries → ${outPath}`);
}
