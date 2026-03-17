# BF Wing Mixer Tool

A standalone web tool for configuring Betaflight fixed-wing aircraft. Pick your airframe, select your flight controller, map your outputs, tune your PIDs, and get a ready-to-paste CLI dump.

**[Use the tool](https://bskimp.github.io/BetaFlight-Wing-Mixer/)** — no install needed, runs entirely in your browser.

Built as a UX testbed for eventual Betaflight Configurator integration. All defaults come from [limonspb's wing tuning guide](https://github.com/betaflight/betaflight/discussions/14032) and real-world flight testing.

## Why?

Betaflight's fixed-wing support has gotten genuinely good in 4.6/2025.12 — S-term, airspeed TPA, SPA, differential thrust — but configuring it is scattered across 6 different tabs and a lot of CLI commands. There's no unified "wing setup" experience.

This tool puts the entire wing configuration flow in one place with sane defaults, validation, and a clean CLI output.

## Getting Started

The tool includes a built-in **Guide** tab that walks you through setting up a flying wing from scratch — from picking a board to your first flight. You can also read the guide in [GETTING_STARTED.md](GETTING_STARTED.md).

### Quick workflow

1. **Setup tab** — Select your FC target board, review pin assignments in the resource mapper
2. **Mixer tab** — Pick an airframe preset, adjust motor and servo mixes
3. **PIDs tab** — Tune PID gains and rates
4. **Tuning tab** — Dial in S-term, TPA, and SPA curves
5. **Output tab** — Copy the generated CLI commands, paste into Betaflight CLI

## Features

### Airframe Presets
- Flying Wing (Elevon) — 1 motor, 2 servos
- Flying Wing with Differential Thrust — 2 motors, 2 servos
- Conventional Airplane — 1 motor, 4 servos (aileron, elevator, rudder)
- Conventional Airplane with Differential Thrust — 2 motors, 4 servos
- V-Tail — 1 motor, 2 servos with V-tail mixing

### Motor & Servo Mixing
- Per-axis sliders for throttle, roll, pitch, and yaw on every motor
- Per-axis sliders for roll, pitch, and yaw on every servo
- Real-time validation with warnings for over-control, timer conflicts, and diff thrust conflicts

### PID & Rate Tuning
- PID sliders (P/I/D/F per axis) with wing-appropriate defaults and ranges
- Rate configuration tuned for fixed-wing flight
- Defaults are intentionally conservative — start safe and tune up

### Wing-Specific Tuning
- **S-term** — per-axis stabilization term configuration
- **TPA** — airspeed-based throttle PID attenuation with live curve visualization
- **SPA** — setpoint PID attenuation with 5 modes (off, pitch only, roll/pitch, all axes, custom)
- Servo PWM rate and i-term relax cutoff

### FC Target Database
- **541 boards** parsed from official Betaflight config.h and unified-target repos
- Pin-to-timer mapping with timer group visualization
- Automatic timer conflict detection (Dshot motors vs PWM servos sharing a timer)
- Board search by name with MCU family info

### Visual Resource Mapper
- Click-to-cycle pin assignment (unassigned > motor > servo > LED > unassigned)
- Pins grouped by timer with conflict highlighting
- Auto-assignment: best-fit algorithm assigns motors and servos to separate timer groups
- **Pin accessibility badges** — pins classified as accessible, blocked (routed to onboard SPI/gyro), maybe (I2C), or unknown
- **Pin budget counter** — shows when your preset needs more outputs than the board has timer pins

### UART-to-Servo Remapping
- When your board doesn't have enough timer pins, sacrifice a UART to gain servo outputs
- The tool shows which UARTs have timer-capable TX/RX pins and which timers are available
- Auto-selects the best timer (prefers timers already used by servos, avoids motor timers)
- Warnings when sacrificing the SERIALRX or MSP UART
- Generates all required CLI commands: `resource SERIAL_TX/RX N NONE`, `timer PIN AF`, `resource SERVO N PIN`, `dma pin PIN NONE`

### Config Compare
- Structured side-by-side comparison of stock target resources vs your configuration
- Shows exactly which pins changed function (e.g., "Motor 4 -> Servo 1")
- Settings diff showing only values that changed from defaults

### Import & Export
- **Import from `diff all`** — paste an existing config, edit in the UI, re-export updated CLI
- **Copy CLI** to clipboard (always one click away from any tab)
- **Download** as .txt file
- **Config sharing** via URL parameters
- **Interactive wing diagram** showing motor/servo positions and current pin assignments

### Theme & UI
- Light / dark / system theme toggle
- Compact utility-focused layout, desktop-primary with mobile support
- Monospace font for all numeric values and CLI output

## How to Use

### Basic Setup

1. Open the tool at **https://bskimp.github.io/BetaFlight-Wing-Mixer/**
2. Go to the **Setup** tab and select your flight controller board from the target database
3. The resource mapper shows all timer pins grouped by timer — click pins to assign them as motor, servo, or LED outputs
4. Switch to the **Mixer** tab and pick your airframe preset (flying wing, airplane, v-tail, etc.)
5. The tool auto-assigns your motors and servos to different timer groups to avoid conflicts
6. Adjust motor yaw mix and servo directions as needed
7. Go to **PIDs** and **Tuning** tabs to dial in your gains, rates, S-term, TPA, and SPA
8. On the **Output** tab, copy the CLI commands and paste them into the Betaflight CLI

### UART Remapping (When You Need More Pins)

Most quad flight controllers only break out 4 motor pads on timers, but a conventional airplane needs 5 outputs (1 motor + 4 servos). The tool handles this automatically:

1. Select your target board in the **Setup** tab
2. If the pin budget shows a shortfall (e.g., "Need 5 outputs, have 4 timer pins"), expand the **"Need more pins? Sacrifice a UART"** section
3. The tool shows which UARTs have timer-capable pins:
   - Each UART row lists its TX and RX pins with available timer channels (e.g., `PC06 (TX) — TIM3 CH1 (AF2), TIM8 CH1 (AF3)`)
   - UARTs where both pins share a timer are listed first (best candidates)
   - UARTs with no timer channels on their pins are shown as unavailable
4. Check the box next to a UART pin to repurpose it as a servo output
   - The tool auto-selects the best timer (prefers one already used for servos to minimize conflicts)
   - If multiple timers are available, use the dropdown to pick a different one
5. Warnings appear if you're about to sacrifice your receiver UART (SERIALRX) or configurator UART (MSP)
6. The remapped pin appears in its timer group alongside your other assignments
7. The **Output** tab CLI will include all the required commands:
   ```
   # Free UART6 pins for servo use
   resource SERIAL_TX 6 NONE
   resource SERIAL_RX 6 NONE

   # Timer and resource assignment
   timer C06 AF2
   resource SERVO 3 C06
   dma pin C06 NONE
   ```
8. After pasting the CLI, go to the **Ports tab** in Betaflight Configurator and disable the sacrificed UART

### Importing an Existing Config

1. Click **Import Config** on the Setup tab
2. Connect to your FC in Betaflight Configurator, go to CLI, type `diff all`, copy the output
3. Paste it into the import dialog — the tool parses your board name, mixer, PIDs, rates, and settings
4. Edit anything in the UI, then copy the updated CLI from the Output tab

### Sharing a Config

Click **Share** on the Output tab to copy a URL that encodes your preset, mixer, PIDs, rates, and wing settings. Anyone opening that link gets your exact configuration loaded.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Commands

```bash
npm run build          # Production build
npm run test-parser    # Run target database parser tests
npm run update-targets # Regenerate targets.json from BF repos
```

### Target Database Pipeline

The 541-board target database is built from official Betaflight sources:

1. `scripts/parse-targets.mjs` — Parses config.h and unified-target files, extracting motors, servos, UARTs, SPI/I2C/ADC peripheral pins, SERIALRX/MSP defaults
2. `scripts/merge-targets.mjs` — Merges parsed data with MCU timer tables, classifies pin accessibility, enriches UARTs with timer options and AF numbers, detects timer groups
3. Output: `src/data/targets.json` — complete board database with pinAccess, timerGroups, enriched UARTs

To regenerate after updating sources:
```bash
npm run update-targets
```

## Resources

- **[Live Tool](https://bskimp.github.io/BetaFlight-Wing-Mixer/)**
- **[Betaflight Wing Tuning Discussion](https://github.com/betaflight/betaflight/discussions/14032)** — limonspb's guide on S-term, TPA, and wing tuning
- **[Betaflight GitHub](https://github.com/betaflight/betaflight)**

## Contributing

This project exists to prove out a UX concept. If you fly BF wings and have opinions about how setup should work, open an issue. Flight-tested preset contributions are especially welcome.

Pin accessibility overrides for specific boards can be contributed via `src/data/pinOverrides.json`.

## License

MIT
