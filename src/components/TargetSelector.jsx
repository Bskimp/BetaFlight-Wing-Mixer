import { useState, useMemo } from 'react';
import Section from './common/Section';
import { normalizePin } from '../utils/timerCheck';

// Classify a target into a display category
function getBoardCategory(t) {
  if (t.boardType === 'wing') return 'wing';
  if (t.boardType === 'aio') return 'aio';
  if (t.boardType === 'fc') return 'fc';
  return 'other';
}

const CATEGORY_ORDER = { wing: 0, fc: 1, aio: 2, other: 3 };
const CATEGORY_LABELS = {
  wing: 'Wing FC',
  fc: 'FC',
  aio: 'AIO',
  other: 'Other',
};

export default function TargetSelector({ targets, selectedTarget, onSelectTarget }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState({ wing: true, fc: true, aio: true, other: true });
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const targetList = useMemo(() => Object.values(targets), [targets]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return targetList
      .filter(t => {
        const cat = getBoardCategory(t);
        if (!typeFilter[cat]) return false;
        if (q && !t.boardName.toLowerCase().includes(q) && !t.manufacturer.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const catA = CATEGORY_ORDER[getBoardCategory(a)] ?? 4;
        const catB = CATEGORY_ORDER[getBoardCategory(b)] ?? 4;
        if (catA !== catB) return catA - catB;
        return a.boardName.localeCompare(b.boardName);
      });
  }, [targetList, searchQuery, typeFilter]);

  const toggleType = (type) => {
    setTypeFilter(prev => ({ ...prev, [type]: !prev[type] }));
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
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={typeFilter[key] ? 'active' : ''}
            onClick={() => toggleType(key)}
          >
            {label}
          </button>
        ))}
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
              {(() => {
                const cat = getBoardCategory(t);
                return cat !== 'other' ? (
                  <span className={`board-type-badge ${cat}`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                ) : null;
              })()}
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
          {selectedTarget.boardType && selectedTarget.boardType !== 'unknown' && (
            <div className="target-info-row">
              <span>Type</span>
              <span className={`board-type-badge ${getBoardCategory(selectedTarget)}`}>
                {(() => {
                  const cat = getBoardCategory(selectedTarget);
                  if (cat === 'aio') return 'AIO (On-board ESC)';
                  if (cat === 'wing') return 'Wing FC';
                  if (cat === 'fc') return 'Standalone FC';
                  return 'Unknown';
                })()}
              </span>
            </div>
          )}
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
