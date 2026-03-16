import { AIRFRAME_PRESETS } from '../data/presets';
import Section from './common/Section';

export default function PresetSelector({ selectedPreset, onSelect }) {
  return (
    <Section title="Airframe preset">
      <div className="preset-grid">
        {Object.entries(AIRFRAME_PRESETS).map(([key, p]) => (
          <button
            key={key}
            className={`preset-btn${selectedPreset === key ? ' selected' : ''}`}
            onClick={() => onSelect(key)}
          >
            <div className="preset-name">{p.name}</div>
            <div className="preset-desc">{p.description}</div>
          </button>
        ))}
      </div>
    </Section>
  );
}
