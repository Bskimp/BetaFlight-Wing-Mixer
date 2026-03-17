/**
 * Orchestrator: clone/update BF repos, run all parsers, produce targets.json.
 *
 * Usage: node scripts/update-all.mjs
 *
 * Steps:
 * 1. Shallow clone betaflight/unified-targets to .cache/bf-unified (or git pull)
 * 2. Shallow clone betaflight/config to .cache/bf-config-h (or git pull)
 * 3. Sparse clone betaflight/betaflight to .cache/bf-firmware (timer files only)
 * 4. Run parse-timer-defs.mjs → scripts/mcu-timers.json
 * 5a. Run parse-targets.mjs (unified-targets) → scripts/targets-raw.json
 * 5b. Run parse-targets.mjs (config.h) → scripts/config-raw.json
 * 6. Run merge-targets.mjs → src/data/targets.json (config.h wins, unified fills gaps)
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTimerDefs } from './parse-timer-defs.mjs';
import { parseAllTargets, parseAllConfigH } from './parse-targets.mjs';
import { mergeTargets } from './merge-targets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cacheDir = join(projectRoot, '.cache');

const UNIFIED_REPO = 'https://github.com/betaflight/unified-targets.git';
const CONFIG_REPO = 'https://github.com/betaflight/config.git';
const FIRMWARE_REPO = 'https://github.com/betaflight/betaflight.git';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function ensureRepo(localDir, repoUrl, label) {
  if (existsSync(join(localDir, '.git'))) {
    console.log(`Updating ${label}...`);
    run('git pull --ff-only', { cwd: localDir });
  } else {
    console.log(`Cloning ${label}...`);
    run(`git clone --depth 1 ${repoUrl} "${localDir}"`);
  }
}

function ensureFirmwareRepo(localDir) {
  // Use sparse checkout to only get timer definition files (avoids Windows long path issues)
  if (existsSync(join(localDir, '.git'))) {
    console.log('Updating betaflight/betaflight (sparse)...');
    run('git -c submodule.recurse=false pull --ff-only origin master', { cwd: localDir });
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

const unifiedDir = join(cacheDir, 'bf-unified');
const configHDir = join(cacheDir, 'bf-config-h');
const firmwareDir = join(cacheDir, 'bf-firmware');

// Handle migration: if old .cache/bf-config exists (was unified-targets), just use it in place
const oldConfigDir = join(cacheDir, 'bf-config');
if (existsSync(join(oldConfigDir, '.git')) && !existsSync(join(unifiedDir, '.git'))) {
  // Old pipeline used bf-config for unified-targets — just clone fresh to new name
  console.log('Old .cache/bf-config found — will clone unified-targets fresh to .cache/bf-unified');
}

ensureRepo(unifiedDir, UNIFIED_REPO, 'betaflight/unified-targets');
ensureRepo(configHDir, CONFIG_REPO, 'betaflight/config');
ensureFirmwareRepo(firmwareDir);

// Step 4: Parse timer definitions
console.log('\nParsing timer definitions...');
const mcuTimers = parseTimerDefs(firmwareDir);
const mcuTimersPath = join(__dirname, 'mcu-timers.json');
writeFileSync(mcuTimersPath, JSON.stringify(mcuTimers, null, 2));
for (const fam of Object.keys(mcuTimers)) {
  console.log(`  ${fam}: ${Object.keys(mcuTimers[fam]).length} pins`);
}

// Step 5a: Parse unified-targets
console.log('\nParsing unified-targets...');
const { targets: unifiedRaw, skipped: unifiedSkipped } = parseAllTargets(unifiedDir);
const unifiedRawPath = join(__dirname, 'targets-raw.json');
writeFileSync(unifiedRawPath, JSON.stringify(unifiedRaw, null, 2));
console.log(`  ${Object.keys(unifiedRaw).length} targets parsed, ${unifiedSkipped} skipped (non-STM32)`);

// Step 5b: Parse config.h targets
console.log('\nParsing config.h targets...');
const { targets: configRaw, skipped: configSkipped } = parseAllConfigH(configHDir);
const configRawPath = join(__dirname, 'config-raw.json');
writeFileSync(configRawPath, JSON.stringify(configRaw, null, 2));
console.log(`  ${Object.keys(configRaw).length} targets parsed, ${configSkipped} skipped (non-STM32)`);

// Step 6: Merge
console.log('\nMerging targets with timer data...');
const { targets: finalTargets, exactCount, wingCount, fromConfig, fromUnified, skippedDuplicate } =
  mergeTargets(unifiedRaw, mcuTimers, configRaw);
const outPath = join(projectRoot, 'src', 'data', 'targets.json');
writeFileSync(outPath, JSON.stringify(finalTargets, null, 2));

const total = Object.keys(finalTargets).length;
console.log(`\nDone! ${total} targets:`);
console.log(`  ${fromConfig} from config.h`);
console.log(`  ${fromUnified} from unified-targets`);
console.log(`  ${skippedDuplicate} duplicates skipped (config.h took priority)`);
console.log(`  ${exactCount} exact timer resolution`);
console.log(`  ${wingCount} wing-capable`);
console.log(`  ${unifiedSkipped + configSkipped} skipped (non-STM32)`);
console.log(`Output: ${outPath}`);
