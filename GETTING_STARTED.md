# Getting Started — Setting Up a Flying Wing on a Quad FC

This guide walks through configuring a 2-motor differential thrust flying wing using
a quad flight controller (Flywoo GN405 Nano). This is the most common wing setup:
take a small quad FC, remap the outputs for motors and servos, and generate a complete
Betaflight CLI config.

> **New to Betaflight wings?** Check out [limonspb's wing tuning discussion](https://github.com/betaflight/betaflight/discussions/14032) for background on S-term, airspeed TPA, and differential thrust tuning.

**What you'll need:**
- A Betaflight-compatible flight controller (any F4/F7/H7 board works)
- 2 brushless motors + ESCs (or a 4-in-1 ESC where you'll use 2 channels)
- 2 servos for elevons
- Your receiver, GPS module, and HD VTX wired up

**What the tool does for you:**
- Picks the right pins so your motors and servos don't conflict on timers
- Generates the full CLI config: resource mapping, mixer, PIDs, rates, and wing tuning
- You just paste it into the Betaflight CLI tab and fly

---

## Step 1: Open the Tool and Pick Your Board

Go to [BF Wing Mixer](https://bskimp.github.io/BetaFlight-Wing-Mixer/).

On the **Setup** tab, search for your flight controller in the target selector. For
this example we're using the **FLYWOOF405NANO** — a 16x16mm F4 board originally
designed for micro quads.

Once selected you'll see:
- **MCU**: STM32F405
- **Motors**: 8 pins (this board supports up to an octocopter)
- **Timer groups**: 5 groups (TIM1, TIM2, TIM3, TIM4, TIM8)
- **Resolution**: Exact (the tool knows exactly which timer each pin is on)

> **Tip:** If your board isn't in the database, use the "Paste CLI dump" option — paste
> the output of `resource` from the Betaflight CLI and the tool will parse the pin
> assignments for you.

## Step 2: Choose Your Airframe Preset

Go to the **Mixer** tab and select **Flying Wing (Diff Thrust)**. This preset
configures:
- 2 motors with ±0.25 yaw mix for differential thrust
- 2 elevon servos with roll ±100% and pitch 100%

You'll see the wing diagram update to show motor and servo positions on the aircraft.
If you've selected a target board, the diagram also shows which pin is assigned to
each output (e.g. "A02" for Motor 1).

## Step 3: Assign Outputs in the Resource Mapper

Back on the **Setup** tab, the resource mapper shows your board's timer groups.
This is the critical part — **Dshot motors and PWM servos cannot share the same
timer**. The tool prevents you from making this mistake.

For the Flywoo GN405 Nano, a good assignment is:

| Output | Pin | Timer | Role |
|--------|-----|-------|------|
| Motor 1 | A02 | TIM2 | Left motor |
| Motor 2 | A03 | TIM2 | Right motor |
| Servo 1 | B00 | TIM3 | Left elevon |
| Servo 2 | B01 | TIM3 | Right elevon |

Both motors are on **TIM2** (Dshot-capable with DMA). Both servos are on **TIM3**
(PWM). Different timer groups = no conflict. The tool highlights this in green.

**What would go wrong:** If you put a motor on B00 (TIM3) and a servo on B01 (also
TIM3), the tool shows a red warning: *"TIM3 has both Dshot motors and PWM servos —
they cannot share a timer."* The motor would run Dshot fine but the servo wouldn't
get the correct PWM signal.

Click the pin slots in the resource mapper to assign them. The tool auto-assigns a
good default when you pick a preset, but you can change any pin assignment.

## Step 4: Adjust Motor Mix

Still on the **Mixer** tab, the motor sliders let you fine-tune the yaw authority.
The default is ±0.25 which is a safe starting point. Some tips from real flight
experience:

- **±0.25 to ±0.30** — good for small wings under 600mm, conservative feel
- **±0.30 to ±0.40** — good for medium wings, more aggressive yaw authority
- **Above ±0.50** — the tool warns you. This causes violent over-control on most
  wings. Don't do it unless you know exactly why.

For a first flight, leave it at ±0.25 and increase later if yaw feels sluggish.

## Step 5: Set PIDs

Go to the **PIDs** tab. The tool defaults to wing-appropriate values:

| Axis | P | I | D | F |
|------|---|---|---|---|
| Roll | 10 | 10 | 10 | 0 |
| Pitch | 10 | 10 | 10 | 0 |
| Yaw | 10 | 10 | 10 | 0 |

These are intentionally low. **Do not use quad PID defaults on a wing** — values
like P=45 will cause violent oscillation. Start low, fly, and increase gradually.

For yaw with differential thrust, I-term should typically be 0 to avoid I-term
windup at high airspeeds.

**Rates** are also set to wing-appropriate values:
- Roll: 500 deg/s
- Pitch: 250 deg/s
- Yaw: 150 deg/s

Adjust after your first flight based on how the wing handles.

## Step 6: Wing Tuning

The **Tuning** tab has the wing-specific settings that make BF wings fly great:

### S-term
Set to 50 roll, 50 pitch, 0 yaw. S-term maps your stick position directly to
servo output — it's what gives BF wings that fluid, direct feel. The PID controller
only stabilizes around whatever S-term commands, rather than being the sole path
from stick to surface.

**Yaw S-term should be 0** when using differential thrust because yaw goes through
the motors, not a servo.

### TPA Airspeed Curve
This is the most important wing tuning parameter. It automatically adjusts your PID
gains based on estimated airspeed — high speed means lower gains (to prevent
oscillation), low speed means higher gains (to maintain control authority).

- **TPA mode**: PD (attenuates P and D terms with speed)
- **Battery**: Select your cell count (3S = 12.6V). This must be correct for the
  airspeed estimation to work.
- **Stall throttle**: The throttle % where your wing stalls (~10-30% depending on
  the airframe)
- **PID at stall**: 100-200% (higher = more authority at low speed)
- **PID at max**: 50-70% (lower = less oscillation at high speed)
- **Expo**: 20-45 (shapes the curve between stall and max speed)

The tool shows a live curve visualization so you can see exactly how PIDs will
scale across the speed range.

### SPA (Setpoint PID Attenuation)
Set all three axes to **I FREEZE** mode with the default center/width values.
This prevents I-term from building up during fast maneuvers, which causes
bounce-back when you release the sticks.

Available modes: OFF, I FREEZE, I, PID, PD I FREEZE. For most wings, I FREEZE
on all axes is a safe starting point.

## Step 7: Copy and Paste the CLI

Go to the **Output** tab. Your complete configuration is shown as a ready-to-paste
CLI dump. It includes:

1. **Resource assignments** — which pins are motors and servos
2. **Mixer configuration** — motor and servo mix rules
3. **Master settings** — servo rate, yaw type, SPA modes
4. **PID profile** — PIDs, S-term, TPA curve, SPA thresholds
5. **Rate profile** — your rates

Click **Copy**, then:
1. Connect your FC to Betaflight Configurator
2. Go to the **CLI** tab
3. Paste the entire block
4. Press Enter
5. The FC will save and reboot

You can also **Save .txt** to download the config as a file for backup, or use
**Share** to generate a URL that loads your exact configuration — handy for sharing
setups in forums or Discord.

## Step 8: Verify Before Flying

After the reboot, check:

1. **Motors tab** — confirm both motors spin in the correct direction
2. **Servos tab** — move your sticks and verify elevons respond correctly:
   - Roll right → left elevon up, right elevon down
   - Pitch up → both elevons up
   - If reversed, go back to the tool and flip the servo rate sign
3. **Receiver tab** — verify all channels respond to your transmitter
4. **Modes tab** — set up your arm switch

**Test differential thrust yaw** (props off!): give yaw input and confirm the
correct motor speeds up. Yaw left should speed up the right motor.

## Step 9: First Flight

- Find an open field with no wind (ideally)
- Arm and hand-launch with ~70% throttle
- Fly straight and level first — feel how the wing responds
- Gradually increase stick inputs to test roll, pitch, and yaw authority
- If oscillation occurs at any speed, land and reduce PIDs
- If the wing feels sloppy, increase PIDs gradually

After your first flight, you can import your `diff` back into the tool (Setup tab →
Import Config), tweak the values, and export an updated CLI.

---

## Quick Reference: Common Adjustments

| Problem | Solution |
|---------|----------|
| Wing oscillates at high speed | Reduce TPA PID @ max speed |
| Wing is sloppy at low speed | Increase TPA PID @ stall |
| Yaw too aggressive | Reduce motor yaw mix (e.g. ±0.20) |
| Yaw too sluggish | Increase motor yaw mix (e.g. ±0.35) |
| Bounce-back after fast rolls | Reduce iterm_relax_cutoff or increase SPA width |
| Servos jittery | Reduce servo_pwm_rate to 50 |
| Elevons reversed | Flip servo rate sign in Mixer tab |
| Roll and pitch mixed up | Swap servo assignments in resource mapper |

---

## Using a Dedicated Wing Board

If you're using a board designed for wings (like the SpeedyBee F405 Wing), the
process is even simpler:

1. The board already has motor and servo outputs on separate timers
2. Select it in the target selector and the tool will auto-assign outputs correctly
3. Just pick your preset, adjust PID/TPA/rates, and paste the CLI

The tool detects when a board has pre-defined servo pins and handles this
automatically.

---

## Importing an Existing Config

Already have a wing flying? On the **Setup** tab, click **Import Config** and paste
the output of `diff all` from the Betaflight CLI. The tool will parse your existing
motor mix, servo mix, PIDs, rates, TPA, and SPA settings and load them into the UI.
From there you can tweak values and export an updated CLI.

---

## Sharing Your Config

Found a setup that flies great? Click **Share** on the Output tab to generate a URL.
Anyone who opens that link will see your exact configuration loaded in the tool.
Drop it in your favorite RC group and help others skip the setup hassle.

---

## Resources

- [BF Wing Mixer Tool](https://bskimp.github.io/BetaFlight-Wing-Mixer/)
- [Betaflight Wing Tuning Discussion](https://github.com/betaflight/betaflight/discussions/14032) — limonspb's guide on S-term, TPA, and wing tuning
- [Betaflight GitHub](https://github.com/betaflight/betaflight)
