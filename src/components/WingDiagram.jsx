import { useMemo } from 'react';

// Preset type detection
function getAirframeType(preset) {
  if (preset.startsWith('flying_wing')) return 'flying_wing';
  if (preset === 'vtail') return 'vtail';
  return 'airplane';
}

function FlyingWingSvg({ motors, servos }) {
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
          {/* Left motor */}
          <circle cx="140" cy="80" r="24" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          <circle cx="140" cy="80" r="11" fill="var(--color-motor)" opacity="0.85" />
          <text x="140" y="84" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M1</text>
          {/* Right motor */}
          <circle cx="260" cy="80" r="24" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          <circle cx="260" cy="80" r="11" fill="var(--color-motor)" opacity="0.85" />
          <text x="260" y="84" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M2</text>
          {/* Thrust arrows */}
          <polygon points="140,56 135,64 145,64" fill="var(--color-motor)" opacity="0.7" />
          <polygon points="260,56 255,64 265,64" fill="var(--color-motor)" opacity="0.7" />
        </>
      ) : (
        <>
          <circle cx="200" cy="52" r="24" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          <circle cx="200" cy="52" r="11" fill="var(--color-motor)" opacity="0.85" />
          <text x="200" y="56" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M1</text>
          <polygon points="200,28 195,36 205,36" fill="var(--color-motor)" opacity="0.7" />
        </>
      )}

      {/* Left elevon */}
      <rect x="55" y="178" width="80" height="14" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="95" y="189" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" className="wing-diagram-label">
        {servos[0]?.label || 'S1'}
      </text>

      {/* Right elevon */}
      <rect x="265" y="178" width="80" height="14" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="305" y="189" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" className="wing-diagram-label">
        {servos[1]?.label || 'S2'}
      </text>

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

function AirplaneSvg({ motors, servos }) {
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
          <circle cx="130" cy="90" r="20" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          <circle cx="130" cy="90" r="10" fill="var(--color-motor)" opacity="0.85" />
          <text x="130" y="94" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M1</text>
          <polygon points="130,68 125,76 135,76" fill="var(--color-motor)" opacity="0.7" />

          <circle cx="270" cy="90" r="20" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          <circle cx="270" cy="90" r="10" fill="var(--color-motor)" opacity="0.85" />
          <text x="270" y="94" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M2</text>
          <polygon points="270,68 265,76 275,76" fill="var(--color-motor)" opacity="0.7" />
        </>
      ) : (
        <>
          <circle cx="200" cy="42" r="20" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          <circle cx="200" cy="42" r="10" fill="var(--color-motor)" opacity="0.85" />
          <text x="200" y="46" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M1</text>
          <polygon points="200,20 195,28 205,28" fill="var(--color-motor)" opacity="0.7" />
        </>
      )}

      {/* Left aileron */}
      <rect x="55" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="90" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">S1</text>

      {/* Right aileron */}
      <rect x="275" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="310" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">S2</text>

      {/* Elevator */}
      <rect x="150" y="263" width="100" height="10" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="200" y="272" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">S3</text>

      {/* Rudder (only if 4+ servos and not diff thrust) */}
      {servos.length >= 4 && (
        <>
          <rect x="210" y="210" width="10" height="40" rx="3" fill="var(--color-servo)" opacity="0.85" />
          <text x="230" y="234" fill="var(--color-servo)" fontSize="9" fontWeight="600" className="wing-diagram-label">S4</text>
        </>
      )}

      <text x="200" y="330" textAnchor="middle" fill="var(--surface-600)" fontSize="11" fontFamily="var(--font-sans)">
        {hasTwoMotors ? 'Airplane (Diff Thrust)' : 'Conventional Airplane'}
      </text>
    </svg>
  );
}

function VTailSvg({ motors, servos }) {
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
      <circle cx="200" cy="42" r="20" fill="none" stroke="var(--color-motor)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
      <circle cx="200" cy="42" r="10" fill="var(--color-motor)" opacity="0.85" />
      <text x="200" y="46" textAnchor="middle" fill="#000" fontSize="10" fontWeight="600" className="wing-diagram-label">M1</text>
      <polygon points="200,20 195,28 205,28" fill="var(--color-motor)" opacity="0.7" />

      {/* Left aileron */}
      <rect x="55" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="90" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">S1</text>

      {/* Right aileron */}
      <rect x="275" y="145" width="70" height="12" rx="3" fill="var(--color-servo)" opacity="0.85" />
      <text x="310" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600" className="wing-diagram-label">S2</text>

      {/* Left V-tail surface */}
      <rect x="130" y="268" width="40" height="10" rx="3"
        fill="var(--color-servo)" opacity="0.85"
        transform="rotate(-25, 150, 273)" />
      <text x="125" y="290" fill="var(--color-servo)" fontSize="9" fontWeight="600" className="wing-diagram-label">S3</text>

      {/* Right V-tail surface */}
      <rect x="230" y="268" width="40" height="10" rx="3"
        fill="var(--color-servo)" opacity="0.85"
        transform="rotate(25, 250, 273)" />
      <text x="265" y="290" fill="var(--color-servo)" fontSize="9" fontWeight="600" className="wing-diagram-label">S4</text>

      <text x="200" y="330" textAnchor="middle" fill="var(--surface-600)" fontSize="11" fontFamily="var(--font-sans)">
        V-Tail Airplane
      </text>
    </svg>
  );
}

export default function WingDiagram({ preset, motors, servos }) {
  const airframeType = useMemo(() => getAirframeType(preset), [preset]);

  return (
    <div className="wing-diagram">
      {airframeType === 'flying_wing' && <FlyingWingSvg motors={motors} servos={servos} />}
      {airframeType === 'airplane' && <AirplaneSvg motors={motors} servos={servos} />}
      {airframeType === 'vtail' && <VTailSvg motors={motors} servos={servos} />}
    </div>
  );
}
