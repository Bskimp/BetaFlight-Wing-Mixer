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
    type: 'Quad FC (16×16mm F4)',
    mcu: 'STM32F405',
    description: 'A tiny 16×16mm quad FC with 6 motor pads. Remap 1 motor pad for your motor and 2 for servos. Great for micro wings.',
    wingSetup: {
      motor: { pin: 'PA02', timer: 'TIM2', pad: 'M1' },
      servos: [
        { pin: 'PB00', timer: 'TIM3', pad: 'M3', label: 'Left Elevon' },
        { pin: 'PB01', timer: 'TIM3', pad: 'M4', label: 'Right Elevon' },
      ],
    },
    highlights: [
      { pin: 'PA02', label: 'Motor (TIM2)' },
      { pin: 'PB00', label: 'L Elevon (TIM3)' },
      { pin: 'PB01', label: 'R Elevon (TIM3)' },
    ],
  },
  {
    name: 'SpeedyBee Wing Mini',
    target: 'SPEEDYBEEF405WING',
    image: `${BASE}boards/speedybee-wing-mini.jpg`,
    type: 'Dedicated Wing FC',
    mcu: 'STM32F405',
    description: 'A purpose-built wing FC with dedicated servo outputs (S1-S9) and 2 motor pads. No remapping needed — servos and motors are already on separate timers.',
    wingSetup: {
      motor: { pin: 'PB07', timer: 'TIM4', pad: 'M1' },
      servos: [
        { pin: 'PB00', timer: 'TIM3', pad: 'S1', label: 'Left Elevon' },
        { pin: 'PB01', timer: 'TIM3', pad: 'S2', label: 'Right Elevon' },
      ],
    },
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
    description: 'A powerful H7 AIO with 4 motor outputs and integrated 35A ESC. Use M1 for your motor and remap M3/M4 pads for servos. Good for larger wings that benefit from H7 processing power.',
    wingSetup: {
      motor: { pin: 'PE14', timer: 'TIM1', pad: 'M1' },
      servos: [
        { pin: 'PB00', timer: 'TIM3', pad: 'M3', label: 'Left Elevon' },
        { pin: 'PB01', timer: 'TIM3', pad: 'M4', label: 'Right Elevon' },
      ],
    },
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
          This guide walks through configuring a <strong>single-motor flying wing</strong> using
          Betaflight. This is the simplest wing setup: one motor for thrust, two servos for elevon
          mixing. The tool generates a complete CLI config that you paste into the Betaflight CLI tab.
        </p>
        <p>
          Want differential thrust (2 motors for yaw)? The process is the same — just pick the
          "Flying Wing (Diff Thrust)" preset in Step 2 instead.
        </p>
        <p>
          For in-depth tuning after your first flight, check the <strong>Tuning Guide</strong> tab.
        </p>
      </div>

      <Section title="What You'll Need">
        <ul className="guide-list">
          <li>A Betaflight-compatible flight controller (any F4/F7/H7 board)</li>
          <li>1 brushless motor + ESC</li>
          <li>2 servos for elevons</li>
          <li>Your receiver, GPS, and VTX wired up</li>
        </ul>
        <p><strong>What the tool does for you:</strong></p>
        <ul className="guide-list">
          <li>Picks the right pins so your motor and servos don't conflict on timers</li>
          <li>Generates the full CLI config: resource mapping, mixer, PIDs, rates, and wing tuning</li>
          <li>You just paste it into the Betaflight CLI tab and fly</li>
        </ul>
      </Section>

      <Section title="Compatible Boards" defaultCollapsed={false}>
        <p>
          Any Betaflight FC works for wings. Here are three boards we'll reference throughout this guide — from a tiny quad FC to a dedicated wing board:
        </p>
        <div className="board-examples">
          {BOARDS.map(board => (
            <div key={board.target} className="sub-group">
              <div className="sub-group-label">{board.name} — {board.type}</div>
              <BoardPinout name={board.name} image={board.image} highlights={board.highlights} />
              <div className="setting-note">{board.description}</div>
              <div className="setting-note">
                Target: <Code>{board.target}</Code> — MCU: {board.mcu}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Step 1: Pick Your Board" defaultCollapsed>
        <p>
          On the <strong>Setup</strong> tab, search for your flight controller in the target selector.
          Type part of the name (e.g. "flywoo", "speedybee", "micoair") and select your board.
        </p>
        <p>Once selected you'll see:</p>
        <ul className="guide-list">
          <li><strong>MCU</strong>: The processor family (F4, F7, or H7)</li>
          <li><strong>Motor/Servo pins</strong>: Available output pads on the board</li>
          <li><strong>Timer groups</strong>: How pins are grouped (critical for avoiding conflicts)</li>
          <li><strong>Resolution</strong>: Whether the tool knows exact timer assignments</li>
        </ul>
        <div className="guide-tip">
          <strong>Tip:</strong> If your board isn't in the database, click <strong>Import Config</strong> and paste
          the output of <Code>resource</Code> from the Betaflight CLI — the tool will parse your pin assignments.
        </div>
      </Section>

      <Section title="Step 2: Choose Your Airframe Preset" defaultCollapsed>
        <p>
          Go to the <strong>Mixer</strong> tab and select <strong>Flying Wing (Elevon)</strong>. This preset configures:
        </p>
        <ul className="guide-list">
          <li>1 motor with standard throttle (no yaw mixing)</li>
          <li>2 elevon servos with roll ±100% and pitch 100%</li>
        </ul>
        <p>
          The wing diagram updates to show motor and servo positions on the aircraft.
          If you've selected a target board, the diagram shows which pin is assigned to each output.
        </p>
        <div className="guide-tip">
          <strong>Want 2 motors?</strong> Select "Flying Wing (Diff Thrust)" instead. This adds a second
          motor with ±0.25 yaw mix for differential thrust yaw control — no rudder servo needed.
        </div>
      </Section>

      <Section title="Step 3: Assign Outputs in the Resource Mapper" defaultCollapsed>
        <p>
          Back on the <strong>Setup</strong> tab, the resource mapper shows your board's timer groups.
          This is the critical part — <strong>Dshot motors and PWM servos cannot share the same timer</strong>.
          The tool prevents you from making this mistake.
        </p>

        <div className="sub-group">
          <div className="sub-group-label">Example: Flywoo GN405 Nano V3</div>
          <p>For a single-motor wing on this quad FC:</p>
          <table className="guide-table">
            <thead>
              <tr><th>Output</th><th>Pad</th><th>Pin</th><th>Timer</th></tr>
            </thead>
            <tbody>
              <tr><td>Motor 1</td><td>M1</td><td>PA02</td><td>TIM2</td></tr>
              <tr><td>Servo 1 (L Elevon)</td><td>M3</td><td>PB00</td><td>TIM3</td></tr>
              <tr><td>Servo 2 (R Elevon)</td><td>M4</td><td>PB01</td><td>TIM3</td></tr>
            </tbody>
          </table>
          <p>
            The motor is on <strong>TIM2</strong> (Dshot). Both servos are on <strong>TIM3</strong> (PWM).
            Different timer groups = no conflict.
          </p>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Dedicated wing boards (SpeedyBee Wing Mini)</div>
          <p>
            Wing FCs already have motor and servo outputs on separate timers. The tool auto-assigns
            outputs correctly — just pick your preset and you're done.
          </p>
        </div>

        <div className="guide-warning">
          <strong>What would go wrong:</strong> If you put a motor and a servo on pins that share the same
          timer (e.g. both on TIM3), the tool shows a red warning. The motor would run Dshot but the
          servo wouldn't get the correct PWM signal.
        </div>
        <p>
          Click the pin slots in the resource mapper to cycle through assignments. The tool auto-assigns a
          good default when you pick a preset, but you can change any pin.
        </p>
      </Section>

      <Section title="Step 4: Set PIDs &amp; Rates" defaultCollapsed>
        <p>
          Go to the <strong>PIDs</strong> tab. The tool defaults to wing-appropriate values:
        </p>
        <table className="guide-table">
          <thead>
            <tr><th>Axis</th><th>P</th><th>I</th><th>D</th><th>F</th></tr>
          </thead>
          <tbody>
            <tr><td>Roll</td><td>10</td><td>10</td><td>10</td><td>0</td></tr>
            <tr><td>Pitch</td><td>10</td><td>10</td><td>10</td><td>0</td></tr>
            <tr><td>Yaw</td><td>10</td><td>0</td><td>10</td><td>0</td></tr>
          </tbody>
        </table>
        <p>
          These are intentionally low. <strong>Do not use quad PID defaults on a wing</strong> — values
          like P=45 will cause violent oscillation. Start low, fly, and increase gradually.
        </p>
        <p><strong>S-term</strong> (also on the PIDs tab):</p>
        <ul className="guide-list">
          <li>Roll: 50, Pitch: 50, Yaw: 0</li>
          <li>S-term maps your stick directly to servo output — it gives wings a fluid, direct feel</li>
        </ul>
        <p><strong>Rates</strong> default to wing-appropriate values:</p>
        <ul className="guide-list">
          <li>Roll: 500 deg/s, Pitch: 250 deg/s, Yaw: 150 deg/s</li>
        </ul>
      </Section>

      <Section title="Step 5: Wing Tuning" defaultCollapsed>
        <p>
          The <strong>Tuning</strong> tab has wing-specific settings. The defaults are a good starting point:
        </p>

        <h4>TPA Airspeed Curve</h4>
        <p>
          The most important wing tuning parameter. It adjusts your PID gains based on estimated
          airspeed — less PIDs at high speed to prevent oscillation, more at low speed for authority.
        </p>
        <ul className="guide-list">
          <li><strong>TPA mode</strong>: PD (attenuates P and D terms with speed)</li>
          <li><strong>Battery</strong>: Select your cell count — must be correct for airspeed estimation</li>
          <li>The tool shows a live curve visualization</li>
        </ul>

        <h4>SPA (Setpoint PID Attenuation)</h4>
        <p>
          Set all axes to <strong>I FREEZE</strong> mode with default center/width values.
          This prevents I-term buildup during fast maneuvers.
        </p>
        <div className="guide-tip">
          <strong>Tip:</strong> For detailed explanations of every tuning parameter, check the <strong>Tuning Guide</strong> tab.
        </div>
      </Section>

      <Section title="Step 6: Copy and Paste the CLI" defaultCollapsed>
        <p>
          Go to the <strong>Output</strong> tab. Your complete configuration is shown as a ready-to-paste CLI dump:
        </p>
        <ol className="guide-list">
          <li><strong>Resource assignments</strong> — which pins are motor and servos</li>
          <li><strong>Mixer configuration</strong> — motor and servo mix rules</li>
          <li><strong>Master settings</strong> — servo rate, SPA modes</li>
          <li><strong>PID profile</strong> — PIDs, S-term, TPA curve, SPA thresholds</li>
          <li><strong>Rate profile</strong> — your rates</li>
        </ol>
        <p>Click <strong>Copy</strong>, then:</p>
        <ol className="guide-list">
          <li>Connect your FC to Betaflight Configurator</li>
          <li>Go to the <strong>CLI</strong> tab</li>
          <li>Paste the entire block</li>
          <li>Press Enter — the FC will save and reboot</li>
        </ol>
        <p>
          You can also <strong>Save .txt</strong> to download the config, or use <strong>Share</strong> to
          generate a URL that loads your exact configuration.
        </p>
        <div className="guide-tip">
          <strong>Tip:</strong> If you have a target selected, use <strong>Compare with Defaults</strong> in the
          Output tab to see exactly what your config changes from the factory defaults.
        </div>
      </Section>

      <Section title="Step 7: Verify Before Flying" defaultCollapsed>
        <p>After the reboot, check <strong>with props off</strong>:</p>
        <ol className="guide-list">
          <li><strong>Motor</strong> — confirm it spins in the correct direction</li>
          <li>
            <strong>Servos</strong> — move your sticks and verify elevons respond correctly:
            <ul>
              <li>Roll right → left elevon up, right elevon down</li>
              <li>Pitch back → both elevons up (nose up)</li>
              <li>If reversed, go back to the tool and flip the servo rate sign in the Mixer tab</li>
            </ul>
          </li>
          <li><strong>Receiver</strong> — verify all channels respond to your transmitter</li>
          <li><strong>Modes</strong> — set up your arm switch</li>
        </ol>
      </Section>

      <Section title="Step 8: First Flight" defaultCollapsed>
        <ul className="guide-list">
          <li>Find an open field, ideally with light wind</li>
          <li>Arm and hand-launch with ~70% throttle</li>
          <li>Fly straight and level first — feel how the wing responds</li>
          <li>Gradually increase stick inputs to test roll and pitch authority</li>
          <li>If oscillation occurs at any speed, land and reduce PIDs</li>
          <li>If the wing feels sloppy, increase PIDs gradually</li>
        </ul>
        <p>
          After your first flight, you can import your <Code>diff all</Code> back into the tool
          (Setup tab → Import Config), tweak the values, and export an updated CLI.
        </p>
      </Section>

      <Section title="Quick Reference: Common Adjustments" defaultCollapsed>
        <table className="guide-table">
          <thead>
            <tr><th>Problem</th><th>Solution</th></tr>
          </thead>
          <tbody>
            <tr><td>Wing oscillates at high speed</td><td>Reduce TPA PID @ max speed</td></tr>
            <tr><td>Wing is sloppy at low speed</td><td>Increase TPA PID @ stall</td></tr>
            <tr><td>Bounce-back after fast rolls</td><td>Reduce iterm_relax_cutoff or increase SPA width</td></tr>
            <tr><td>Servos jittery</td><td>Reduce servo_pwm_rate to 50</td></tr>
            <tr><td>Elevons reversed</td><td>Flip servo rate sign in Mixer tab</td></tr>
            <tr><td>Roll and pitch mixed up</td><td>Swap servo assignments in resource mapper</td></tr>
            <tr><td>Controls feel indirect</td><td>Increase S-term (roll/pitch)</td></tr>
            <tr><td>Controls feel twitchy</td><td>Reduce S-term or PIDs</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Importing an Existing Config" defaultCollapsed>
        <p>
          Already have a wing flying? On the <strong>Setup</strong> tab, click <strong>Import Config</strong> and
          paste the output of <Code>diff all</Code> from the Betaflight CLI. The tool parses your existing
          motor mix, servo mix, PIDs, rates, TPA, and SPA settings and loads them into the UI.
          From there you can tweak values and export an updated CLI.
        </p>
      </Section>

      <Section title="Resources &amp; Links">
        <ul className="guide-list">
          <li>
            <ExtLink href="https://github.com/betaflight/betaflight/discussions/14032">
              Betaflight Wing Tuning Discussion
            </ExtLink>{' '}
            — limonspb's guide on S-term, TPA, and wing tuning
          </li>
          <li>
            <ExtLink href="https://github.com/betaflight/betaflight">
              Betaflight GitHub
            </ExtLink>
          </li>
          <li>
            <ExtLink href="https://github.com/bskimp/BetaFlight-Wing-Mixer">
              BF Wing Mixer Source Code
            </ExtLink>
          </li>
        </ul>
      </Section>
    </div>
  );
}
