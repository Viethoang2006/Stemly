import React from 'react';
import {
  CircuitComp,
  CompType,
  LED_COLOR_MAP,
  LedColorKey,
  OscilloscopeTraceData,
  SEVEN_SEG_CODES,
  SolvedCompState,
  getResistorColorBands,
} from './circuitSandboxCore';

export const BreadboardPaletteIcon: React.FC = () => (
  <svg viewBox="0 0 64 40" className="w-14 h-9 shrink-0" aria-hidden="true">
    <rect x="6" y="5" width="52" height="30" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" />
    <line x1="10" y1="9" x2="54" y2="9" stroke="#dc2626" strokeWidth="1.2" />
    <line x1="10" y1="31" x2="54" y2="31" stroke="#2563eb" strokeWidth="1.2" />
    <rect x="10" y="18.5" width="44" height="3" rx="0.8" fill="#cbd5e1" />
    {[14, 20, 26, 32, 38, 44, 50].map((x) => (
      <React.Fragment key={x}>
        <circle cx={x} cy="13" r="1.1" fill="#1e293b" />
        <circle cx={x} cy="16" r="1.1" fill="#1e293b" />
        <circle cx={x} cy="24" r="1.1" fill="#1e293b" />
        <circle cx={x} cy="27" r="1.1" fill="#1e293b" />
      </React.Fragment>
    ))}
  </svg>
);

export const CompPaletteIcon: React.FC<{ type: CompType }> = ({ type }) => {
  return (
    <svg viewBox="0 0 64 40" className="w-14 h-9 shrink-0" aria-hidden="true">
      {type === 'source' && (
        <>
          <rect x="14" y="8" width="36" height="24" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.4" />
          <rect x="38" y="8" width="12" height="24" rx="3" fill="#d97706" />
          <rect x="8" y="13" width="6" height="5" rx="1" fill="#94a3b8" />
          <rect x="8" y="22" width="6" height="5" rx="1" fill="#cbd5e1" />
          <text x="44" y="23" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle">
            9V
          </text>
          <text x="20" y="18" fill="#cbd5e1" fontSize="8" fontWeight="700">
            −
          </text>
          <text x="20" y="29" fill="#f87171" fontSize="8" fontWeight="800">
            +
          </text>
        </>
      )}

      {type === 'ac_source' && (
        <>
          <rect x="10" y="6" width="44" height="28" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.4" />
          <rect x="15" y="10" width="34" height="12" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
          <path d="M 20 16 Q 24 11, 28 16 T 36 16 T 44 16" fill="none" stroke="#34d399" strokeWidth="1.6" />
          <circle cx="22" cy="28" r="2.6" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="42" cy="28" r="2.6" fill="#dc2626" stroke="#fca5a5" strokeWidth="1" />
        </>
      )}

      {type === 'ground' && (
        <>
          <line x1="32" y1="4" x2="32" y2="18" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="16" y1="18" x2="48" y2="18" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          <line x1="21" y1="24" x2="43" y2="24" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="26" y1="30" x2="38" y2="30" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {type === 'resistor' && (
        <>
          <line x1="4" y1="20" x2="15" y2="20" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="49" y1="20" x2="60" y2="20" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="14" y="12" width="36" height="16" rx="6" fill="#e5c899" stroke="#b08d57" strokeWidth="1.2" />
          <rect x="20" y="12" width="4" height="16" fill="#dc2626" />
          <rect x="27" y="12" width="4" height="16" fill="#dc2626" />
          <rect x="34" y="12" width="4" height="16" fill="#78350f" />
          <rect x="42" y="12" width="3" height="16" fill="#d97706" />
        </>
      )}

      {type === 'capacitor' && (
        <>
          <line x1="25" y1="25" x2="25" y2="37" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="39" y1="25" x2="39" y2="37" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="19" y="6" width="26" height="22" rx="4" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
          <rect x="36" y="6" width="7" height="22" rx="1" fill="#cbd5e1" />
          <text x="39.5" y="19" fill="#0f172a" fontSize="9" fontWeight="800" textAnchor="middle">
            −
          </text>
          <ellipse cx="32" cy="6" rx="13" ry="2.6" fill="#93c5fd" />
        </>
      )}

      {type === 'inductor' && (
        <>
          <line x1="4" y1="22" x2="13" y2="22" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="51" y1="22" x2="60" y2="22" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="14" y="17" width="36" height="10" rx="3" fill="#334155" />
          <path
            d="M 14 22 C 14 10, 23 10, 23 22 C 23 10, 32 10, 32 22 C 32 10, 41 10, 41 22 C 41 10, 50 10, 50 22"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M 15 20 C 15 12, 22 12, 22 20 M 24 20 C 24 12, 31 12, 31 20 M 33 20 C 33 12, 40 12, 40 20 M 42 20 C 42 12, 49 12, 49 20"
            fill="none"
            stroke="#fde68a"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </>
      )}

      {type === 'pot' && (
        <>
          <circle cx="32" cy="18" r="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="32" cy="18" r="8.5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
          <line x1="32" y1="18" x2="38" y2="12" stroke="#f8fafc" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="22" y1="31" x2="22" y2="38" stroke="#94a3b8" strokeWidth="2" />
          <line x1="32" y1="31" x2="32" y2="38" stroke="#a78bfa" strokeWidth="2" />
          <line x1="42" y1="31" x2="42" y2="38" stroke="#94a3b8" strokeWidth="2" />
        </>
      )}

      {type === 'switch' && (
        <>
          <line x1="6" y1="22" x2="16" y2="22" stroke="#94a3b8" strokeWidth="2.2" />
          <line x1="48" y1="22" x2="58" y2="22" stroke="#94a3b8" strokeWidth="2.2" />
          <rect x="14" y="11" width="36" height="20" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1.4" />
          <rect x="18" y="15" width="28" height="12" rx="2" fill="#0f172a" />
          <rect x="20" y="16" width="12" height="10" rx="1.5" fill="#10b981" stroke="#6ee7b7" strokeWidth="0.9" />
          <line x1="24" y1="18" x2="24" y2="24" stroke="#064e3b" strokeWidth="1.2" />
          <line x1="28" y1="18" x2="28" y2="24" stroke="#064e3b" strokeWidth="1.2" />
        </>
      )}

      {type === 'pushbutton' && (
        <>
          <line x1="14" y1="10" x2="20" y2="10" stroke="#94a3b8" strokeWidth="2" />
          <line x1="14" y1="30" x2="20" y2="30" stroke="#94a3b8" strokeWidth="2" />
          <line x1="44" y1="10" x2="50" y2="10" stroke="#94a3b8" strokeWidth="2" />
          <line x1="44" y1="30" x2="50" y2="30" stroke="#94a3b8" strokeWidth="2" />
          <rect x="19" y="7" width="26" height="26" rx="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
          <rect x="21" y="9" width="22" height="22" rx="2" fill="#334155" />
          <circle cx="32" cy="20" r="7.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="1" />
        </>
      )}

      {type === 'motor' && (
        <>
          <line x1="6" y1="20" x2="14" y2="20" stroke="#dc2626" strokeWidth="2.4" />
          <line x1="50" y1="20" x2="58" y2="20" stroke="#334155" strokeWidth="2.4" />
          <rect x="14" y="9" width="36" height="22" rx="4" fill="#eab308" stroke="#ca8a04" strokeWidth="1.3" />
          <circle cx="32" cy="20" r="8" fill="#fef08a" stroke="#a16207" strokeWidth="1.1" />
          <circle cx="32" cy="20" r="2.6" fill="#475569" />
          <line x1="26" y1="20" x2="38" y2="20" stroke="#713f12" strokeWidth="1.5" />
        </>
      )}

      {type === 'buzzer' && (
        <>
          <line x1="6" y1="20" x2="18" y2="20" stroke="#dc2626" strokeWidth="2.2" />
          <line x1="46" y1="20" x2="58" y2="20" stroke="#334155" strokeWidth="2.2" />
          <circle cx="32" cy="20" r="14" fill="#1e293b" stroke="#475569" strokeWidth="1.4" />
          <circle cx="32" cy="20" r="9.5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <circle cx="32" cy="20" r="3.5" fill="#cbd5e1" />
          <text x="21" y="15" fill="#f87171" fontSize="8" fontWeight="800">
            +
          </text>
        </>
      )}

      {type === 'ldr' && (
        <>
          <line x1="6" y1="20" x2="18" y2="20" stroke="#94a3b8" strokeWidth="2.2" />
          <line x1="46" y1="20" x2="58" y2="20" stroke="#94a3b8" strokeWidth="2.2" />
          <circle cx="32" cy="20" r="13" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.4" />
          <path
            d="M 23 16 L 41 16 L 23 20 L 41 20 L 23 24 L 41 24"
            fill="none"
            stroke="#c2410c"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      )}

      {type === 'diode' && (
        <>
          <line x1="4" y1="20" x2="15" y2="20" stroke="#94a3b8" strokeWidth="2.4" />
          <line x1="49" y1="20" x2="60" y2="20" stroke="#94a3b8" strokeWidth="2.4" />
          <rect x="15" y="12" width="34" height="16" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
          <rect x="40" y="12" width="5" height="16" fill="#cbd5e1" />
        </>
      )}

      {type === 'zener' && (
        <>
          <line x1="4" y1="20" x2="15" y2="20" stroke="#94a3b8" strokeWidth="2.4" />
          <line x1="49" y1="20" x2="60" y2="20" stroke="#94a3b8" strokeWidth="2.4" />
          <rect x="15" y="13" width="34" height="14" rx="3" fill="#ea580c" stroke="#fdba74" strokeWidth="1.2" />
          <rect x="40" y="13" width="5" height="14" fill="#0f172a" />
        </>
      )}

      {type === 'led' && (
        <>
          <line x1="26" y1="26" x2="26" y2="37" stroke="#94a3b8" strokeWidth="2" />
          <line x1="38" y1="26" x2="38" y2="38" stroke="#94a3b8" strokeWidth="2" />
          <path d="M 22 25 L 22 15 A 10 10 0 0 1 42 15 L 42 25 Z" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.2" />
          <rect x="20" y="23" width="24" height="4" rx="1" fill="#dc2626" />
          <ellipse cx="28" cy="12" rx="2.5" ry="4" fill="rgba(255,255,255,0.45)" transform="rotate(-20 28 12)" />
        </>
      )}

      {type === 'bjt' && (
        <>
          <line x1="24" y1="24" x2="24" y2="37" stroke="#94a3b8" strokeWidth="2" />
          <line x1="32" y1="24" x2="32" y2="37" stroke="#94a3b8" strokeWidth="2" />
          <line x1="40" y1="24" x2="40" y2="37" stroke="#94a3b8" strokeWidth="2" />
          <path d="M 18 24 L 18 11 C 18 6, 46 6, 46 11 L 46 24 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <text x="32" y="19" fill="#f472b6" fontSize="8" fontWeight="700" textAnchor="middle">
            NPN
          </text>
        </>
      )}

      {type === 'opamp' && (
        <>
          <rect x="16" y="7" width="32" height="26" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.3" />
          <circle cx="22" cy="14" r="2" fill="#475569" />
          <line x1="10" y1="12" x2="16" y2="12" stroke="#94a3b8" strokeWidth="2" />
          <line x1="10" y1="20" x2="16" y2="20" stroke="#94a3b8" strokeWidth="2" />
          <line x1="10" y1="28" x2="16" y2="28" stroke="#94a3b8" strokeWidth="2" />
          <line x1="48" y1="12" x2="54" y2="12" stroke="#94a3b8" strokeWidth="2" />
          <line x1="48" y1="20" x2="54" y2="20" stroke="#94a3b8" strokeWidth="2" />
          <line x1="48" y1="28" x2="54" y2="28" stroke="#94a3b8" strokeWidth="2" />
          <text x="33" y="23" fill="#7dd3fc" fontSize="7.5" fontWeight="700" textAnchor="middle">
            LM741
          </text>
        </>
      )}

      {type === 'multimeter' && (
        <>
          <rect x="17" y="4" width="30" height="32" rx="4" fill="#f59e0b" stroke="#b45309" strokeWidth="1.3" />
          <rect x="20" y="7" width="24" height="10" rx="1.8" fill="#0f172a" stroke="#334155" strokeWidth="0.9" />
          <text x="32" y="14.5" fill="#38bdf8" fontSize="6.5" fontWeight="800" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
            V / I
          </text>
          <circle cx="32" cy="24" r="4.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
          <line x1="32" y1="24" x2="29" y2="21" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="23" cy="31.5" r="2.2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="41" cy="31.5" r="2.2" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
        </>
      )}

      {type === 'oscilloscope' && (
        <>
          <rect x="8" y="4" width="48" height="32" rx="4" fill="#1e293b" stroke="#0284c7" strokeWidth="1.4" />
          <rect x="12" y="7" width="40" height="16" rx="2" fill="#031019" stroke="#0e7490" strokeWidth="0.9" />
          <line x1="14" y1="15" x2="50" y2="15" stroke="rgba(34,211,238,0.28)" strokeWidth="0.7" strokeDasharray="2,2" />
          <path d="M 15 15 Q 20 8, 25 15 T 35 15 T 45 15 T 49 12" fill="none" stroke="#22d3ee" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="19" cy="29.5" r="3.2" fill="#475569" stroke="#38bdf8" strokeWidth="0.9" />
          <circle cx="32" cy="29.5" r="1.8" fill="#10b981" />
          <circle cx="45" cy="29.5" r="3.2" fill="#475569" stroke="#94a3b8" strokeWidth="0.9" />
        </>
      )}

      {type === 'mcu8051' && (
        <>
          <rect x="14" y="4" width="36" height="32" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.4" />
          <path d="M 28 4 A 4 4 0 0 0 36 4" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
          {[9, 15, 21, 27, 33].map((y) => (
            <React.Fragment key={y}>
              <rect x="8" y={y - 1.5} width="6" height="3" rx="0.6" fill="#cbd5e1" />
              <rect x="50" y={y - 1.5} width="6" height="3" rx="0.6" fill="#cbd5e1" />
            </React.Fragment>
          ))}
          <text x="32" y="21" fill="#38bdf8" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
            8051
          </text>
          <text x="32" y="30" fill="#94a3b8" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">
            AT89C51
          </text>
        </>
      )}

      {type === 'dec74138' && (
        <>
          <rect x="16" y="5" width="32" height="30" rx="2.5" fill="#1e293b" stroke="#6366f1" strokeWidth="1.3" />
          <circle cx="22" cy="11" r="1.8" fill="#818cf8" />
          {[10, 16, 22, 28].map((y) => (
            <React.Fragment key={y}>
              <rect x="10" y={y - 1.3} width="6" height="2.6" rx="0.5" fill="#cbd5e1" />
              <rect x="48" y={y - 1.3} width="6" height="2.6" rx="0.5" fill="#cbd5e1" />
            </React.Fragment>
          ))}
          <text x="32" y="22" fill="#e0e7ff" fontSize="7.2" fontWeight="800" textAnchor="middle" fontFamily="monospace">
            74138
          </text>
          <text x="32" y="30" fill="#a5b4fc" fontSize="5.2" fontWeight="700" textAnchor="middle" fontFamily="monospace">
            3 → 8
          </text>
        </>
      )}

      {type === 'sevenseg' && (
        <>
          <rect x="18" y="4" width="28" height="32" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.4" />
          {[11, 20, 29].map((y) => (
            <React.Fragment key={y}>
              <rect x="12" y={y - 1.3} width="6" height="2.6" rx="0.5" fill="#cbd5e1" />
              <rect x="46" y={y - 1.3} width="6" height="2.6" rx="0.5" fill="#cbd5e1" />
            </React.Fragment>
          ))}
          <rect x="26" y="8" width="12" height="2.5" rx="1" fill="#ef4444" />
          <rect x="37" y="10" width="2.5" height="9" rx="1" fill="#ef4444" />
          <rect x="37" y="21" width="2.5" height="9" rx="1" fill="#ef4444" />
          <rect x="26" y="29" width="12" height="2.5" rx="1" fill="#ef4444" />
          <rect x="24" y="10" width="2.5" height="9" rx="1" fill="#ef4444" />
          <rect x="24" y="21" width="2.5" height="9" rx="1" fill="#ef4444" />
          <rect x="26" y="18.8" width="12" height="2.4" rx="1" fill="#450a0a" />
          <circle cx="42" cy="31" r="1.4" fill="#450a0a" />
        </>
      )}

      {type === 'clockgen' && (
        <>
          <line x1="8" y1="20" x2="18" y2="20" stroke="#94a3b8" strokeWidth="2.2" />
          <line x1="46" y1="20" x2="56" y2="20" stroke="#94a3b8" strokeWidth="2.2" />
          <rect x="18" y="9" width="28" height="22" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="1.4" />
          <rect x="22" y="13" width="20" height="8" rx="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.9" />
          <text x="32" y="29" fill="#6ee7b7" fontSize="6.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
            CLK
          </text>
        </>
      )}
    </svg>
  );
};

interface CircuitComponentSvgProps {
  comp: CircuitComp;
  st?: SolvedCompState;
  isRealistic: boolean;
  isLightCanvas: boolean;
  animPhase?: number;
  isRunning?: boolean;
  scopeTrace?: OscilloscopeTraceData;
}

export const CircuitComponentSvg: React.FC<CircuitComponentSvgProps> = ({
  comp,
  st,
  isRealistic,
  isLightCanvas,
  animPhase = 0,
  isRunning = true,
  scopeTrace,
}) => {
  const leadColor = isLightCanvas ? '#64748b' : '#94a3b8';
  const ledCurrent = comp.type === 'led' ? Math.max(0, st?.currentMa ?? 0) : 0;
  const ledBrightness = Math.min(1, ledCurrent / 20);
  const ledColorKey: LedColorKey =
    comp.color && comp.color in LED_COLOR_MAP ? (comp.color as LedColorKey) : 'red';
  const ledPalette = LED_COLOR_MAP[ledColorKey];
  const bands = comp.type === 'resistor' ? getResistorColorBands(comp.value) : null;
  const isOverload =
    (comp.type === 'led' && ledCurrent > 30) ||
    (comp.type === 'resistor' && Boolean(st && st.powerMw > 1000));

  const motorSpeed =
    comp.type === 'motor' && isRunning ? Math.min(18, Math.abs(st?.vDrop ?? 0) * 1.4) : 0;
  const motorAngle =
    comp.type === 'motor' && st
      ? ((animPhase * motorSpeed * (st.vDrop >= 0 ? 1 : -1)) % 360)
      : 0;

  const buzzerActive = comp.type === 'buzzer' && isRunning && Math.abs(st?.vDrop ?? 0) >= 1.5;

  return (
    <>
      {comp.type === 'source' && (
        <>
          <line x1="-40" y1="0" x2="-18" y2="0" stroke="#334155" strokeWidth="3.2" />
          <line x1="18" y1="0" x2="40" y2="0" stroke="#dc2626" strokeWidth="3.2" />
          {isRealistic ? (
            <>
              {/* Realistic Tinkercad 9V / DC Battery Block */}
              <rect
                x="-21"
                y="-17"
                width="42"
                height="34"
                rx="4.5"
                fill="#1e293b"
                stroke={isLightCanvas ? '#334155' : '#64748b'}
                strokeWidth="1.5"
              />
              <rect x="3" y="-17" width="18" height="34" rx="3.5" fill="#d97706" />
              {/* Snap terminals */}
              <rect x="-24" y="-6" width="4" height="12" rx="1" fill="#94a3b8" />
              <rect x="20" y="-6" width="4" height="12" rx="1" fill="#cbd5e1" />
              <text x="-8" y="4.5" fill="#38bdf8" fontSize="12" fontWeight="900" textAnchor="middle">
                −
              </text>
              <text x="12" y="4.5" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle">
                +
              </text>
            </>
          ) : (
            <>
              <line x1="-10" y1="-9" x2="-10" y2="9" stroke="#0284c7" strokeWidth="4" />
              <line x1="10" y1="-16" x2="10" y2="16" stroke="#dc2626" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="20" fill="none" stroke="rgba(239,68,68,0.28)" strokeWidth="1" />
            </>
          )}
        </>
      )}

      {comp.type === 'ac_source' && (
        <>
          <line x1="-40" y1="0" x2="-19" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="19" y1="0" x2="40" y2="0" stroke="#dc2626" strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect
                x="-21"
                y="-17"
                width="42"
                height="34"
                rx="5"
                fill="#0f172a"
                stroke="#f97316"
                strokeWidth="1.8"
              />
              <rect x="-15" y="-12" width="30" height="14" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
              <path d="M -11 -5 Q -6 -11, 0 -5 T 11 -5" fill="none" stroke="#34d399" strokeWidth="1.8" />
              <text x="0" y="11" fill="#fdba74" fontSize="7.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                AC ~
              </text>
            </>
          ) : (
            <>
              <circle cx="0" cy="0" r="18" fill={isLightCanvas ? '#fff7ed' : '#0f172a'} stroke="#ea580c" strokeWidth="2.2" />
              <path d="M -10 0 Q -5 -10, 0 0 T 10 0" fill="none" stroke="#f97316" strokeWidth="2.2" />
            </>
          )}
        </>
      )}

      {comp.type === 'resistor' && (
        <>
          <line x1="-40" y1="0" x2="-24" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="24" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic && bands ? (
            <>
              {/* Realistic Tinkercad axial resistor with ceramic waist */}
              <path
                d="M -23 -8 C -23 -11, -14 -11, -11 -8.5 L 11 -8.5 C 14 -11, 23 -11, 23 -8 L 23 8 C 23 11, 14 11, 11 8.5 L -11 8.5 C -14 11, -23 11, -23 8 Z"
                fill="#e5c899"
                stroke={st && st.powerMw > 250 ? '#e11d48' : '#a68353'}
                strokeWidth={st && st.powerMw > 250 ? 2.2 : 1.5}
              />
              <rect x="-16" y="-9.5" width="4.5" height="19" fill={bands[0]} />
              <rect x="-7" y="-8.5" width="4.5" height="17" fill={bands[1]} />
              <rect x="2" y="-8.5" width="4.5" height="17" fill={bands[2]} />
              <rect x="13" y="-9.5" width="4" height="19" fill={bands[3]} />
              <line x1="-19" y1="-5.5" x2="19" y2="-5.5" stroke="rgba(255,255,255,0.42)" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : (
            <polyline
              points="-24,0 -20,-8 -12,8 -4,-8 4,8 12,-8 20,8 24,0"
              fill="none"
              stroke={st && st.powerMw > 250 ? '#f43f5e' : '#6366f1'}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
          )}
        </>
      )}

      {comp.type === 'pot' && (
        <>
          <line x1="-40" y1="0" x2="-18" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="18" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="0" y1="-20" x2="0" y2="-10" stroke="#8b5cf6" strokeWidth="2.4" />
          {isRealistic ? (
            <>
              <circle cx="0" cy="0" r="16" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.6" />
              <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
              <line
                x1="0"
                y1="0"
                x2={Math.cos((((comp.wiper ?? 0.5) - 0.5) * 240 - 90) * (Math.PI / 180)) * 10}
                y2={Math.sin((((comp.wiper ?? 0.5) - 0.5) * 240 - 90) * (Math.PI / 180)) * 10}
                stroke="#f8fafc"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <polyline
                points="-24,0 -18,-7 -10,7 -2,-7 6,7 14,-7 22,7 24,0"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <polygon points="0,-6 -4,-13 4,-13" fill="#a78bfa" />
            </>
          )}
        </>
      )}

      {comp.type === 'capacitor' && (
        <>
          <line x1="-40" y1="0" x2="-14" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="14" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect x="-15" y="-13" width="30" height="26" rx="4" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.5" />
              <rect x="6" y="-13" width="8" height="26" rx="1.5" fill="#e2e8f0" />
              <text x="10" y="3.5" fill="#0f172a" fontSize="10" fontWeight="800" textAnchor="middle">
                −
              </text>
              <text x="-6" y="3.5" fill="#bfdbfe" fontSize="9" fontWeight="800" textAnchor="middle">
                +
              </text>
            </>
          ) : (
            <>
              <line x1="-14" y1="0" x2="-6" y2="0" stroke={leadColor} strokeWidth="2.6" />
              <line x1="6" y1="0" x2="14" y2="0" stroke={leadColor} strokeWidth="2.6" />
              <line x1="-6" y1="-14" x2="-6" y2="14" stroke="#0284c7" strokeWidth="3.5" />
              <line x1="6" y1="-14" x2="6" y2="14" stroke="#0284c7" strokeWidth="3.5" />
            </>
          )}
        </>
      )}

      {comp.type === 'inductor' && (
        <>
          <line x1="-40" y1="0" x2="-24" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="24" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect x="-23" y="-5" width="46" height="10" rx="3" fill="#334155" />
              <path
                d="M -24 0 C -24 -13, -12 -13, -12 0 C -12 -13, 0 -13, 0 0 C 0 -13, 12 -13, 12 0 C 12 -13, 24 -13, 24 0"
                fill="none"
                stroke="#d97706"
                strokeWidth="3.8"
                strokeLinecap="round"
              />
              <path
                d="M -22 -2 C -22 -10, -14 -10, -14 -2 M -10 -2 C -10 -10, -2 -10, -2 -2 M 2 -2 C 2 -10, 10 -10, 10 -2 M 14 -2 C 14 -10, 22 -10, 22 -2"
                fill="none"
                stroke="#fde68a"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </>
          ) : (
            <path
              d="M -24 0 C -24 -12, -12 -12, -12 0 C -12 -12, 0 -12, 0 0 C 0 -12, 12 -12, 12 0 C 12 -12, 24 -12, 24 0"
              fill="none"
              stroke="#9333ea"
              strokeWidth="2.6"
            />
          )}
        </>
      )}

      {comp.type === 'diode' && (
        <>
          <line x1="-40" y1="0" x2="-15" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="15" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect x="-17" y="-9" width="34" height="18" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <rect x="8" y="-9" width="5.5" height="18" fill="#e2e8f0" />
              <polygon points="-9,-4 2,0 -9,4" fill={st && st.currentMa > 0.5 ? '#fbbf24' : '#475569'} />
            </>
          ) : (
            <>
              <polygon
                points="-10,-11 10,0 -10,11"
                fill={st && st.currentMa > 0.5 ? '#f59e0b' : isLightCanvas ? '#fffbeb' : '#1e293b'}
                stroke="#d97706"
                strokeWidth="2"
              />
              <line x1="10" y1="-12" x2="10" y2="12" stroke="#d97706" strokeWidth="3" />
            </>
          )}
        </>
      )}

      {comp.type === 'zener' && (
        <>
          <line x1="-40" y1="0" x2="-15" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="15" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect x="-16" y="-8" width="32" height="16" rx="3" fill="#ea580c" stroke="#fdba74" strokeWidth="1.3" />
              <rect x="8" y="-8" width="5" height="16" fill="#0f172a" />
            </>
          ) : (
            <>
              <polygon
                points="-10,-10 10,0 -10,10"
                fill={st && Math.abs(st.currentMa) > 0.5 ? '#14b8a6' : isLightCanvas ? '#f0fdfa' : '#1e293b'}
                stroke="#0d9488"
                strokeWidth="2"
              />
              <polyline points="5,-13 10,-10 10,10 15,13" fill="none" stroke="#0d9488" strokeWidth="2.5" />
            </>
          )}
        </>
      )}

      {comp.type === 'led' && (
        <>
          <line x1="-40" y1="0" x2="-14" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="14" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {ledBrightness > 0.05 && (
            <>
              <circle
                cx="0"
                cy="0"
                r={18 + ledBrightness * 18}
                fill={
                  ledCurrent > 30
                    ? 'rgba(244, 63, 94, 0.38)'
                    : `rgba(${ledPalette.glowRgb}, ${(0.22 + ledBrightness * 0.55).toFixed(2)})`
                }
              />
              <circle
                cx="0"
                cy="0"
                r={10 + ledBrightness * 6}
                fill={`rgba(255, 255, 255, ${(ledBrightness * 0.45).toFixed(2)})`}
              />
            </>
          )}
          {isRealistic ? (
            <>
              {/* Realistic Tinkercad 5mm domed LED with flat cathode rim */}
              <circle
                cx="0"
                cy="0"
                r="14"
                fill={ledCurrent > 30 ? '#fb7185' : ledBrightness > 0.05 ? ledPalette.onFill : ledPalette.offFill}
                stroke={ledCurrent > 30 ? '#e11d48' : ledPalette.stroke}
                strokeWidth="2"
              />
              <circle
                cx="0"
                cy="0"
                r="9.5"
                fill={ledBrightness > 0.15 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.16)'}
              />
              <ellipse cx="-4.5" cy="-4.5" rx="4.2" ry="2.2" fill="rgba(255,255,255,0.52)" transform="rotate(-35 -4.5 -4.5)" />
              <line x1="11" y1="-8" x2="11" y2="8" stroke="#0f172a" strokeWidth="2.4" />
            </>
          ) : (
            <>
              <polygon
                points="-10,-11 10,0 -10,11"
                fill={
                  ledCurrent > 30
                    ? '#fb7185'
                    : ledBrightness > 0.05
                    ? ledPalette.onFill
                    : isLightCanvas
                    ? '#f8fafc'
                    : '#1e293b'
                }
                stroke={ledCurrent > 30 ? '#e11d48' : ledPalette.stroke}
                strokeWidth="2"
              />
              <line x1="10" y1="-12" x2="10" y2="12" stroke={ledPalette.stroke} strokeWidth="3" />
            </>
          )}
        </>
      )}

      {comp.type === 'bjt' && (
        <>
          <line x1="-40" y1="0" x2="-8" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="2" y1="-8" x2="20" y2="-20" stroke={leadColor} strokeWidth="2.8" />
          <line x1="2" y1="8" x2="20" y2="20" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <path d="M -12 -15 L 4 -15 A 15 15 0 0 1 4 15 L -12 15 Z" fill="#1e293b" stroke="#ec4899" strokeWidth="1.6" />
              <text x="-3" y="3.5" fill="#fbcfe8" fontSize="8" fontWeight="800" textAnchor="middle">
                NPN
              </text>
            </>
          ) : (
            <>
              <circle cx="2" cy="0" r="18" fill="none" stroke="rgba(236,72,153,0.45)" strokeWidth="1.5" />
              <line x1="-8" y1="-11" x2="-8" y2="11" stroke="#ec4899" strokeWidth="3.5" />
              <line x1="-8" y1="-4" x2="2" y2="-8" stroke="#ec4899" strokeWidth="2.2" />
              <line x1="-8" y1="4" x2="2" y2="8" stroke="#ec4899" strokeWidth="2.2" />
              <polygon points="14,16 6,16 11,9" fill="#ec4899" />
            </>
          )}
        </>
      )}

      {comp.type === 'opamp' && (
        <>
          <line x1="-40" y1="-20" x2="-22" y2="-20" stroke={leadColor} strokeWidth="2.5" />
          <line x1="-40" y1="20" x2="-22" y2="20" stroke={leadColor} strokeWidth="2.5" />
          <line x1="24" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.5" />
          {isRealistic ? (
            <>
              <rect x="-22" y="-23" width="46" height="46" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.8" />
              <circle cx="-14" cy="0" r="3" fill="#475569" />
              <text x="3" y="3" fill="#7dd3fc" fontSize="8.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                LM741
              </text>
              <text x="-17" y="-12" fill="#f43f5e" fontSize="10" fontWeight="800">
                −
              </text>
              <text x="-17" y="17" fill="#34d399" fontSize="10" fontWeight="800">
                +
              </text>
            </>
          ) : (
            <>
              <polygon
                points="-22,-28 24,0 -22,28"
                fill="rgba(14, 165, 233, 0.14)"
                stroke="#0284c7"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <text x="-16" y="-11" fill="#e11d48" fontSize="12" fontWeight="700">
                −
              </text>
              <text x="-16" y="16" fill="#059669" fontSize="11" fontWeight="700">
                +
              </text>
            </>
          )}
        </>
      )}

      {comp.type === 'switch' && (
        <>
          <line x1="-40" y1="0" x2="-16" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="16" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect
                x="-19"
                y="-11"
                width="38"
                height="22"
                rx="3.5"
                fill="#475569"
                stroke={comp.value >= 0.5 ? '#10b981' : '#f43f5e'}
                strokeWidth="1.6"
              />
              <rect x="-14" y="-7" width="28" height="14" rx="2" fill="#0f172a" />
              <rect
                x={comp.value >= 0.5 ? 0 : -13}
                y="-6"
                width="13"
                height="12"
                rx="1.5"
                fill={comp.value >= 0.5 ? '#10b981' : '#ef4444'}
                stroke="#ffffff"
                strokeWidth="0.7"
              />
              <text
                x="0"
                y="19"
                fill={comp.value >= 0.5 ? (isLightCanvas ? '#059669' : '#34d399') : isLightCanvas ? '#dc2626' : '#fb7185'}
                fontSize="8"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {comp.value >= 0.5 ? 'ON' : 'OFF'}
              </text>
            </>
          ) : (
            <>
              <circle cx="-14" cy="0" r="3.5" fill="#0ea5e9" />
              <circle cx="14" cy="0" r="3.5" fill="#0ea5e9" />
              <line
                x1="-14"
                y1="0"
                x2={comp.value >= 0.5 ? 14 : 10}
                y2={comp.value >= 0.5 ? 0 : -15}
                stroke={comp.value >= 0.5 ? '#10b981' : '#ef4444'}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}
        </>
      )}

      {comp.type === 'pushbutton' && (
        <>
          {/* 4-pin Tactile Pushbutton spanning center ravine */}
          <line x1="-20" y1="-20" x2="-10" y2="-14" stroke={leadColor} strokeWidth="2.6" />
          <line x1="-20" y1="20" x2="-10" y2="14" stroke={leadColor} strokeWidth="2.6" />
          <line x1="20" y1="-20" x2="10" y2="-14" stroke={leadColor} strokeWidth="2.6" />
          <line x1="20" y1="20" x2="10" y2="14" stroke={leadColor} strokeWidth="2.6" />
          {isRealistic ? (
            <>
              <rect x="-15" y="-15" width="30" height="30" rx="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.4" />
              <rect x="-12" y="-12" width="24" height="24" rx="2.5" fill="#1e293b" />
              <circle
                cx="0"
                cy="0"
                r={comp.value >= 0.5 ? 8.2 : 9.2}
                fill={comp.value >= 0.5 ? '#10b981' : '#dc2626'}
                stroke={comp.value >= 0.5 ? '#6ee7b7' : '#fca5a5'}
                strokeWidth="1.3"
              />
              <text
                x="0"
                y="2.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="6.5"
                fontWeight="800"
                fontFamily="JetBrains Mono, monospace"
              >
                {comp.value >= 0.5 ? 'ĐÓNG' : 'NHẤN'}
              </text>
            </>
          ) : (
            <>
              <rect x="-14" y="-14" width="28" height="28" rx="3" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1="-10" y1="-10" x2="-10" y2="10" stroke="#0ea5e9" strokeWidth="2.2" />
              <line x1="10" y1="-10" x2="10" y2="10" stroke="#0ea5e9" strokeWidth="2.2" />
              <line
                x1="-10"
                y1="0"
                x2="10"
                y2={comp.value >= 0.5 ? 0 : -8}
                stroke={comp.value >= 0.5 ? '#10b981' : '#ef4444'}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </>
          )}
        </>
      )}

      {comp.type === 'motor' && (
        <>
          <line x1="-40" y1="0" x2="-19" y2="0" stroke="#dc2626" strokeWidth="2.8" />
          <line x1="19" y1="0" x2="40" y2="0" stroke="#334155" strokeWidth="2.8" />
          {isRealistic ? (
            <>
              <rect x="-20" y="-16" width="40" height="32" rx="6" fill="#eab308" stroke="#a16207" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="12.5" fill="#fef08a" stroke="#a16207" strokeWidth="1.2" />
              <g transform={`rotate(${motorAngle})`}>
                <line x1="-9" y1="0" x2="9" y2="0" stroke="#713f12" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="0" y1="-9" x2="0" y2="9" stroke="#713f12" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="0" cy="0" r="3.5" fill="#334155" />
              </g>
            </>
          ) : (
            <>
              <circle cx="0" cy="0" r="16" fill={isLightCanvas ? '#fefce8' : '#0f172a'} stroke="#ca8a04" strokeWidth="2.2" />
              <text x="0" y="4" textAnchor="middle" fill="#eab308" fontSize="13" fontWeight="800">
                M
              </text>
            </>
          )}
        </>
      )}

      {comp.type === 'buzzer' && (
        <>
          <line x1="-40" y1="0" x2="-17" y2="0" stroke="#dc2626" strokeWidth="2.8" />
          <line x1="17" y1="0" x2="40" y2="0" stroke="#334155" strokeWidth="2.8" />
          {buzzerActive && (
            <>
              <circle
                cx="0"
                cy="0"
                r={20 + ((animPhase * 0.4) % 10)}
                fill="none"
                stroke="rgba(14, 165, 233, 0.55)"
                strokeWidth="1.6"
              />
              <circle
                cx="0"
                cy="0"
                r={25 + ((animPhase * 0.4) % 10)}
                fill="none"
                stroke="rgba(14, 165, 233, 0.25)"
                strokeWidth="1.2"
              />
            </>
          )}
          <circle cx="0" cy="0" r="16" fill="#1e293b" stroke={buzzerActive ? '#38bdf8' : '#475569'} strokeWidth="1.8" />
          <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <circle cx="0" cy="0" r="3.8" fill={buzzerActive ? '#38bdf8' : '#cbd5e1'} />
          <text x="-11" y="-8" fill="#f87171" fontSize="8.5" fontWeight="800">
            +
          </text>
        </>
      )}

      {comp.type === 'ldr' && (
        <>
          <line x1="-40" y1="0" x2="-16" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="16" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <circle
            cx="0"
            cy="0"
            r="15"
            fill={isRealistic ? '#fed7aa' : isLightCanvas ? '#fff7ed' : '#1e293b'}
            stroke="#ea580c"
            strokeWidth="1.8"
          />
          <path
            d="M -10 -4 L 10 -4 L -10 0 L 10 0 L -10 4 L 10 4"
            fill="none"
            stroke="#c2410c"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Sun brightness glow ring */}
          <circle
            cx="0"
            cy="0"
            r="19"
            fill="none"
            stroke={`rgba(250, 204, 21, ${(0.15 + (comp.wiper ?? 0.5) * 0.75).toFixed(2)})`}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        </>
      )}

      {comp.type === 'ground' && (
        <>
          <line x1="0" y1="-20" x2="0" y2="0" stroke={leadColor} strokeWidth="2.8" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="-9" y1="6" x2="9" y2="6" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="-4" y1="12" x2="4" y2="12" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {comp.type === 'multimeter' && (() => {
        const isCurrent = comp.meterMode === 'I';
        const readout = st?.extraLabel ?? (isCurrent ? '0.0 mA' : '0.00 V');
        return isRealistic ? (
          <>
            {/* Terminal pin leads */}
            <line x1="-20" y1="16" x2="-20" y2="20" stroke={leadColor} strokeWidth="2.4" />
            <line x1="20" y1="16" x2="20" y2="20" stroke={leadColor} strokeWidth="2.4" />
            <line x1="-20" y1="16" x2="-10" y2="16" stroke="#1e293b" strokeWidth="2" />
            <line x1="20" y1="16" x2="10" y2="16" stroke="#dc2626" strokeWidth="2" />
            {/* Tinkercad Yellow Elastomer Holster */}
            <rect x="-24" y="-34" width="48" height="56" rx="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.8" />
            <rect x="-20" y="-30" width="40" height="48" rx="4.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
            {/* Backlit LCD Display */}
            <rect x="-18" y="-27" width="36" height="16" rx="2.5" fill="#042f2e" stroke="#0f766e" strokeWidth="1" />
            <text
              x="0"
              y="-15.5"
              textAnchor="middle"
              fill={isCurrent ? '#34d399' : '#38bdf8'}
              fontSize="8.5"
              fontWeight="800"
              fontFamily="JetBrains Mono, monospace"
            >
              {readout}
            </text>
            {/* Mode Switch Dial */}
            <circle cx="0" cy="-1" r="7.5" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
            <line
              x1="0"
              y1="-1"
              x2={isCurrent ? 4.5 : -4.5}
              y2="-5"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <text x="-13" y="2" fill={isCurrent ? '#64748b' : '#38bdf8'} fontSize="7" fontWeight="800" textAnchor="middle">
              V
            </text>
            <text x="13" y="2" fill={isCurrent ? '#34d399' : '#64748b'} fontSize="7" fontWeight="800" textAnchor="middle">
              I
            </text>
            {/* Banana Sockets */}
            <circle cx="-10" cy="12" r="3.6" fill="#090d16" stroke="#94a3b8" strokeWidth="1.2" />
            <circle cx="10" cy="12" r="3.6" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.2" />
            <text x="-10" y="14.5" fill="#cbd5e1" fontSize="6" fontWeight="800" textAnchor="middle">
              −
            </text>
            <text x="10" y="14.5" fill="#ffffff" fontSize="6" fontWeight="800" textAnchor="middle">
              +
            </text>
          </>
        ) : (
          <>
            <polyline points="-20,20 -20,0 -15,0" fill="none" stroke={leadColor} strokeWidth="2.4" />
            <polyline points="20,20 20,0 15,0" fill="none" stroke={leadColor} strokeWidth="2.4" />
            <circle
              cx="0"
              cy="0"
              r="15"
              fill={isLightCanvas ? '#ffffff' : '#0f172a'}
              stroke={isCurrent ? '#10b981' : '#0284c7'}
              strokeWidth="2"
            />
            <text
              x="0"
              y="4.5"
              textAnchor="middle"
              fill={isCurrent ? '#10b981' : '#0284c7'}
              fontSize="13"
              fontWeight="800"
              fontFamily="JetBrains Mono, monospace"
            >
              {isCurrent ? 'A' : 'V'}
            </text>
            <text x="-16" y="-8" fill="#64748b" fontSize="8" fontWeight="800">
              −
            </text>
            <text x="12" y="-8" fill="#dc2626" fontSize="8" fontWeight="800">
              +
            </text>
          </>
        );
      })()}

      {comp.type === 'oscilloscope' && (() => {
        const samples = scopeTrace?.samples ?? [];
        const vmin = scopeTrace?.vmin ?? 0;
        const vmax = scopeTrace?.vmax ?? 0;
        const vDiv = comp.scopeVDiv ?? 0;
        let yMin = -5;
        let yMax = 5;
        if (vDiv > 0) {
          if (vmin >= -0.05 && vmax > vDiv * 1.9) {
            yMin = -0.3 * vDiv;
            yMax = 3.7 * vDiv;
          } else {
            yMin = -2 * vDiv;
            yMax = 2 * vDiv;
          }
        } else {
          const maxAbs = Math.max(1.5, Math.abs(vmin), Math.abs(vmax));
          if (vmin < -0.15 && vmax > 0.15) {
            yMax = maxAbs * 1.2;
            yMin = -yMax;
          } else if (vmin >= -0.15) {
            yMin = -Math.max(0.5, maxAbs * 0.12);
            yMax = Math.max(2.0, vmax * 1.2);
          } else {
            yMax = Math.max(0.5, maxAbs * 0.12);
            yMin = Math.min(-2.0, vmin * 1.2);
          }
        }

        const gx = -22;
        const gy = -27;
        const gw = 44;
        const gh = 22;
        const ptsAttr =
          samples.length >= 2
            ? samples
                .map((v, i) => {
                  const px = gx + (i / (samples.length - 1)) * gw;
                  const ratio = Math.max(0, Math.min(1, (v - yMin) / Math.max(0.01, yMax - yMin)));
                  const py = gy + gh - ratio * gh;
                  return `${px.toFixed(1)},${py.toFixed(1)}`;
                })
                .join(' ')
            : `${gx},${gy + gh / 2} ${gx + gw},${gy + gh / 2}`;

        return isRealistic ? (
          <>
            <line x1="-20" y1="16" x2="-20" y2="20" stroke={leadColor} strokeWidth="2.4" />
            <line x1="20" y1="16" x2="20" y2="20" stroke={leadColor} strokeWidth="2.4" />
            <line x1="-20" y1="16" x2="-12" y2="16" stroke="#1e293b" strokeWidth="2" />
            <line x1="20" y1="16" x2="12" y2="16" stroke="#dc2626" strokeWidth="2" />
            {/* Benchtop Chassis */}
            <rect x="-29" y="-34" width="58" height="54" rx="6" fill="#1e293b" stroke="#0284c7" strokeWidth="1.8" />
            <rect x="-26" y="-34" width="52" height="4.5" rx="2" fill="#0284c7" />
            {/* CRT/IPS Screen */}
            <rect x={gx - 1} y={gy - 1} width={gw + 2} height={gh + 2} rx="2.5" fill="#031019" stroke="#0e7490" strokeWidth="1" />
            <line x1={gx} y1={gy + gh / 2} x2={gx + gw} y2={gy + gh / 2} stroke="rgba(34,211,238,0.22)" strokeWidth="0.7" strokeDasharray="2,2" />
            <line x1={0} y1={gy} x2={0} y2={gy + gh} stroke="rgba(34,211,238,0.2)" strokeWidth="0.7" />
            <polyline points={ptsAttr} fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            {/* Controls & BNC Jacks */}
            <circle cx="-13" cy="2.5" r="4.5" fill="#334155" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="0" cy="2.5" r="2" fill="#10b981" />
            <circle cx="13" cy="2.5" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="-12" cy="12" r="3.4" fill="#0f172a" stroke="#d9a441" strokeWidth="1.2" />
            <circle cx="12" cy="12" r="3.4" fill="#dc2626" stroke="#d9a441" strokeWidth="1.2" />
          </>
        ) : (
          <>
            <polyline points="-20,20 -20,10 -12,10" fill="none" stroke={leadColor} strokeWidth="2.2" />
            <polyline points="20,20 20,10 12,10" fill="none" stroke={leadColor} strokeWidth="2.2" />
            <rect
              x="-20"
              y="-18"
              width="40"
              height="28"
              rx="4"
              fill={isLightCanvas ? '#082f49' : '#021526'}
              stroke="#06b6d4"
              strokeWidth="2"
            />
            <polyline points="-15,-4 -9,-10 -3,-4 3,2 9,-4 15,-10" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
            <text x="-18" y="18" fill="#64748b" fontSize="6.5" fontWeight="800" textAnchor="middle">
              GND
            </text>
            <text x="18" y="18" fill="#06b6d4" fontSize="6.5" fontWeight="800" textAnchor="middle">
              CH1
            </text>
          </>
        );
      })()}

      {comp.type === 'mcu8051' && (() => {
        const pBits = st?.digitalBits ?? 0;
        const p1Mask = pBits & 0x0f;
        const leftPins = ['VCC', 'P1.0', 'P1.1', 'P1.2', 'P1.3'];
        const rightPins = ['GND', 'P2.0', 'P2.1', 'INT1', 'CLK'];
        const rowYs = [-40, -20, 0, 20, 40];
        return isRealistic ? (
          <>
            {rowYs.map((py, idx) => (
              <React.Fragment key={py}>
                <rect x="-40" y={py - 3.5} width="12" height="7" rx="1.2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                <rect x="28" y={py - 3.5} width="12" height="7" rx="1.2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                <text x="-24" y={py + 2.5} fill={idx === 0 ? '#f87171' : '#94a3b8'} fontSize="6.2" fontWeight="700" fontFamily="monospace">
                  {leftPins[idx]}
                </text>
                <text x="24" y={py + 2.5} fill={idx === 0 ? '#64748b' : '#94a3b8'} fontSize="6.2" fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {rightPins[idx]}
                </text>
              </React.Fragment>
            ))}
            <rect x="-28" y="-48" width="56" height="96" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.8" />
            <path d="M -7 -48 A 7 7 0 0 0 7 -48" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
            <circle cx="-18" cy="-38" r="2.2" fill="#475569" />
            {rowYs.map((py, idx) => (
              <React.Fragment key={`lbl-${py}`}>
                <text x="-24" y={py + 2.3} fill={idx === 0 ? '#f87171' : '#cbd5e1'} fontSize="6" fontWeight="700" fontFamily="monospace">
                  {leftPins[idx]}
                </text>
                <text x="24" y={py + 2.3} fill={idx === 0 ? '#94a3b8' : idx === 3 ? '#fbbf24' : '#cbd5e1'} fontSize="6" fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {rightPins[idx]}
                </text>
              </React.Fragment>
            ))}
            <text x="0" y="-18" fill="#38bdf8" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              AT89C51
            </text>
            <text x="0" y="-7" fill="#94a3b8" fontSize="6.2" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              8051 MCU
            </text>
            {[0, 1, 2, 3].map((bit) => {
              const on = isRunning && Boolean((p1Mask >> bit) & 1);
              return (
                <circle
                  key={bit}
                  cx={-12 + bit * 8}
                  cy="10"
                  r="2.4"
                  fill={on ? '#22c55e' : '#334155'}
                  stroke={on ? '#86efac' : '#475569'}
                  strokeWidth="0.7"
                />
              );
            })}
            <text x="0" y="25" fill="#38bdf8" fontSize="6.2" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              {st?.extraLabel ?? 'READY'}
            </text>
          </>
        ) : (
          <>
            {rowYs.map((py, idx) => (
              <React.Fragment key={py}>
                <line x1="-40" y1={py} x2="-28" y2={py} stroke={leadColor} strokeWidth="2" />
                <line x1="28" y1={py} x2="40" y2={py} stroke={leadColor} strokeWidth="2" />
                <text x="-24" y={py + 2.3} fill={isLightCanvas ? '#0f172a' : '#e2e8f0'} fontSize="6" fontWeight="700" fontFamily="monospace">
                  {leftPins[idx]}
                </text>
                <text x="24" y={py + 2.3} fill={isLightCanvas ? '#0f172a' : '#e2e8f0'} fontSize="6" fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {rightPins[idx]}
                </text>
              </React.Fragment>
            ))}
            <rect x="-28" y="-48" width="56" height="96" rx="3" fill="none" stroke="#0284c7" strokeWidth="2" />
            <text x="0" y="-4" fill="#0284c7" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              8051
            </text>
            <text x="0" y="8" fill="#64748b" fontSize="6.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              {st?.extraLabel ?? 'MCU'}
            </text>
          </>
        );
      })()}

      {comp.type === 'dec74138' && (() => {
        const activeOut = isRunning ? (st?.digitalValue ?? -1) : -1;
        const leftPins = ['VCC', 'A0', 'A1', 'A2', 'GND'];
        const rightPins = ['EN', 'Y0', 'Y1', 'Y2', 'Y3'];
        const rowYs = [-40, -20, 0, 20, 40];
        return isRealistic ? (
          <>
            {rowYs.map((py) => (
              <React.Fragment key={py}>
                <rect x="-40" y={py - 3.5} width="12" height="7" rx="1.2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                <rect x="28" y={py - 3.5} width="12" height="7" rx="1.2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
              </React.Fragment>
            ))}
            <rect x="-28" y="-48" width="56" height="96" rx="4" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.8" />
            <path d="M -7 -48 A 7 7 0 0 0 7 -48" fill="#0f172a" stroke="#818cf8" strokeWidth="1.1" />
            {rowYs.map((py, idx) => {
              const isYActive = idx >= 1 && activeOut === idx - 1;
              return (
                <React.Fragment key={`dl-${py}`}>
                  <text x="-24" y={py + 2.3} fill={idx === 0 ? '#f87171' : '#e0e7ff'} fontSize="6" fontWeight="700" fontFamily="monospace">
                    {leftPins[idx]}
                  </text>
                  <text x="24" y={py + 2.3} fill={isYActive ? '#4ade80' : '#c7d2fe'} fontSize="6" fontWeight="800" textAnchor="end" fontFamily="monospace">
                    {rightPins[idx]}
                  </text>
                  {idx >= 1 && (
                    <circle cx="11" cy={py} r="2" fill={isYActive ? '#22c55e' : '#312e81'} />
                  )}
                </React.Fragment>
              );
            })}
            <text x="-2" y="-4" fill="#a5b4fc" fontSize="7.4" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              74LS138
            </text>
            <text x="-2" y="8" fill="#818cf8" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              3 → 8
            </text>
          </>
        ) : (
          <>
            {rowYs.map((py, idx) => (
              <React.Fragment key={py}>
                <line x1="-40" y1={py} x2="-28" y2={py} stroke={leadColor} strokeWidth="2" />
                <line x1="28" y1={py} x2="40" y2={py} stroke={leadColor} strokeWidth="2" />
                <text x="-24" y={py + 2.3} fill={isLightCanvas ? '#0f172a' : '#e2e8f0'} fontSize="6" fontWeight="700" fontFamily="monospace">
                  {leftPins[idx]}
                </text>
                <text x="24" y={py + 2.3} fill={isLightCanvas ? '#0f172a' : '#e2e8f0'} fontSize="6" fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {rightPins[idx]}
                </text>
              </React.Fragment>
            ))}
            <rect x="-28" y="-48" width="56" height="96" rx="3" fill="none" stroke="#6366f1" strokeWidth="2" />
            <text x="0" y="-2" fill="#6366f1" fontSize="7.5" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              74138
            </text>
            <text x="0" y="10" fill="#64748b" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              {activeOut >= 0 ? `Y${activeOut}=0` : 'LOCK'}
            </text>
          </>
        );
      })()}

      {comp.type === 'sevenseg' && (() => {
        const val = st?.digitalValue ?? 0;
        const segMask = isRunning && st ? (st.digitalBits ?? SEVEN_SEG_CODES[val & 0x0f]) : 0;
        const dpOn = isRunning && Boolean(st?.digitalAux);
        const onCol = '#ef4444';
        const offCol = isRealistic ? '#3f1d1d' : isLightCanvas ? '#e2e8f0' : '#1e293b';
        const seg = (bit: number) => ((segMask >> bit) & 1 ? onCol : offCol);
        const leftPins = ['D0', 'D1', 'D2'];
        const rightPins = ['D3', 'DP', 'COM'];
        const rowYs = [-20, 0, 20];
        return (
          <>
            {rowYs.map((py, idx) => (
              <React.Fragment key={py}>
                <line x1="-40" y1={py} x2="-28" y2={py} stroke={leadColor} strokeWidth="2.2" />
                <line x1="28" y1={py} x2="40" y2={py} stroke={leadColor} strokeWidth="2.2" />
                <text x="-24" y={py + 2.2} fill={isRealistic ? '#94a3b8' : isLightCanvas ? '#475569' : '#94a3b8'} fontSize="5.8" fontWeight="700" fontFamily="monospace">
                  {leftPins[idx]}
                </text>
                <text x="24" y={py + 2.2} fill={isRealistic ? '#94a3b8' : isLightCanvas ? '#475569' : '#94a3b8'} fontSize="5.8" fontWeight="700" textAnchor="end" fontFamily="monospace">
                  {rightPins[idx]}
                </text>
              </React.Fragment>
            ))}
            <rect
              x="-28"
              y="-32"
              width="56"
              height="64"
              rx="4"
              fill={isRealistic ? '#0f172a' : isLightCanvas ? '#f8fafc' : '#0f172a'}
              stroke={isRealistic ? '#475569' : '#ef4444'}
              strokeWidth="1.8"
            />
            {/* Segments a,b,c,d,e,f,g */}
            <rect x="-8" y="-23" width="16" height="4" rx="1.6" fill={seg(0)} />
            <rect x="8" y="-19" width="4" height="16" rx="1.6" fill={seg(1)} />
            <rect x="8" y="3" width="4" height="16" rx="1.6" fill={seg(2)} />
            <rect x="-8" y="19" width="16" height="4" rx="1.6" fill={seg(3)} />
            <rect x="-12" y="3" width="4" height="16" rx="1.6" fill={seg(4)} />
            <rect x="-12" y="-19" width="4" height="16" rx="1.6" fill={seg(5)} />
            <rect x="-8" y="-2" width="16" height="4" rx="1.6" fill={seg(6)} />
            <circle cx="15" cy="21" r="2.3" fill={dpOn ? onCol : offCol} />
          </>
        );
      })()}

      {comp.type === 'clockgen' && (() => {
        const clkHi = isRunning && (st?.digitalValue ?? 0) >= 1;
        return isRealistic ? (
          <>
            <line x1="-40" y1="0" x2="-22" y2="0" stroke={leadColor} strokeWidth="2.5" />
            <line x1="22" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.5" />
            <rect x="-24" y="-18" width="48" height="36" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.8" />
            <rect x="-15" y="-11" width="30" height="12" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
            <text x="0" y="-3" fill="#334155" fontSize="6" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              XTAL
            </text>
            <circle cx="-13" cy="10" r="3.2" fill={clkHi ? '#22d3ee' : '#0f172a'} stroke="#0891b2" strokeWidth="1" />
            <text x="6" y="12.5" fill="#6ee7b7" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="monospace">
              {comp.freq ?? 1.5}Hz
            </text>
            <text x="-31" y="-5" fill="#64748b" fontSize="6.5" fontWeight="700" textAnchor="middle">
              GND
            </text>
            <text x="31" y="-5" fill="#10b981" fontSize="6.5" fontWeight="800" textAnchor="middle">
              CLK
            </text>
          </>
        ) : (
          <>
            <line x1="-40" y1="0" x2="-18" y2="0" stroke={leadColor} strokeWidth="2.2" />
            <line x1="18" y1="0" x2="40" y2="0" stroke={leadColor} strokeWidth="2.2" />
            <rect x="-18" y="-14" width="36" height="28" rx="3" fill="none" stroke="#10b981" strokeWidth="2" />
            <polyline points="-12,4 -7,4 -7,-6 -1,-6 -1,4 5,4 5,-6 11,-6 11,4" fill="none" stroke="#10b981" strokeWidth="1.8" />
          </>
        );
      })()}

      {/* Tinkercad-style Starburst Overload Warning */}
      {isOverload && (
        <g transform="translate(18, -16)" className="pointer-events-none">
          <polygon
            points="0,-10 3,-4 9,-7 6,-1 11,3 4,4 5,10 0,6 -5,10 -4,4 -11,3 -6,-1 -9,-7 -3,-4"
            fill="#f97316"
            stroke="#fef08a"
            strokeWidth="1.2"
          />
          <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900">
            !
          </text>
        </g>
      )}
    </>
  );
};
