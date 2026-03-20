import { useState, useMemo } from 'react';
import { pinToCli } from '../utils/timerCheck';
import { BF_DEFAULTS } from '../data/defaults';
import Section from './common/Section';

/**
 * Build a map of pin → { type, index, label } from target's stock motor/servo arrays.
 */
function buildStockResources(target) {
  const map = {};
  if (target.motors) {
    for (const m of target.motors) {
      map[m.pin] = { type: 'motor', index: m.index, label: `Motor ${m.index}` };
    }
  }
  if (target.servos) {
    for (const s of target.servos) {
      map[s.pin] = { type: 'servo', index: s.index, label: `Servo ${s.index}` };
    }
  }
  return map;
}

/**
 * Build a label for a resource assignment.
 */
function assignmentLabel(a) {
  if (!a) return null;
  if (a.type === 'motor') return `Motor ${a.index}`;
  if (a.type === 'servo') return `Servo ${a.index}`;
  if (a.type === 'led') return 'LED';
  return null;
}

/**
 * Parse CLI text into setting key → value map for diffing.
 */
function parseSettings(text) {
  const map = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^set\s+(\S+)\s*=\s*(.+)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

/**
 * Structured compare: resource changes + settings changes.
 */
function CompareView({ target, assignments, cliText }) {
  const stockResources = useMemo(() => buildStockResources(target), [target]);

  // Collect all pins, sorted by resource type/index (Motor 1, Motor 2, ..., Servo 1, Servo 2, ...)
  const allPins = useMemo(() => {
    const pins = new Set();
    for (const pin of Object.keys(stockResources)) pins.add(pin);
    for (const pin of Object.keys(assignments)) pins.add(pin);
    const typeOrder = { motor: 0, servo: 1, led: 2 };
    return [...pins].sort((a, b) => {
      const ra = stockResources[a] || assignments[a];
      const rb = stockResources[b] || assignments[b];
      if (!ra && !rb) return a.localeCompare(b);
      if (!ra) return 1;
      if (!rb) return -1;
      const ta = typeOrder[ra.type] ?? 3;
      const tb = typeOrder[rb.type] ?? 3;
      if (ta !== tb) return ta - tb;
      return (ra.index || 0) - (rb.index || 0);
    });
  }, [stockResources, assignments]);

  // Compute resource changes
  const resourceRows = useMemo(() => {
    const rows = [];
    for (const pin of allPins) {
      const stock = stockResources[pin];
      const user = assignments[pin];
      const stockLabel = stock ? stock.label : '\u2014';
      const userLabel = assignmentLabel(user) || '\u2014';

      // Determine change status
      let status = 'unchanged';
      if (!stock && user) {
        status = 'added';
      } else if (stock && !user) {
        status = 'removed';
      } else if (stock && user && (stock.type !== user.type || stock.index !== user.index)) {
        status = 'changed';
      }

      // Only show rows that changed, or stock resources
      if (status !== 'unchanged' || stock) {
        rows.push({ pin, stockLabel, userLabel, status });
      }
    }
    return rows;
  }, [allPins, stockResources, assignments]);

  // Compute settings changes
  const settingChanges = useMemo(() => {
    const userSettings = parseSettings(cliText);
    const changes = [];
    for (const [key, userVal] of Object.entries(userSettings)) {
      const defaultVal = BF_DEFAULTS[key] !== undefined ? String(BF_DEFAULTS[key]) : null;
      if (defaultVal !== null && defaultVal !== userVal) {
        changes.push({ key, defaultVal, userVal });
      } else if (defaultVal === null) {
        // Setting not in BF_DEFAULTS — show as new
        changes.push({ key, defaultVal: '\u2014', userVal });
      }
    }
    return changes;
  }, [cliText]);

  const hasResourceChanges = resourceRows.some(r => r.status !== 'unchanged');

  return (
    <div className="compare-view">
      {/* Resource comparison */}
      <div className="compare-section">
        <div className="compare-section-title">Resource Changes</div>
        {!hasResourceChanges ? (
          <div className="compare-empty">No resource changes from stock target</div>
        ) : (
          <table className="compare-table">
            <thead>
              <tr>
                <th>Pin</th>
                <th>Stock ({target.boardName})</th>
                <th>Your Config</th>
              </tr>
            </thead>
            <tbody>
              {resourceRows.map(row => (
                <tr key={row.pin} className={`compare-row-${row.status}`}>
                  <td className="compare-pin">{pinToCli(row.pin)}</td>
                  <td>{row.stockLabel}</td>
                  <td>{row.userLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Settings comparison */}
      {settingChanges.length > 0 && (
        <div className="compare-section">
          <div className="compare-section-title">Settings Changed from Defaults</div>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Setting</th>
                <th>BF Default</th>
                <th>Your Value</th>
              </tr>
            </thead>
            <tbody>
              {settingChanges.map(row => (
                <tr key={row.key} className="compare-row-changed">
                  <td className="compare-setting-key">{row.key}</td>
                  <td className="compare-default-val">{row.defaultVal}</td>
                  <td className="compare-user-val">{row.userVal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CliPre({ text }) {
  const lines = text.split('\n');
  return (
    <pre className="cli-pre">
      {lines.map((line, i) => {
        const commentClass = line.startsWith('#') ? 'cli-comment' : '';
        return (
          <span key={i} className={commentClass}>
            {line}{i < lines.length - 1 ? '\n' : ''}
          </span>
        );
      })}
    </pre>
  );
}

export default function CliOutput({ cliText, warnings, boardName, onShare, selectedTarget, assignments }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cliText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveAsFile = () => {
    const name = boardName || 'wing-config';
    const blob = new Blob([cliText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const canCompare = selectedTarget && assignments && Object.keys(assignments).length > 0;

  return (
    <Section title="CLI output">
      <div className="cli-wrapper">
        <div className="cli-btn-row">
          <button
            className={`cli-action-btn primary${copied ? ' copied' : ''}`}
            onClick={copyToClipboard}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="cli-action-btn" onClick={saveAsFile}>
            Save .txt
          </button>
          {onShare && (
            <button
              className={`cli-action-btn${shared ? ' copied' : ''}`}
              onClick={handleShare}
            >
              {shared ? 'Link copied!' : 'Share'}
            </button>
          )}
          {canCompare && (
            <button
              className={`cli-action-btn${showCompare ? ' active' : ''}`}
              onClick={() => setShowCompare(v => !v)}
            >
              {showCompare ? 'Hide Compare' : 'Compare with Stock'}
            </button>
          )}
        </div>

        <CliPre text={cliText} />

        {showCompare && canCompare && (
          <CompareView
            target={selectedTarget}
            assignments={assignments}
            cliText={cliText}
          />
        )}
      </div>
      {warnings && warnings.length > 0 && (
        <div className="cli-warnings">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}
    </Section>
  );
}
