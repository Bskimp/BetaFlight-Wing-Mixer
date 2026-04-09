import { useState } from 'react';
import Section from './common/Section';
import { PID_DEFAULTS, RATE_DEFAULTS, TPA_DEFAULTS, SPA_DEFAULTS, WING_DEFAULTS } from '../data/defaults';

// --- Helper Components ---

function GuideCodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const lines = code.split('\n');
  return (
    <div className="guide-code-block">
      <button className="guide-copy-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      {lines.map((line, i) => (
        <span key={i} className={line.trimStart().startsWith('#') ? 'cli-comment' : ''}>
          {line}{i < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </div>
  );
}

function ApplyButton({ label, onClick }) {
  const [applied, setApplied] = useState(false);
  const handle = () => {
    onClick();
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };
  return (
    <button className={`guide-apply-btn${applied ? ' applied' : ''}`} onClick={handle}>
      {applied ? 'Applied!' : label}
    </button>
  );
}

function TabLink({ tab, label, onTabChange }) {
  return <a className="guide-link" onClick={() => onTabChange(tab)}>{label}</a>;
}

function ExtLink({ href, children }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="guide-link">{children}</a>;
}

// --- Main Component ---

export default function TuningGuidePanel({ onApply, onTabChange }) {
  return (
    <div className="tuning-guide">
      <div className="tpa-info-text">
        Wing tuning reference based on{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/discussions/14032">limonspb's Betaflight wing firmware development</ExtLink>{' '}
        (PRs #13679, #13719, #13805, #13895, #14010, #14009) and real-world flight configs.
        Use the "Apply" buttons to load recommended starting values into the tool.
      </div>

      {/* Before You Tune */}
      <Section title="Before You Tune" defaultCollapsed={false}>
        <div className="setting-note">
          Betaflight's wing code is new and tested by a small but growing community.
          Making a wing fly is straightforward. Making it fly <strong>well</strong> requires
          understanding what each tuning system does and why it exists.
        </div>
        <div className="setting-note">
          Fixed-wing tuning is similar to quads in some ways — you're still adjusting PID
          gains — but the aerodynamics are fundamentally different. A quad hovers. A wing
          MUST keep moving to fly. That one fact changes everything about how the control
          system needs to behave.
        </div>
        <div className="setting-note">
          <strong>This guide covers only wing-specific tuning.</strong> It assumes your wing is
          already set up and flying (mixer configured, servos verified, basic stability
          confirmed). If you haven't done that yet, start with the{' '}
          <TabLink tab="guide" label="How to Use" onTabChange={onTabChange} /> tab.
        </div>
      </Section>

      {/* Calibration */}
      <Section title="Calibration" defaultCollapsed>
        <div className="setting-note">
          Before tuning anything, make sure your sensors are accurate. Bad sensor data
          means every tuning parameter you set is built on a lie.
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Voltmeter</div>
          <div className="setting-note">
            <strong>Calibrate your voltmeter first.</strong> The voltage reading feeds directly into
            airspeed estimation, which feeds the TPA curve, which controls your PID gains
            at every speed. If your voltage reads 10% high, your TPA curve is shifted —
            the FC thinks you're going faster than you are and reduces PIDs too early.
          </div>
          <div className="setting-note">
            In the Betaflight Configurator Power & Battery tab, adjust the voltage scale
            until the reading matches a multimeter on your battery. This takes 30 seconds
            and affects everything downstream.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Accelerometer</div>
          <div className="setting-note">
            Calibrate the accelerometer with the wing on a level surface. It feeds the
            attitude estimation, which feeds the airspeed estimator's gravity component
            (pitch angle), which feeds TPA. It also determines how angle mode behaves.
          </div>
          <div className="setting-note">
            Double-check board alignment in the Setup tab — the 3D model should match
            your wing's actual orientation. If the FC is mounted at an angle, set the
            board alignment offset in CLI or the Configuration tab.
          </div>
        </div>
      </Section>

      {/* GPS 3D Speed */}
      <Section title="GPS 3D Speed" defaultCollapsed>
        <GuideCodeBlock code="set gps_use_3d_speed = ON" />
        <div className="setting-note">
          Makes blackbox record 3D speed instead of 2D ground speed, and makes the
          OSD show 3D speed. GPS speed isn't used during flight for any control purpose,
          but blackbox 3D speed is <strong>essential</strong> for tuning the airspeed estimation later.
        </div>
        <div className="setting-note">
          Why 3D and not 2D? When your wing dives, ground speed might stay constant while
          actual airspeed increases dramatically. 3D speed captures the vertical component
          that 2D misses.
        </div>
        <ApplyButton label="Apply GPS 3D speed" onClick={() => onApply({
          wingSettings: { gps_use_3d_speed: 'ON' },
        })} />
      </Section>

      {/* Servo Update Rate */}
      <Section title="Servo Update Rate" defaultCollapsed>
        <div className="setting-note">
          Default servo update rate (50 Hz) is fine for slow analog servos but wastes the
          responsiveness of modern digital servos. Higher update rates let the FC command
          smaller, faster corrections. Found in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code="set servo_pwm_rate = 150" />
        <table className="guide-table">
          <thead>
            <tr><th>Servo Type</th><th>Recommended Rate</th></tr>
          </thead>
          <tbody>
            <tr><td>Cheap analog (9g)</td><td>50 Hz</td></tr>
            <tr><td>Standard digital</td><td>150 Hz</td></tr>
            <tr><td>Fast digital (metal gear)</td><td>333 Hz</td></tr>
            <tr><td>Premium digital (Savox, KST)</td><td>333 Hz</td></tr>
          </tbody>
        </table>
        <div className="setting-note">
          If servos buzz, jitter, or don't respond properly, come back down to 50 Hz.
          The servo itself determines the maximum rate it can accept.
        </div>
        <ApplyButton label="Apply servo rate (150)" onClick={() => onApply({
          wingSettings: { servo_pwm_rate: 150 },
        })} />
      </Section>

      {/* Initial Rates */}
      <Section title="Initial Rates" defaultCollapsed>
        <div className="setting-note">
          Set starting rates in the <TabLink tab="pids" label="PIDs tab" onTabChange={onTabChange} />.
          These define the maximum rotation speed the FC will allow on each axis.
        </div>
        <GuideCodeBlock code={`# Starting rates
Roll:  500 deg/s
Pitch: 250 deg/s
Yaw:   150 deg/s`} />
        <div className="setting-note">
          Pitch is lower than roll because most wings pitch faster than intended and can
          pull too many G's. Yaw is low because differential thrust has limited yaw authority
          at speed, and rudder servos don't need aggressive rates.
        </div>
        <div className="setting-note">
          <strong>Important:</strong> After finding your S-term values (covered later), come back and
          revisit rates. S-term and rates together define your actual maximum rotation speed.
          If S-term is 50 and rates are 500, your actual max roll rate might be ~250 deg/s
          because S-term only commands 50% of the surface travel at full stick.
        </div>
        <ApplyButton label="Apply starting rates" onClick={() => onApply({
          rates: { ...RATE_DEFAULTS },
        })} />
      </Section>

      {/* Initial PID Tune */}
      <Section title="Initial PID Tune" defaultCollapsed={false}>
        <div className="setting-note">
          Open the <TabLink tab="pids" label="PIDs tab" onTabChange={onTabChange} />,
          and set all PIDs to small values. <strong>Do NOT use quad PID defaults</strong> —
          quad defaults (P=45, I=80, D=40) will cause violent, immediate oscillation on a wing.
        </div>
        <GuideCodeBlock code={`set p_roll = 10
set i_roll = 10
set d_roll = 10
set p_pitch = 10
set i_pitch = 10
set d_pitch = 10
set p_yaw = 10
set i_yaw = 0
set d_yaw = 0`} />
        <div className="setting-note">
          These are intentionally low. Start here, fly, and increase. You'll eventually
          push PIDs much higher (P=30-50 is common for tuned wings), but you need to
          find the safe range for YOUR specific airframe.
        </div>

        <div className="sub-group">
          <div className="sub-group-label">What Each PID Term Does on a Wing</div>
          <div className="setting-note">
            <strong>P (Proportional):</strong> Reacts to the difference between where you want to be and
            where you are. Higher P = faster correction, but too high = oscillation. On wings,
            P is fighting aerodynamic forces that change with speed — the same P value that's
            perfect at cruise might oscillate in a dive. This is why TPA exists.
          </div>
          <div className="setting-note">
            <strong>I (Integral):</strong> Accumulates error over time to eliminate steady-state offset.
            Keeps the wing tracking where you point it, compensates for trim changes with speed.
            But I-term builds up during fast maneuvers and causes bounce-back. SPA exists
            specifically to solve this.
          </div>
          <div className="setting-note">
            <strong>D (Derivative):</strong> Dampens the rate of change — resists rapid movements. Smooths
            out P-term oscillation and reduces overshoot. On wings, D is less critical than on
            quads because surfaces are inherently slower than motors. Too much D makes the wing
            feel sluggish.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Why Yaw I = 0 (Differential Thrust)</div>
          <div className="setting-note">
            With differential thrust, yaw authority comes from running one motor faster than
            the other. At fast airspeeds, propwash from both motors is overwhelmed by the
            freestream airflow — the motors simply can't create enough differential thrust
            to yaw effectively. This is normal and expected.
          </div>
          <div className="setting-note">
            But I-term doesn't know this. It sees "I'm commanding yaw but not getting yaw"
            and keeps integrating the error. By the time you slow down and the motors regain
            authority, I-term has accumulated a huge value that causes the motors to run at
            wildly different speeds — wasting battery, creating asymmetric thrust, and
            potentially causing a departure.
          </div>
          <div className="setting-note">
            Set <code>i_yaw = 0</code> and leave it there. If you specifically need yaw holding
            (crosswind compensation), add I-term back very carefully — single digits.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Feedforward</div>
          <div className="setting-note">
            Leave at defaults initially. Feedforward in Betaflight is a derivative of setpoint
            — it kicks in when you move the stick (providing a burst during the transition)
            but goes away when the stick stops moving. This is different from S-term, which
            responds to where the stick is (see the S-term section). FF may be helpful for
            wings but it's still in the testing phase.
          </div>
        </div>

        <ApplyButton label="Apply starting PIDs" onClick={() => onApply({
          pids: { ...PID_DEFAULTS },
        })} />
      </Section>

      {/* Disable Quad Features */}
      <Section title="Disable Quad Features" defaultCollapsed>
        <div className="setting-note">
          These quad-oriented features actively fight wing tuning. The tool sets them
          automatically but it's worth understanding why. Found in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code={`set anti_gravity_gain = 0       # fights TPA airspeed curve on wings
set d_max_roll = 0              # unpredictable on wings
set d_max_pitch = 0
set angle_earth_ref = 0         # quad axis mixing — wings handle this aerodynamically`} />

        <div className="sub-group">
          <div className="sub-group-label">Why Each One Is Disabled</div>
          <div className="setting-note">
            <strong>Anti-gravity</strong> boosts I-term during rapid throttle changes on quads (to prevent
            dropping during punchouts). On wings, rapid throttle changes are handled by the
            airspeed TPA curve — anti-gravity fights against it.
          </div>
          <div className="setting-note">
            <strong>D-max</strong> dynamically increases D-term during fast moves on quads. On wings,
            D-term behavior is already managed by TPA. Having D-max on top creates
            unpredictable interactions.
          </div>
          <div className="setting-note">
            <strong>Angle earth ref</strong> mixes yaw into roll when banked on quads (so a yaw command
            produces a coordinated turn). Wings handle this aerodynamically through their
            vertical stabilizer, dihedral, or differential thrust. Software mixing on top
            creates double-correction.
          </div>
        </div>
        <ApplyButton label="Apply wing essentials" onClick={() => onApply({
          wingSettings: {
            // These are fixed values emitted by cliGenerator, not slider values
          },
        })} />
      </Section>

      {/* Initial Filter Tune */}
      <Section title="Initial Filter Tune" defaultCollapsed>
        <div className="setting-note">
          Start conservative and open up later. Found in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code="set dterm_lpf1_dyn_expo = 8" />
        <div className="setting-note">
          This is equivalent to the 0.8 slider position in the Configurator. For extra
          safety on your first few flights, use 5 (equivalent to 0.5 on both sliders).
          Performance may degrade slightly but it's a safer starting point.
        </div>
        <div className="setting-note">
          Wings generally have cleaner gyro signals than quads (no 4 motors creating
          vibration harmonics), so you can usually run more open filters once you're
          confident in the airframe.
        </div>
        <ApplyButton label="Apply filter settings" onClick={() => onApply({
          wingSettings: { dterm_lpf1_dyn_expo: 8 },
        })} />
      </Section>

      {/* Max Voltage Setting */}
      <Section title="Max Voltage Setting" defaultCollapsed>
        <div className="setting-note">
          <strong>This MUST match your actual battery.</strong> Wrong voltage = wrong airspeed
          estimation = wrong TPA curve = wrong PIDs at every speed. Set in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} /> TPA section.
        </div>
        <table className="guide-table">
          <thead>
            <tr><th>Battery</th><th>Voltage</th><th>Setting</th></tr>
          </thead>
          <tbody>
            <tr><td>2S</td><td>8.4V</td><td>840</td></tr>
            <tr><td>3S</td><td>12.6V</td><td>1260</td></tr>
            <tr><td>4S</td><td>16.8V</td><td>1680</td></tr>
            <tr><td>5S</td><td>21.0V</td><td>2100</td></tr>
            <tr><td>6S</td><td>25.2V</td><td>2520</td></tr>
          </tbody>
        </table>
        <div className="setting-note">
          If you fly different cell counts on the same plane, set it to the maximum voltage
          you plan to use.
        </div>
        <div className="setting-note">
          <strong>Why voltage matters:</strong> The airspeed estimator uses voltage to scale throttle.
          At 100% throttle with a full 3S (12.6V), the motors produce more thrust than
          at 100% throttle with a sagging 3S (10.8V). The estimator compensates for this
          voltage difference to maintain accurate speed estimation throughout the flight.
        </div>
      </Section>

      {/* TPA Airspeed Curve */}
      <Section title="TPA Airspeed Curve — The Most Important Wing Setting" defaultCollapsed={false}>
        <div className="setting-note">
          For wings, TPA is <strong>airspeed PID attenuation</strong> — higher speed means less PIDs,
          lower speed means more PIDs. Configure in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13805">PR #13805</ExtLink>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">The Problem</div>
          <div className="setting-note">
            A wing's aerodynamic forces scale with the <strong>square</strong> of airspeed. Double the
            speed = four times the aerodynamic force on the control surfaces. This means:
          </div>
          <div className="setting-note">
            At <strong>low speed</strong> (near stall): surfaces barely do anything. You need HIGH PID
            gains to maintain control authority.
          </div>
          <div className="setting-note">
            At <strong>high speed</strong> (diving, full throttle): surfaces are extremely powerful. The
            SAME PID gains that worked at low speed now cause violent oscillation.
          </div>
          <div className="setting-note">
            If you tune PIDs for cruise, they'll oscillate in dives and be sloppy near stall.
            You can't win with a single set of gains.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Enable the Wing Curve</div>
          <GuideCodeBlock code={`set tpa_curve_type = HYPERBOLIC
set tpa_curve_stall_throttle = 30   # speed % at which wing stalls
set tpa_curve_pid_thr0 = 200        # PID multiplier at stall speed (200 = 2x)
set tpa_curve_pid_thr100 = 70       # PID multiplier at max speed (70 = 0.7x)
set tpa_curve_expo = 20             # curve shape (higher = more mid-range reduction)`} />
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Understanding the Parameters</div>
          <div className="setting-note">
            <strong>stall_throttle</strong> — the estimated speed % where your wing stalls.
            Think of 100% speed as "full throttle plus nose straight down for several seconds."
            Stall throttle is what fraction of that maximum represents stall speed. Fast,
            overpowered micro wings: ~10%. Heavier wings: ~25-30%.
          </div>
          <div className="setting-note">
            <strong>pid_thr0</strong> — PID multiplier at stall speed. 200 means PIDs are
            doubled near stall. Near stall your wing is barely flying — it needs all the help
            it can get.
          </div>
          <div className="setting-note">
            <strong>pid_thr100</strong> — PID multiplier at maximum speed. 70 means PIDs are
            reduced to 70% at top speed. If your wing shakes in dives, reduce this first.
          </div>
          <div className="setting-note">
            <strong>expo</strong> — Controls how quickly the curve transitions from boost to
            attenuation. Higher expo values reduce PIDs more aggressively in the mid-speed
            range. 0 would be roughly a straight line, 20+ gives the characteristic 1/x
            hyperbolic shape that matches how aerodynamic forces actually scale.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Interactive Curve Calculator</div>
          <div className="setting-note">
            Experiment with parameters before flying:{' '}
            <ExtLink href="https://www.desmos.com/calculator/xfgcd4lclh">Desmos TPA Curve Calculator</ExtLink>
          </div>
          <div className="setting-note">
            The tool also shows a live curve visualization in the Tuning tab so you can see
            the shape as you adjust sliders.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Tuning</div>
          <table className="guide-table">
            <thead>
              <tr><th>Symptom</th><th>Parameter</th><th>Direction</th></tr>
            </thead>
            <tbody>
              <tr><td>Oscillation at HIGH speed</td><td>pid_thr100</td><td>Reduce (70 → 50)</td></tr>
              <tr><td>Sloppy at HIGH speed</td><td>pid_thr100</td><td>Increase (70 → 90)</td></tr>
              <tr><td>Oscillation near STALL</td><td>pid_thr0</td><td>Reduce (200 → 150)</td></tr>
              <tr><td>Sloppy near STALL</td><td>pid_thr0</td><td>Increase (200 → 250)</td></tr>
              <tr><td>Good at extremes, bad in middle</td><td>expo</td><td>Increase</td></tr>
              <tr><td>Oscillation in mid-range only</td><td>expo</td><td>Increase</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Real-World Examples</div>
          <div className="setting-note"><strong>Fast micro wing (600mm, 3S):</strong> Barely stalls, huge speed range, mild TPA.</div>
          <GuideCodeBlock code={`set tpa_curve_stall_throttle = 10
set tpa_curve_pid_thr0 = 105
set tpa_curve_pid_thr100 = 60
set tpa_curve_expo = 45`} />
          <div className="setting-note"><strong>Medium FPV wing (800mm, 3S):</strong> Wider speed envelope, more pronounced stall.</div>
          <GuideCodeBlock code={`set tpa_curve_stall_throttle = 28
set tpa_curve_pid_thr0 = 170
set tpa_curve_pid_thr100 = 50
set tpa_curve_expo = 40`} />
          <div className="setting-note"><strong>Heavy cruiser/long-range (1200mm+, 4-6S):</strong> High wing loading, strong PID boost near stall.</div>
          <GuideCodeBlock code={`set tpa_curve_stall_throttle = 30
set tpa_curve_pid_thr0 = 200
set tpa_curve_pid_thr100 = 50
set tpa_curve_expo = 35`} />
        </div>

        <ApplyButton label="Apply TPA defaults" onClick={() => onApply({
          tpaSettings: { ...TPA_DEFAULTS },
        })} />
      </Section>

      {/* Airspeed Estimation */}
      <Section title="Airspeed Estimation" defaultCollapsed>
        <div className="setting-note">
          The TPA curve needs to know how fast you're going. GPS gives ground speed, not
          airspeed. A pitot tube would work but isn't realistic. So Betaflight estimates
          airspeed from data it already has.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13895">PR #13895</ExtLink>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Why Not Just Use Throttle?</div>
          <div className="setting-note">
            When throttle drops from 100% to 0%, the wing doesn't instantly slow down — it
            glides and slowly decelerates. When dropping from 100% to 50%, the wing reaches
            its new terminal speed much faster than when dropping to 0%. A single lowpass
            filter has the same time constant regardless — it can't model this asymmetry.
            The physics model handles all of this naturally because it's actually modeling
            the forces involved.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">How It Works</div>
          <div className="setting-note">
            The estimator runs a simple physics simulation every PID loop cycle:
            <strong> Thrust</strong> (from throttle x voltage) minus <strong>Drag</strong> (proportional
            to speed squared) plus/minus <strong>Gravity</strong> (based on pitch angle from
            accelerometer) = acceleration. Then it integrates acceleration to update the
            speed estimate.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">BASIC Mode (Recommended)</div>
          <GuideCodeBlock code={`set tpa_speed_type = BASIC
set tpa_speed_basic_delay = 1000    # ms — time to reach half terminal velocity
set tpa_speed_basic_gravity = 50    # dive speed as % of full-throttle speed
set tpa_speed_max_voltage = 1260    # your max battery voltage x 100`} />
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Delay Values by Wing Type</div>
          <table className="guide-table">
            <thead>
              <tr><th>Wing Type</th><th>Typical Delay</th></tr>
            </thead>
            <tbody>
              <tr><td>Light, overpowered micro wing</td><td>500-800 ms</td></tr>
              <tr><td>Medium FPV wing</td><td>800-1200 ms</td></tr>
              <tr><td>Heavy cruiser/long-range</td><td>1500-3000 ms</td></tr>
            </tbody>
          </table>
          <div className="setting-note">
            <strong>gravity</strong> — terminal dive speed at zero throttle as % of full throttle speed.
            50% is reasonable for most wings. Slippery, low-drag wings: 60-70%. Draggy flying
            wings with lots of surface area: 30-40%.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Tuning with Blackbox</div>
          <GuideCodeBlock code={`set debug_mode = TPA
set gps_use_3d_speed = ON
# Fly: full throttle level → chop → dive → pull up → repeat
# Compare debug[2] (estimated speed) against GPS 3D speed
# Too slow to react → reduce tpa_speed_basic_delay
# Too fast to react → increase tpa_speed_basic_delay
# Wrong during dives/climbs → adjust tpa_speed_basic_gravity`} />
          <div className="setting-note">
            A single flight with this debug mode gives very accurate estimation parameters.
            Fly on a calm, low-wind day for the best GPS comparison.
          </div>
        </div>
      </Section>

      {/* S-Term */}
      <Section title="S-Term — Direct Stick Feel" defaultCollapsed={false}>
        <div className="setting-note">
          S-term adds a direct connection between your stick and the servo. Configure in the{' '}
          <TabLink tab="pids" label="PIDs tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13679">PR #13679</ExtLink>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">The Problem</div>
          <div className="setting-note">
            On a quad, PID between stick and motors works fine — motors respond in milliseconds.
            On a wing, this feels indirect and sluggish. P-term is proportional to <strong>error</strong> —
            once the wing matches your desired rate, P-term goes to zero, but the surface still
            needs to be deflected. Only I-term keeps the surface there, and I-term is slow and
            creates bounce-back problems.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">The Solution</div>
          <div className="setting-note">
            S-term is proportional to your stick position and directly commands a percentage of
            servo travel. The PID controller then only handles stabilization around that position.
          </div>
          <div className="setting-note">
            <code>pidSum = P + I + D + F + S-term</code>
          </div>
          <div className="setting-note">
            <code>s_roll = 100</code>: full stick = 100% surface deflection. Pure passthrough
            with rates applied. PIDs at 0 would be flying without stabilization.
          </div>
          <div className="setting-note">
            <code>s_roll = 50</code>: full stick = 50% deflection from S-term, plus whatever
            P+I+D contribute for stabilization.
          </div>
          <div className="setting-note">
            <code>s_roll = 0</code>: pure PID stabilization, no direct stick-to-surface mapping.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Recommended Start</div>
          <GuideCodeBlock code={`set s_pitch = 50
set s_roll = 50
set s_yaw = 0    # 0 for diff thrust, 50 for rudder servo`} />
          <div className="setting-note">
            <strong>Yaw S-term must be 0 with differential thrust.</strong> Yaw goes through motors
            via the PID controller — there's no servo to directly command.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Tuning</div>
          <table className="guide-table">
            <thead>
              <tr><th>S-Term Value</th><th>Feel</th><th>Who It's For</th></tr>
            </thead>
            <tbody>
              <tr><td>20-30</td><td>Heavily stabilized, FC does most work</td><td>Beginners, long-range cruising</td></tr>
              <tr><td>40-60</td><td>Balanced — direct feel with stabilization</td><td>Most pilots (recommended)</td></tr>
              <tr><td>70-90</td><td>Very direct, almost like flying without FC</td><td>Experienced acro/freestyle</td></tr>
              <tr><td>100 (PIDs=0)</td><td>Pure passthrough with BF rates applied</td><td>Testing, "old school" feel</td></tr>
            </tbody>
          </table>
          <div className="setting-note">
            After finding your preferred S-term, <strong>adjust your rates accordingly</strong>.
            S-term + rates together define your maximum rotation speed on each axis.
          </div>
        </div>

        <ApplyButton label="Apply S-term (50/50/0)" onClick={() => onApply({
          wingSettings: { s_roll: 50, s_pitch: 50, s_yaw: 0 },
        })} />
      </Section>

      {/* SPA */}
      <Section title="SPA — Setpoint PID Attenuation" defaultCollapsed>
        <div className="setting-note">
          SPA monitors your stick position and attenuates PID terms during fast maneuvers
          to prevent bounce-back. Configure in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13719">PR #13719</ExtLink>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">The Problem</div>
          <div className="setting-note">
            During a fast roll (say 400 deg/s, ~0.9 seconds for 360), the PID controller sees
            a large error the entire time. I-term integrates this error. When you center the
            stick, accumulated I-term pushes the wing past center — bounce-back. The faster
            the maneuver and the higher your I-gain, the worse it gets.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">SPA Modes</div>
          <table className="guide-table">
            <thead>
              <tr><th>Mode</th><th>What It Does</th><th>When to Use</th></tr>
            </thead>
            <tbody>
              <tr><td>OFF</td><td>No attenuation</td><td>Only if no bounce-back</td></tr>
              <tr><td>I_FREEZE</td><td>Freezes I-term during fast sticks</td><td>Recommended start</td></tr>
              <tr><td>PD_I_FREEZE</td><td>Freezes I, reduces P+D</td><td>If I_FREEZE alone isn't enough</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Recommended Start</div>
          <GuideCodeBlock code={`set spa_roll_mode = I_FREEZE
set spa_pitch_mode = I_FREEZE
set spa_yaw_mode = I_FREEZE
set spa_roll_center = 200
set spa_roll_width = 70
set spa_pitch_center = 150
set spa_pitch_width = 70
set spa_yaw_center = 150
set spa_yaw_width = 70`} />
        </div>

        <div className="sub-group">
          <div className="sub-group-label">How Center/Width Work</div>
          <div className="setting-note">
            SPA activates based on stick deflection on a 0-500 scale (0 = centered, 500 = full).
          </div>
          <div className="setting-note">
            <strong>Below (center - width/2):</strong> Full PID — steady flight, small corrections.
          </div>
          <div className="setting-note">
            <strong>Between center +/- width/2:</strong> Gradual transition — blending between full PID and attenuation.
          </div>
          <div className="setting-note">
            <strong>Above (center + width/2):</strong> Full attenuation — I-term frozen during fast maneuvers.
          </div>
          <div className="setting-note">
            Example with roll center=200, width=70: stick 0-165 (0-33%) = full PID,
            165-235 (33-47%) = transitioning, 235-500 (47-100%) = I-term frozen.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Tuning</div>
          <table className="guide-table">
            <thead>
              <tr><th>Symptom</th><th>Adjustment</th></tr>
            </thead>
            <tbody>
              <tr><td>Bounce-back after fast rolls</td><td>Lower center value (200 → 150) or widen width</td></tr>
              <tr><td>Bounce-back still persists</td><td>Try PD_I_FREEZE mode</td></tr>
              <tr><td>Won't hold heading in gentle turns</td><td>Raise center value (200 → 250)</td></tr>
              <tr><td>Drifts during steady cruise</td><td>Center too low — PID isn't getting enough I-term</td></tr>
            </tbody>
          </table>
        </div>

        <ApplyButton label="Apply SPA defaults" onClick={() => onApply({
          spaSettings: { ...SPA_DEFAULTS },
        })} />
      </Section>

      {/* I-Term Relax */}
      <Section title="I-Term Relax" defaultCollapsed>
        <div className="setting-note">
          Complements SPA with a different mechanism. While SPA attenuates based on stick
          <strong> position</strong>, iterm_relax reduces I-term response based on how fast the
          setpoint is <strong>changing</strong>. Found in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code="set iterm_relax_cutoff = 5" />
        <div className="setting-note">
          The default quad value is 15. Wings need a lower value because servos respond
          slower than motors — by the time I-term has built up a response, the moment has
          passed and the correction causes overshoot.
        </div>
        <div className="setting-note">
          If your plane reacts quickly and you want sharper, more precise maneuvers,
          increase this gradually (try 8, then 10). Higher values let I-term respond faster
          to setpoint changes but increase bounce-back risk.
        </div>
        <ApplyButton label="Apply iterm relax (5)" onClick={() => onApply({
          wingSettings: { iterm_relax_cutoff: 5 },
        })} />
      </Section>

      {/* TPA Mode PDS */}
      <Section title="TPA Mode PDS — Speed-Dependent S-Term" defaultCollapsed>
        <div className="setting-note">
          Once your TPA curve and airspeed estimation are well-tuned, PDS makes S-term
          itself scale with the TPA curve. Configure in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/14010">PR #14010</ExtLink>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">The Problem PDS Solves</div>
          <div className="setting-note">
            With <code>tpa_mode = PD</code>, the TPA curve attenuates P and D but S-term stays constant.
            The same stick deflection gives the same surface deflection regardless of speed.
            But aerodynamic forces scale with V². At high speed, a small deflection produces a
            huge moment. At low speed, the same deflection barely does anything. Your actual
            roll rate changes dramatically with speed.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">TPA Modes Compared</div>
          <table className="guide-table">
            <thead>
              <tr><th>Mode</th><th>What's Attenuated</th><th>Best For</th></tr>
            </thead>
            <tbody>
              <tr><td>D</td><td>D-term only</td><td>Quads (default)</td></tr>
              <tr><td>PD</td><td>P and D terms</td><td>Wings — recommended start</td></tr>
              <tr><td>PDS</td><td>P, D, and S-term</td><td>Wings — advanced, consistent feel</td></tr>
            </tbody>
          </table>
        </div>

        <div className="setting-note">
          PDS also includes <strong>setpoint attenuation</strong>: when speed is so low that S-term
          would need to exceed 100% to maintain the commanded rate, the setpoint itself is
          reduced. This prevents the FC from commanding rates the wing physically can't achieve
          near stall.
        </div>

        <div className="setting-note">
          Some pilots prefer PD because they WANT the speed-dependent feel — they know how much
          surface deflection they're getting at any speed. PDS trades that predictability for
          consistency. Try both and see which you prefer.
        </div>

        <GuideCodeBlock code={`set tpa_mode = PDS
# Debug:
set debug_mode = WING_SETPOINT   # setpoint before/after TPA
set debug_mode = S_TERM          # S-term before/after TPA`} />
      </Section>

      {/* Differential Thrust Tuning */}
      <Section title="Differential Thrust Tuning" defaultCollapsed>
        <div className="setting-note">
          For wings with 2 motors using throttle differential for yaw control.
          Configure motor mix in the <TabLink tab="wing-setup" label="Wing Setup tab" onTabChange={onTabChange} />.
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Motor Mix</div>
          <GuideCodeBlock code={`mmix 0  1.000  0.000  0.000 -0.300    # left motor
mmix 1  1.000  0.000  0.000  0.300    # right motor`} />
          <div className="setting-note">
            The yaw value controls how much throttle differential is applied. This is one of
            the most commonly mis-set values — too high causes violent yaw oscillation.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Yaw Mix Values</div>
          <table className="guide-table">
            <thead>
              <tr><th>Value</th><th>Behavior</th><th>Use Case</th></tr>
            </thead>
            <tbody>
              <tr><td>+/-0.15</td><td>Gentle</td><td>Small/light wings</td></tr>
              <tr><td>+/-0.20-0.25</td><td>Moderate</td><td>Good starting point for most wings</td></tr>
              <tr><td>+/-0.30-0.35</td><td>Aggressive</td><td>Medium wings with good prop clearance</td></tr>
              <tr><td>+/-0.40</td><td>Very aggressive</td><td>Large wings, underpowered</td></tr>
              <tr><td>+/-0.50+</td><td>Dangerous</td><td>Almost always causes violent over-control</td></tr>
            </tbody>
          </table>
          <div className="setting-note">
            <strong>Start at +/-0.25 and work up.</strong> At low speed with full yaw stick, one
            motor goes to nearly zero and the other goes to maximum. The wing yaws violently
            and one side stalls from the asymmetric thrust.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Yaw PIDs for Diff Thrust</div>
          <GuideCodeBlock code={`set p_yaw = 20        # start low, can go to 50-100+
set i_yaw = 0         # MUST be zero (see PID section for why)
set d_yaw = 0         # usually not needed
set s_yaw = 0         # S-term is for servos, not motors`} />
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Verification (Props OFF!)</div>
          <table className="guide-table">
            <thead>
              <tr><th>Stick Input</th><th>Left Motor</th><th>Right Motor</th></tr>
            </thead>
            <tbody>
              <tr><td>Yaw LEFT</td><td>Slower/stop</td><td>Faster</td></tr>
              <tr><td>Yaw RIGHT</td><td>Faster</td><td>Slower/stop</td></tr>
            </tbody>
          </table>
          <div className="setting-note">
            If reversed: swap the yaw sign in your mmix, or swap the motor resource assignments.
          </div>
        </div>
      </Section>

      {/* Angle Mode for Wings */}
      <Section title="Angle Mode for Wings" defaultCollapsed>
        <div className="setting-note">
          In angle mode (self-level), some wings tend to climb or dive when sticks are centered.
          This is usually a dive tendency caused by the wing's natural pitch-down moment.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/14009">PR #14009</ExtLink>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Pitch Offset</div>
          <div className="setting-note">
            If the aircraft <strong>loses altitude</strong> (noses down) in angle mode:
          </div>
          <GuideCodeBlock code="set angle_pitch_offset = -50       # minus 5 degrees (nose up trim)" />
          <div className="setting-note">
            If the aircraft <strong>gains altitude</strong> (noses up) in angle mode:
          </div>
          <GuideCodeBlock code="set angle_pitch_offset = 50        # plus 5 degrees (nose down trim)" />
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Disable Earth Reference</div>
          <GuideCodeBlock code="set angle_earth_ref = 0" />
          <div className="setting-note">
            Disables the quad-specific axis coupling in angle mode. Wings handle coordinated
            turns aerodynamically — software coupling creates double-correction.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Passthrough Mode</div>
          <div className="setting-note">
            BF has a <code>passthrough</code> mode that sends transmitter inputs directly to
            servos without any PID processing. Useful for first test flights to verify servo
            setup, emergency backup if PID tuning goes wrong mid-flight, or "old school"
            flying without FC assistance. Set up passthrough on a switch so you can always
            fall back to it.
          </div>
        </div>
      </Section>

      {/* General Tuning Approach */}
      <Section title="General Tuning Approach" defaultCollapsed>
        <div className="setting-note">
          Tuning is similar to a quadcopter, but servos have slower reaction time than motors,
          so tracking will be more latent.
        </div>

        <div className="sub-group">
          <div className="sub-group-label">The Tuning Loop</div>
          <div className="setting-note">
            1. <strong>Increase P</strong> until you see the beginning of oscillation (shuddering, fast wobble).
            Back off 15-20%.
          </div>
          <div className="setting-note">
            2. <strong>Increase I</strong> to improve tracking accuracy — the wing holds attitude better,
            compensates for trim changes with speed. Watch for bounce-back.
          </div>
          <div className="setting-note">
            3. <strong>Increase D</strong> to dampen overshoot if needed. Less critical on wings than quads.
          </div>
          <div className="setting-note">
            4. <strong>Adjust TPA</strong> to handle speed-dependent behavior — oscillation only at certain
            speeds means TPA needs tuning, not base PIDs.
          </div>
          <div className="setting-note">
            5. <strong>Tune S-term</strong> to taste — find the balance between direct feel and stabilization.
          </div>
          <div className="setting-note">
            6. <strong>Adjust SPA</strong> if bounce-back occurs during aggressive maneuvers.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">What Can't Be Tuned Away</div>
          <div className="setting-note">
            Gusty, turbulent air will still make your plane shake. The degree depends on craft
            size, wing loading, and aerodynamics. A 600mm micro wing in 15mph gusts will
            always get tossed around — no amount of PID tuning changes the physics. Larger,
            heavier wings with higher wing loading handle turbulence better.
          </div>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Typical Tuned Values</div>
          <div className="setting-note"><strong>Fast micro wing (600mm, 3S, diff thrust):</strong></div>
          <GuideCodeBlock code={`set p_roll = 30     set i_roll = 45     set d_roll = 12
set p_pitch = 35    set i_pitch = 50    set d_pitch = 15
set p_yaw = 50      set i_yaw = 0       set d_yaw = 0
set s_roll = 50     set s_pitch = 50    set s_yaw = 0`} />
          <div className="setting-note"><strong>Medium FPV wing (800mm, 3S, diff thrust):</strong></div>
          <GuideCodeBlock code={`set p_roll = 10     set i_roll = 20     set d_roll = 5
set p_pitch = 15    set i_pitch = 25    set d_pitch = 8
set p_yaw = 30      set i_yaw = 0       set d_yaw = 0
set s_roll = 50     set s_pitch = 50    set s_yaw = 0`} />
          <div className="setting-note">
            Note the huge difference — the micro wing is tuned much hotter because it's
            lighter, faster, and more responsive. Your wing will have its own sweet spot.
          </div>
        </div>
      </Section>

      {/* Blackbox Debug Modes Reference */}
      <Section title="Blackbox Debug Modes" defaultCollapsed>
        <table className="guide-table">
          <thead>
            <tr><th>Debug Mode</th><th>What It Shows</th><th>When to Use</th></tr>
          </thead>
          <tbody>
            <tr><td>TPA</td><td>debug[0]=TPA factor, debug[2]=estimated speed</td><td>Tuning airspeed estimation</td></tr>
            <tr><td>WING_SETPOINT</td><td>Roll/pitch setpoint before/after TPA</td><td>Verifying PDS setpoint attenuation</td></tr>
            <tr><td>S_TERM</td><td>S-term before/after TPA per axis</td><td>Verifying S-term scaling in PDS</td></tr>
            <tr><td>D_LPF</td><td>Pre-TPA D-term values</td><td>Checking D-term filter behavior</td></tr>
            <tr><td>GYRO_SCALED</td><td>Raw gyro rates</td><td>General vibration and noise analysis</td></tr>
          </tbody>
        </table>
        <GuideCodeBlock code={`set debug_mode = TPA
save`} />
        <div className="setting-note">
          View the debug values in Blackbox Explorer or the Betaflight Configurator Sensors tab.
        </div>
      </Section>

      {/* Troubleshooting */}
      <Section title="Troubleshooting" defaultCollapsed>
        <div className="sub-group">
          <div className="sub-group-label">Speed-Dependent Issues (TPA)</div>
          <table className="guide-table">
            <thead>
              <tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr>
            </thead>
            <tbody>
              <tr><td>Shakes only at high speed</td><td>TPA not reducing PIDs enough</td><td>Reduce pid_thr100</td></tr>
              <tr><td>Shakes only near stall</td><td>TPA boosting PIDs too much</td><td>Reduce pid_thr0</td></tr>
              <tr><td>Shakes at a specific speed band</td><td>TPA curve shape wrong</td><td>Increase expo</td></tr>
              <tr><td>Shakes during throttle changes/dives</td><td>Airspeed estimation inaccurate</td><td>Tune with debug_mode = TPA</td></tr>
              <tr><td>TPA feels wrong despite correct settings</td><td>Battery voltage mismatch</td><td>Verify max_voltage and calibration</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">PID Issues</div>
          <table className="guide-table">
            <thead>
              <tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr>
            </thead>
            <tbody>
              <tr><td>Oscillation at all speeds</td><td>PIDs too high</td><td>Reduce P and D</td></tr>
              <tr><td>Sloppy/loose at all speeds</td><td>PIDs too low</td><td>Increase P first, then D</td></tr>
              <tr><td>Bounce-back after fast rolls</td><td>I-term windup</td><td>Enable SPA (I_FREEZE), reduce iterm_relax_cutoff</td></tr>
              <tr><td>Wing drifts/doesn't hold attitude</td><td>I-term too low</td><td>Increase I (carefully)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Motor/Servo Issues</div>
          <table className="guide-table">
            <thead>
              <tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr>
            </thead>
            <tbody>
              <tr><td>Motors run different speeds in straight flight</td><td>Yaw I-term buildup</td><td>Set i_yaw = 0</td></tr>
              <tr><td>Violent yaw oscillation</td><td>Yaw motor mix too high</td><td>Reduce mmix yaw values (try +/-0.20)</td></tr>
              <tr><td>Servos buzzing/jittering</td><td>Servo update rate too high</td><td>Reduce servo_pwm_rate to 50</td></tr>
              <tr><td>Controls feel robotic/indirect</td><td>S-term too low</td><td>Increase s_roll, s_pitch</td></tr>
              <tr><td>Controls feel twitchy</td><td>S-term or PIDs too high</td><td>Reduce S-term or PIDs</td></tr>
            </tbody>
          </table>
        </div>

        <div className="sub-group">
          <div className="sub-group-label">Angle Mode Issues</div>
          <table className="guide-table">
            <thead>
              <tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr>
            </thead>
            <tbody>
              <tr><td>Wing climbs in angle mode</td><td>Pitch offset wrong direction</td><td>Set angle_pitch_offset positive</td></tr>
              <tr><td>Wing dives in angle mode</td><td>Pitch offset needed</td><td>Set angle_pitch_offset negative (e.g. -50)</td></tr>
              <tr><td>Jerky axis coupling in banked turns</td><td>Earth reference enabled</td><td>Set angle_earth_ref = 0</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Tuning Order */}
      <Section title="Tuning Order Checklist" defaultCollapsed>
        <ol className="guide-checklist">
          <li>Set servo_pwm_rate (150 or 333) — <em>matches your servo hardware</em></li>
          <li>Set safe starting PIDs (10/10/10) — <em>low and safe</em></li>
          <li>Set starting rates (500/250/150) — <em>reasonable range for most wings</em></li>
          <li>Set filters (D-term expo to 8) — <em>conservative filtering</em></li>
          <li>Disable: anti_gravity, d_max, angle_earth_ref — <em>remove quad features</em></li>
          <li>Set max voltage for your battery — <em>critical for airspeed estimation</em></li>
          <li><strong>First flight — verify basic stability</strong> — <em>if it doesn't fly stable here, fix PIDs before anything else</em></li>
          <li>Tune PIDs up gradually — <em>P first, then I, then D. Back off from oscillation by 15-20%</em></li>
          <li>Set S-term (50/50/0 for diff thrust) — <em>find your preferred feel</em></li>
          <li>Adjust rates to match S-term — <em>rates + S-term = actual rotation speed</em></li>
          <li>Enable TPA curve (HYPERBOLIC) — <em>tune stall throttle first, then the extremes</em></li>
          <li>Enable SPA (I_FREEZE) with defaults — <em>tune center/width if bounce-back persists</em></li>
          <li>Set iterm_relax_cutoff = 5 — <em>complements SPA</em></li>
          <li>Optional: try tpa_mode = PDS — <em>speed-dependent S-term for consistent feel</em></li>
          <li>Optional: tune airspeed estimation with blackbox — <em>debug_mode = TPA, compare vs GPS</em></li>
        </ol>
      </Section>

      {/* Quick Reference */}
      <Section title="Quick Reference — All Wing Defaults" defaultCollapsed={false}>
        <GuideCodeBlock code={`# PIDs — safe starting point
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
set gps_use_3d_speed = ON`} />
        <ApplyButton label="Apply All Wing Defaults" onClick={() => onApply({
          pids: { ...PID_DEFAULTS },
          rates: { ...RATE_DEFAULTS },
          wingSettings: { ...WING_DEFAULTS },
          tpaSettings: { ...TPA_DEFAULTS, tpa_mode: 'PD' },
          spaSettings: { ...SPA_DEFAULTS },
        })} />
      </Section>

      {/* Attribution */}
      <div className="tpa-info-text" style={{ marginTop: 16, fontSize: 11 }}>
        Based on{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/discussions/14032">limonspb's Betaflight wing firmware development</ExtLink>.
        PRs:{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/pull/13679">#13679</ExtLink>,{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/pull/13719">#13719</ExtLink>,{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/pull/13805">#13805</ExtLink>,{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/pull/13895">#13895</ExtLink>,{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/pull/14010">#14010</ExtLink>,{' '}
        <ExtLink href="https://github.com/betaflight/betaflight/pull/14009">#14009</ExtLink>
      </div>
    </div>
  );
}
