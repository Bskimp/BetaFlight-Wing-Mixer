import { useState, useCallback, useMemo, useEffect } from 'react';
import { AIRFRAME_PRESETS } from './data/presets';
import { WING_DEFAULTS, PID_DEFAULTS, RATE_DEFAULTS, TPA_DEFAULTS, SPA_DEFAULTS } from './data/defaults';
import { validateMotorYaw, validateSTermYaw } from './data/validation';
import { generateCli } from './utils/cliGenerator';
import { detectConflicts, autoAssignResources } from './utils/timerCheck';
import targets from './data/targets.json';
import Sidebar, { isTabEnabled } from './components/Sidebar';
import PresetSelector from './components/PresetSelector';
import MotorMixer from './components/MotorMixer';
import ServoMixer from './components/ServoMixer';
import PidPanel from './components/PidPanel';
import RatesPanel from './components/RatesPanel';
import WingSettings from './components/WingSettings';
import TpaCurvePanel from './components/TpaCurvePanel';
import SpaPanel from './components/SpaPanel';
import TargetSelector from './components/TargetSelector';
import ResourceMapper from './components/ResourceMapper';
import CliOutput from './components/CliOutput';
import ImportDialog from './components/ImportDialog';
import WingDiagram from './components/WingDiagram';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// URL sharing: encode essential state compactly
function encodeStateToUrl(state) {
  const compact = {
    p: state.preset,
    m: state.motors.map(m => [m.throttle, m.roll, m.pitch, m.yaw]),
    s: state.servos.map(s => [s.id, s.roll, s.pitch, s.yaw]),
    pid: [
      [state.pids.roll.p, state.pids.roll.i, state.pids.roll.d, state.pids.roll.f],
      [state.pids.pitch.p, state.pids.pitch.i, state.pids.pitch.d, state.pids.pitch.f],
      [state.pids.yaw.p, state.pids.yaw.i, state.pids.yaw.d, state.pids.yaw.f],
    ],
    r: [state.rates.roll, state.rates.pitch, state.rates.yaw],
    w: {
      sp: state.wingSettings.s_pitch,
      sr: state.wingSettings.s_roll,
      sy: state.wingSettings.s_yaw,
      pw: state.wingSettings.servo_pwm_rate,
      ir: state.wingSettings.iterm_relax_cutoff,
    },
    dt: state.diffThrust ? 1 : 0,
  };
  return btoa(JSON.stringify(compact));
}

function decodeStateFromUrl(encoded) {
  try {
    const c = JSON.parse(atob(encoded));
    const presetKey = c.p;
    const fallback = AIRFRAME_PRESETS[presetKey];

    const motors = c.m.map((m, i) => ({
      id: i,
      label: `Motor ${i + 1}`,
      throttle: m[0], roll: m[1], pitch: m[2], yaw: m[3],
    }));

    const servos = c.s.map(s => ({
      id: s[0],
      label: fallback?.servos?.[s[0]]?.label || `Servo ${s[0]}`,
      roll: s[1], pitch: s[2], yaw: s[3],
    }));

    const pids = {
      roll:  { p: c.pid[0][0], i: c.pid[0][1], d: c.pid[0][2], f: c.pid[0][3] },
      pitch: { p: c.pid[1][0], i: c.pid[1][1], d: c.pid[1][2], f: c.pid[1][3] },
      yaw:   { p: c.pid[2][0], i: c.pid[2][1], d: c.pid[2][2], f: c.pid[2][3] },
    };

    const rates = { roll: c.r[0], pitch: c.r[1], yaw: c.r[2] };

    const wingSettings = {
      ...WING_DEFAULTS,
      s_pitch: c.w.sp,
      s_roll: c.w.sr,
      s_yaw: c.w.sy,
      servo_pwm_rate: c.w.pw,
      iterm_relax_cutoff: c.w.ir,
    };

    return { preset: presetKey, motors, servos, pids, rates, wingSettings, diffThrust: !!c.dt };
  } catch {
    return null;
  }
}

const TAB_TITLES = {
  setup: 'Setup',
  mixer: 'Mixer',
  pids: 'PIDs',
  tuning: 'Tuning',
  output: 'Output',
};

export default function App() {
  const [preset, setPreset] = useState('flying_wing_dt');
  const [motors, setMotors] = useState(deepClone(AIRFRAME_PRESETS.flying_wing_dt.motors));
  const [servos, setServos] = useState(deepClone(AIRFRAME_PRESETS.flying_wing_dt.servos));
  const [diffThrust, setDiffThrust] = useState(true);
  const [wingSettings, setWingSettings] = useState({ ...WING_DEFAULTS });
  const [pids, setPids] = useState(deepClone(PID_DEFAULTS));
  const [rates, setRates] = useState({ ...RATE_DEFAULTS });
  const [tpaSettings, setTpaSettings] = useState({ ...TPA_DEFAULTS });
  const [spaSettings, setSpaSettings] = useState({ ...SPA_DEFAULTS });
  const [complexity, setComplexity] = useState('advanced');
  const [theme, setTheme] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [userModifiedResources, setUserModifiedResources] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState(null);
  const [passthrough, setPassthrough] = useState(null);
  const [activeTab, setActiveTab] = useState('setup');

  // Load from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('c');
    if (encoded) {
      const state = decodeStateFromUrl(encoded);
      if (state) {
        setPreset(state.preset);
        setMotors(state.motors);
        setServos(state.servos);
        setPids(state.pids);
        setRates(state.rates);
        setWingSettings(state.wingSettings);
        setDiffThrust(state.diffThrust);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // When complexity changes, ensure active tab is still valid
  useEffect(() => {
    const tabDef = { setup: 'simple', mixer: 'advanced', pids: 'advanced', tuning: 'expert', output: 'simple' };
    const levels = { simple: 0, advanced: 1, expert: 2 };
    const minLevel = tabDef[activeTab];
    if (levels[complexity] < levels[minLevel]) {
      setActiveTab('setup');
    }
  }, [complexity, activeTab]);

  const loadPreset = useCallback((key) => {
    const p = AIRFRAME_PRESETS[key];

    if (selectedTarget && userModifiedResources) {
      if (!window.confirm('Changing preset will reset resource assignments. Continue?')) return;
    }

    setPreset(key);
    setMotors(deepClone(p.motors));
    setServos(deepClone(p.servos));
    setDiffThrust(p.diffThrust);
    setWingSettings(prev => ({
      ...prev,
      s_yaw: p.diffThrust ? 0 : prev.s_yaw,
    }));

    if (selectedTarget) {
      setAssignments(autoAssignResources(p, selectedTarget));
      setUserModifiedResources(false);
    }

    setImportSource(null);
    setPassthrough(null);
  }, [selectedTarget, userModifiedResources]);

  const handleTargetSelect = useCallback((target) => {
    if (userModifiedResources) {
      if (!window.confirm('Changing target will reset resource assignments. Continue?')) return;
    }
    setSelectedTarget(target);
    const currentPreset = AIRFRAME_PRESETS[preset];
    if (currentPreset) {
      setAssignments(autoAssignResources(currentPreset, target));
    } else {
      setAssignments({});
    }
    setUserModifiedResources(false);
  }, [preset, userModifiedResources]);

  const handleAssignmentsChange = useCallback((newAssignments) => {
    setAssignments(newAssignments);
    setUserModifiedResources(true);
  }, []);

  const handleImport = useCallback((state) => {
    setPreset(state.preset);
    setMotors(state.motors);
    setServos(state.servos);
    setDiffThrust(state.diffThrust);
    setPids(state.pids);
    setRates(state.rates);
    setWingSettings(state.wingSettings);
    setTpaSettings(state.tpaSettings);
    setSpaSettings(state.spaSettings);
    setPassthrough(state.passthrough);
    setImportSource(state.boardName);
    setShowImport(false);
    setComplexity('expert');

    if (state.boardName && targets[state.boardName]) {
      const target = targets[state.boardName];
      setSelectedTarget(target);
    }
  }, []);

  const handleShare = useCallback(() => {
    const encoded = encodeStateToUrl({
      preset, motors, servos, pids, rates, wingSettings, diffThrust,
    });
    const url = `${window.location.origin}${window.location.pathname}?c=${encoded}`;
    navigator.clipboard.writeText(url);
  }, [preset, motors, servos, pids, rates, wingSettings, diffThrust]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === null ? 'light' : prev === 'light' ? 'dark' : null;
      // Remove both classes first
      document.documentElement.classList.remove('light-theme', 'dark-theme');
      if (next !== null) {
        document.documentElement.classList.add(`${next}-theme`);
      }
      return next;
    });
  };

  const handleComplexityChange = useCallback((level) => {
    setComplexity(level);
  }, []);

  // Timer conflict detection
  const conflicts = useMemo(() => {
    if (!selectedTarget) return [];
    return detectConflicts(assignments, selectedTarget.timerPins);
  }, [assignments, selectedTarget]);

  // CLI generation
  const cliText = useMemo(() => generateCli({
    preset, motors, servos, wingSettings, pids, rates, diffThrust, complexity,
    selectedTarget, assignments, tpaSettings, spaSettings, passthrough,
  }), [preset, motors, servos, wingSettings, pids, rates, diffThrust, complexity, selectedTarget, assignments, tpaSettings, spaSettings, passthrough]);

  // Collect warnings
  const warnings = useMemo(() => {
    const w = [];
    motors.forEach(m => {
      const v = validateMotorYaw(m.yaw);
      if (v) w.push(`${m.label}: ${v.message}`);
    });
    const sYaw = validateSTermYaw(wingSettings.s_yaw, diffThrust);
    if (sYaw) w.push(sYaw.message);
    for (const c of conflicts) {
      w.push(c.message);
    }
    return w;
  }, [motors, wingSettings, diffThrust, conflicts]);

  // Copy CLI to clipboard
  const [copied, setCopied] = useState(false);
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(cliText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cliText]);

  const isAdvanced = complexity === 'advanced' || complexity === 'expert';

  // Tab content rendering
  const renderTabContent = () => {
    switch (activeTab) {
      case 'setup':
        return (
          <>
            {importSource && (
              <div className="import-badge">
                Imported from {importSource}
                <button className="import-badge-clear" onClick={() => { setImportSource(null); setPassthrough(null); }}>&times;</button>
              </div>
            )}
            <div className="header-controls">
              <button className="btn import-btn" onClick={() => setShowImport(true)}>
                Import Config
              </button>
            </div>
            {complexity === 'expert' && (
              <TargetSelector
                targets={targets}
                selectedTarget={selectedTarget}
                onSelectTarget={handleTargetSelect}
              />
            )}
            {complexity === 'expert' && selectedTarget && (
              <ResourceMapper
                target={selectedTarget}
                assignments={assignments}
                onAssignmentsChange={handleAssignmentsChange}
                conflicts={conflicts}
              />
            )}
          </>
        );

      case 'mixer':
        return (
          <>
            <PresetSelector selectedPreset={preset} onSelect={loadPreset} />
            <WingDiagram preset={preset} motors={motors} servos={servos} />
            {isAdvanced && (
              <MotorMixer motors={motors} onChange={setMotors} />
            )}
            <ServoMixer
              servos={servos}
              onChange={setServos}
              mode={complexity === 'simple' ? 'direction' : 'full'}
            />
          </>
        );

      case 'pids':
        return (
          <>
            {isAdvanced && (
              <PidPanel pids={pids} onChange={setPids} />
            )}
            {isAdvanced && (
              <RatesPanel rates={rates} onChange={setRates} />
            )}
          </>
        );

      case 'tuning':
        return (
          <>
            <WingSettings wingSettings={wingSettings} diffThrust={diffThrust} onChange={setWingSettings} />
            <TpaCurvePanel tpaSettings={tpaSettings} onChange={setTpaSettings} />
            <SpaPanel spaSettings={spaSettings} onChange={setSpaSettings} />
          </>
        );

      case 'output':
        return (
          <CliOutput
            cliText={cliText}
            warnings={warnings}
            boardName={importSource || selectedTarget?.boardName}
            onShare={handleShare}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-wrapper">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        complexity={complexity}
        onComplexityChange={handleComplexityChange}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Mobile header */}
      <div className="mobile-header">
        <h1>BF Wing Mixer</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="segmented-control">
            {['simple', 'advanced', 'expert'].map(level => (
              <button
                key={level}
                className={complexity === level ? 'active' : ''}
                onClick={() => handleComplexityChange(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === null ? '\u25D0' : theme === 'dark' ? '\u263E' : '\u2600'}
          </button>
        </div>
      </div>

      <main className="content-area">
        <div className="tab-title">{TAB_TITLES[activeTab]}</div>
        <div className="content-wrapper">
          {renderTabContent()}
        </div>

        {/* Bottom toolbar with Copy button — always visible */}
        <div className="content-toolbar">
          <button
            className={`save-btn${copied ? ' copied' : ''}`}
            onClick={copyToClipboard}
          >
            {copied ? 'Copied!' : 'Copy CLI'}
          </button>
          <button className="toolbar-btn" onClick={() => setActiveTab('output')}>
            View Output
          </button>
          {warnings.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--warning-500)' }}>
              {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </main>

      {showImport && (
        <ImportDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
