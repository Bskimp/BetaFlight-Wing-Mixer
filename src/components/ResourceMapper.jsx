import { useMemo, useState } from 'react';
import Section from './common/Section';
import { pinToCli, renumberAssignments, computePinBudget, findRemappableUarts, pickBestTimer } from '../utils/timerCheck';

const CYCLE_ORDER = [null, 'motor', 'servo', 'led'];

function nextType(currentType) {
  const idx = CYCLE_ORDER.indexOf(currentType || null);
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

function getNextIndex(assignments, type, uartRemaps) {
  let max = 0;
  for (const a of Object.values(assignments)) {
    if (a.type === type && a.index > max) max = a.index;
  }
  // Also check UART remaps for servo indices
  if (type === 'servo' && uartRemaps) {
    for (const r of Object.values(uartRemaps)) {
      if (r.servoIndex > max) max = r.servoIndex;
    }
  }
  return max + 1;
}

function AccessBadge({ access }) {
  if (!access || access === 'accessible') return null;
  if (access === 'blocked') return <span className="pin-badge-blocked" title="Routed to on-board peripheral — not accessible">&#128274;</span>;
  if (access === 'locked') return <span className="pin-badge-locked" title="Hardwired to on-board ESC — motor only">&#128274; ESC</span>;
  if (access === 'maybe') return <span className="pin-badge-maybe" title="May be broken out — check your board">?</span>;
  if (access === 'unknown') return <span className="pin-badge-unknown" title="Unverified — check your board">?</span>;
  return null;
}

export default function ResourceMapper({ target, assignments, onAssignmentsChange, conflicts, preset, uartRemaps, onUartRemapsChange }) {
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

  const pinBudget = useMemo(() => {
    if (!target || !preset) return null;
    return computePinBudget(preset, target);
  }, [target, preset]);

  const remappableUarts = useMemo(() => {
    if (!target) return [];
    return findRemappableUarts(target);
  }, [target]);

  if (!target) {
    return (
      <Section title="Resource mapper">
        <div className="resource-empty">Select a target board above to map resources</div>
      </Section>
    );
  }

  const handlePinClick = (pin) => {
    const access = target.pinAccess?.[pin];
    if (access === 'blocked') return;

    const current = assignments[pin];
    const currentType = current ? current.type : null;

    let next;
    if (access === 'locked') {
      // Locked ESC pads: toggle motor on/off only (can't assign servo/LED)
      next = currentType === 'motor' ? null : 'motor';
    } else {
      next = nextType(currentType);
    }

    let newAssignments;
    if (next === null) {
      newAssignments = { ...assignments };
      delete newAssignments[pin];
      newAssignments = renumberAssignments(newAssignments);
    } else {
      const index = getNextIndex(assignments, next, uartRemaps);
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
    const access = target.pinAccess?.[pin];
    let cls = 'pin-slot';
    if (a) cls += ` ${a.type}`;
    if (access === 'blocked') cls += ' blocked';
    if (access === 'locked') cls += ' locked';
    return cls;
  };

  const handleUartPinToggle = (pin, uart, role) => {
    const newRemaps = { ...uartRemaps };
    if (newRemaps[pin]) {
      // Remove remap
      delete newRemaps[pin];
    } else {
      // Add remap — pick best timer
      const timerOptions = role === 'tx' ? uart.txTimers : uart.rxTimers;
      const best = pickBestTimer(timerOptions, assignments, target.timerPins);
      if (!best) return;
      const servoIndex = getNextIndex(assignments, 'servo', newRemaps);
      newRemaps[pin] = {
        uartIndex: uart.index,
        role,
        timer: best.timer,
        channel: best.channel,
        af: best.af,
        servoIndex,
      };
    }
    onUartRemapsChange(newRemaps);
  };

  const handleUartTimerChange = (pin, uart, role, timerName) => {
    const timerOptions = role === 'tx' ? uart.txTimers : uart.rxTimers;
    const opt = timerOptions.find(t => t.timer === timerName);
    if (!opt) return;
    const existing = uartRemaps[pin];
    onUartRemapsChange({
      ...uartRemaps,
      [pin]: { ...existing, timer: opt.timer, channel: opt.channel, af: opt.af },
    });
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
                <AccessBadge access={target.pinAccess?.[pin]} />
                {getLabelForPin(pin) && <span className="pin-label">{getLabelForPin(pin)}</span>}
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  }

  // Grouped by timer
  const groupEntries = Object.entries(target.timerGroups);
  const isAio = target.boardType === 'aio';
  const showUartSection = isAio || pinBudget?.shortfall > 0 || Object.keys(uartRemaps || {}).length > 0;

  return (
    <Section title="Resource mapper">
      {/* AIO banner */}
      {isAio && (
        <div className="aio-banner">
          <strong>AIO Board</strong> — Motor pads 1–4 are hardwired to the on-board ESC and can only be used as motor outputs.
          Additional signal pads (5+) can be freely assigned. Use UART remapping below if you need more servo outputs.
        </div>
      )}

      {/* Pin budget counter */}
      {pinBudget && pinBudget.shortfall > 0 && !isAio && (
        <div className="pin-budget">
          Your preset needs <strong>{pinBudget.needed}</strong> outputs.
          This target has <strong>{pinBudget.available}</strong> timer pins.
          {' '}Need <strong>{pinBudget.shortfall}</strong> more — check UARTs below.
        </div>
      )}

      {/* Timer groups */}
      {groupEntries.map(([timer, pins]) => {
        const hasConflict = conflictTimers.has(timer);
        const isApproximate = target.timerPins.some(
          tp => pins.includes(tp.pin) && tp.exact === false
        );
        const groupLabel = isApproximate ? `~${timer}` : timer;

        // Check if any UART-remapped pins belong to this timer group
        const remappedInGroup = Object.entries(uartRemaps || {}).filter(
          ([, r]) => r.timer === timer
        );

        return (
          <div key={timer} className={`timer-group${isApproximate ? ' approximate' : ''}`}>
            <div className={`timer-group-header${hasConflict ? ' conflict' : ''}`}>
              {groupLabel}
              <span style={{ fontWeight: 400, fontSize: 11 }}>
                ({pins.length + remappedInGroup.length} pin{pins.length + remappedInGroup.length !== 1 ? 's' : ''})
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
                  <AccessBadge access={target.pinAccess?.[pin]} />
                  {getLabelForPin(pin) && <span className="pin-label">{getLabelForPin(pin)}</span>}
                </div>
              ))}
              {/* Show UART-remapped pins in their timer group */}
              {remappedInGroup.map(([pin, remap]) => (
                <div key={pin} className="pin-slot servo uart-remap">
                  {pinToCli(pin)}
                  <span className="pin-label">Servo {remap.servoIndex}</span>
                  <span className="pin-uart-tag">UART{remap.uartIndex}</span>
                </div>
              ))}
            </div>
            {hasConflict && (
              <div className="conflict-message">{conflictMessages[timer]}</div>
            )}
          </div>
        );
      })}

      {/* UART Remap Section */}
      {remappableUarts.length > 0 && (
        <UartRemapSection
          uarts={remappableUarts}
          target={target}
          uartRemaps={uartRemaps || {}}
          onToggle={handleUartPinToggle}
          onTimerChange={handleUartTimerChange}
          isAio={isAio}
        />
      )}

      {/* Non-remappable UARTs info */}
      <UartInfo uarts={target.uarts} remappableUarts={remappableUarts} />
    </Section>
  );
}

function UartRemapSection({ uarts, target, uartRemaps, onToggle, onTimerChange, isAio }) {
  const [expanded, setExpanded] = useState(isAio || Object.keys(uartRemaps).length > 0);

  return (
    <div className="uart-remap-section">
      <button
        className={`uart-remap-toggle${expanded ? ' expanded' : ''}`}
        onClick={() => setExpanded(v => !v)}
      >
        {isAio ? 'UART Servo Outputs (required for wing on AIO)' : 'Need more pins? Sacrifice a UART'}
        <span className="uart-remap-arrow">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="uart-remap-list">
          {uarts.map(uart => (
            <UartRemapRow
              key={uart.index}
              uart={uart}
              target={target}
              uartRemaps={uartRemaps}
              onToggle={onToggle}
              onTimerChange={onTimerChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UartRemapRow({ uart, target, uartRemaps, onToggle, onTimerChange }) {
  const isSerialRx = target.serialrxUart === uart.index;
  const isOnboardRx = isSerialRx && target.onboardRx && target.onboardRx.includes(`UART${uart.index}`);
  const isMsp = target.mspUart === uart.index;
  const anyRemapped = (uart.tx && uartRemaps[uart.tx]) || (uart.rx && uartRemaps[uart.rx]);

  return (
    <div className={`uart-remap-row${anyRemapped ? ' active' : ''}`}>
      <div className="uart-remap-header">
        UART{uart.index}
        {uart.tx && uart.rx && ` (${pinToCli(uart.tx)} / ${pinToCli(uart.rx)})`}
        {uart.tx && !uart.rx && ` (TX: ${pinToCli(uart.tx)})`}
        {!uart.tx && uart.rx && ` (RX: ${pinToCli(uart.rx)})`}
        {isOnboardRx && <span className="uart-remap-warning"> — On-board RX (do not remap)</span>}
        {isMsp && <span className="uart-remap-warning"> — MSP/Configurator</span>}
      </div>

      {uart.tx && uart.txTimers?.length > 0 && target.pinAccess?.[uart.tx] !== 'blocked' && (
        <UartPinRow
          pin={uart.tx}
          role="tx"
          timerOptions={uart.txTimers}
          remap={uartRemaps[uart.tx]}
          uart={uart}
          onToggle={onToggle}
          onTimerChange={onTimerChange}
        />
      )}
      {uart.tx && (uart.txTimers?.length === 0 || target.pinAccess?.[uart.tx] === 'blocked') && (
        <div className="uart-pin-row uart-no-timer">
          {pinToCli(uart.tx)} (TX) — {target.pinAccess?.[uart.tx] === 'blocked' ? 'blocked (on-board peripheral)' : 'no timer channels'}
        </div>
      )}

      {uart.rx && uart.rxTimers?.length > 0 && target.pinAccess?.[uart.rx] !== 'blocked' && (
        <UartPinRow
          pin={uart.rx}
          role="rx"
          timerOptions={uart.rxTimers}
          remap={uartRemaps[uart.rx]}
          uart={uart}
          onToggle={onToggle}
          onTimerChange={onTimerChange}
        />
      )}
      {uart.rx && (uart.rxTimers?.length === 0 || target.pinAccess?.[uart.rx] === 'blocked') && (
        <div className="uart-pin-row uart-no-timer">
          {pinToCli(uart.rx)} (RX) — {target.pinAccess?.[uart.rx] === 'blocked' ? 'blocked (on-board peripheral)' : 'no timer channels'}
        </div>
      )}
    </div>
  );
}

function UartPinRow({ pin, role, timerOptions, remap, uart, onToggle, onTimerChange }) {
  const timerDesc = timerOptions.map(t => `${t.timer} CH${t.channel}`).join(', ');

  return (
    <div className={`uart-pin-row${remap ? ' selected' : ''}`}>
      <label className="uart-pin-check">
        <input
          type="checkbox"
          checked={!!remap}
          onChange={() => onToggle(pin, uart, role)}
        />
        {pinToCli(pin)} ({role.toUpperCase()})
      </label>
      <span className="uart-pin-timers">{timerDesc}</span>
      {remap && timerOptions.length > 1 && (
        <select
          className="uart-timer-select"
          value={remap.timer}
          onChange={(e) => onTimerChange(pin, uart, role, e.target.value)}
        >
          {timerOptions.map(t => (
            <option key={t.timer} value={t.timer}>
              {t.timer} CH{t.channel} (AF{t.af})
            </option>
          ))}
        </select>
      )}
      {remap && (
        <span className="uart-pin-assigned">Servo {remap.servoIndex}</span>
      )}
    </div>
  );
}

function UartInfo({ uarts, remappableUarts }) {
  if (!uarts || uarts.length === 0) return null;
  const remappableIndices = new Set(remappableUarts.map(u => u.index));
  const nonRemappable = uarts.filter(u => !remappableIndices.has(u.index));
  if (nonRemappable.length === 0) return null;

  return (
    <div className="uart-info">
      {nonRemappable.map(u => {
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
