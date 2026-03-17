import { useState, useMemo } from 'react';
import Section from './common/Section';
import RangeInput from './common/RangeInput';

const TPA_MODES = ['D', 'PD', 'PDS'];
const SPEED_TYPES = ['BASIC', 'ADVANCED'];

const CELL_VOLTAGES = [
  { label: '2S (8.4V)', value: 840 },
  { label: '3S (12.6V)', value: 1260 },
  { label: '4S (16.8V)', value: 1680 },
  { label: '5S (21.0V)', value: 2100 },
  { label: '6S (25.2V)', value: 2520 },
];

/**
 * Exact port of BF's tpaCurveHyperbolicFunction() from pid_init.c.
 * See betaflight/betaflight PR #13805.
 *
 * @param {number} x - normalized speed 0.0–1.0
 * @param {number} stallThrottle - tpa_curve_stall_throttle (0–100, stored as %)
 * @param {number} pidThr0 - tpa_curve_pid_thr0 (uint16, e.g. 200 = 2.0×)
 * @param {number} pidThr100 - tpa_curve_pid_thr100 (uint16, e.g. 70 = 0.7×)
 * @param {number} expoParam - tpa_curve_expo (int8, divided by 10 in formula)
 * @returns {number} PID multiplier factor (e.g. 2.0 at stall, 0.7 at max)
 */
function tpaCurveHyperbolic(x, stallThrottle, pidThr0, pidThr100, expoParam) {
  const thrStall = stallThrottle / 100.0;
  const pThr0 = pidThr0 / 100.0;

  if (x <= thrStall) {
    return pThr0;
  }

  const expoDivider = expoParam / 10.0 - 1.0;
  const expo = Math.abs(expoDivider) > 1e-3 ? 1.0 / expoDivider : 1e3;

  const pThr100 = pidThr100 / 100.0;
  const xShifted = (x - thrStall) / (1.0 - thrStall); // scaleRangef(x, thrStall, 1, 0, 1)
  const base = 1 + (Math.pow(pThr0 / pThr100, 1.0 / expo) - 1) * xShifted;
  const divisor = Math.pow(base, expo);

  return pThr0 / divisor;
}

function computeTpaCurve(stallThrottle, pidThr0, pidThr100, expo, points = 100) {
  const thrStall = stallThrottle / 100;
  const result = [];
  for (let i = 0; i <= points; i++) {
    const x = i / points;
    // Mirror the curve shape on the left side of stall
    const xEval = x < thrStall ? 2 * thrStall - x : x;
    const multiplier = tpaCurveHyperbolic(xEval, stallThrottle, pidThr0, pidThr100, expo);
    result.push({ speed: x * 100, multiplier: multiplier * 100 });
  }
  return result;
}

function TpaCurveChart({ stallThrottle, pidThr0, pidThr100, expo }) {
  const points = useMemo(
    () => computeTpaCurve(stallThrottle, pidThr0, pidThr100, expo),
    [stallThrottle, pidThr0, pidThr100, expo]
  );

  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const width = 400;
  const height = 160;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const yMin = Math.min(pidThr0, pidThr100, 50) - 10;
  const yMax = Math.max(pidThr0, pidThr100, 100) + 10;

  const toX = (speed) => padding.left + (speed / 100) * plotW;
  const toY = (mult) => padding.top + plotH - ((mult - yMin) / (yMax - yMin)) * plotH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.speed).toFixed(1)},${toY(p.multiplier).toFixed(1)}`)
    .join(' ');

  const stallX = toX(stallThrottle);

  // Y-axis ticks
  const yTicks = [];
  const yStep = yMax - yMin > 100 ? 50 : 25;
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
    yTicks.push(v);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="tpa-curve-chart">
      {/* Grid */}
      <rect x={padding.left} y={padding.top} width={plotW} height={plotH}
        fill="none" stroke="var(--surface-400)" strokeWidth="1" />

      {/* Y-axis ticks */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={padding.left} y1={toY(v)} x2={padding.left + plotW} y2={toY(v)}
            stroke="var(--surface-400)" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={padding.left - 4} y={toY(v) + 3} textAnchor="end"
            className="tpa-chart-label">{v}%</text>
        </g>
      ))}

      {/* Stall line */}
      <line x1={stallX} y1={padding.top} x2={stallX} y2={padding.top + plotH}
        stroke="var(--warning-500)" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={stallX} y={padding.top + plotH + 14} textAnchor="middle"
        className="tpa-chart-label" fill="var(--warning-500)">stall</text>

      {/* Curve */}
      <path d={pathD} fill="none" stroke="var(--primary-500)" strokeWidth="2" />

      {/* X-axis labels */}
      <text x={padding.left} y={height - 2} className="tpa-chart-label">0%</text>
      <text x={padding.left + plotW} y={height - 2} textAnchor="end" className="tpa-chart-label">100%</text>
      <text x={padding.left + plotW / 2} y={height - 2} textAnchor="middle" className="tpa-chart-label">Speed</text>
    </svg>
  );
}

export default function TpaCurvePanel({ tpaSettings, onChange }) {
  const [showHelp, setShowHelp] = useState(false);

  const update = (field, value) => {
    onChange({ ...tpaSettings, [field]: value });
  };

  const voltageMatch = CELL_VOLTAGES.find(c => c.value === tpaSettings.tpa_speed_max_voltage);
  const isAdvanced = tpaSettings.tpa_speed_type === 'ADVANCED';

  return (
    <Section title="TPA airspeed curve" defaultCollapsed={false}>
      <div className="tpa-info-text">
        BF estimates airspeed from throttle, voltage, and pitch angle. The TPA curve
        scales your PIDs based on estimated speed — lower gains at high speed, higher
        gains near stall.
      </div>

      {/* TPA Mode */}
      <div className="sub-group">
        <div className="sub-group-label">TPA mode</div>
        <div className="segmented-btn">
          {TPA_MODES.map(m => (
            <button key={m}
              className={tpaSettings.tpa_mode === m ? 'active' : ''}
              onClick={() => update('tpa_mode', m)}
            >{m}</button>
          ))}
        </div>
        <div className="setting-note">
          {tpaSettings.tpa_mode === 'D' && 'Attenuates D term only'}
          {tpaSettings.tpa_mode === 'PD' && 'Attenuates P and D terms with speed'}
          {tpaSettings.tpa_mode === 'PDS' && 'Attenuates P, D, and S-term with speed'}
        </div>
        <div className="setting-note">
          Curve type: HYPERBOLIC (required for wing airspeed TPA)
        </div>
      </div>

      {/* Speed Estimation Model */}
      <div className="sub-group">
        <div className="sub-group-label">Speed estimation model</div>
        <div className="segmented-btn">
          {SPEED_TYPES.map(t => (
            <button key={t}
              className={tpaSettings.tpa_speed_type === t ? 'active' : ''}
              onClick={() => update('tpa_speed_type', t)}
            >{t === 'BASIC' ? 'Basic' : 'Advanced'}</button>
          ))}
        </div>
        <div className="setting-note">
          {isAdvanced
            ? 'Physics-based model using mass, drag, TWR, and prop pitch'
            : 'Simple model using throttle delay and gravity estimate'}
        </div>
      </div>

      {/* Voltage / Cell count — shared by both models */}
      <div className="sub-group">
        <div className="sub-group-label">Battery voltage</div>
        <div className="range-row">
          <span className="range-label">Cells</span>
          <select
            value={voltageMatch ? tpaSettings.tpa_speed_max_voltage : 'custom'}
            onChange={e => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) update('tpa_speed_max_voltage', v);
            }}
            className="select-input"
          >
            {CELL_VOLTAGES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
            {!voltageMatch && <option value="custom">Custom: {tpaSettings.tpa_speed_max_voltage}</option>}
          </select>
        </div>
      </div>

      {/* BASIC model parameters */}
      {!isAdvanced && (
        <div className="sub-group">
          <div className="sub-group-label">Basic speed estimation</div>
          <RangeInput label="Delay" value={tpaSettings.tpa_speed_basic_delay}
            onChange={v => update('tpa_speed_basic_delay', v)}
            min={0} max={5000} step={100} unit=" ms" />
          <RangeInput label="Gravity effect" value={tpaSettings.tpa_speed_basic_gravity}
            onChange={v => update('tpa_speed_basic_gravity', v)}
            min={0} max={200} step={5} unit="%" />
        </div>
      )}

      {/* ADVANCED model parameters */}
      {isAdvanced && (
        <div className="sub-group">
          <div className="sub-group-label">Advanced speed estimation</div>
          <RangeInput label="Aircraft mass" value={tpaSettings.tpa_speed_adv_mass}
            onChange={v => update('tpa_speed_adv_mass', v)}
            min={100} max={10000} step={50} unit=" g" />
          <RangeInput label="Drag coefficient" value={tpaSettings.tpa_speed_adv_drag_k}
            onChange={v => update('tpa_speed_adv_drag_k', v)}
            min={1} max={200} step={1} />
          <RangeInput label="Thrust/weight ratio" value={tpaSettings.tpa_speed_adv_twr}
            onChange={v => update('tpa_speed_adv_twr', v)}
            min={50} max={500} step={10} unit="%" />
          <RangeInput label="Prop pitch" value={tpaSettings.tpa_speed_adv_prop_pitch / 100}
            onChange={v => update('tpa_speed_adv_prop_pitch', Math.round(v * 100))}
            min={1} max={10} step={0.1} unit=' in' />
          <RangeInput label="Pitch offset" value={tpaSettings.tpa_speed_est_pitch_offset / 100}
            onChange={v => update('tpa_speed_est_pitch_offset', Math.round(v * 100))}
            min={-10} max={10} step={0.5} unit='°' />
        </div>
      )}

      {/* Curve parameters */}
      <div className="sub-group">
        <div className="sub-group-label">Curve shape</div>
        <RangeInput label="Stall thr" value={tpaSettings.tpa_curve_stall_throttle}
          onChange={v => update('tpa_curve_stall_throttle', v)}
          min={0} max={50} step={1} unit="%" />
        <RangeInput label="PID @ stall" value={tpaSettings.tpa_curve_pid_thr0}
          onChange={v => update('tpa_curve_pid_thr0', v)}
          min={50} max={250} step={5} unit="%" />
        <RangeInput label="PID @ max" value={tpaSettings.tpa_curve_pid_thr100}
          onChange={v => update('tpa_curve_pid_thr100', v)}
          min={20} max={200} step={5} unit="%" />
        <RangeInput label="Expo" value={tpaSettings.tpa_curve_expo}
          onChange={v => update('tpa_curve_expo', v)}
          min={-100} max={100} step={5} />
      </div>

      {/* Live curve */}
      <TpaCurveChart
        stallThrottle={tpaSettings.tpa_curve_stall_throttle}
        pidThr0={tpaSettings.tpa_curve_pid_thr0}
        pidThr100={tpaSettings.tpa_curve_pid_thr100}
        expo={tpaSettings.tpa_curve_expo}
      />

      {/* Tuning tips */}
      <button className="target-paste-link" onClick={() => setShowHelp(!showHelp)}>
        {showHelp ? 'Hide tuning tips' : 'Show tuning tips'}
      </button>
      {showHelp && (
        <div className="tpa-help">
          <div>Oscillating at high speed? Reduce PID at full speed</div>
          <div>Sloppy at low speed? Increase PID at stall</div>
          <div>Good at extremes, bad in middle? Adjust expo</div>
          <div>Speed feels laggy? Reduce delay (Basic) or check mass/drag (Advanced)</div>
          <div>Nose-down dives over-attenuate? Adjust pitch offset or gravity effect</div>
        </div>
      )}
    </Section>
  );
}
