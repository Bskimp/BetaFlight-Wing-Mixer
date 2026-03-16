# BF Wing Mixer Tool

A standalone web tool for configuring Betaflight fixed-wing aircraft. Pick your airframe, set your mix, tune your PIDs, and get a ready-to-paste CLI dump.

Built as a UX testbed for eventual Betaflight Configurator integration.

## Why?

Betaflight's fixed-wing support has gotten genuinely good in 4.6/2025.12 — S-term, airspeed TPA, SPA, differential thrust — but configuring it is scattered across 6 different tabs and a lot of CLI commands. There's no unified "wing setup" experience.

This tool puts the entire wing configuration flow in one place with sane defaults, validation, and a clean CLI output.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Features

### Phase 1 
- Airframe presets: Flying Wing, Flying Wing + Diff Thrust, Airplane, Airplane + Diff Thrust, V-Tail
- Motor mix editor with per-axis sliders
- Servo mix editor with per-axis sliders  
- PID sliders with wing-appropriate defaults and ranges
- Rate configuration
- Wing-specific settings: S-term, SPA, servo PWM rate, i-term relax
- Live CLI output with copy button
- Validation warnings (yaw over-control, timer conflicts, diff thrust + s-term conflicts)
- Simple / Advanced / Expert complexity toggle

### Phase 2 
- FC target database with pin-to-timer mapping
- Visual resource mapper — pick your board, assign outputs, auto-detect timer conflicts
- Resource command generation

### Phase 3 
- Import from `diff all` — paste existing config, edit in UI
- Export as .txt file
- Config sharing via URL parameters

### Phase 4 
- Visual wing diagram showing output assignments
- Stick input preview showing surface deflections
- Community preset library

## Defaults

All defaults come from [limonspb's wing tuning guide](https://github.com/betaflight/betaflight/discussions/14032) and real-world flight testing. They are intentionally conservative — the tool helps you start safe and tune up, not start aggressive and crash.

## Contributing

This project exists to prove out a UX concept. If you fly BF wings and have opinions about how setup should work, open an issue. Flight-tested preset contributions are especially welcome.

## License

MIT
