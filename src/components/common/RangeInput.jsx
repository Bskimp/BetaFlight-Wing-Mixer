export default function RangeInput({ label, value, onChange, min, max, step, unit, warn, warnMessage }) {
  const displayValue = typeof value === 'number'
    ? (Number.isInteger(step) ? value : value.toFixed(2))
    : value;

  return (
    <>
      <div className="range-row">
        <span className="range-label">{label}</span>
        <input
          type="range"
          className={`range-input${warn ? ' warn' : ''}`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
        />
        <span className={`range-value${warn ? ' warn' : ''}`}>
          {displayValue}{unit || ''}
        </span>
      </div>
      {warn && warnMessage && <div className="warning-text">{warnMessage}</div>}
    </>
  );
}
