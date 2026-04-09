import Section from './common/Section';
import { AIRFRAME_PRESETS } from '../data/presets';
import { findPin, findPinBySlotId, buildStockResources } from '../utils/pinLookup';

export default function ServoMapPanel({ preset, servos, motors, assignments, servoReversed, onServoReversedChange, selectedTarget }) {
  const presetData = AIRFRAME_PRESETS[preset];
  if (!presetData) return null;

  const useBuiltInWing = presetData.mixerType === 'FLYING_WING';
  const minSlot = useBuiltInWing ? 3 : 2;

  const stockMap = selectedTarget ? buildStockResources(selectedTarget) : {};

  const toggleReversed = (servoId) => {
    onServoReversedChange(prev => ({ ...prev, [servoId]: !prev[servoId] }));
  };

  // Look up what a pin was originally assigned to (factory default)
  const getStockLabel = (cliPin, currentResource) => {
    if (!cliPin || cliPin === '\u2014' || !selectedTarget) return null;
    const fullPin = `P${cliPin}`;
    const stock = stockMap[fullPin];
    if (!stock) return null;
    // Only show if it differs from current assignment
    if (stock.label.toUpperCase() === currentResource.toUpperCase()) return null;
    return stock.label;
  };

  const motorRows = presetData.motors.map((m, i) => {
    const pin = findPin(assignments, 'motor', i + 1) || '\u2014';
    const resource = `MOTOR ${i + 1}`;
    return {
      key: `m-${m.id}`,
      type: 'motor',
      fn: m.label,
      pin,
      resource,
      stockLabel: getStockLabel(pin, resource),
      bfSlot: '\u2014',
      direction: null,
    };
  });

  const servoRows = presetData.servos.map((s) => {
    const pin = findPinBySlotId(assignments, s.id) || '\u2014';
    const resource = `SERVO ${s.id - minSlot + 1}`;
    return {
      key: `s-${s.id}`,
      type: 'servo',
      fn: s.label,
      pin,
      resource,
      stockLabel: getStockLabel(pin, resource),
      bfSlot: `slot ${s.id}`,
      direction: servoReversed?.[s.id] ? 'Reversed' : 'Normal',
      servoId: s.id,
    };
  });

  const rows = [...motorRows, ...servoRows];

  return (
    <Section title="Output Mapping" defaultCollapsed={false}>
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
                <td className="mono">
                  {row.resource}
                  {row.stockLabel && <span className="stock-label"> (was {row.stockLabel})</span>}
                </td>
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
