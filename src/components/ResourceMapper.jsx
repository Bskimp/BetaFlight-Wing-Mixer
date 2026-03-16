import { useMemo } from 'react';
import Section from './common/Section';
import { pinToCli, renumberAssignments } from '../utils/timerCheck';

const CYCLE_ORDER = [null, 'motor', 'servo', 'led'];

function nextType(currentType) {
  const idx = CYCLE_ORDER.indexOf(currentType || null);
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

function getNextIndex(assignments, type) {
  let max = 0;
  for (const a of Object.values(assignments)) {
    if (a.type === type && a.index > max) max = a.index;
  }
  return max + 1;
}

export default function ResourceMapper({ target, assignments, onAssignmentsChange, conflicts }) {
  const conflictTimers = useMemo(() => {
    const set = new Set();
    for (const c of conflicts) set.add(c.timer);
    return set;
  }, [conflicts]);

  const conflictMessages = useMemo(() => {
    const map = {};
    for (const c of conflicts) map[c.timer] = c.message;
    return map;
  }, [conflicts]);

  if (!target) {
    return (
      <Section title="Resource mapper">
        <div className="resource-empty">Select a target board above to map resources</div>
      </Section>
    );
  }

  const handlePinClick = (pin) => {
    const current = assignments[pin];
    const currentType = current ? current.type : null;
    const next = nextType(currentType);

    let newAssignments;
    if (next === null) {
      // Remove assignment
      newAssignments = { ...assignments };
      delete newAssignments[pin];
      newAssignments = renumberAssignments(newAssignments);
    } else {
      const index = getNextIndex(assignments, next);
      newAssignments = { ...assignments, [pin]: { type: next, index } };
    }
    onAssignmentsChange(newAssignments);
  };

  const getLabelForPin = (pin) => {
    const a = assignments[pin];
    if (!a) return '';
    if (a.type === 'motor') return `Motor ${a.index}`;
    if (a.type === 'servo') return `Servo ${a.index}`;
    if (a.type === 'led') return 'LED Strip';
    return '';
  };

  const getSlotClass = (pin) => {
    const a = assignments[pin];
    if (!a) return 'pin-slot';
    return `pin-slot ${a.type}`;
  };

  // Unresolved: flat pin list
  if (target.resolutionStatus === 'unresolved') {
    const allPins = [
      ...target.motors.map(m => m.pin),
      ...target.servos.map(s => s.pin),
    ];
    const uniquePins = [...new Set(allPins)];

    return (
      <Section title="Resource mapper">
        <div className="resource-warning">
          Timer groups unavailable — conflict detection disabled
        </div>
        <div className="timer-group">
          <div className="timer-group-header">All pins</div>
          <div className="timer-group-pins">
            {uniquePins.map(pin => (
              <div
                key={pin}
                className={getSlotClass(pin)}
                onClick={() => handlePinClick(pin)}
              >
                {pinToCli(pin)}
                {getLabelForPin(pin) && <span className="pin-label">{getLabelForPin(pin)}</span>}
              </div>
            ))}
          </div>
        </div>
        <UartInfo uarts={target.uarts} />
      </Section>
    );
  }

  // Grouped by timer
  const groupEntries = Object.entries(target.timerGroups);

  return (
    <Section title="Resource mapper">
      {groupEntries.map(([timer, pins]) => {
        const hasConflict = conflictTimers.has(timer);
        // Check if any pin in this group is approximate
        const isApproximate = target.timerPins.some(
          tp => pins.includes(tp.pin) && tp.exact === false
        );
        const groupLabel = isApproximate ? `~${timer}` : timer;

        return (
          <div key={timer} className={`timer-group${isApproximate ? ' approximate' : ''}`}>
            <div className={`timer-group-header${hasConflict ? ' conflict' : ''}`}>
              {groupLabel}
              <span style={{ fontWeight: 400, fontSize: 11 }}>
                ({pins.length} pin{pins.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="timer-group-pins">
              {pins.map(pin => (
                <div
                  key={pin}
                  className={getSlotClass(pin)}
                  onClick={() => handlePinClick(pin)}
                >
                  {pinToCli(pin)}
                  {getLabelForPin(pin) && <span className="pin-label">{getLabelForPin(pin)}</span>}
                </div>
              ))}
            </div>
            {hasConflict && (
              <div className="conflict-message">{conflictMessages[timer]}</div>
            )}
          </div>
        );
      })}
      <UartInfo uarts={target.uarts} />
    </Section>
  );
}

function UartInfo({ uarts }) {
  if (!uarts || uarts.length === 0) return null;
  return (
    <div className="uart-info">
      {uarts.map(u => {
        const tx = u.tx ? pinToCli(u.tx) : null;
        const rx = u.rx ? pinToCli(u.rx) : null;
        let desc = '';
        if (tx && rx) desc = `TX: ${tx}, RX: ${rx}`;
        else if (rx) desc = `RX only (RX: ${rx})`;
        else if (tx) desc = `TX only (TX: ${tx})`;
        return <div key={u.index}>UART{u.index}: {desc}</div>;
      })}
    </div>
  );
}
