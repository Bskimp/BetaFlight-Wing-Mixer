# Betaflight Fixed-Wing Tuning Guide

*Based on [limonspb's tuning draft](https://github.com/betaflight/betaflight/discussions/14032)
for Betaflight 4.6, with technical deep-dives from the wing PRs
([#13679](https://github.com/betaflight/betaflight/pull/13679),
[#13719](https://github.com/betaflight/betaflight/pull/13719),
[#13805](https://github.com/betaflight/betaflight/pull/13805),
[#13895](https://github.com/betaflight/betaflight/pull/13895),
[#14010](https://github.com/betaflight/betaflight/pull/14010),
[#14009](https://github.com/betaflight/betaflight/pull/14009)),
and validated against real flight configs.*

---

## Important Notes

Betaflight's wing/plane code is new and has been tested by a small but growing
community. By using it, you're among the first testers. Most settings are
configured via CLI, so the setup process isn't user-friendly yet.

Making a wing fly is straightforward. Making it fly **well** requires tuning
dozens of wing-specific parameters. Fixed-wing tuning is similar to quads but
the aerodynamics are fundamentally different.

**This guide covers only wing-specific setup.** It assumes you already know
standard Betaflight configuration: ports, modes, VTX, OSD, receiver binding,
GPS, etc.

---

## 1. Flashing

Flash your flight controller with the correct target. Ensure you:

- Select **Betaflight 4.6** (or later)
- Enable the **Wing** option and **Servos** option
- Select your radio protocol as usual
- Choose a motor protocol — if your ESC supports DSHOT, use it

---

## 2. Mixer Selection

Go to the Motors tab and choose the appropriate mixer:

- **Flying Wing** — elevon mixing, single motor
- **Airplane** — separate aileron/elevator/rudder servos, single motor
- **Custom Airplane** — any custom setup including differential thrust

For differential thrust (2 motors for yaw control):
```
mixer CUSTOMAIRPLANE
set yaw_type = DIFF_THRUST
save
```

---

## 3. Resource Remapping

**Wing-specific FCs** (like SpeedyBee F405 Wing) have servo outputs predefined —
remapping may not be necessary.

**Multirotor FCs** require remapping motor outputs to servos via CLI `resource`
commands. Keep your motor outputs as motors. Remap unused motor outputs to servos.

If your plane needs more than 4 outputs, you may need additional CLI commands for
DMA and timers. UART pins can also be remapped to servos depending on your FC.

See: https://betaflight.com/docs/wiki/guides/current/resource-remapping

For custom mmix/smix: https://betaflight.com/docs/development/mixer

---

## 4. Verify Servo Direction

**This is mandatory before every first flight.** With props OFF:

- Roll stick right → left aileron/elevon goes up, right goes down
- Pitch stick back → trailing edges deflect up (nose up)
- Yaw stick (if rudder servo) → rudder deflects correctly

If direction is wrong, adjust in the Servos tab using the "Rate and Direction"
column. You can also decrease servo throws here if 100% is too much.

For differential thrust, with props OFF:
- Yaw left → right motor spins faster
- Yaw right → left motor spins faster

If motor direction is wrong, remap motors or adjust with `mmix`.

---

## 5. Servo Update Rate

Try increasing servo update rate:
```
set servo_pwm_rate = 150
```

For digital servos, you can try higher:
```
set servo_pwm_rate = 333
```

If servos buzz, jitter, or don't respond properly, bring it back to defaults:
```
set servo_pwm_rate = 50
```

---

## 6. Calibration

Calibrate accelerometer and voltmeter. **Voltmeter accuracy is important** because
it feeds into the airspeed estimation for TPA. An inaccurate voltage reading shifts
your entire TPA curve.

Double-check board alignment using the 3D model in the Setup tab.

---

## 7. GPS 3D Speed

```
set gps_use_3d_speed = ON
```

This makes blackbox record 3D speed instead of 2D, and makes the OSD show 3D speed.
GPS speed isn't used during flight, but blackbox 3D speed is important for tuning
the airspeed estimation later.

---

## 8. Initial Rates

Set starting rates in the Rates tab:

- **Roll:** 500 deg/s
- **Pitch:** 250 deg/s
- **Yaw:** 150 deg/s

Adjust later based on your plane's performance. After finding your S-term values
(see below), you'll want to revisit rates to match desired rotation speeds.

---

## 9. Initial PID Tune

Open the PID Tuning tab, turn off sliders, and set all PIDs to small values:

```
set p_roll = 10
set i_roll = 10
set d_roll = 10
set p_pitch = 10
set i_pitch = 10
set d_pitch = 10
set p_yaw = 10
set i_yaw = 0
set d_yaw = 0
```

You can leave feedforward at defaults for now — it's not critical initially.

**Do NOT use quad PID defaults.** Quad defaults (P=45, I=80, D=40) will cause
violent oscillation on a wing.

Later you'll be able to increase PIDs by a LOT, but this is a safe starting point.

### Yaw PIDs for Differential Thrust

Yaw P and D can go quite high — 50, 100, or even 150. But start low (10) and tune
up like you would for a quad.

**I-term for yaw must be zero** to avoid I-term buildup. At fast airspeeds, yaw
authority from differential thrust is limited (too much airflow over the wing for
the motors to fight). I-term accumulates error during these moments and causes the
motors to run at different speeds for no reason.

```
set i_yaw = 0
```

---

## 10. Initial Filter Tune

- Start with default filter settings
- Move the **D-term filter slider** to 0.8
- For extra safety, move **both filter sliders** to 0.5 (performance may degrade
  slightly but it's a safer starting point)

You can open these up later as you learn how your airframe behaves.

---

## 11. Disable Quad Features

These quad-oriented features interfere with wing tuning:

```
set anti_gravity_gain = 0       # fights TPA airspeed curve on wings
set d_max_roll = 0              # unpredictable on wings
set d_max_pitch = 0
set angle_earth_ref = 0         # quad axis mixing — wings handle this aerodynamically
```

---

## 12. Max Voltage Setting

**Critical for airspeed estimation.** Set the max voltage for your battery in
volts × 100:

```
set tpa_speed_max_voltage = 1260    # 3S (12.6V)
```

| Battery | Voltage | Setting |
|---------|---------|---------|
| 2S | 8.4V | 840 |
| 3S | 12.6V | 1260 |
| 4S | 16.8V | 1680 |
| 5S | 21.0V | 2100 |
| 6S | 25.2V | 2520 |

If you fly different cell counts on the same plane, set it to the **maximum
voltage** you plan to use.

---

## 13. TPA Airspeed Curve

*Technical details: [PR #13805](https://github.com/betaflight/betaflight/pull/13805)*

For wings, TPA is **airspeed PID attenuation** — higher speed means less PIDs,
lower speed means more PIDs. This is the most important wing tuning parameter.

### Why It Matters

A wing's aerodynamic forces scale with the square of airspeed. At low speed you
need high PID gains to maintain authority. At high speed those same gains cause
oscillation. The TPA curve continuously adjusts PID gains across the speed range.

### Enable the Wing Curve

```
set tpa_curve_type = HYPERBOLIC
```

Default values should work OK, but for best performance it needs tuning.

### Curve Parameters

```
set tpa_curve_stall_throttle = 30   # speed % at which wing stalls (default)
set tpa_curve_pid_thr0 = 200        # PID multiplier at stall speed (200 = 2×)
set tpa_curve_pid_thr100 = 70       # PID multiplier at max speed (70 = 0.7×)
set tpa_curve_expo = 20             # curve shape (positive = bend down like 1/x)
```

### How to Read These

**`tpa_curve_stall_throttle`** is the estimated speed percentage where the wing
stalls. For fast wings this is close to the stall throttle. 100% speed represents
full throttle plus nose straight down for a sustained period. So stall_throttle is
a fraction of that. In practical terms: it's the throttle where the wing can't
maintain level flight and the nose starts to dip.

### Tuning

1. **Set `tpa_curve_stall_throttle`** — the throttle where your wing can't hold
   level flight. Fast, light wings: ~10%. Heavier, slower wings: ~25-30%.

2. **Oscillates at HIGH speed** → reduce `tpa_curve_pid_thr100` (70 → 50)

3. **Sloppy at HIGH speed** → increase `tpa_curve_pid_thr100` (70 → 90)

4. **Oscillates near STALL** → reduce `tpa_curve_pid_thr0` (200 → 150)

5. **Sloppy near STALL** → increase `tpa_curve_pid_thr0` (200 → 250)

6. **Good at extremes, bad in the middle** → increase `tpa_curve_expo`.
   Higher values reduce PIDs more in the mid-range.

### Interactive Curve Calculator

Play with parameters before they're in the Configurator:
https://www.desmos.com/calculator/xfgcd4lclh

### Real-World Examples

**Fast micro wing (600mm, 3S)** — barely stalls, mild TPA needed:
```
set tpa_curve_stall_throttle = 10
set tpa_curve_pid_thr0 = 105
set tpa_curve_pid_thr100 = 60
set tpa_curve_expo = 45
```

**Medium FPV wing (800mm, 3S)** — wider speed envelope, more TPA range:
```
set tpa_curve_stall_throttle = 28
set tpa_curve_pid_thr0 = 170
set tpa_curve_pid_thr100 = 50
set tpa_curve_expo = 40
```

---

## 14. Airspeed Estimation

*Technical details: [PR #13895](https://github.com/betaflight/betaflight/pull/13895)*

Instead of using raw throttle for TPA, Betaflight estimates airspeed using a
physics model that accounts for throttle, battery voltage, pitch angle with
gravity, and aerodynamic drag.

It's ON by default, but for best flight performance it needs tuning.

### The Physics

The estimator models: thrust produces acceleration, which is opposed by
aerodynamic drag (proportional to speed squared). When you dive, gravity adds
speed. When you climb, gravity subtracts. The model runs each PID loop iteration
to estimate current airspeed as a percentage of maximum.

### Why Not Just Use Throttle?

When throttle drops from 100% to 0%, the wing doesn't instantly slow down — it
glides and slowly decelerates. A simple lowpass filter on throttle doesn't model
this correctly because the deceleration curve is fundamentally different from the
acceleration curve. For example, when throttle drops from 100% to 50%, the wing
reaches its new terminal speed much faster than when throttle drops to 0%. A
single LPF has the same time constant regardless. The physics model handles these
asymmetries naturally.

### BASIC Mode (Default, Recommended)

Most pilots should use BASIC mode. It has three tuning parameters:

```
set tpa_speed_type = BASIC
set tpa_speed_basic_delay = 1000    # ms — time to reach half terminal velocity
set tpa_speed_basic_gravity = 50    # dive terminal speed as % of full-throttle speed
set tpa_speed_max_voltage = 1260    # your max battery voltage × 100
```

**`tpa_speed_basic_delay`** is the time to reach half of terminal velocity when
throttle is raised from 0 to 100% in horizontal flight. Light, high-powered wings
accelerate fast (~500-1000ms). Heavy, underpowered wings are slower (~1500-3000ms).

**`tpa_speed_basic_gravity`** is the terminal speed of diving straight down at zero
throttle, expressed as a percentage of terminal speed at full throttle in level
flight. 50% is reasonable for most wings.

**`tpa_speed_max_voltage`** scales throttle with voltage drop. Set to your max
battery voltage × 100. This ensures the estimation stays consistent as your
battery drains.

### Tuning with Blackbox

For precise tuning:
1. `set debug_mode = TPA`
2. Fly a pattern: full throttle level → chop throttle → dive → pull up → repeat
3. Download blackbox log
4. Compare debug trace (estimated speed) against GPS 3D speed
5. Adjust `tpa_speed_basic_delay` until estimation tracks GPS speed

This gives you very accurate airspeed estimation settings from a single flight.

---

## 15. S-Term — Direct Stick Feel

*Technical details: [PR #13679](https://github.com/betaflight/betaflight/pull/13679)*

Betaflight's PID controller for fixed wings uses an extra term called **S-term**,
making it a **PIDFS** controller.

### What It Is

S-term stands for Setpoint (or Sticks, or Servos). It's a term proportional to
stick position that directly commands servo output. Technically it's a feedforward
in control theory terms, but in Betaflight, "feedforward" (F) specifically means the
derivative of setpoint. S-term is the setpoint itself — your stick position with
the rates curve applied.

### How It Works

Without S-term, the PID controller is the only path from stick to surface. It
sees the error between where you want to be and where you are, then drives the
servos. This works but feels indirect.

With S-term, your stick position **directly** commands a percentage of servo travel.
The PID only handles the remaining stabilization.

`set s_roll = 100` deflects surfaces to 100% when roll stick is at 100%.
`set s_roll = 50` deflects surfaces to 50% when roll stick is at 100%.
`set s_roll = 0` means PID does everything (pure stabilization).

It's possible to fly with **only** S-term (PIDs at 0) — it's equivalent to flying
without a flight controller but with your BF rate curve applied.

### Recommended Start

```
set s_pitch = 50
set s_roll = 50
set s_yaw = 50               # if you have a rudder servo
```

For differential thrust, **do not use S-term on yaw**:
```
set s_yaw = 0                # yaw goes through motors via PID, not direct servo
```

### Tuning

S-term is the main driver for maneuvers. It allows the PID to only stabilize the
craft **around** the S-term position.

- **Higher S-term** = more direct feel, less PID influence, more like flying without FC
- **Lower S-term** = more stabilized, PID does more work
- Most pilots settle between 30-70

In combination with SPA (next section), S-term defines your maximum rotation speed
on each axis. **Once you find your preferred S-term values, adjust your rates
accordingly.** You can use visual observation or blackbox to determine actual
degrees per second on each axis.

---

## 16. SPA — Setpoint PID Attenuation

*Technical details: [PR #13719](https://github.com/betaflight/betaflight/pull/13719)*

SPA can turn off some or all PID terms while you're performing high-rate maneuvers.
This prevents I-term buildup that causes bounce-back.

### The Problem

During a fast roll, PID error is large. I-term integrates this error. When you
center the sticks, the accumulated I-term pushes the wing past center before it
unwinds. This is bounce-back.

### SPA Modes

- **OFF** — no attenuation
- **I_FREEZE** — freezes I-term during fast stick moves (recommended start)
- **PD_I_FREEZE** — freezes I-term and reduces P+D during fast moves (more aggressive)

### Recommended Start

```
set spa_roll_mode = I_FREEZE
set spa_pitch_mode = I_FREEZE
set spa_yaw_mode = I_FREEZE
set spa_roll_center = 200
set spa_roll_width = 70
set spa_pitch_center = 150
set spa_pitch_width = 70
set spa_yaw_center = 150
set spa_yaw_width = 70
```

### How Center/Width Work

SPA activates based on stick position on a 0-500 scale:

- **Below (center − width/2):** Full PID, no attenuation — steady flight, small corrections
- **Between center ± width/2:** Gradual transition
- **Above (center + width/2):** Full attenuation — aerobatics, fast maneuvers

Example with center=200, width=70:
- Stick 0–165: full PID
- Stick 165–235: transitioning
- Stick 235–500: I-term frozen

### Tuning

- **Bounce-back after fast rolls** → lower center or widen width
- **Won't hold heading during gentle turns** → raise center
- Start with I_FREEZE. Try PD_I_FREEZE if bounce-back persists.

---

## 17. I-Term Relax

```
set iterm_relax_cutoff = 5
```

This complements SPA by reducing I-term response to fast setpoint changes.
Default quad value is 15 — wings need a lower value.

If your plane reacts quickly and you want more accurate, sharp maneuvers, you
can increase this value later.

---

## 18. TPA Mode PDS — Speed-Dependent S-Term

*Technical details: [PR #14010](https://github.com/betaflight/betaflight/pull/14010)*

Once your plane flies well, you can bring back some faster turns by making
S-term dynamic:

```
set tpa_mode = PDS
```

### What PDS Does

With constant S-term (`tpa_mode = PD`), the same stick deflection gives the same
surface deflection regardless of airspeed. This is how RC planes fly without an FC.

But aerodynamic forces scale with speed squared. At high speed, a small surface
deflection produces a huge moment. At low speed, the same deflection barely does
anything. With constant S-term, your actual roll rate changes dramatically with speed.

**PDS makes S-term dynamic.** At high speed, S-term is reduced (less deflection
needed for the same rate). At low speed, S-term is boosted (more deflection needed).
The result is more consistent rotation rates across the speed range.

### Setpoint Attenuation

PDS also includes **setpoint attenuation**. When speed is slow enough that S-term
is maxed out at 100%, the setpoint itself is reduced so you don't request 500 deg/sec
when the wing physically can't achieve it.

### TPA Mode Summary

| Mode | What's Attenuated by Speed | Best For |
|------|---------------------------|----------|
| D | D-term only | Quads (default) |
| PD | P and D terms | Wings — recommended starting point |
| PDS | P, D, and S-term | Wings — advanced, consistent feel across speeds |

### When to Use PDS

- After your TPA curve and airspeed estimation are well-tuned
- After S-term feels good in PD mode
- When you want consistent handling across the speed range

### Blackbox Debug

```
set debug_mode = WING_SETPOINT     # shows setpoint before/after TPA adjustment
set debug_mode = S_TERM            # shows S-term before/after TPA
```

---

## 19. Angle Mode

In angle mode some wings tend to climb or dive when sticks are centered (usually
dive). Adjust with pitch offset:

If aircraft **loses altitude** in angle mode:
```
set angle_pitch_offset = -50       # minus 5 degrees
```

If aircraft **gains altitude** in angle mode:
```
set angle_pitch_offset = 50        # plus 5 degrees
```

Turn off the quad axis mixing:
```
set angle_earth_ref = 0
```

*Details: [PR #14009](https://github.com/betaflight/betaflight/pull/14009)*

### Passthrough Mode

BF has a `passthrough` mode that sends transmitter outputs directly to servos
without any PID processing. This is useful for first test flights to verify servo
setup before engaging stabilization — standard practice in the fixed-wing world.

---

## 20. General Tuning Approach

Tuning is similar to a quadcopter, but be aware that **servos have slower reaction
time than motors**, so tracking will be more latent.

### Increasing PIDs

As a general approach, increase PID gains to tighten the tune to your specific
aircraft. As you increase, the plane becomes more predictable and tracks stick
movements better.

When you see signs of oscillation (shuddering, fast wobble), you've gone too far.
Back off 10-20% from the oscillation point.

### What Can't Be Tuned Away

Gusty/turbulent air will still make your plane shake. The degree depends on craft
size and aerodynamics — no amount of PID tuning eliminates weather.

### Feedforward

May be helpful but its use for wings is still in testing. Leave at defaults
initially. Current feedforward in BF is a derivative of setpoint — it kicks in
when you **move** the stick (not where the stick **is**, which is what S-term
does).

### Typical Tuned Values

From real flight configs:

**Fast micro wing (600mm, 3S, diff thrust):**
```
set p_roll = 30     set i_roll = 45     set d_roll = 12
set p_pitch = 35    set i_pitch = 50    set d_pitch = 15
set p_yaw = 50      set i_yaw = 0       set d_yaw = 0
set s_roll = 50     set s_pitch = 50    set s_yaw = 0
```

**Medium FPV wing (800mm, 3S, diff thrust):**
```
set p_roll = 10     set i_roll = 20     set d_roll = 5
set p_pitch = 15    set i_pitch = 25    set d_pitch = 8
set p_yaw = 30      set i_yaw = 0       set d_yaw = 0
set s_roll = 50     set s_pitch = 50    set s_yaw = 0
```

---

## 21. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Shakes at a particular speed but not others | TPA curve shape | Tune the specific speed range in TPA curve |
| Shakes at fast throttle changes or nose-down dives | Airspeed estimation inaccurate | Tune TPA speed estimation with blackbox |
| Shakes at all speeds/throttles | PIDs too high | Reduce PIDs |
| Sloppy at all speeds/throttles | PIDs too low | Increase PIDs |
| Bounce-back after fast rolls | I-term windup | Enable SPA (I_FREEZE), reduce `iterm_relax_cutoff` |
| Motors run different speeds in straight flight | Yaw I-term windup | Set `i_yaw = 0` |
| Yaw over-control (violent oscillation) | Yaw mmix values too high | Reduce yaw values (try ±0.20) |
| Servos buzzing/jittering | Servo update rate too high | Reduce `servo_pwm_rate` to 50 |
| Roll and pitch mixed up | Servo assignments wrong | Remap in CLI |
| Elevons reversed | Servo direction wrong | Flip sign in Servos tab |
| Climbs/dives in angle mode | Pitch offset needed | Adjust `angle_pitch_offset` |
| Controls feel robotic/indirect | S-term too low | Increase s_roll, s_pitch |
| Controls feel twitchy | S-term + PIDs too high | Reduce S-term or PIDs |
| TPA feels wrong at unexpected speeds | Battery voltage wrong | Check `tpa_speed_max_voltage` and voltmeter calibration |

---

## 22. Tuning Order Checklist

Follow this order for the smoothest experience:

1. ☐ Flash with Wing + Servos enabled
2. ☐ Set mixer type and motor/servo assignments
3. ☐ **Verify servo directions (props off!)**
4. ☐ Calibrate accelerometer and voltmeter
5. ☐ Set servo_pwm_rate (150 or 333)
6. ☐ Set safe starting PIDs (10/10/10)
7. ☐ Set starting rates (500/250/150)
8. ☐ Set filters (D-term slider to 0.8)
9. ☐ Disable: anti_gravity, d_max, angle_earth_ref
10. ☐ Set max voltage for your battery
11. ☐ **First flight — verify basic stability**
12. ☐ Tune PIDs up gradually (P first, then I, then D)
13. ☐ Set S-term (50/50/0 for diff thrust, 50/50/50 for rudder)
14. ☐ Adjust rates to match S-term
15. ☐ Enable TPA curve (HYPERBOLIC) — tune stall throttle, then extremes
16. ☐ Enable SPA (I_FREEZE) with defaults — tune center/width if needed
17. ☐ Set iterm_relax_cutoff = 5
18. ☐ Optional: try tpa_mode = PDS for speed-dependent S-term
19. ☐ Optional: tune airspeed estimation with blackbox (debug_mode = TPA)

---

## Quick Reference — All Wing Defaults

```
# Mixer (diff thrust example)
mixer CUSTOMAIRPLANE
set yaw_type = DIFF_THRUST

# PIDs — safe starting point
set p_roll = 10
set i_roll = 10
set d_roll = 10
set p_pitch = 10
set i_pitch = 10
set d_pitch = 10
set p_yaw = 10
set i_yaw = 0
set d_yaw = 0

# S-term
set s_roll = 50
set s_pitch = 50
set s_yaw = 0                      # 0 for diff thrust, 50 for rudder

# TPA airspeed curve
set tpa_mode = PD
set tpa_curve_type = HYPERBOLIC
set tpa_speed_max_voltage = 1260   # adjust for your battery!
set tpa_curve_stall_throttle = 30
set tpa_curve_pid_thr0 = 200
set tpa_curve_pid_thr100 = 70
set tpa_curve_expo = 20

# Airspeed estimation
set tpa_speed_type = BASIC
set tpa_speed_basic_delay = 1000
set tpa_speed_basic_gravity = 50

# SPA
set spa_roll_mode = I_FREEZE
set spa_pitch_mode = I_FREEZE
set spa_yaw_mode = I_FREEZE
set spa_roll_center = 200
set spa_roll_width = 70
set spa_pitch_center = 150
set spa_pitch_width = 70
set spa_yaw_center = 150
set spa_yaw_width = 70

# Wing essentials
set servo_pwm_rate = 150
set iterm_relax_cutoff = 5
set anti_gravity_gain = 0
set d_max_roll = 0
set d_max_pitch = 0
set angle_earth_ref = 0
set small_angle = 180
set gps_use_3d_speed = ON

save
```

---

## Pre-Flight Double-Checks

**EVERY TIME before flying:**

- ☐ Servos and motors mapped correctly — control surfaces move as expected
- ☐ **Handshake check** — stick inputs produce correct surface movements
  (mandatory, same as real aircraft)
- ☐ Flight controller alignment is correct (check 3D model in Setup tab)
- ☐ Battery voltage reading is accurate

---

*This guide is a community resource based on limonspb's work developing the
Betaflight wing firmware. Sources: Discussion [#14032](https://github.com/betaflight/betaflight/discussions/14032),
PRs [#13679](https://github.com/betaflight/betaflight/pull/13679),
[#13719](https://github.com/betaflight/betaflight/pull/13719),
[#13805](https://github.com/betaflight/betaflight/pull/13805),
[#13895](https://github.com/betaflight/betaflight/pull/13895),
[#14010](https://github.com/betaflight/betaflight/pull/14010),
[#14009](https://github.com/betaflight/betaflight/pull/14009),
and real-world flight configs.*
