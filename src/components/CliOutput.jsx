import { useState } from 'react';
import Section from './common/Section';

export default function CliOutput({ cliText, warnings, boardName, onShare }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

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

  const lines = cliText.split('\n');

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
        </div>
        <pre className="cli-pre">
          {lines.map((line, i) => (
            <span key={i} className={line.startsWith('#') ? 'cli-comment' : ''}>
              {line}{i < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </pre>
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
