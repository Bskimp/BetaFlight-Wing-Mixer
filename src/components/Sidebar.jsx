const TABS = [
  { id: 'hardware', icon: '\uD83D\uDCCB', label: 'Hardware' },
  { id: 'wing-setup', icon: '\u2699', label: 'Wing Setup' },
  { id: 'pids', icon: '\u2261', label: 'PIDs' },
  { id: 'tuning', icon: '\u223F', label: 'Tuning' },
  { id: 'tuning-guide', icon: '\uD83D\uDCD6', label: 'Tuning Guide' },
  { id: 'output', icon: '\u2756', label: 'Output' },
  { id: 'guide', icon: '\u2139', label: 'How to Use' },
];

export default function Sidebar({ activeTab, onTabChange, theme, onThemeToggle }) {
  const themeIcon = theme === null ? '\u25D0' : theme === 'dark' ? '\u263E' : '\u2600';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>BF Wing Mixer</h1>
        <div className="sidebar-controls">
          <button className="theme-toggle" onClick={onThemeToggle} title="Toggle theme">
            {themeIcon}
          </button>
        </div>
      </div>

      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        BF Wing Mixer Tool
      </div>
    </div>
  );
}
