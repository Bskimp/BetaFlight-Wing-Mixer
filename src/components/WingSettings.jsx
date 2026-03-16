import { useState } from 'react';
import Section from './common/Section';
import RangeInput from './common/RangeInput';
import { validateSTermYaw } from '../data/validation';

export default function WingSettings({ wingSettings, diffThrust, onChange }) {
  const [showOther, setShowOther] = useState(false);

  const update = (field, value) => {
    onChange({ ...wingSettings, [field]: value });
  };

  const sYawWarn = validateSTermYaw(wingSettings.s_yaw, diffThrust);

  return (
    <Section title="Wing settings" defaultCollapsed={false}>
      {/* S-term — always visible in Expert */}
      <div className="sub-group">
        <div className="sub-group-label">S-term (direct stick-to-surface)</div>
        <div className="setting-note">
          Maps stick position directly to servo output. Higher = more direct feel, less PID authority.
        </div>
        <RangeInput label="Roll" value={wingSettings.s_roll} onChange={v => update('s_roll', v)} min={0} max={200} step={5} />
        <RangeInput label="Pitch" value={wingSettings.s_pitch} onChange={v => update('s_pitch', v)} min={0} max={200} step={5} />
        <RangeInput
          label="Yaw" value={wingSettings.s_yaw} onChange={v => update('s_yaw', v)}
          min={0} max={200} step={5}
          warn={!!sYawWarn}
          warnMessage={sYawWarn?.message}
        />
      </div>

      {/* Other Wing Settings — collapsible */}
      <button className="target-paste-link" onClick={() => setShowOther(!showOther)}>
        {showOther ? 'Hide other wing settings' : 'Show other wing settings'}
      </button>

      {showOther && (
        <>
          <div className="sub-group" style={{ marginTop: 8 }}>
            <div className="sub-group-label">Servo PWM rate</div>
            <RangeInput label="PWM Hz" value={wingSettings.servo_pwm_rate}
              onChange={v => update('servo_pwm_rate', v)} min={50} max={400} step={1} />
            <div className="setting-note">Try 333 for digital servos</div>
          </div>

          <div className="sub-group">
            <div className="sub-group-label">I-term relax</div>
            <RangeInput label="Cutoff" value={wingSettings.iterm_relax_cutoff}
              onChange={v => update('iterm_relax_cutoff', v)} min={1} max={50} step={1} />
          </div>

          <div className="sub-group">
            <div className="sub-group-label">Fixed wing values</div>
            <div className="fixed-value-row">
              <span className="fixed-value-label">d_max_roll</span>
              <span className="fixed-value">0</span>
              <span className="fixed-value-note">disabled for wings</span>
            </div>
            <div className="fixed-value-row">
              <span className="fixed-value-label">d_max_pitch</span>
              <span className="fixed-value">0</span>
              <span className="fixed-value-note">disabled for wings</span>
            </div>
            <div className="fixed-value-row">
              <span className="fixed-value-label">anti_gravity_gain</span>
              <span className="fixed-value">0</span>
              <span className="fixed-value-note">disabled for wings</span>
            </div>
            <div className="fixed-value-row">
              <span className="fixed-value-label">angle_earth_ref</span>
              <span className="fixed-value">0</span>
              <span className="fixed-value-note">disabled for wings</span>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
