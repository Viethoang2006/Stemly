import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AnalogOpAmp555SimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
}

export const AnalogOpAmp555Sim: React.FC<AnalogOpAmp555SimProps> = ({
  parameters,
  onSimulationStats,
  onParametersBatchChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const circuitMode = Math.round(Math.min(2, Math.max(0, parameters.circuitMode ?? 0)));
  const Vin = parameters.Vin ?? 2.0;
  const R1_k = Math.max(1, parameters.R1_k ?? 10);
  const R2_k = Math.max(1, parameters.R2_k ?? 47);
  const Vcc = Math.max(5, parameters.Vcc ?? 12);
  const C_uF = Math.max(1, parameters.C_uF ?? 10);

  // Op-Amp metrics
  const gain = circuitMode === 0 ? -(R2_k / R1_k) : 1 + R2_k / R1_k;
  const idealVoutPeak = Math.abs(gain) * Vin;
  const Vsat = Math.max(2, Vcc - 1.2);
  const isClipped = circuitMode < 2 && idealVoutPeak > Vsat;

  // NE555 Astable metrics: f = 1.44 / ((R1 + 2*R2)*C)
  const R1 = R1_k * 1000;
  const R2 = R2_k * 1000;
  const C = C_uF * 1e-6;
  const tHigh = 0.693 * (R1 + R2) * C;
  const tLow = 0.693 * R2 * C;
  const period555 = tHigh + tLow;
  const freq555 = 1 / period555;
  const dutyCycle = ((R1 + R2) / (R1 + 2 * R2)) * 100;

  useEffect(() => {
    if (onSimulationStats) {
      if (circuitMode < 2) {
        onSimulationStats({
          'Hệ số khuếch đại (Av)': `${gain.toFixed(2)}×`,
          'V_out đỉnh lý thuyết': `${idealVoutPeak.toFixed(1)} V`,
          'Ngưỡng bão hòa (±Vsat)': `±${Vsat.toFixed(1)} V`,
          'Dạng sóng ngõ ra': isClipped ? 'Bị xén ngọn (Clipping)' : 'Tuyến tính chuẩn',
        });
      } else {
        onSimulationStats({
          'Tần số xung (f)': `${freq555.toFixed(2)} Hz`,
          'Chu kỳ (T)': `${(period555 * 1000).toFixed(0)} ms`,
          'Duty Cycle': `${dutyCycle.toFixed(1)} %`,
          'Mức cao / thấp': `${(tHigh * 1000).toFixed(0)} / ${(tLow * 1000).toFixed(0)} ms`,
        });
      }
    }
  }, [circuitMode, gain, idealVoutPeak, Vsat, isClipped, freq555, period555, dutyCycle, tHigh, tLow, onSimulationStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, width, height);

      phase += 0.035;

      const padL = 48;
      const padR = 24;
      const padT = 36;
      const padB = 28;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      // Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.65)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const x = padL + (i * plotW) / 8;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();
      }
      for (let j = 0; j <= 4; j++) {
        const y = padT + (j * plotH) / 4;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
      }

      if (circuitMode < 2) {
        // Op-Amp Scope: Vin vs Vout with ±Vsat Clipping rails
        const midY = padT + plotH / 2;
        const maxRangeV = Math.max(Vcc + 2, 14);
        const scaleY = (plotH * 0.45) / maxRangeV;

        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(padL, midY);
        ctx.lineTo(padL + plotW, midY);
        ctx.stroke();

        // ±Vsat threshold lines
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(padL, midY - Vsat * scaleY);
        ctx.lineTo(padL + plotW, midY - Vsat * scaleY);
        ctx.moveTo(padL, midY + Vsat * scaleY);
        ctx.lineTo(padL + plotW, midY + Vsat * scaleY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fda4af';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`+Vsat (+${Vsat.toFixed(1)}V)`, padL + 6, midY - Vsat * scaleY - 5);
        ctx.fillText(`-Vsat (-${Vsat.toFixed(1)}V)`, padL + 6, midY + Vsat * scaleY + 12);

        // Input Sine Wave
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const theta = (px / plotW) * Math.PI * 4 - phase;
          const vinT = Vin * Math.sin(theta);
          const y = midY - vinT * scaleY;
          if (px === 0) ctx.moveTo(padL + px, y);
          else ctx.lineTo(padL + px, y);
        }
        ctx.stroke();

        // Output Wave (with saturation clipping!)
        ctx.strokeStyle = isClipped ? '#f43f5e' : '#34d399';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const theta = (px / plotW) * Math.PI * 4 - phase;
          const vinT = Vin * Math.sin(theta);
          const rawVout = gain * vinT;
          const voutT = Math.max(-Vsat, Math.min(Vsat, rawVout));
          const y = midY - voutT * scaleY;
          if (px === 0) ctx.moveTo(padL + px, y);
          else ctx.lineTo(padL + px, y);
        }
        ctx.stroke();

        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Vin (${Vin.toFixed(1)}V)`, padL, 20);
        ctx.fillStyle = isClipped ? '#f43f5e' : '#34d399';
        ctx.fillText(
          `Vout (Av = ${gain.toFixed(1)}×)${isClipped ? ' [XÉN NGỌN]' : ''}`,
          padL + 110,
          20
        );
      } else {
        // NE555 Astable: Vc(t) between 1/3 Vcc & 2/3 Vcc + Output Square Wave Pin 3 + Live LED
        const scopeAreaW = plotW - 90;
        const baseY = padT + plotH * 0.88;
        const scaleY = (plotH * 0.76) / Vcc;

        // 1/3 Vcc and 2/3 Vcc threshold guides
        const y13 = baseY - (Vcc / 3) * scaleY;
        const y23 = baseY - ((2 * Vcc) / 3) * scaleY;
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padL, y13);
        ctx.lineTo(padL + scopeAreaW, y13);
        ctx.moveTo(padL, y23);
        ctx.lineTo(padL + scopeAreaW, y23);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('2/3 Vcc', padL + 4, y23 - 4);
        ctx.fillText('1/3 Vcc', padL + 4, y13 + 11);

        // Plot 2.5 periods of NE555
        const duty = (R1 + R2) / (R1 + 2 * R2);
        const scrollShift = (phase / (Math.PI * 2)) % 1;

        // Square wave Vout (Pin 3)
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        let currentOutHigh = false;
        for (let px = 0; px <= scopeAreaW; px += 2) {
          const cycPos = ((px / scopeAreaW) * 2.5 + scrollShift) % 1;
          const isHigh = cycPos < duty;
          if (px === scopeAreaW - 2 || px === scopeAreaW) currentOutHigh = isHigh;
          const vOut = isHigh ? Vcc * 0.88 : 0.2;
          const y = baseY - vOut * scaleY;
          if (px === 0) ctx.moveTo(padL + px, y);
          else ctx.lineTo(padL + px, y);
        }
        ctx.stroke();

        // Capacitor Vc(t) curve (exponential charge/discharge between 1/3 and 2/3 Vcc)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let px = 0; px <= scopeAreaW; px += 2) {
          const cycPos = ((px / scopeAreaW) * 2.5 + scrollShift) % 1;
          let vc = Vcc / 3;
          if (cycPos < duty) {
            const p = cycPos / duty;
            vc = Vcc / 3 + (Vcc / 3) * (1 - Math.exp(-3 * p)) / (1 - Math.exp(-3));
          } else {
            const p = (cycPos - duty) / (1 - duty);
            vc = (2 * Vcc) / 3 - (Vcc / 3) * (1 - Math.exp(-3 * p)) / (1 - Math.exp(-3));
          }
          const y = baseY - vc * scaleY;
          if (px === 0) ctx.moveTo(padL + px, y);
          else ctx.lineTo(padL + px, y);
        }
        ctx.stroke();

        // Output Pin 3 LED indicator on the right
        const ledX = padL + scopeAreaW + 48;
        const ledY = padT + plotH / 2;
        if (currentOutHigh) {
          const glow = ctx.createRadialGradient(ledX, ledY, 2, ledX, ledY, 34);
          glow.addColorStop(0, 'rgba(52, 211, 153, 0.85)');
          glow.addColorStop(1, 'rgba(52, 211, 153, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(ledX, ledY, 34, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = currentOutHigh ? '#10b981' : '#1e293b';
        ctx.strokeStyle = currentOutHigh ? '#6ee7b7' : '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LED Pin 3', ledX, ledY + 30);
        ctx.fillStyle = currentOutHigh ? '#4ade80' : '#94a3b8';
        ctx.fillText(currentOutHigh ? 'HIGH' : 'LOW', ledX, ledY + 43);

        ctx.textAlign = 'left';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(`Out Pin 3 (${freq555.toFixed(1)}Hz)`, padL, 20);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Áp tụ Vc(t)`, padL + 150, 20);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [circuitMode, Vin, R1, R2, R1_k, R2_k, Vcc, Vsat, gain, isClipped, freq555]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          {[
            { id: 0, label: 'Op-Amp Đảo' },
            { id: 1, label: 'Op-Amp Không đảo' },
            { id: 2, label: 'Xung NE555' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onParametersBatchChange?.({ circuitMode: m.id })}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                circuitMode === m.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono tabular-nums">
          {circuitMode < 2 ? (
            isClipped ? (
              <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Xén ngọn! Vượt ±{Vsat.toFixed(1)}V
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Khuếch đại tuyến tính ({gain.toFixed(1)}×)
              </span>
            )
          ) : (
            <span className="text-sky-400 font-semibold">
              f = {freq555.toFixed(2)} Hz · Duty {dutyCycle.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[290px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
