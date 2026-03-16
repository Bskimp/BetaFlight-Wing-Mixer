import { useState, useMemo } from 'react';
import Section from './common/Section';
import { normalizePin } from '../utils/timerCheck';

export default function TargetSelector({ targets, selectedTarget, onSelectTarget }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mcuFilter, setMcuFilter] = useState({ STM32F4: true, STM32F7: true, STM32H7: true });
  const [wingOnly, setWingOnly] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const targetList = useMemo(() => Object.values(targets), [targets]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return targetList.filter(t => {
      if (!mcuFilter[t.mcu]) return false;
      if (wingOnly && t.wingCapable === false) return false;
      if (q && !t.boardName.toLowerCase().includes(q) && !t.manufacturer.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [targetList, searchQuery, mcuFilter, wingOnly]);

  const toggleMcu = (family) => {
    setMcuFilter(prev => ({ ...prev, [family]: !prev[family] }));
  };

  const handlePaste = () => {
    const lines = pasteText.split('\n');
    const motors = [];
    const servos = [];
    for (const line of lines) {
      const m = line.match(/resource\s+(MOTOR|SERVO)\s+(\d+)\s+([A-Ia-i]\d{1,2})/i);
      if (m) {
        const pin = normalizePin(m[3]);
        if (!pin) continue;
        const entry = { index: parseInt(m[2], 10), pin };
        if (m[1].toUpperCase() === 'MOTOR') motors.push(entry);
        else servos.push(entry);
      }
    }
    if (motors.length === 0 && servos.length === 0) return;

    const pastedTarget = {
      boardName: 'CLI Paste',
      mcu: 'Unknown',
      mcuRaw: 'Unknown',
      manufacturer: '',
      motors,
      servos,
      uarts: [],
      timerPins: [],
      timerGroups: {},
      resolutionStatus: 'unresolved',
      wingCapable: null,
      ledStrip: null,
      features: [],
      gyroAlign: null,
    };
    onSelectTarget(pastedTarget);
    setShowPaste(false);
    setPasteText('');
  };

  const wingIcon = (t) => {
    if (t.wingCapable === true) return { cls: 'capable', ch: '\u2713' };
    if (t.wingCapable === null) return { cls: 'unknown', ch: '?' };
    return { cls: 'incapable', ch: '\u2717' };
  };

  return (
    <Section title="Target board" badge={selectedTarget ? selectedTarget.boardName : null}>
      <input
        className="target-search"
        type="text"
        placeholder="Search board name or manufacturer..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      <div className="target-filter-row">
        {['STM32F4', 'STM32F7', 'STM32H7'].map(fam => (
          <button
            key={fam}
            className={mcuFilter[fam] ? 'active' : ''}
            onClick={() => toggleMcu(fam)}
          >
            {fam.replace('STM32', '')}
          </button>
        ))}
        <button
          className={wingOnly ? 'active' : ''}
          onClick={() => setWingOnly(v => !v)}
        >
          Wing capable
        </button>
      </div>

      <div className="target-list">
        {filtered.length === 0 && (
          <div style={{ padding: '12px', fontSize: 12, color: 'var(--surface-600)', textAlign: 'center' }}>
            No targets found
          </div>
        )}
        {filtered.map(t => {
          const w = wingIcon(t);
          const isSelected = selectedTarget && selectedTarget.boardName === t.boardName;
          return (
            <div
              key={t.boardName}
              className={`target-row${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectTarget(t)}
            >
              <span className="target-row-name">{t.boardName}</span>
              <span className="mcu-badge">{t.mcu.replace('STM32', '')}</span>
              <span className={`wing-badge ${w.cls}`}>{w.ch}</span>
            </div>
          );
        })}
      </div>

      {selectedTarget && (
        <div className="target-info">
          <div className="target-info-row">
            <span>Board</span>
            <span>{selectedTarget.boardName}</span>
          </div>
          <div className="target-info-row">
            <span>MCU</span>
            <span>{selectedTarget.mcuRaw || selectedTarget.mcu}</span>
          </div>
          <div className="target-info-row">
            <span>Motors</span>
            <span>{selectedTarget.motors.length} pins</span>
          </div>
          <div className="target-info-row">
            <span>Servos</span>
            <span>{selectedTarget.servos.length} pins</span>
          </div>
          <div className="target-info-row">
            <span>UARTs</span>
            <span>{selectedTarget.uarts.length}</span>
          </div>
          <div className="target-info-row">
            <span>Timer groups</span>
            <span>{Object.keys(selectedTarget.timerGroups).length}</span>
          </div>
          <div className="target-info-row">
            <span>Resolution</span>
            <span className={`resolution-badge ${selectedTarget.resolutionStatus}`}>
              {selectedTarget.resolutionStatus}
            </span>
          </div>
        </div>
      )}

      <button className="target-paste-link" onClick={() => setShowPaste(v => !v)}>
        {showPaste ? 'Cancel' : 'Paste CLI resource dump'}
      </button>

      {showPaste && (
        <div>
          <textarea
            className="target-paste-area"
            placeholder="Paste output of 'resource show all' from Betaflight CLI..."
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
          />
          <button className="btn" style={{ marginTop: 6 }} onClick={handlePaste}>
            Parse
          </button>
        </div>
      )}
    </Section>
  );
}
