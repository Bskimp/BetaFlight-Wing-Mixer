const TABS = [
  { id: 'setup', icon: '\u2699', label: 'Setup', minLevel: 'simple' },
  { id: 'mixer', icon: '\u2630', label: 'Mixer', minLevel: 'simple' },
  { id: 'pids', icon: '\u2261', label: 'PIDs', minLevel: 'advanced' },
  { id: 'tuning', icon: '\u223F', label: 'Tuning', minLevel: 'expert' },
  { id: 'output', icon: '\u2756', label: 'Output', minLevel: 'simple' },
];

const COMPLEXITY_LEVELS = ['simple', 'advanced', 'expert'];

function isTabEnabled(tab, complexity) {
  const levels = { simple: 0, advanced: 1, expert: 2 };
  return levels[complexity] >= levels[tab.minLevel];
}

export default function Sidebar({ activeTab, onTabChange, complexity, onComplexityChange, theme, onThemeToggle }) {
  const themeIcon = theme === null ? '\u25D0' : theme === 'dark' ? '\u263E' : '\u2600';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>BF Wing Mixer</h1>
        <div className="sidebar-controls">
          <div className="segmented-control">
            {COMPLEXITY_LEVELS.map(level => (
              <button
                key={level}
                className={complexity === level ? 'active' : ''}
                onClick={() => onComplexityChange(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <div className="sidebar-controls-row">
            <button className="theme-toggle" onClick={onThemeToggle} title="Toggle theme">
              {themeIcon}
            </button>
          </div>
        </div>
      </div>

      <nav className="tab-nav">
        {TABS.map(tab => {
          const enabled = isTabEnabled(tab, complexity);
          return (
            <button
              key={tab.id}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}${!enabled ? ' disabled' : ''}`}
              onClick={() => enabled && onTabChange(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        BF Wing Mixer Tool
      </div>
    </div>
  );
}

export { TABS, isTabEnabled };
