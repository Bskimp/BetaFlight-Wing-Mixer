import Section from './common/Section';
import RangeInput from './common/RangeInput';
import { validatePidValue } from '../data/validation';

const AXES = ['roll', 'pitch', 'yaw'];
const TERMS = [
  { key: 'p', label: 'P', min: 0, max: 200, step: 1 },
  { key: 'i', label: 'I', min: 0, max: 200, step: 1 },
  { key: 'd', label: 'D', min: 0, max: 200, step: 1 },
  { key: 'f', label: 'F', min: 0, max: 500, step: 5 },
];

export default function PidPanel({ pids, onChange }) {
  const updatePid = (axis, term, value) => {
    onChange({
      ...pids,
      [axis]: { ...pids[axis], [term]: value },
    });
  };

  return (
    <Section title="PID tuning" defaultCollapsed={false}>
      {AXES.map(axis => (
        <div key={axis} className="axis-group">
          <div className="axis-label">{axis.charAt(0).toUpperCase() + axis.slice(1)}</div>
          {TERMS.map(t => {
            const value = pids[axis][t.key];
            const warn = validatePidValue(t.key, value);
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
  );
}
