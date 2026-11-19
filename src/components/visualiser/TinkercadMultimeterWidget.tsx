import React from 'react';
import { X } from 'lucide-react';

export type MultimeterMode = 'V' | 'A' | 'R';

interface TinkercadMultimeterWidgetProps {
  mode: MultimeterMode;
  onChangeMode: (m: MultimeterMode) => void;
  vVomDiff: number;
  currentMa: number;
  resistanceOhm: number | null;
  probeMode: 'none' | 'red' | 'black';
  onToggleProbeMode: (p: 'red' | 'black') => void;
  redLabel: string;
  blackLabel: string;
  onClose?: () => void;
}

export const TinkercadMultimeterWidget: React.FC<TinkercadMultimeterWidgetProps> = ({
  mode,
  onChangeMode,
  vVomDiff,
  currentMa,
  resistanceOhm,
  probeMode,
  onToggleProbeMode,
  redLabel,
  blackLabel,
  onClose,
}) => {
  const displayValue = (() => {
    if (mode === 'V') {
      const sign = vVomDiff >= 0 ? '' : '−';
      return `${sign}${Math.abs(vVomDiff).toFixed(2)} V`;
    }
    if (mode === 'A') {
      return `${Math.abs(currentMa).toFixed(1)} mA`;
    }
    if (resistanceOhm === null) return 'OL Ω';
    if (resistanceOhm >= 1000) return `${(resistanceOhm / 1000).toFixed(2)} kΩ`;
    return `${resistanceOhm.toFixed(0)} Ω`;
  })();

  return (
    <div className="w-[186px] rounded-xl bg-amber-400 border-2 border-amber-500 shadow-xl p-2 text-slate-900 select-none">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-extrabold tracking-tight text-slate-900 uppercase">
          Đồng hồ VOM
        </span>
        <div className="flex items-center gap-0.5">
          {(['V', 'A', 'R'] as MultimeterMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChangeMode(m)}
              title={
                m === 'V'
                  ? 'Đo Điện áp (V)'
                  : m === 'A'
                  ? 'Đo Dòng điện qua điểm đỏ (mA)'
                  : 'Đo Điện trở tương đương giữa 2 que (Ω)'
              }
              className={`w-5 h-5 rounded text-[10px] font-extrabold font-mono transition-colors ${
                mode === m
                  ? 'bg-slate-900 text-amber-300 shadow-inner'
                  : 'bg-amber-300/80 hover:bg-amber-200 text-slate-800 border border-amber-600/30'
              }`}
            >
              {m === 'R' ? 'Ω' : m}
            </button>
          ))}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-0.5 p-0.5 rounded hover:bg-amber-500/40 text-slate-800"
              title="Thu gọn đồng hồ VOM"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Backlit LCD Display */}
      <div className="bg-[#9fb59a] border-2 border-slate-800 rounded-md px-2 py-1.5 shadow-inner mb-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-800/80 font-bold">
          <span>{mode === 'V' ? 'DC VOLT' : mode === 'A' ? 'CURRENT' : 'OHMS'}</span>
          <span>AUTO</span>
        </div>
        <div className="text-right font-mono tabular-nums font-extrabold text-[17px] leading-tight text-slate-950">
          {displayValue}
        </div>
      </div>

      {/* Interactive Probe Lead Jacks */}
      <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => onToggleProbeMode('red')}
          title={`Que Đỏ (+): ${redLabel} — Bấm để cắm sang điểm khác`}
          className={`px-1.5 py-1 rounded border flex items-center justify-center gap-1 transition-all truncate ${
            probeMode === 'red'
              ? 'bg-rose-600 text-white border-rose-800 ring-2 ring-white/80'
              : 'bg-slate-900/90 hover:bg-slate-800 text-rose-300 border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span className="truncate">Đỏ (+)</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleProbeMode('black')}
          title={`Que Đen (−): ${blackLabel} — Bấm để cắm sang điểm khác`}
          className={`px-1.5 py-1 rounded border flex items-center justify-center gap-1 transition-all truncate ${
            probeMode === 'black'
              ? 'bg-slate-700 text-white border-slate-950 ring-2 ring-white/80'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          <span className="truncate">Đen (−)</span>
        </button>
      </div>
    </div>
  );
};
