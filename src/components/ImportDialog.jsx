import { useState } from 'react';
import { parseDiff } from '../utils/configParser';
import { mapConfigToState, buildImportSummary } from '../utils/configMapper';

export default function ImportDialog({ onImport, onClose }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const handleParse = () => {
    setError(null);
    setParsed(null);
    setSummary(null);

    if (!text.trim()) {
      setError('Paste a diff output first');
      return;
    }

    try {
      const result = parseDiff(text);

      // Validate we got something useful
      if (!result.mixerType && result.motors.length === 0 && result.servoMix.length === 0) {
        setError('No mixer data found. Make sure you paste a BF diff or diff all output.');
        return;
      }

      setParsed(result);
      setSummary(buildImportSummary(result));
    } catch (e) {
      setError(`Parse error: ${e.message}`);
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    const state = mapConfigToState(parsed);
    onImport(state);
  };

  return (
    <div className="import-overlay" onClick={onClose}>
      <div className="import-dialog" onClick={e => e.stopPropagation()}>
        <div className="import-header">
          <h3>Import Config</h3>
          <button className="import-close" onClick={onClose}>&times;</button>
        </div>

        <div className="import-body">
          <p className="import-instructions">
            Paste your Betaflight <code>diff</code> or <code>diff all</code> output below.
          </p>

          <textarea
            className="import-textarea"
            value={text}
            onChange={e => { setText(e.target.value); setParsed(null); setSummary(null); setError(null); }}
            placeholder="# Betaflight / STM32F405 ...&#10;batch start&#10;..."
            rows={12}
          />

          {error && <div className="import-error">{error}</div>}

          {!parsed && (
            <div className="import-actions">
              <button className="btn import-parse-btn" onClick={handleParse}>Parse</button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          )}

          {summary && (
            <div className="import-summary">
              <div className="import-summary-title">Detected configuration:</div>
              {summary.map((line, i) => (
                <div key={i} className="import-summary-line">{line}</div>
              ))}
            </div>
          )}

          {parsed && (
            <div className="import-actions">
              <button className="btn import-apply-btn" onClick={handleApply}>Apply</button>
              <button className="btn" onClick={() => { setParsed(null); setSummary(null); }}>Back</button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
