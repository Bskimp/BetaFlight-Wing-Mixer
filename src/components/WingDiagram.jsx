import { useMemo } from 'react';
import { AIRFRAME_PRESETS } from '../data/presets';
import { findPin } from '../utils/pinLookup';

// Preset type detection
function getAirframeType(preset) {
  if (preset.startsWith('flying_wing')) return 'flying_wing';
  if (preset === 'vtail') return 'vtail';
  return 'airplane';
}

// Small pin label rendered below a motor/servo label
function PinTag({ x, y, pin }) {
  if (!pin) return null;
  const w = 28;
  const h = 14;
  return (
    <g>
      <rect x={x - w / 2} y={y - h + 2} width={w} height={h} rx="3"
        fill="var(--primary-500)" opacity="0.9" />
      <text x={x} y={y} textAnchor="middle" fill="#000"
        fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">
        {pin}
      </text>
    </g>
  );
}

// Motor rendered as a pill (rounded rect) so function name text fits
function MotorPill({ cx, cy, label, pin, pinY }) {
  const w = 50;
  const h = 20;
  return (
    <g>
      {/* Outer prop disc */}
      <circle cx={cx} cy={cy} r="24" fill="none" stroke="var(--color-motor)"
        strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
      {/* Inner pill */}
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="10"
        fill="var(--color-motor)" opacity="0.85" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#000"
        fontSize="9" fontWeight="600" className="wing-diagram-label">
        {label}
      </text>
      {/* Thrust arrow */}
      <polygon points={`${cx},${cy - 24} ${cx - 5},${cy - 16} ${cx + 5},${cy - 16}`}
        fill="var(--color-motor)" opacity="0.7" />
      <PinTag x={cx} y={pinY} pin={pin} />
    </g>
  );
}

function FlyingWingSvg({ motors, labelMap, pinMap }) {
  const hasTwoMotors = motors.length >= 2;

  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">
      {/* Wing body */}
      <path
        d="M200,50 L355,170 L370,195 L30,195 L45,170 Z"
        fill="var(--surface-200)" stroke="var(--surface-500)" strokeWidth="2"
      />
      {/* Center line */}
      <line x1="200" y1="50" x2="200" y2="195" stroke="var(--surface-400)" strokeWidth="1" strokeDasharray="4,4" />

      {/* Motor(s) */}
      {hasTwoMotors ? (
        <>
          <MotorPill cx={140} cy={80} label={labelMap.m1} pin={pinMap.m1} pinY={112} />
          <MotorPill cx={260} cy={80} label={labelMap.m2} pin={pinMap.m2} pinY={112} />
        </>
      ) : (
        <MotorPill cx={200} cy={52} label={labelMap.m1} pin={pinMap.m1} pinY={84} />
      )}

      {/* Left elevon */}
      <rect x="55" y="178" width="80" height="14" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="95" y="189" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s1}
      </text>
      <PinTag x={95} y={210} pin={pinMap.s1} />

      {/* Right elevon */}
      <rect x="265" y="178" width="80" height="14" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="305" y="189" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s2}
      </text>
      <PinTag x={305} y={210} pin={pinMap.s2} />

      {/* Deflection arrows on servos */}
      <path d="M75,176 L75,170 L85,173 Z" fill="var(--color-servo)" opacity="0.5" />
      <path d="M325,176 L325,170 L315,173 Z" fill="var(--color-servo)" opacity="0.5" />

      {/* Labels */}
      <text x="200" y="245" textAnchor="middle" fill="var(--surface-600)" fontSize="11" fontFamily="var(--font-sans)">
        {hasTwoMotors ? 'Flying Wing (Diff Thrust)' : 'Flying Wing'}
      </text>
    </svg>
  );
}

function AirplaneSvg({ motors, servos, labelMap, pinMap }) {
  const hasTwoMotors = motors.length >= 2;

  return (
    <svg viewBox="0 0 400 340" xmlns="http://www.w3.org/2000/svg">
      {/* Wings */}
      <path
        d="M200,60 L355,140 L355,160 L45,160 L45,140 Z"
        fill="var(--surface-200)" stroke="var(--surface-500)" strokeWidth="2"
      />
      {/* Fuselage */}
      <rect x="188" y="40" width="24" height="230" rx="12"
        fill="var(--surface-200)" stroke="var(--surface-500)" strokeWidth="2" />
      {/* Horizontal stab */}
      <path
        d="M200,240 L280,260 L280,272 L120,272 L120,260 Z"
        fill="var(--surface-200)" stroke="var(--surface-500)" strokeWidth="2"
      />

      {/* Motor(s) */}
      {hasTwoMotors ? (
        <>
          <MotorPill cx={130} cy={90} label={labelMap.m1} pin={pinMap.m1} pinY={118} />
          <MotorPill cx={270} cy={90} label={labelMap.m2} pin={pinMap.m2} pinY={118} />
        </>
      ) : (
        <MotorPill cx={200} cy={42} label={labelMap.m1} pin={pinMap.m1} pinY={70} />
      )}

      {/* Left aileron */}
      <rect x="55" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="90" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s1}
      </text>
      <PinTag x={90} y={170} pin={pinMap.s1} />

      {/* Right aileron */}
      <rect x="275" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="310" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s2}
      </text>
      <PinTag x={310} y={170} pin={pinMap.s2} />

      {/* Elevator */}
      <rect x="150" y="263" width="100" height="10" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="200" y="272" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s3}
      </text>
      <PinTag x={200} y={286} pin={pinMap.s3} />

      {/* Rudder (only if 4+ servos and not diff thrust) */}
      {servos.length >= 4 && (
        <>
          <rect x="210" y="210" width="10" height="40" rx="3" fill="var(--color-servo)" opacity="0.85" />
          <text x="230" y="234" fill="var(--color-servo)" fontSize="9" fontWeight="600" className="wing-diagram-label">
            {labelMap.s4}
          </text>
          <PinTag x={230} y={246} pin={pinMap.s4} />
        </>
      )}

      <text x="200" y="330" textAnchor="middle" fill="var(--surface-600)" fontSize="11" fontFamily="var(--font-sans)">
        {hasTwoMotors ? 'Airplane (Diff Thrust)' : 'Conventional Airplane'}
      </text>
    </svg>
  );
}

function VTailSvg({ labelMap, pinMap }) {
  return (
    <svg viewBox="0 0 400 340" xmlns="http://www.w3.org/2000/svg">
      {/* Wings */}
      <path
        d="M200,60 L355,140 L355,160 L45,160 L45,140 Z"
        fill="var(--surface-200)" stroke="var(--surface-500)" strokeWidth="2"
      />
      {/* Fuselage */}
      <rect x="188" y="40" width="24" height="210" rx="12"
        fill="var(--surface-200)" stroke="var(--surface-500)" strokeWidth="2" />
      {/* V-tail left */}
      <line x1="200" y1="235" x2="140" y2="280" stroke="var(--surface-500)" strokeWidth="2" />
      {/* V-tail right */}
      <line x1="200" y1="235" x2="260" y2="280" stroke="var(--surface-500)" strokeWidth="2" />

      {/* Motor */}
      <MotorPill cx={200} cy={42} label={labelMap.m1} pin={pinMap.m1} pinY={70} />

      {/* Left aileron */}
      <rect x="55" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="90" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s1}
      </text>
      <PinTag x={90} y={170} pin={pinMap.s1} />

      {/* Right aileron */}
      <rect x="275" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="310" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s2}
      </text>
      <PinTag x={310} y={170} pin={pinMap.s2} />

      {/* Left V-tail surface */}
      <rect x="130" y="268" width="40" height="10" rx="3"
        fill="var(--color-servo)" opacity="0.85"
        transform="rotate(-25, 150, 273)" />
      <text x="125" y="290" fill="var(--color-servo)" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s3}
      </text>
      <PinTag x={125} y={302} pin={pinMap.s3} />

      {/* Right V-tail surface */}
      <rect x="230" y="268" width="40" height="10" rx="3"
        fill="var(--color-servo)" opacity="0.85"
        transform="rotate(25, 250, 273)" />
      <text x="265" y="290" fill="var(--color-servo)" fontSize="9" fontWeight="600" className="wing-diagram-label">
        {labelMap.s4}
      </text>
      <PinTag x={265} y={302} pin={pinMap.s4} />

      <text x="200" y="330" textAnchor="middle" fill="var(--surface-600)" fontSize="11" fontFamily="var(--font-sans)">
        V-Tail Airplane
      </text>
    </svg>
  );
}

export default function WingDiagram({ preset, motors, servos, assignments }) {
  const airframeType = useMemo(() => getAirframeType(preset), [preset]);

  // Build label map from preset shortLabels
  const labelMap = useMemo(() => {
    const pd = AIRFRAME_PRESETS[preset];
    if (!pd) return {};
    const map = {};
    pd.motors.forEach((m, i) => { map[`m${i + 1}`] = m.shortLabel || m.label; });
    pd.servos.forEach((s, i) => { map[`s${i + 1}`] = s.shortLabel || s.label; });
    return map;
  }, [preset]);

  // Build pin map: m1, m2, s1, s2, s3, s4
  const pinMap = useMemo(() => {
    if (!assignments || Object.keys(assignments).length === 0) return {};
    return {
      m1: findPin(assignments, 'motor', 1),
      m2: findPin(assignments, 'motor', 2),
      s1: findPin(assignments, 'servo', 1),
      s2: findPin(assignments, 'servo', 2),
      s3: findPin(assignments, 'servo', 3),
      s4: findPin(assignments, 'servo', 4),
    };
  }, [assignments]);

  return (
    <div className="wing-diagram">
      {airframeType === 'flying_wing' && <FlyingWingSvg motors={motors} servos={servos} labelMap={labelMap} pinMap={pinMap} />}
      {airframeType === 'airplane' && <AirplaneSvg motors={motors} servos={servos} labelMap={labelMap} pinMap={pinMap} />}
      {airframeType === 'vtail' && <VTailSvg motors={motors} servos={servos} labelMap={labelMap} pinMap={pinMap} />}
    </div>
  );
}
