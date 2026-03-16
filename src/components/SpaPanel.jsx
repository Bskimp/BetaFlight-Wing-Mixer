import Section from './common/Section';
import RangeInput from './common/RangeInput';

const SPA_MODES = ['OFF', 'I_FREEZE', 'I', 'PID', 'PD_I_FREEZE'];

function SpaBar({ center, width }) {
  const max = 500;
  const left = Math.max(0, center - width / 2);
  const right = Math.min(max, center + width / 2);

  const leftPct = (left / max) * 100;
  const rightPct = (right / max) * 100;
  const centerPct = (center / max) * 100;

  return (
    <div className="spa-bar-container">
      <div className="spa-bar">
        {/* Full PID zone */}
        <div className="spa-zone spa-zone-full" style={{ left: 0, width: `${leftPct}%` }} />
        {/* Transition zone */}
        <div className="spa-zone spa-zone-transition" style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }} />
        {/* Attenuated zone */}
        <div className="spa-zone spa-zone-attenuated" style={{ left: `${rightPct}%`, width: `${100 - rightPct}%` }} />
        {/* Center marker */}
        <div className="spa-center-mark" style={{ left: `${centerPct}%` }} />
      </div>
      <div className="spa-bar-labels">
        <span>0</span>
        <span className="spa-bar-center-label" style={{ left: `${centerPct}%` }}>{center}</span>
        <span>500</span>
      </div>
    </div>
  );
}

export default function SpaPanel({ spaSettings, onChange }) {
  const update = (field, value) => {
    onChange({ ...spaSettings, [field]: value });
  };

  return (
    <Section title="Setpoint PID attenuation" defaultCollapsed={false}>
      {['roll', 'pitch', 'yaw'].map(axis => {
        const mode = spaSettings[`spa_${axis}_mode`];
        const center = spaSettings[`spa_${axis}_center`];
        const width = spaSettings[`spa_${axis}_width`];
        const isOff = mode === 'OFF';

        return (
          <div key={axis} className="axis-group">
            <div className="axis-label">{axis.charAt(0).toUpperCase() + axis.slice(1)}</div>

            {/* Mode selector */}
            <div className="segmented-btn spa-mode-btn">
              {SPA_MODES.map(m => (
                <button key={m}
                  className={mode === m ? 'active' : ''}
                  onClick={() => update(`spa_${axis}_mode`, m)}
                >{m.replaceAll('_', ' ')}</button>
              ))}
            </div>

            {!isOff && (
              <>
                <RangeInput label="Center" value={center}
                  onChange={v => update(`spa_${axis}_center`, v)}
                  min={0} max={500} step={10} />
                <RangeInput label="Width" value={width}
                  onChange={v => update(`spa_${axis}_width`, v)}
                  min={0} max={200} step={10} />
                <SpaBar center={center} width={width} />
              </>
            )}
          </div>
        );
      })}
    </Section>
  );
}
