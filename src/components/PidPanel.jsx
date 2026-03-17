import Section from './common/Section';
import RangeInput from './common/RangeInput';
import { validatePidValue, validateYawIGain, validateSTermYaw } from '../data/validation';

const AXES = ['roll', 'pitch', 'yaw'];
const TERMS = [
  { key: 'p', label: 'P', min: 0, max: 200, step: 1 },
  { key: 'i', label: 'I', min: 0, max: 200, step: 1 },
  { key: 'd', label: 'D', min: 0, max: 200, step: 1 },
  { key: 'f', label: 'F', min: 0, max: 500, step: 5 },
];

export default function PidPanel({ pids, onChange, diffThrust, wingSettings, onWingSettingsChange }) {
  const updatePid = (axis, term, value) => {
    onChange({
      ...pids,
      [axis]: { ...pids[axis], [term]: value },
    });
  };

  const updateSterm = (field, value) => {
    onWingSettingsChange({ ...wingSettings, [field]: value });
  };

  const sYawWarn = validateSTermYaw(wingSettings.s_yaw, diffThrust);

  return (
    <>
      <Section title="PID tuning" defaultCollapsed={false}>
        {AXES.map(axis => (
          <div key={axis} className="axis-group">
            <div className="axis-label">{axis.charAt(0).toUpperCase() + axis.slice(1)}</div>
            {TERMS.map(t => {
              const value = pids[axis][t.key];
              let warn = validatePidValue(t.key, value);
              // Yaw I-gain warning for diff thrust
              if (axis === 'yaw' && t.key === 'i') {
                const yawWarn = validateYawIGain(value, diffThrust);
                if (yawWarn) warn = yawWarn;
              }
              return (
                <RangeInput
                  key={t.key}
                  label={t.label}
                  value={value}
                  onChange={v => updatePid(axis, t.key, v)}
                  min={t.min}
                  max={t.max}
                  step={t.step}
                  warn={!!warn}
                  warnMessage={warn?.message}
                />
              );
            })}
          </div>
        ))}
      </Section>

      <Section title="S-term" defaultCollapsed={false}>
        <div className="setting-note">
          Maps stick position directly to servo output. Higher = more direct feel, less PID authority.
        </div>
        <RangeInput label="Roll" value={wingSettings.s_roll} onChange={v => updateSterm('s_roll', v)} min={0} max={200} step={5} />
        <RangeInput label="Pitch" value={wingSettings.s_pitch} onChange={v => updateSterm('s_pitch', v)} min={0} max={200} step={5} />
        <RangeInput
          label="Yaw" value={wingSettings.s_yaw} onChange={v => updateSterm('s_yaw', v)}
          min={0} max={200} step={5}
          warn={!!sYawWarn}
          warnMessage={sYawWarn?.message}
        />
        {diffThrust && (
          <div className="setting-note">
            Yaw S-term is 0 because yaw goes through motors with differential thrust, not servos.
          </div>
        )}
      </Section>
    </>
  );
}
