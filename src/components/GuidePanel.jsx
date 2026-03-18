import Section from './common/Section';

function ExtLink({ href, children }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="guide-link">{children}</a>;
}

function Code({ children }) {
  return <code className="guide-code">{children}</code>;
}

function BoardPinout({ name, image, highlights }) {
  return (
    <div className="board-pinout">
      <div className="board-pinout-label">{name}</div>
      <img src={image} alt={`${name} pinout`} className="board-pinout-img" />
      {highlights && highlights.length > 0 && (
        <div className="board-pinout-legend">
          {highlights.map(h => (
            <span key={h.pin} className="pinout-highlight">
              <span className="pinout-pin">{h.pin}</span> {h.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const BASE = import.meta.env.BASE_URL;

const BOARDS = [
  {
    name: 'Flywoo GN405 Nano V3',
    target: 'FLYWOOF405NANO',
    image: `${BASE}boards/flywoo-gn405-nano-v3.webp`,
    type: 'Quad FC (16\u00d716mm F4)',
    mcu: 'STM32F405',
    description: 'A tiny 16\u00d716mm quad FC with 4 motor pads. Keep 1 as motor and remap 2 for servos. Typical scenario when repurposing a quad board for a wing.',
    highlights: [
      { pin: 'PA02', label: 'Motor (TIM2)' },
      { pin: 'PB00', label: 'L Elevon (TIM3)' },
      { pin: 'PB01', label: 'R Elevon (TIM3)' },
    ],
  },
  {
    name: 'SpeedyBee F405 Wing',
    target: 'SPEEDYBEEF405WING',
    image: `${BASE}boards/speedybee-wing-mini.jpg`,
    type: 'Dedicated Wing FC',
    mcu: 'STM32F405',
    description: 'Purpose-built with 2 motor pads and 7 servo pads on separate timers. No remapping needed. Pick your preset and go.',
    highlights: [
      { pin: 'M1', label: 'Motor' },
      { pin: 'S1', label: 'Left Elevon' },
      { pin: 'S2', label: 'Right Elevon' },
    ],
  },
  {
    name: 'MicoAir H743 AIO V1',
    target: 'MICOAIR743',
    image: `${BASE}boards/micoair-h743-aio.jpg`,
    type: 'AIO FC (H7)',
    mcu: 'STM32H743',
    description: 'Has 4 motor outputs with an integrated 35A ESC. The motor pads are hardwired to MOSFETs \u2014 they can only be motors. This particular AIO has 5 additional signal pads that can be used for servos. Most other AIOs are not this generous with signal pads.',
    highlights: [
      { pin: 'PE14', label: 'Motor (TIM1)' },
      { pin: 'PB00', label: 'L Elevon (TIM3)' },
      { pin: 'PB01', label: 'R Elevon (TIM3)' },
    ],
  },
];

export default function GuidePanel() {
  return (
    <div className="guide-panel">
      <div className="guide-intro">
        <p>
          Everything you need to go from a bare flight controller to a flying wing on
          Betaflight. This guide walks through the tool step by step, explains the "why"
          behind every setting, and covers the gotchas that catch people.
        </p>
        <p>
          For in-depth tuning after your first flight, check the <strong>Tuning Guide</strong> tab.
        </p>
      </div>

      {/* ── Before You Start ── */}
      <Section title="Before You Start" defaultCollapsed={false}>
        <div className="sub-group">
          <div className="sub-group-label">What You Need</div>
          <ul className="guide-list">
            <li>A <strong>Betaflight-compatible flight controller</strong> &mdash; any F4, F7, or H7 board works.
              Dedicated wing FCs (like SpeedyBee F405 Wing) have servo outputs already broken out.
              Quad FCs work too &mdash; you just remap motor pads to servos.</li>
            <li><strong>1 brushless motor + ESC</strong> (or 2 motors for differential thrust)</li>
            <li><strong>2 servos</strong> for elevons (flying wing) or ruddervators (V-tail)</li>
            <li>Your <strong>receiver</strong> bound and working</li>
            <li>Optionally: GPS, VTX, current sensor &mdash; wire these up but they don't affect the mixer setup</li>
          </ul>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">What This Tool Does</div>
          <ul className="guide-list">
            <li><strong>Pin assignment</strong> &mdash; picks motor and servo pins that don't conflict on timers</li>
            <li><strong>Servo mixing</strong> &mdash; correct elevon/V-tail/airplane mix with proper rates</li>
            <li><strong>Wing PID defaults</strong> &mdash; safe starting values, not quad defaults</li>
            <li><strong>TPA airspeed curve</strong> &mdash; automatic PID adjustment for speed changes</li>
            <li><strong>SPA</strong> &mdash; prevents bounce-back during aerobatics</li>
          </ul>
          <p>You paste the output into the Betaflight CLI tab. One paste, save, fly.</p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">What This Tool Does NOT Do</div>
          <ul className="guide-list">
            <li><strong>Flash firmware</strong> &mdash; you do that first in the Betaflight Configurator</li>
            <li><strong>Configure your receiver, VTX, OSD, or GPS</strong> &mdash; use the Configurator for those</li>
            <li><strong>Replace tuning</strong> &mdash; the tool gives safe starting values, you tune from there</li>
            <li><strong>Check servo direction, travel, or mechanical setup</strong> &mdash; the tool generates the
              electrical configuration, but it cannot verify that your servos are installed correctly, moving
              the right direction, or have appropriate travel limits</li>
            <li><strong>Perform a "high five" check</strong> &mdash; this is the standard fixed-wing pre-flight
              control surface verification (see Step 6 below)</li>
            <li><strong>Replace proper CG and mechanical setup</strong> &mdash; no amount of software tuning fixes
              a wing with the wrong center of gravity, binding control surfaces, or sloppy linkages</li>
          </ul>
        </div>
      </Section>

      {/* ── Step 0: Flash Firmware ── */}
      <Section title="Step 0: Flash Betaflight with Wing Support" defaultCollapsed>
        <div className="guide-warning">
          <strong>This step is critical.</strong> If you skip it or miss the build options, nothing
          in this guide will work.
        </div>
        <ol className="guide-list">
          <li>Open the <strong>Betaflight Configurator</strong> (app.betaflight.com)</li>
          <li>Connect your FC via USB</li>
          <li>Go to the <strong>Firmware Flasher</strong> tab</li>
          <li>Select <strong>Betaflight 2025.12</strong> (or later)</li>
          <li>Find your board target (same one you'll select in this tool)</li>
          <li>
            <strong>Enable these build options:</strong>
            <ul>
              <li><strong>Wing</strong> &mdash; enables the wing flight controller code</li>
              <li><strong>Servos</strong> &mdash; enables servo output support</li>
            </ul>
          </li>
          <li>Select your radio protocol (CRSF, ELRS, SBUS, etc.)</li>
          <li>Select your motor protocol (Dshot600 recommended if your ESC supports it)</li>
          <li>Click <strong>Flash Firmware</strong></li>
        </ol>
        <div className="guide-tip">
          <strong>Common mistake:</strong> Forgetting to enable "Wing" and "Servos" build options.
          If your servos don't work later, come back and check this first.
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Disable Transmitter Mixing</div>
          <p>
            If you're coming from a traditional RC setup or iNav, you may have elevon or V-tail
            mixing enabled on your transmitter. <strong>Turn it off.</strong> Betaflight handles
            all mixing internally. If both your TX and BF are mixing, you get double-mixed garbage
            and the wing will be uncontrollable.
          </p>
          <p>
            In EdgeTX/OpenTX: remove any mixes on CH1/CH2 that combine aileron + elevator.
            Each channel should output only its own axis &mdash; aileron on aileron, elevator on
            elevator. BF combines them on the FC side.
          </p>
        </div>
      </Section>

      {/* ── Step 1: Select Board ── */}
      <Section title="Step 1: Select Your Board" defaultCollapsed>
        <p>
          On the <strong>Setup</strong> tab, search for your flight controller in the target selector.
          Type part of the name and select your board.
        </p>
        <p>Once selected, you'll see:</p>
        <ul className="guide-list">
          <li><strong>MCU</strong> &mdash; the processor family (F4, F7, or H7)</li>
          <li><strong>Motor/Servo pins</strong> &mdash; available output pads on your board</li>
          <li><strong>Timer groups</strong> &mdash; how pins are grouped (critical for avoiding conflicts)</li>
          <li><strong>Resolution</strong> &mdash; whether the tool has exact timer data for your board</li>
        </ul>

        <div className="sub-group">
          <div className="sub-group-label">Resolution Status</div>
          <table className="guide-table">
            <thead>
              <tr><th>Status</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Exact</strong></td><td>Full timer data from config.h &mdash; all assignments verified</td></tr>
              <tr><td><strong>Partial</strong></td><td>Some timer data resolved, some inferred &mdash; should be fine</td></tr>
              <tr><td><strong>Unresolved</strong></td><td>Timer data not available &mdash; verify on your board manually</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Three Example Boards</div>
          <p>
            These represent the three common scenarios &mdash; from a quad FC to a dedicated wing board to an AIO:
          </p>
          <div className="board-examples">
            {BOARDS.map(board => (
              <div key={board.target} className="sub-group">
                <div className="sub-group-label">{board.name} &mdash; {board.type}</div>
                <BoardPinout name={board.name} image={board.image} highlights={board.highlights} />
                <div className="setting-note">{board.description}</div>
                <div className="setting-note">
                  Target: <Code>{board.target}</Code> &mdash; MCU: {board.mcu}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="guide-tip">
          <strong>Board not in the database?</strong> Click <strong>Import Config</strong> and paste the
          output of <Code>resource</Code> from the Betaflight CLI. The tool parses your pin assignments
          directly from the FC.
        </div>
      </Section>

      {/* ── Step 2: Choose Mixer Preset ── */}
      <Section title="Step 2: Choose Your Mixer Preset" defaultCollapsed>
        <p>
          Go to the <strong>Mixer</strong> tab and select your airframe type.
        </p>

        <div className="sub-group">
          <div className="sub-group-label">Flying Wing (Elevon)</div>
          <p>The most common wing setup. Two servos, each controlling both roll and pitch.</p>
          <table className="guide-table">
            <thead>
              <tr><th>Output</th><th>Function</th><th>Roll</th><th>Pitch</th></tr>
            </thead>
            <tbody>
              <tr><td>Motor 1</td><td>Thrust</td><td>&mdash;</td><td>&mdash;</td></tr>
              <tr><td>Servo 1 (Left Elevon)</td><td>Roll + Pitch</td><td>50%</td><td>50%</td></tr>
              <tr><td>Servo 2 (Right Elevon)</td><td>Roll + Pitch</td><td>-50%</td><td>50%</td></tr>
            </tbody>
          </table>
          <div className="guide-tip">
            <strong>Why 50% and not 100%?</strong> Each elevon handles two axes simultaneously. If both
            roll and pitch are at 100% authority, a combined full-stick input demands 200% servo
            travel &mdash; physically impossible. The servo hits its mechanical limit and you lose
            proportional control. At 50% per axis: full pitch + full roll = 100% travel. The servo
            stays within its range even at maximum combined input.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Flying Wing (Differential Thrust)</div>
          <p>Same as above, plus a second motor for yaw control:</p>
          <table className="guide-table">
            <thead>
              <tr><th>Output</th><th>Function</th><th>Throttle</th><th>Yaw</th></tr>
            </thead>
            <tbody>
              <tr><td>Motor 1 (Left)</td><td>Thrust + Yaw</td><td>1.0</td><td>-0.25</td></tr>
              <tr><td>Motor 2 (Right)</td><td>Thrust + Yaw</td><td>1.0</td><td>0.25</td></tr>
            </tbody>
          </table>
          <p>The yaw value (default &plusmn;0.25) controls how much throttle differential is applied for yaw input:</p>
          <table className="guide-table">
            <thead>
              <tr><th>Yaw Value</th><th>Behavior</th></tr>
            </thead>
            <tbody>
              <tr><td>&plusmn;0.15</td><td>Gentle, for small/light wings</td></tr>
              <tr><td>&plusmn;0.25</td><td>Good starting point for most wings</td></tr>
              <tr><td>&plusmn;0.35&ndash;0.40</td><td>More aggressive, medium wings</td></tr>
              <tr><td>&plusmn;0.50+</td><td>Usually causes violent yaw oscillation</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Airplane</div>
          <p>Separate surfaces for each axis &mdash; no mixing needed:</p>
          <table className="guide-table">
            <thead>
              <tr><th>Output</th><th>Axis</th><th>Rate</th></tr>
            </thead>
            <tbody>
              <tr><td>Motor 1</td><td>&mdash;</td><td>&mdash;</td></tr>
              <tr><td>Servo 1 (Left Aileron)</td><td>Roll</td><td>100%</td></tr>
              <tr><td>Servo 2 (Right Aileron)</td><td>Roll</td><td>-100%</td></tr>
              <tr><td>Servo 3 (Elevator)</td><td>Pitch</td><td>100%</td></tr>
              <tr><td>Servo 4 (Rudder)</td><td>Yaw</td><td>100%</td></tr>
            </tbody>
          </table>
          <p>Each surface handles one axis, so 100% rate is correct &mdash; no saturation risk.</p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">V-Tail</div>
          <p>Two ruddervator servos mix pitch and yaw, plus separate ailerons:</p>
          <table className="guide-table">
            <thead>
              <tr><th>Output</th><th>Pitch</th><th>Yaw</th><th>Roll</th></tr>
            </thead>
            <tbody>
              <tr><td>Servo 1 (Left Ruddervator)</td><td>50%</td><td>50%</td><td>&mdash;</td></tr>
              <tr><td>Servo 2 (Right Ruddervator)</td><td>50%</td><td>-50%</td><td>&mdash;</td></tr>
              <tr><td>Servo 3 (Left Aileron)</td><td>&mdash;</td><td>&mdash;</td><td>100%</td></tr>
              <tr><td>Servo 4 (Right Aileron)</td><td>&mdash;</td><td>&mdash;</td><td>-100%</td></tr>
            </tbody>
          </table>
          <p>Same 50/50 logic as elevons &mdash; two axes on one servo means each gets half.</p>
        </div>
      </Section>

      {/* ── Step 3: Assign Pins ── */}
      <Section title="Step 3: Assign Pins (Resource Mapper)" defaultCollapsed>
        <p>
          Back on the <strong>Setup</strong> tab, the resource mapper shows your board's timer groups.
        </p>

        <div className="sub-group">
          <div className="sub-group-label">The Timer Rule</div>
          <p>
            <strong>Dshot motors and PWM servos cannot share the same timer group.</strong> This is a
            hardware limitation &mdash; Dshot and PWM use fundamentally different signal protocols
            that require different timer configurations.
          </p>
          <p>The tool prevents you from making this mistake. If you try to put a motor and
            servo on the same timer, you'll see a red warning.</p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Good Assignment (No Conflicts)</div>
          <pre className="guide-code-block">
{`TIM2: PA02 [Motor 1] — Dshot
TIM3: PB00 [Servo 1], PB01 [Servo 2] — PWM`}
          </pre>
          <p>Motor on TIM2, servos on TIM3. Different timers. No conflict.</p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Bad Assignment (Conflict!)</div>
          <pre className="guide-code-block guide-code-bad">
{`TIM3: PB00 [Motor 1], PB01 [Servo 1] — CONFLICT`}
          </pre>
          <p>Motor and servo on the same timer. The motor would run Dshot but the servo
            would get corrupted signals.</p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Dedicated Wing FCs</div>
          <p>
            If you selected a wing-specific board (like SpeedyBee F405 Wing), the motor
            and servo outputs are already on separate timers. The tool auto-assigns
            correctly &mdash; just pick your preset and move on.
          </p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Quad FCs and AIOs</div>
          <p>
            On a quad FC, you're repurposing motor pads as servo outputs. The tool shows
            which timer each pad is on so you can pick non-conflicting pins.
          </p>
          <p>
            On an AIO, the motor pads are hardwired to the on-board ESC &mdash; they can't be
            used as servos. Some AIOs have extra signal pads that can be used for servos directly.
            Most don't &mdash; you'll need to find servo pins by remapping UART pins that have
            timer capability.
          </p>
        </div>
      </Section>

      {/* ── Step 4: Set PIDs ── */}
      <Section title="Step 4: Set PIDs" defaultCollapsed>
        <p>
          Go to the <strong>PIDs</strong> tab. The tool defaults to wing-appropriate values:
        </p>

        <div className="sub-group">
          <div className="sub-group-label">Starting PIDs</div>
          <table className="guide-table">
            <thead>
              <tr><th>Axis</th><th>P</th><th>I</th><th>D</th></tr>
            </thead>
            <tbody>
              <tr><td>Roll</td><td>10</td><td>10</td><td>10</td></tr>
              <tr><td>Pitch</td><td>10</td><td>10</td><td>10</td></tr>
              <tr><td>Yaw</td><td>10</td><td>0</td><td>10</td></tr>
            </tbody>
          </table>
          <div className="guide-warning">
            <strong>Do NOT use quad PID defaults on a wing.</strong> Quad defaults (P=45, I=80, D=40)
            will cause violent, immediate oscillation. Wings have completely different
            aerodynamics &mdash; start low and tune up.
          </div>
          <p>
            <strong>Why yaw I = 0?</strong> With differential thrust, I-term on yaw accumulates during
            fast forward flight when the motors can't effectively yaw (too much airflow). This causes
            the motors to run at different speeds for no reason, wasting battery and creating unwanted
            asymmetric thrust.
          </p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">S-Term</div>
          <table className="guide-table">
            <thead>
              <tr><th>Axis</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Roll</td><td>50</td></tr>
              <tr><td>Pitch</td><td>50</td></tr>
              <tr><td>Yaw</td><td>0 (diff thrust) or 50 (rudder)</td></tr>
            </tbody>
          </table>
          <p>
            <strong>What is S-term?</strong> It maps your stick position directly to servo output. With
            S-term at 50, half your servo movement comes directly from your stick (instant, direct feel)
            and half comes from PID stabilization (correcting for wind, gusts, trim). It's what makes
            BF wings feel fluid rather than robotic.
          </p>
          <ul className="guide-list">
            <li><strong>Higher S-term (60&ndash;80)</strong> = more direct feel, like flying without an FC</li>
            <li><strong>Lower S-term (20&ndash;40)</strong> = more stabilized, FC does more work</li>
            <li><strong>S-term at 100 with PIDs at 0</strong> = pure passthrough, no stabilization at all</li>
          </ul>
          <div className="guide-tip">
            <strong>Yaw S-term must be 0 with differential thrust</strong> because yaw goes through motors
            via the PID controller, not directly through a servo.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Rates</div>
          <table className="guide-table">
            <thead>
              <tr><th>Axis</th><th>Rate (deg/s)</th></tr>
            </thead>
            <tbody>
              <tr><td>Roll</td><td>500</td></tr>
              <tr><td>Pitch</td><td>250</td></tr>
              <tr><td>Yaw</td><td>150</td></tr>
            </tbody>
          </table>
          <p>These are starting points. After finding your preferred S-term values, adjust
            rates to match your desired rotation speeds.</p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Features the Tool Disables for Wings</div>
          <p>The tool automatically turns off quad-specific features that interfere with wing tuning:</p>
          <ul className="guide-list">
            <li><Code>anti_gravity_gain = 0</Code> &mdash; fights the airspeed TPA curve</li>
            <li><Code>d_max_roll/pitch = 0</Code> &mdash; unpredictable on wings</li>
            <li><Code>angle_earth_ref = 0</Code> &mdash; quad axis mixing that wings handle aerodynamically</li>
            <li><Code>iterm_relax_cutoff = 5</Code> &mdash; lower than quad default (15) to reduce bounce-back</li>
          </ul>
        </div>
      </Section>

      {/* ── Step 5: Wing Tuning ── */}
      <Section title="Step 5: Configure Wing Tuning" defaultCollapsed>
        <p>
          The <strong>Tuning</strong> tab has wing-specific settings that don't exist on quads. These
          are what make BF wings actually fly well across the speed range.
        </p>

        <div className="sub-group">
          <div className="sub-group-label">TPA Airspeed Curve &mdash; The Most Important Wing Setting</div>
          <p>
            <strong>The problem:</strong> A wing's control authority scales with the square of airspeed.
            PIDs tuned for cruise speed will oscillate in a high-speed dive and be sloppy near stall.
            You need different PID strength at different speeds.
          </p>
          <p>
            <strong>The solution:</strong> BF estimates your airspeed and automatically adjusts PID gains.
            The TPA curve defines how much adjustment happens across the speed range.
          </p>
          <ul className="guide-list">
            <li><strong>TPA Mode: PD</strong> &mdash; attenuates P and D terms with speed (recommended for wings)</li>
            <li><strong>Curve Type: HYPERBOLIC</strong> &mdash; the wing-specific curve shape</li>
            <li><strong>Battery cell count</strong> &mdash; <strong>MUST match your actual battery.</strong> Wrong
              voltage = wrong airspeed estimation = PIDs wrong at every speed</li>
          </ul>

          <table className="guide-table">
            <thead>
              <tr><th>Parameter</th><th>Default</th><th>What It Does</th></tr>
            </thead>
            <tbody>
              <tr><td>Stall Throttle</td><td>30%</td><td>Speed where wing stalls &mdash; PIDs are maxed here</td></tr>
              <tr><td>PID @ Stall</td><td>200%</td><td>PID multiplier near stall (2x boost)</td></tr>
              <tr><td>PID @ Max Speed</td><td>70%</td><td>PID multiplier at top speed (0.7x reduction)</td></tr>
              <tr><td>Expo</td><td>20</td><td>How fast the curve transitions (higher = more mid-range reduction)</td></tr>
            </tbody>
          </table>

          <p><strong>Tuning after first flight:</strong></p>
          <ul className="guide-list">
            <li>Oscillation at HIGH speed &rarr; reduce PID @ max speed (70 &rarr; 50)</li>
            <li>Sloppy at LOW speed &rarr; increase PID @ stall (200 &rarr; 250)</li>
            <li>Good at extremes, bad in the middle &rarr; increase expo</li>
          </ul>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">SPA (Setpoint PID Attenuation) &mdash; Prevents Bounce-Back</div>
          <p>
            <strong>The problem:</strong> During a fast roll, I-term accumulates. When you center the
            stick, the built-up I-term pushes the wing past center before it unwinds. This
            is "bounce-back" &mdash; the wing overshoots at the end of every maneuver.
          </p>
          <p>
            <strong>The solution:</strong> SPA freezes I-term when your sticks are deflected past a
            threshold. During a fast roll, I-term stops accumulating. When you let go,
            there's nothing built up to cause overshoot.
          </p>
          <ul className="guide-list">
            <li><strong>Mode: I_FREEZE</strong> on all axes (recommended starting point)</li>
            <li><strong>Center/Width:</strong> Defines where the freeze activates on the stick travel
              <ul>
                <li>Default center = 200 (of 500), width = 70</li>
                <li>Below 165: full PID (gentle flying, corrections)</li>
                <li>165&ndash;235: gradual transition</li>
                <li>Above 235: I-term frozen (fast maneuvers, aerobatics)</li>
              </ul>
            </li>
          </ul>
          <p>If bounce-back persists, try PD_I_FREEZE mode (more aggressive).</p>
        </div>

        <div className="guide-tip">
          <strong>Tip:</strong> For detailed explanations of every tuning parameter, check the <strong>Tuning Guide</strong> tab.
        </div>
      </Section>

      {/* ── Step 6: Verify Servo Direction & Stabilization ── */}
      <Section title="Step 6: Verify Servo Direction &amp; Stabilization" defaultCollapsed={false}>
        <div className="guide-warning">
          <strong>This is THE most important pre-flight check.</strong> It has two parts &mdash; both
          MUST pass. Wrong servo direction or reversed stabilization = crash on first launch.
          There is no recovering from this in the air. Do this with PROPS OFF every single time.
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Part 1: TX Response Check</div>
          <p>Verify that YOUR stick inputs move the surfaces correctly.</p>
          <ol className="guide-list">
            <li>Power your FC (USB or battery &mdash; <strong>remove ALL propellers first</strong>)</li>
            <li>Arm the flight controller</li>
            <li>Move your sticks and watch the elevons:</li>
          </ol>
          <table className="guide-table">
            <thead>
              <tr><th>Stick Input</th><th>Left Elevon</th><th>Right Elevon</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Roll RIGHT</strong></td><td>Go UP</td><td>Go DOWN</td></tr>
              <tr><td><strong>Roll LEFT</strong></td><td>Go DOWN</td><td>Go UP</td></tr>
              <tr><td><strong>Pitch BACK (pull)</strong></td><td>Go UP</td><td>Go UP</td></tr>
              <tr><td><strong>Pitch FORWARD (push)</strong></td><td>Go DOWN</td><td>Go DOWN</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Part 2: Stabilization Direction Check ("High Five" Test)</div>
          <p>
            This is just as critical as Part 1. The FC's stabilization must push AGAINST
            disturbances, not amplify them. If stabilization is reversed, the wing actively
            flies itself into the ground.
          </p>
          <ol className="guide-list">
            <li>Keep the FC armed (props still OFF)</li>
            <li>Hold the wing in your hands and <strong>tilt it physically</strong> while watching the surfaces:</li>
          </ol>
          <table className="guide-table">
            <thead>
              <tr><th>Physical Movement</th><th>Surfaces Should</th><th>Why</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Tilt nose UP</strong></td><td>Elevons deflect DOWN</td><td>FC corrects by pushing nose back down</td></tr>
              <tr><td><strong>Tilt nose DOWN</strong></td><td>Elevons deflect UP</td><td>FC corrects by pushing nose back up</td></tr>
              <tr><td><strong>Roll LEFT</strong></td><td>Left UP, right DOWN</td><td>FC corrects by rolling right</td></tr>
              <tr><td><strong>Roll RIGHT</strong></td><td>Right UP, left DOWN</td><td>FC corrects by rolling left</td></tr>
            </tbody>
          </table>
          <p>
            <strong>The FC should always fight your hand movement</strong> &mdash; pushing the opposite direction
            to level the aircraft. If the surfaces move WITH your tilt (amplifying it instead of
            correcting), stabilization is reversed and <strong>the wing will immediately roll/pitch
            into the ground on launch.</strong>
          </p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">If Something Is Wrong</div>
          <table className="guide-table">
            <thead>
              <tr><th>Problem</th><th>Fix</th></tr>
            </thead>
            <tbody>
              <tr><td>Both elevons same way for roll</td><td>One servo rate sign needs to flip (+ to -)</td></tr>
              <tr><td>Both elevons wrong way for pitch</td><td>Both servo rate signs need to flip</td></tr>
              <tr><td>Roll and pitch are swapped</td><td>Swap your servo pin assignments</td></tr>
              <tr><td>One elevon doesn't move</td><td>Check resource assignment &mdash; may be on a conflicting timer</td></tr>
            </tbody>
          </table>
          <p>
            In the tool, flip the servo rate sign in the <strong>Mixer</strong> tab, re-export the CLI,
            and paste again.
          </p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">For Differential Thrust (Props OFF!)</div>
          <table className="guide-table">
            <thead>
              <tr><th>Stick Input</th><th>Left Motor</th><th>Right Motor</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Yaw LEFT</strong></td><td>Slower</td><td>Faster</td></tr>
              <tr><td><strong>Yaw RIGHT</strong></td><td>Faster</td><td>Slower</td></tr>
            </tbody>
          </table>
          <p>If reversed, swap the yaw sign in your motor mix or swap the motor assignments.</p>
        </div>
      </Section>

      {/* ── Step 7: Export and Flash ── */}
      <Section title="Step 7: Export and Flash Your Config" defaultCollapsed>
        <p>Go to the <strong>Output</strong> tab. Your complete configuration is shown as a CLI dump.</p>

        <div className="sub-group">
          <div className="sub-group-label">What's In The Output</div>
          <ul className="guide-list">
            <li><strong>Resource assignments</strong> &mdash; which pins are motors and servos</li>
            <li><strong>Mixer configuration</strong> &mdash; motor and servo mix rules</li>
            <li><strong>Master settings</strong> &mdash; servo rate, SPA modes, wing features</li>
            <li><strong>PID profile</strong> &mdash; PIDs, S-term, TPA curve, SPA thresholds</li>
            <li><strong>Rate profile</strong> &mdash; your configured rates</li>
          </ul>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">How to Apply</div>
          <ol className="guide-list">
            <li>Click <strong>Copy</strong></li>
            <li>Open Betaflight Configurator &rarr; <strong>CLI</strong> tab</li>
            <li>Paste the entire block</li>
            <li>Press <strong>Enter</strong> &mdash; the FC processes each command and saves</li>
            <li>Type <Code>save</Code> if not automatically included</li>
            <li>The FC reboots with your wing configuration</li>
          </ol>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Other Export Options</div>
          <ul className="guide-list">
            <li><strong>Save .txt</strong> &mdash; download the config as a text file (good for backup)</li>
            <li><strong>Share</strong> &mdash; generate a URL that loads your exact configuration</li>
            <li><strong>Compare with Defaults</strong> &mdash; shows exactly what your config changes from factory</li>
          </ul>
        </div>
      </Section>

      {/* ── Step 8: First Flight ── */}
      <Section title="Step 8: First Flight" defaultCollapsed>
        <div className="sub-group">
          <div className="sub-group-label">Pre-Flight Checklist</div>
          <ul className="guide-list">
            <li>Servo direction verified &mdash; TX response correct (Step 6, Part 1)</li>
            <li>Stabilization direction verified &mdash; high five test passes (Step 6, Part 2)</li>
            <li>Motor spins correct direction</li>
            <li>CG (center of gravity) is correct for your airframe</li>
            <li>Control surfaces move freely, no binding</li>
            <li>Battery secured, voltage reading correctly</li>
            <li>Arm switch configured and tested</li>
            <li>Failsafe configured (motor off + level recommended for wings)</li>
            <li>Props are on and tight (finally!)</li>
          </ul>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Launch Technique</div>
          <ol className="guide-list">
            <li>Find an <strong>open field</strong> with light wind (or no wind for first flight)</li>
            <li>Hold the wing at the CG, nose <strong>15&ndash;20&deg; above horizontal</strong></li>
            <li>Throttle to <strong>60&ndash;70%</strong> before throwing</li>
            <li>Throw <strong>firmly and level</strong> &mdash; give it speed, don't lob it upward</li>
            <li>Release the wing and <strong>grab your sticks immediately</strong></li>
            <li>Fly straight and level for the first 10&ndash;20 seconds &mdash; feel the response</li>
          </ol>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">What to Watch For</div>
          <table className="guide-table">
            <thead>
              <tr><th>Observation</th><th>What It Means</th><th>Action</th></tr>
            </thead>
            <tbody>
              <tr><td>Flies straight, feels locked in</td><td>PIDs are in a good range</td><td>Gradually increase stick inputs</td></tr>
              <tr><td>Gentle oscillation at cruise</td><td>PIDs slightly high</td><td>Land, reduce P by 20%</td></tr>
              <tr><td>Violent oscillation immediately</td><td>PIDs way too high or servo direction wrong</td><td>Land immediately, check servos, reduce PIDs</td></tr>
              <tr><td>Feels sloppy, doesn't hold attitude</td><td>PIDs too low</td><td>Land, increase P gradually</td></tr>
              <tr><td>Oscillation only in dives</td><td>TPA not reducing PIDs enough at speed</td><td>Reduce TPA "PID @ max speed"</td></tr>
              <tr><td>Sloppy only when slow</td><td>TPA not boosting enough near stall</td><td>Increase TPA "PID @ stall"</td></tr>
              <tr><td>Bounces back after rolls</td><td>I-term buildup</td><td>Enable SPA (I_FREEZE), reduce iterm_relax_cutoff</td></tr>
              <tr><td>One wing drops on launch</td><td>Servo direction issue or CG off</td><td>Check trim, check CG</td></tr>
            </tbody>
          </table>
        </div>

        <div className="guide-tip">
          <strong>After first flight:</strong> Import your <Code>diff all</Code> back into the tool
          (<strong>Setup</strong> &rarr; <strong>Import Config</strong>), tweak values based on flight
          observations, and export an updated CLI. Iterate until it flies how you want.
        </div>
      </Section>

      {/* ── Coming From iNav ── */}
      <Section title="Coming From iNav?" defaultCollapsed>
        <p>If you've been flying wings on iNav, here's what's different in Betaflight:</p>
        <table className="guide-table">
          <thead>
            <tr><th>iNav</th><th>Betaflight</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td>FF (feedforward)</td><td>S-term</td><td>Same concept &mdash; direct stick-to-surface. BF's S-term is position-proportional, iNav's FF is derivative-based.</td></tr>
            <tr><td>TPA (throttle-based)</td><td>TPA (airspeed-based)</td><td>BF estimates airspeed from throttle + voltage + pitch angle. Much more accurate than raw throttle for wings.</td></tr>
            <tr><td>PIFF controller</td><td>PIDFS controller</td><td>Same P, I, D. BF adds F (feedforward derivative) and S (S-term).</td></tr>
            <tr><td>Nav Launch</td><td>(coming soon)</td><td>BF autolaunch is in development &mdash; hand-launch mode with throw detection.</td></tr>
            <tr><td>Mixer in Configurator</td><td>Mixer via CLI / this tool</td><td>BF's configurator doesn't have a wing mixer GUI yet. This tool fills that gap.</td></tr>
            <tr><td>PID values</td><td>Same scale</td><td>P, I, D gains use the same multipliers. You can port your iNav PID values as a starting point.</td></tr>
          </tbody>
        </table>
        <div className="guide-warning">
          <strong>Critical difference:</strong> Disable ALL mixing on your transmitter. In iNav you
          might have used TX mixing for manual mode fallback. In BF, the FC handles all
          mixing in all modes including passthrough. Double-mixing = uncontrollable wing.
        </div>
      </Section>

      {/* ── Coming From Traditional TX ── */}
      <Section title="Coming From a Traditional TX Setup?" defaultCollapsed>
        <p>
          If you've been flying wings with transmitter-based elevon mixing (no FC stabilization):
        </p>
        <ul className="guide-list">
          <li>Your TX mixed aileron + elevator &rarr; CH1/CH2 as elevon signals</li>
          <li>With BF, your TX sends <strong>unmixed</strong> aileron on CH1 and elevator on CH2</li>
          <li>BF does the elevon mixing internally, with proper rate limiting</li>
          <li>You'll likely need to <strong>remove your TX wing mix</strong> and set up clean AETR channels</li>
          <li>The S-term setting at 50&ndash;100 will give you the "direct feel" you're used to,
            with stabilization on top</li>
        </ul>
      </Section>

      {/* ── Troubleshooting ── */}
      <Section title="Troubleshooting" defaultCollapsed>
        <div className="sub-group">
          <div className="sub-group-label">Setup Issues</div>
          <table className="guide-table">
            <thead>
              <tr><th>Problem</th><th>Cause</th><th>Solution</th></tr>
            </thead>
            <tbody>
              <tr><td>No servo tab in Configurator</td><td>Servos build option not enabled</td><td>Re-flash with Servos enabled</td></tr>
              <tr><td>Servos don't move at all</td><td>Pin not assigned as servo</td><td>Check resource assignments in CLI (<Code>resource list</Code>)</td></tr>
              <tr><td>Only one elevon moves</td><td>Timer conflict</td><td>Reassign to a pin on a different timer group</td></tr>
              <tr><td>CLI paste gives errors</td><td>Firmware version mismatch</td><td>Make sure you're on BF 2025.12, not 4.5 or earlier</td></tr>
              <tr><td><Code>set s_roll</Code> not recognized</td><td>Wing build option not enabled</td><td>Re-flash with Wing enabled</td></tr>
              <tr><td>Servo jitters/buzzes</td><td>Servo PWM rate too high</td><td>Set <Code>servo_pwm_rate = 50</Code> (or 150 for digital servos)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Flight Issues</div>
          <table className="guide-table">
            <thead>
              <tr><th>Problem</th><th>Cause</th><th>Solution</th></tr>
            </thead>
            <tbody>
              <tr><td>Oscillation at all speeds</td><td>PIDs too high</td><td>Reduce P and D on affected axis</td></tr>
              <tr><td>Oscillation only at high speed</td><td>TPA not attenuating enough</td><td>Reduce "PID @ max speed" in TPA curve</td></tr>
              <tr><td>Oscillation only near stall</td><td>TPA boosting too much</td><td>Reduce "PID @ stall" in TPA curve</td></tr>
              <tr><td>Sloppy at all speeds</td><td>PIDs too low</td><td>Increase P first, then D</td></tr>
              <tr><td>Bounce-back after fast rolls</td><td>I-term windup</td><td>Enable SPA (I_FREEZE), reduce iterm_relax_cutoff</td></tr>
              <tr><td>Motors run different speeds straight</td><td>Yaw I-term buildup</td><td>Set <Code>i_yaw = 0</Code></td></tr>
              <tr><td>Violent yaw oscillation</td><td>Yaw motor mix too high</td><td>Reduce mmix yaw values (try &plusmn;0.20)</td></tr>
              <tr><td>Controls feel robotic/indirect</td><td>S-term too low</td><td>Increase S-term (roll and pitch)</td></tr>
              <tr><td>Controls feel twitchy</td><td>S-term or PIDs too high</td><td>Reduce S-term or reduce PIDs</td></tr>
              <tr><td>TPA feels wrong at certain speeds</td><td>Battery voltage mismatch</td><td>Verify cell count matches your battery</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Tuning Order ── */}
      <Section title="Tuning Order Checklist" defaultCollapsed>
        <p>After first flight, follow this order for the smoothest tuning experience:</p>
        <ol className="guide-list">
          <li>Verify basic stability &mdash; does it fly straight?</li>
          <li>Tune PIDs up gradually &mdash; P first, then I, then D</li>
          <li>Set S-term to taste (50/50/0 is a good start)</li>
          <li>Adjust rates to match your S-term</li>
          <li>Enable TPA curve (HYPERBOLIC) &mdash; tune stall throttle first</li>
          <li>Tune TPA high-speed end (reduce until no oscillation in dives)</li>
          <li>Tune TPA low-speed end (increase until authority near stall)</li>
          <li>Enable SPA (I_FREEZE) &mdash; tune center/width if bounce-back persists</li>
          <li>Optional: try <Code>tpa_mode = PDS</Code> for speed-dependent S-term</li>
          <li>Optional: tune airspeed estimation with blackbox (<Code>debug_mode = TPA</Code>)</li>
        </ol>
      </Section>

      {/* ── Importing Existing Config ── */}
      <Section title="Importing an Existing Config" defaultCollapsed>
        <p>
          Already have a wing flying? On the <strong>Setup</strong> tab, click <strong>Import Config</strong> and
          paste the output of <Code>diff all</Code> from the Betaflight CLI. The tool parses your existing
          motor mix, servo mix, PIDs, rates, TPA, and SPA settings and loads them into the UI.
          From there you can tweak values and export an updated CLI.
        </p>
      </Section>

      {/* ── Resources ── */}
      <Section title="Resources &amp; Links">
        <ul className="guide-list">
          <li>
            <ExtLink href="https://github.com/betaflight/betaflight/discussions/14032">
              Betaflight Wing Tuning Discussion
            </ExtLink>{' '}
            &mdash; limonspb's official tuning guide
          </li>
          <li>
            <ExtLink href="https://github.com/betaflight/betaflight">
              Betaflight GitHub
            </ExtLink>{' '}
            &mdash; source code and releases
          </li>
          <li>
            <ExtLink href="https://github.com/bskimp/BetaFlight-Wing-Mixer">
              BF Wing Mixer Source Code
            </ExtLink>{' '}
            &mdash; contribute or report issues
          </li>
          <li>
            <ExtLink href="https://www.desmos.com/calculator/xfgcd4lclh">
              TPA Curve Calculator
            </ExtLink>{' '}
            &mdash; interactive Desmos graph
          </li>
        </ul>
      </Section>
    </div>
  );
}
