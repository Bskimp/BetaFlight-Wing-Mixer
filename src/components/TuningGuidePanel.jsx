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
        <ExtLink href="https://github.com/betaflight/betaflight/discussions/14032">limonspb's tuning draft</ExtLink>{' '}
        for Betaflight 4.6. Use the "Apply" buttons to load recommended starting values into the tool.
      </div>

      {/* Important Notes */}
      <Section title="Important Notes" defaultCollapsed={false}>
        <div className="setting-note">
          Betaflight's wing code is new and tested by a small but growing community.
          Most settings are configured via CLI, so setup isn't user-friendly yet.
        </div>
        <div className="setting-note">
          Making a wing fly is straightforward. Making it fly <strong>well</strong> requires tuning
          dozens of wing-specific parameters. Fixed-wing tuning is similar to quads but
          the aerodynamics are fundamentally different.
        </div>
        <div className="setting-note">
          This guide covers only wing-specific tuning. It assumes you already know
          standard Betaflight configuration (ports, modes, VTX, OSD, receiver, GPS, etc.).
        </div>
      </Section>

      {/* Servo Update Rate */}
      <Section title="Servo Update Rate" defaultCollapsed>
        <div className="setting-note">
          Try increasing servo update rate for better response. Found in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code="set servo_pwm_rate = 150" />
        <div className="setting-note">
          For digital servos, you can try higher (333 Hz). If servos buzz, jitter, or
          don't respond properly, bring it back to 50 Hz.
        </div>
        <ApplyButton label="Apply servo rate (150)" onClick={() => onApply({
          wingSettings: { servo_pwm_rate: 150 },
        })} />
      </Section>

      {/* Initial Rates */}
      <Section title="Initial Rates" defaultCollapsed>
        <div className="setting-note">
          Set starting rates in the <TabLink tab="pids" label="PIDs tab" onTabChange={onTabChange} />.
          Adjust later based on your plane's performance. After finding your S-term values,
          revisit rates to match desired rotation speeds.
        </div>
        <GuideCodeBlock code={`# Starting rates
Roll:  500 deg/s
Pitch: 250 deg/s
Yaw:   150 deg/s`} />
        <ApplyButton label="Apply starting rates" onClick={() => onApply({
          rates: { ...RATE_DEFAULTS },
        })} />
      </Section>

      {/* Initial PID Tune */}
      <Section title="Initial PID Tune" defaultCollapsed={false}>
        <div className="setting-note">
          Open the <TabLink tab="pids" label="PIDs tab" onTabChange={onTabChange} />,
          and set all PIDs to small values. <strong>Do NOT use quad PID defaults</strong> —
          quad defaults (P=45, I=80, D=40) will cause violent oscillation on a wing.
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
          You can leave feedforward at defaults initially — it's not critical.
          Later you'll be able to increase PIDs by a LOT, but this is a safe starting point.
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Yaw PIDs for Differential Thrust</div>
          <div className="setting-note">
            Yaw P and D can go quite high (50, 100, even 150). But start low and tune up.
          </div>
          <div className="setting-note">
            <strong>I-term for yaw must be zero</strong> to avoid I-term buildup. At fast airspeeds,
            yaw authority from differential thrust is limited — I-term accumulates error
            and causes motors to run at different speeds for no reason.
          </div>
        </div>
        <ApplyButton label="Apply starting PIDs" onClick={() => onApply({
          pids: { ...PID_DEFAULTS },
        })} />
      </Section>

      {/* Initial Filter Tune */}
      <Section title="Initial Filter Tune" defaultCollapsed>
        <div className="setting-note">
          Start with default filter settings and move the D-term filter expo to 8
          (equivalent to 0.8 slider in Configurator). For extra safety, use 5 (both sliders at 0.5).
          You can open these up later as you learn how your airframe behaves.
          Found in the <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code="set dterm_lpf1_dyn_expo = 8" />
        <ApplyButton label="Apply filter settings" onClick={() => onApply({
          wingSettings: { dterm_lpf1_dyn_expo: 8 },
        })} />
      </Section>

      {/* Disable Quad Features */}
      <Section title="Disable Quad Features" defaultCollapsed>
        <div className="setting-note">
          These quad-oriented features interfere with wing tuning. They are automatically
          set in the <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} /> wing settings.
        </div>
        <GuideCodeBlock code={`set anti_gravity_gain = 0       # fights TPA airspeed curve on wings
set d_max_roll = 0              # unpredictable on wings
set d_max_pitch = 0
set angle_earth_ref = 0         # quad axis mixing — wings handle this aerodynamically`} />
        <ApplyButton label="Apply wing essentials" onClick={() => onApply({
          wingSettings: {
            // These are fixed values emitted by cliGenerator, not slider values
          },
        })} />
      </Section>

      {/* Max Voltage Setting */}
      <Section title="Max Voltage Setting" defaultCollapsed>
        <div className="setting-note">
          <strong>Critical for airspeed estimation.</strong> Set the max voltage for your battery
          in the <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} /> TPA section.
          An inaccurate voltage reading shifts your entire TPA curve.
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
          If you fly different cell counts on the same plane, set it to the maximum voltage you plan to use.
        </div>
      </Section>

      {/* TPA Airspeed Curve */}
      <Section title="TPA Airspeed Curve" defaultCollapsed={false}>
        <div className="setting-note">
          For wings, TPA is <strong>airspeed PID attenuation</strong> — higher speed means less PIDs,
          lower speed means more PIDs. This is the most important wing tuning parameter.
          Configure in the <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Why It Matters</div>
          <div className="setting-note">
            A wing's aerodynamic forces scale with the square of airspeed. At low speed you
            need high PID gains to maintain authority. At high speed those same gains cause
            oscillation. The TPA curve continuously adjusts PID gains across the speed range.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Curve Parameters</div>
          <GuideCodeBlock code={`set tpa_curve_type = HYPERBOLIC
set tpa_curve_stall_throttle = 30   # speed % at which wing stalls
set tpa_curve_pid_thr0 = 200        # PID multiplier at stall speed (200 = 2x)
set tpa_curve_pid_thr100 = 70       # PID multiplier at max speed (70 = 0.7x)
set tpa_curve_expo = 20             # curve shape (positive = bend down)`} />
        </div>
        <div className="sub-group">
          <div className="sub-group-label">How to Read These</div>
          <div className="setting-note">
            <strong>tpa_curve_stall_throttle</strong> — the estimated speed % where the wing stalls.
            100% speed represents full throttle plus nose straight down. In practical terms:
            the throttle where the wing can't maintain level flight and the nose starts to dip.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Tuning</div>
          <div className="setting-note">
            1. Set stall throttle — fast, light wings: ~10%. Heavier wings: ~25-30%.
          </div>
          <div className="setting-note">
            2. Oscillates at HIGH speed? Reduce pid_thr100 (70 → 50)
          </div>
          <div className="setting-note">
            3. Sloppy at HIGH speed? Increase pid_thr100 (70 → 90)
          </div>
          <div className="setting-note">
            4. Oscillates near STALL? Reduce pid_thr0 (200 → 150)
          </div>
          <div className="setting-note">
            5. Sloppy near STALL? Increase pid_thr0 (200 → 250)
          </div>
          <div className="setting-note">
            6. Good at extremes, bad in the middle? Increase expo.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Real-World Examples</div>
          <div className="setting-note"><strong>Fast micro wing (600mm, 3S)</strong> — barely stalls, mild TPA:</div>
          <GuideCodeBlock code={`set tpa_curve_stall_throttle = 10
set tpa_curve_pid_thr0 = 105
set tpa_curve_pid_thr100 = 60
set tpa_curve_expo = 45`} />
          <div className="setting-note"><strong>Medium FPV wing (800mm, 3S)</strong> — wider speed envelope:</div>
          <GuideCodeBlock code={`set tpa_curve_stall_throttle = 28
set tpa_curve_pid_thr0 = 170
set tpa_curve_pid_thr100 = 50
set tpa_curve_expo = 40`} />
        </div>
        <ApplyButton label="Apply TPA defaults" onClick={() => onApply({
          tpaSettings: { ...TPA_DEFAULTS },
        })} />
      </Section>

      {/* Airspeed Estimation */}
      <Section title="Airspeed Estimation" defaultCollapsed>
        <div className="setting-note">
          Instead of using raw throttle for TPA, Betaflight estimates airspeed using a
          physics model that accounts for throttle, battery voltage, pitch angle, and drag.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13895">PR #13895</ExtLink>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Why Not Just Use Throttle?</div>
          <div className="setting-note">
            When throttle drops from 100% to 0%, the wing doesn't instantly slow down — it
            glides and slowly decelerates. A simple lowpass filter doesn't model this correctly
            because deceleration is fundamentally different from acceleration. The physics model
            handles these asymmetries naturally.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">BASIC Mode (Recommended)</div>
          <GuideCodeBlock code={`set tpa_speed_type = BASIC
set tpa_speed_basic_delay = 1000    # ms — time to reach half terminal velocity
set tpa_speed_basic_gravity = 50    # dive speed as % of full-throttle speed
set tpa_speed_max_voltage = 1260    # your max battery voltage x 100`} />
          <div className="setting-note">
            <strong>delay</strong> — time to reach half terminal velocity from 0→100% throttle in level flight.
            Light, high-powered wings: ~500-1000ms. Heavy wings: ~1500-3000ms.
          </div>
          <div className="setting-note">
            <strong>gravity</strong> — terminal dive speed at zero throttle as % of full throttle speed.
            50% is reasonable for most wings.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Tuning with Blackbox</div>
          <GuideCodeBlock code={`set debug_mode = TPA
# Fly: full throttle level → chop → dive → pull up → repeat
# Compare debug trace (estimated speed) against GPS 3D speed
# Adjust tpa_speed_basic_delay until estimation tracks GPS`} />
        </div>
      </Section>

      {/* S-Term */}
      <Section title="S-Term — Direct Stick Feel" defaultCollapsed={false}>
        <div className="setting-note">
          BF's PID controller for wings uses an extra term called S-term, making it a PIDFS controller.
          Configure in the <TabLink tab="pids" label="PIDs tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13679">PR #13679</ExtLink>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">What It Is</div>
          <div className="setting-note">
            S-term is proportional to stick position and directly commands servo output.
            Without it, PID is the only path from stick to surface (feels indirect).
            With S-term, your stick position <strong>directly</strong> commands a percentage of servo travel;
            PID only handles stabilization.
          </div>
          <div className="setting-note">
            <code>s_roll = 100</code> → surfaces deflect 100% when roll stick is at 100%.
            <code>s_roll = 50</code> → 50% deflection. <code>s_roll = 0</code> → pure PID stabilization.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Recommended Start</div>
          <GuideCodeBlock code={`set s_pitch = 50
set s_roll = 50
set s_yaw = 0    # 0 for diff thrust, 50 for rudder servo`} />
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Tuning</div>
          <div className="setting-note">
            Higher S-term = more direct feel, less PID influence, more like flying without FC.
            Lower = more stabilized, PID does more work. Most pilots settle between 30-70.
          </div>
          <div className="setting-note">
            Once you find your preferred S-term, <strong>adjust your rates accordingly</strong>.
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
          SPA turns off some or all PID terms during high-rate maneuvers to prevent
          I-term buildup that causes bounce-back. Configure in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/13719">PR #13719</ExtLink>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">The Problem</div>
          <div className="setting-note">
            During a fast roll, PID error is large. I-term integrates this error. When you
            center the sticks, accumulated I-term pushes the wing past center — bounce-back.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">SPA Modes</div>
          <div className="setting-note">
            <strong>OFF</strong> — no attenuation.
            <strong>I_FREEZE</strong> — freezes I-term during fast moves (recommended start).
            <strong>PD_I_FREEZE</strong> — also reduces P+D (more aggressive).
          </div>
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
            SPA activates based on stick position (0-500 scale).
            Below (center - width/2): full PID.
            Between center +/- width/2: gradual transition.
            Above (center + width/2): full attenuation.
          </div>
          <div className="setting-note">
            Example with center=200, width=70: stick 0-165 = full PID, 165-235 = transitioning, 235-500 = I-term frozen.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Tuning</div>
          <div className="setting-note">
            Bounce-back after fast rolls? Lower center or widen width.
            Won't hold heading during gentle turns? Raise center.
            Start with I_FREEZE. Try PD_I_FREEZE if bounce-back persists.
          </div>
        </div>
        <ApplyButton label="Apply SPA defaults" onClick={() => onApply({
          spaSettings: { ...SPA_DEFAULTS },
        })} />
      </Section>

      {/* I-Term Relax */}
      <Section title="I-Term Relax" defaultCollapsed>
        <div className="setting-note">
          Complements SPA by reducing I-term response to fast setpoint changes.
          Default quad value is 15 — wings need a lower value. Found in the{' '}
          <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
        </div>
        <GuideCodeBlock code="set iterm_relax_cutoff = 5" />
        <div className="setting-note">
          If your plane reacts quickly and you want sharper maneuvers, increase this later.
        </div>
        <ApplyButton label="Apply iterm relax (5)" onClick={() => onApply({
          wingSettings: { iterm_relax_cutoff: 5 },
        })} />
      </Section>

      {/* TPA Mode PDS */}
      <Section title="TPA Mode PDS — Speed-Dependent S-Term" defaultCollapsed>
        <div className="setting-note">
          Once your plane flies well, bring back faster turns by making S-term dynamic.
          Configure in the <TabLink tab="tuning" label="Tuning tab" onTabChange={onTabChange} />.
          Details: <ExtLink href="https://github.com/betaflight/betaflight/pull/14010">PR #14010</ExtLink>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">What PDS Does</div>
          <div className="setting-note">
            With constant S-term (PD mode), the same stick deflection gives the same surface
            deflection regardless of airspeed. But aerodynamic forces scale with speed squared.
            PDS makes S-term dynamic — at high speed, less deflection. At low speed, more.
            The result is more consistent rotation rates across the speed range.
          </div>
        </div>
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
        <div className="setting-note">
          Use PDS after your TPA curve and airspeed estimation are well-tuned, and S-term feels good in PD mode.
        </div>
        <GuideCodeBlock code={`set tpa_mode = PDS
# Debug:
set debug_mode = WING_SETPOINT   # setpoint before/after TPA
set debug_mode = S_TERM          # S-term before/after TPA`} />
      </Section>

      {/* General Tuning Approach */}
      <Section title="General Tuning Approach" defaultCollapsed>
        <div className="setting-note">
          Tuning is similar to a quadcopter, but servos have slower reaction time than motors,
          so tracking will be more latent.
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Increasing PIDs</div>
          <div className="setting-note">
            Increase PID gains to tighten the tune to your specific aircraft. As you increase,
            the plane becomes more predictable. When you see oscillation (shuddering, fast wobble),
            you've gone too far — back off 10-20%.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">What Can't Be Tuned Away</div>
          <div className="setting-note">
            Gusty/turbulent air will still make your plane shake. No amount of PID tuning eliminates weather.
          </div>
        </div>
        <div className="sub-group">
          <div className="sub-group-label">Feedforward</div>
          <div className="setting-note">
            May be helpful but still in testing for wings. Leave at defaults initially.
            FF kicks in when you move the stick (derivative of setpoint), unlike S-term
            which responds to where the stick is.
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
        </div>
      </Section>

      {/* Troubleshooting */}
      <Section title="Troubleshooting" defaultCollapsed>
        <table className="guide-table">
          <thead>
            <tr><th>Symptom</th><th>Likely Cause</th><th>Fix</th></tr>
          </thead>
          <tbody>
            <tr><td>Shakes at a particular speed</td><td>TPA curve shape</td><td>Tune the specific speed range in TPA curve</td></tr>
            <tr><td>Shakes at fast throttle changes or dives</td><td>Airspeed estimation inaccurate</td><td>Tune speed estimation with blackbox</td></tr>
            <tr><td>Shakes at all speeds</td><td>PIDs too high</td><td>Reduce PIDs</td></tr>
            <tr><td>Sloppy at all speeds</td><td>PIDs too low</td><td>Increase PIDs</td></tr>
            <tr><td>Bounce-back after fast rolls</td><td>I-term windup</td><td>Enable SPA (I_FREEZE), reduce iterm_relax_cutoff</td></tr>
            <tr><td>Motors run different speeds in straight flight</td><td>Yaw I-term windup</td><td>Set i_yaw = 0</td></tr>
            <tr><td>Yaw over-control (violent oscillation)</td><td>Yaw mmix too high</td><td>Reduce yaw values (try +/-0.20)</td></tr>
            <tr><td>Servos buzzing/jittering</td><td>Servo update rate too high</td><td>Reduce servo_pwm_rate to 50</td></tr>
            <tr><td>Controls feel robotic/indirect</td><td>S-term too low</td><td>Increase s_roll, s_pitch</td></tr>
            <tr><td>Controls feel twitchy</td><td>S-term + PIDs too high</td><td>Reduce S-term or PIDs</td></tr>
            <tr><td>TPA feels wrong at unexpected speeds</td><td>Battery voltage wrong</td><td>Check tpa_speed_max_voltage and voltmeter</td></tr>
          </tbody>
        </table>
      </Section>

      {/* Tuning Order */}
      <Section title="Tuning Order Checklist" defaultCollapsed>
        <ol className="guide-checklist">
          <li>Set servo_pwm_rate (150 or 333)</li>
          <li>Set safe starting PIDs (10/10/10)</li>
          <li>Set starting rates (500/250/150)</li>
          <li>Set filters (D-term expo to 8)</li>
          <li>Disable: anti_gravity, d_max, angle_earth_ref</li>
          <li>Set max voltage for your battery</li>
          <li><strong>First flight — verify basic stability</strong></li>
          <li>Tune PIDs up gradually (P first, then I, then D)</li>
          <li>Set S-term (50/50/0 for diff thrust, 50/50/50 for rudder)</li>
          <li>Adjust rates to match S-term</li>
          <li>Enable TPA curve (HYPERBOLIC) — tune stall throttle, then extremes</li>
          <li>Enable SPA (I_FREEZE) with defaults — tune center/width if needed</li>
          <li>Set iterm_relax_cutoff = 5</li>
          <li>Optional: try tpa_mode = PDS for speed-dependent S-term</li>
          <li>Optional: tune airspeed estimation with blackbox (debug_mode = TPA)</li>
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
        <ExtLink href="https://github.com/betaflight/betaflight/discussions/14032">limonspb's tuning draft</ExtLink>.
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
