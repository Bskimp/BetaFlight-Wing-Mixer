/**
 * Orchestrator: clone/update BF repos, run all parsers, produce targets.json.
 *
 * Usage: node scripts/update-all.mjs
 *
 * Steps:
 * 1. Shallow clone betaflight/unified-targets to .cache/bf-config (or git pull)
 * 2. Sparse clone betaflight/betaflight to .cache/bf-firmware (timer files only)
 * 3. Run parse-timer-defs.mjs → scripts/mcu-timers.json
 * 4. Run parse-targets.mjs → scripts/targets-raw.json
 * 5. Run merge-targets.mjs → src/data/targets.json
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTimerDefs } from './parse-timer-defs.mjs';
import { parseAllTargets } from './parse-targets.mjs';
import { mergeTargets } from './merge-targets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cacheDir = join(projectRoot, '.cache');

const CONFIG_REPO = 'https://github.com/betaflight/unified-targets.git';
const FIRMWARE_REPO = 'https://github.com/betaflight/betaflight.git';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function ensureConfigRepo(localDir) {
  if (existsSync(join(localDir, '.git'))) {
    console.log('Updating betaflight/unified-targets...');
    run('git pull --ff-only', { cwd: localDir });
  } else {
    console.log('Cloning betaflight/unified-targets...');
    run(`git clone --depth 1 ${CONFIG_REPO} "${localDir}"`);
  }
}

function ensureFirmwareRepo(localDir) {
  // Use sparse checkout to only get timer definition files (avoids Windows long path issues)
  if (existsSync(join(localDir, '.git'))) {
    console.log('Updating betaflight/betaflight (sparse)...');
    run('git pull --ff-only', { cwd: localDir });
  } else {
    console.log('Cloning betaflight/betaflight (sparse — timer files only)...');
    mkdirSync(localDir, { recursive: true });
    run('git init', { cwd: localDir });
    run(`git remote add origin ${FIRMWARE_REPO}`, { cwd: localDir });
    run('git config core.sparseCheckout true', { cwd: localDir });
    // Only checkout the timer definition files we need
    writeFileSync(
      join(localDir, '.git', 'info', 'sparse-checkout'),
      'src/platform/STM32/timer_stm32f4xx.c\nsrc/platform/STM32/timer_stm32f7xx.c\nsrc/platform/STM32/timer_stm32h7xx.c\n'
    );
    run('git pull --depth 1 origin master', { cwd: localDir });
  }
}

// Main
if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

const configDir = join(cacheDir, 'bf-config');
const firmwareDir = join(cacheDir, 'bf-firmware');

ensureConfigRepo(configDir);
ensureFirmwareRepo(firmwareDir);

// Step 3: Parse timer definitions
console.log('\nParsing timer definitions...');
const mcuTimers = parseTimerDefs(firmwareDir);
const mcuTimersPath = join(__dirname, 'mcu-timers.json');
writeFileSync(mcuTimersPath, JSON.stringify(mcuTimers, null, 2));
for (const fam of Object.keys(mcuTimers)) {
  console.log(`  ${fam}: ${Object.keys(mcuTimers[fam]).length} pins`);
}

// Step 4: Parse target configs
console.log('\nParsing target configs...');
const { targets: targetsRaw, skipped } = parseAllTargets(configDir);
const targetsRawPath = join(__dirname, 'targets-raw.json');
writeFileSync(targetsRawPath, JSON.stringify(targetsRaw, null, 2));
console.log(`  ${Object.keys(targetsRaw).length} targets parsed, ${skipped} skipped (non-STM32)`);

// Step 5: Merge
console.log('\nMerging targets with timer data...');
const { targets: finalTargets, exactCount, wingCount } = mergeTargets(targetsRaw, mcuTimers);
const outPath = join(projectRoot, 'src', 'data', 'targets.json');
writeFileSync(outPath, JSON.stringify(finalTargets, null, 2));

const total = Object.keys(finalTargets).length;
console.log(`\nDone! ${total} targets:`);
console.log(`  ${exactCount} exact timer resolution`);
console.log(`  ${wingCount} wing-capable`);
console.log(`  ${skipped} skipped (non-STM32)`);
console.log(`Output: ${outPath}`);
