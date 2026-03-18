import Section from './common/Section';
import RangeInput from './common/RangeInput';

export default function ServoMixer({ servos, onChange, mode }) {
  const updateServo = (idx, field, val) => {
    onChange(servos.map((s, i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: val };
      const total = Math.abs(updated.roll) + Math.abs(updated.pitch) + Math.abs(updated.yaw);
      if (total > 120) {
        // Clamp the changed field so total stays at 120
        const others = total - Math.abs(val);
        const maxAbs = 120 - others;
        updated[field] = val >= 0 ? Math.min(val, maxAbs) : Math.max(val, -maxAbs);
      }
      return updated;
    }));
  };

  const addServo = () => {
    onChange([...servos, {
      id: servos.length,
      label: `Servo ${servos.length + 1}`,
      roll: 0, pitch: 0, yaw: 0,
    }]);
  };

  const removeServo = () => {
    if (servos.length > 1) onChange(servos.slice(0, -1));
  };

  // Simple mode: direction-only view
  if (mode === 'direction') {
    return (
      <Section title={`Servo direction (${servos.length})`}>
        {servos.map((s, i) => (
          <div key={i} className="servo-direction">
            <span className="servo-direction-label">{s.label}</span>
            {s.roll !== 0 && (
              <span className={`servo-direction-sign ${s.roll > 0 ? 'positive' : 'negative'}`}>
                Roll {s.roll > 0 ? '+' : '\u2212'}
              </span>
            )}
            {s.pitch !== 0 && (
              <span className={`servo-direction-sign ${s.pitch > 0 ? 'positive' : 'negative'}`}>
                Pitch {s.pitch > 0 ? '+' : '\u2212'}
              </span>
            )}
            {s.yaw !== 0 && (
              <span className={`servo-direction-sign ${s.yaw > 0 ? 'positive' : 'negative'}`}>
                Yaw {s.yaw > 0 ? '+' : '\u2212'}
              </span>
            )}
          </div>
        ))}
      </Section>
    );
  }

  // Full mode: sliders
  return (
    <Section title={`Servos (${servos.length})`} defaultCollapsed={false}>
      {servos.map((s, i) => {
        const totalRate = Math.abs(s.roll) + Math.abs(s.pitch) + Math.abs(s.yaw);
        return (
          <div key={i} className="mixer-card">
            <div className="mixer-card-header">
              <input
                className="mixer-card-label"
                value={s.label}
                onChange={e => updateServo(i, 'label', e.target.value)}
              />
              <span className="mixer-card-id">Servo {i + 1}</span>
            </div>
            <RangeInput label="Roll" value={s.roll} onChange={v => updateServo(i, 'roll', v)} min={-100} max={100} step={5} unit="%" />
            <RangeInput label="Pitch" value={s.pitch} onChange={v => updateServo(i, 'pitch', v)} min={-100} max={100} step={5} unit="%" />
            <RangeInput label="Yaw" value={s.yaw} onChange={v => updateServo(i, 'yaw', v)} min={-100} max={100} step={5} unit="%" />
            {totalRate > 100 && totalRate <= 120 && (
              <div className="warning-badge">Combined rate {totalRate}% — servo may saturate when multiple axes peak together</div>
            )}
            {totalRate > 120 && (
              <div className="warning-badge error">Combined rate {totalRate}% exceeds 120% limit — reduce rates to avoid clipping</div>
            )}
          </div>
        );
      })}
      <div className="btn-row">
        <button className="btn" onClick={addServo}>+ Add servo</button>
        {servos.length > 1 && (
          <button className="btn" onClick={removeServo}>Remove last</button>
        )}
      </div>
    </Section>
  );
}
