import Section from './common/Section';
import RangeInput from './common/RangeInput';
import WarningBadge from './common/WarningBadge';
import { validateMotorYaw } from '../data/validation';

export default function MotorMixer({ motors, onChange }) {
  const updateMotor = (idx, field, val) => {
    onChange(motors.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  };

  const addMotor = () => {
    onChange([...motors, {
      id: motors.length,
      label: `Motor ${motors.length + 1}`,
      throttle: 1.0, roll: 0, pitch: 0, yaw: 0,
    }]);
  };

  const removeMotor = () => {
    if (motors.length > 1) onChange(motors.slice(0, -1));
  };

  const hasYawWarning = motors.some(m => validateMotorYaw(m.yaw));

  return (
    <Section
      title={`Motors (${motors.length})`}
      defaultCollapsed={false}
      badge={hasYawWarning ? <WarningBadge level="danger" message="yaw" /> : null}
    >
      {motors.map((m, i) => {
        const yawWarn = validateMotorYaw(m.yaw);
        return (
          <div key={i} className="mixer-card">
            <div className="mixer-card-header">
              <input
                className="mixer-card-label"
                value={m.label}
                onChange={e => updateMotor(i, 'label', e.target.value)}
              />
              <span className="mixer-card-id">Motor {i + 1}</span>
            </div>
            <RangeInput label="Throt" value={m.throttle} onChange={v => updateMotor(i, 'throttle', v)} min={0} max={1} step={0.05} />
            <RangeInput label="Roll" value={m.roll} onChange={v => updateMotor(i, 'roll', v)} min={-1} max={1} step={0.05} />
            <RangeInput label="Pitch" value={m.pitch} onChange={v => updateMotor(i, 'pitch', v)} min={-1} max={1} step={0.05} />
            <RangeInput
              label="Yaw" value={m.yaw} onChange={v => updateMotor(i, 'yaw', v)}
              min={-1} max={1} step={0.05}
              warn={!!yawWarn}
              warnMessage={yawWarn?.message}
            />
          </div>
        );
      })}
      <div className="btn-row">
        <button className="btn" onClick={addMotor}>+ Add motor</button>
        {motors.length > 1 && (
          <button className="btn" onClick={removeMotor}>Remove last</button>
        )}
      </div>
    </Section>
  );
}
