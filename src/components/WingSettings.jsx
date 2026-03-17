import { useState } from 'react';
import Section from './common/Section';
import RangeInput from './common/RangeInput';

export default function WingSettings({ wingSettings, onChange }) {
  const [showOther, setShowOther] = useState(false);

  const update = (field, value) => {
    onChange({ ...wingSettings, [field]: value });
  };

  return (
    <Section title="Wing settings" defaultCollapsed={false}>
      {/* Other Wing Settings — collapsible */}
      <button className="target-paste-link" onClick={() => setShowOther(!showOther)}>
        {showOther ? 'Hide wing settings' : 'Show wing settings'}
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
            <div className="setting-note">
              Increase for faster, more responsive aircraft. Lower for smoother flight.
            </div>
          </div>

          <div className="sub-group">
            <div className="sub-group-label">GPS</div>
            <div className="range-row">
              <span className="range-label">3D speed</span>
              <div className="segmented-btn">
                <button
                  className={wingSettings.gps_use_3d_speed === 'ON' ? 'active' : ''}
                  onClick={() => update('gps_use_3d_speed', 'ON')}
                >ON</button>
                <button
                  className={wingSettings.gps_use_3d_speed === 'OFF' ? 'active' : ''}
                  onClick={() => update('gps_use_3d_speed', 'OFF')}
                >OFF</button>
              </div>
            </div>
            <div className="setting-note">
              Use 3D GPS speed (includes vertical component) for more accurate speed readout on wings.
            </div>
          </div>

          <div className="sub-group">
            <div className="sub-group-label">D-term filter</div>
            <RangeInput label="LPF1 expo" value={wingSettings.dterm_lpf1_dyn_expo}
              onChange={v => update('dterm_lpf1_dyn_expo', v)} min={0} max={10} step={1} />
            <div className="setting-note">
              Higher = more filtering. Wing recommendation: 8 (equivalent to 0.8 slider in Configurator).
              Conservative: 5 (both sliders at 0.5).
            </div>
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
