import { useMemo } from 'react';
import { pinToCli } from '../utils/timerCheck';
import { buildStockResources, assignmentLabel } from '../utils/pinLookup';

/**
 * Wiring Guide — shows which board pads to wire to which functions.
 * Uses factory default resource names (what's printed on the board) as the "from"
 * and preset function labels (what the user is connecting) as the "to".
 * Only shows pins that changed from factory default.
 */
export default function WiringSummary({ target, assignments, preset }) {
  const stockResources = useMemo(() => buildStockResources(target), [target]);

  const rows = useMemo(() => {
    if (!assignments || Object.keys(assignments).length === 0) return [];

    const result = [];
    // Collect all pins from both stock and user assignments
    const allPins = new Set([
      ...Object.keys(stockResources),
      ...Object.keys(assignments),
    ]);

    for (const pin of allPins) {
      const stock = stockResources[pin];
      const user = assignments[pin];
      if (!user) continue; // only show pins that have a user assignment

      const stockLabel = stock ? stock.label : null;
      const userLabel = assignmentLabel(user, preset);

      // Skip unchanged assignments
      if (stock && user && stock.type === user.type && stock.index === user.index) continue;

      result.push({
        pin,
        padLabel: stockLabel ? `${stockLabel} pad` : `Pin ${pinToCli(pin)}`,
        pinCli: pinToCli(pin),
        wireTo: userLabel,
        type: user.type,
      });
    }

    // Sort: motors first, then servos, then LED
    const typeOrder = { motor: 0, servo: 1, led: 2 };
    result.sort((a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3));

    return result;
  }, [stockResources, assignments, preset]);

  if (rows.length === 0) return null;

  return (
    <div className="wiring-summary">
      <div className="wiring-title">Wiring Guide</div>
      <table className="wiring-table">
        <thead>
          <tr>
            <th>Board Pad</th>
            <th></th>
            <th>Wire To</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.pin} className={`wiring-row wiring-${row.type}`}>
              <td className="wiring-pad">
                {row.padLabel}
                <span className="wiring-pin">{row.pinCli}</span>
              </td>
              <td className="wiring-arrow">{'\u2192'}</td>
              <td className="wiring-function">{row.wireTo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="wiring-hint">
        Board pads are labeled with their factory default names.
      </p>
    </div>
  );
}
