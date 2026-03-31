import Section from './common/Section';
import { AIRFRAME_PRESETS } from '../data/presets';
import { findPin, findPinBySlotId } from '../utils/pinLookup';

export default function ServoMapPanel({ preset, servos, motors, assignments, servoReversed, onServoReversedChange }) {
  const presetData = AIRFRAME_PRESETS[preset];
  if (!presetData) return null;

  const useBuiltInWing = presetData.mixerType === 'FLYING_WING';
  const minSlot = useBuiltInWing ? 3 : 2;

  const toggleReversed = (servoId) => {
    onServoReversedChange(prev => ({ ...prev, [servoId]: !prev[servoId] }));
  };

  const motorRows = presetData.motors.map((m, i) => ({
    key: `m-${m.id}`,
    type: 'motor',
    fn: m.label,
    pin: findPin(assignments, 'motor', i + 1) || '\u2014',
    resource: `MOTOR ${i + 1}`,
    bfSlot: '\u2014',
    direction: null,
  }));

  const servoRows = presetData.servos.map((s) => ({
    key: `s-${s.id}`,
    type: 'servo',
    fn: s.label,
    pin: findPinBySlotId(assignments, s.id) || '\u2014',
    resource: `SERVO ${s.id - minSlot + 1}`,
    bfSlot: `slot ${s.id}`,
    direction: servoReversed?.[s.id] ? 'Reversed' : 'Normal',
    servoId: s.id,
  }));

  const rows = [...motorRows, ...servoRows];

  return (
    <Section title="Output Mapping" defaultCollapsed={true}>
      <div className="servo-map-wrap">
        <table className="servo-map-table">
          <thead>
            <tr>
              <th>Function</th>
              <th>Pin</th>
              <th>Resource</th>
              <th>BF Slot</th>
              <th>Direction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key} className={row.type === 'motor' ? 'motor-row' : ''}>
                <td>{row.fn}</td>
                <td className="mono">{row.pin}</td>
                <td className="mono">{row.resource}</td>
                <td className="mono">{row.bfSlot}</td>
                <td>
                  {row.direction !== null ? (
                    <button
                      className={`direction-btn ${row.direction === 'Reversed' ? 'reversed' : ''}`}
                      onClick={() => toggleReversed(row.servoId)}
                    >
                      {row.direction}
                    </button>
                  ) : (
                    <span className="muted">{'\u2014'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="servo-map-info">
          BF uses different numbering for resources and servo slots. The tool handles this automatically.
        </p>
      </div>
    </Section>
  );
}
