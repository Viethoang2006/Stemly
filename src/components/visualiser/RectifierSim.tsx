import React, { useEffect, useRef } from 'react';

interface RectifierSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
}

export const RectifierSim: React.FC<RectifierSimProps> = ({
  parameters,
  onSimulationStats,
  onParametersBatchChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mode = Math.round(Math.min(2, Math.max(0, parameters.mode ?? 2)));
  const Vrms = parameters.Vrms ?? 12;
  const C_uF = Math.max(0, parameters.C_uF ?? 220);
  const Rl = Math.max(20, parameters.Rl ?? 220);

  const Vpeak = Vrms * Math.SQRT2;
  const Vdrop = mode === 2 ? 1.4 : 0.7; // Bridge drops 2 diodes (1.4V), half/full center-tap drops 1 diode (0.7V)
  const VoutPeak = Math.max(0.2, Vpeak - Vdrop);
  const freq = 50;
  const rippleFreq = mode === 0 ? freq : freq * 2;
  const C = C_uF * 1e-6;

  // Compute approximate Vdc and ripple Vpp
  let Vripple = VoutPeak;
  let Vdc = mode === 0 ? VoutPeak / Math.PI : (2 * VoutPeak) / Math.PI;
  if (C_uF > 0) {
    const rawRipple = VoutPeak / (rippleFreq * Rl * C);
    Vripple = Math.min(VoutPeak * 0.9, rawRipple);
    Vdc = Math.max(0, VoutPeak - Vripple / 2);
  }
  const ripplePct = Vdc > 0 ? (Vripple / Vdc) * 100 : 100;

  useEffect(() => {
    if (onSimulationStats) {
      const modeNames = ['Nửa chu kỳ (1D)', 'Toàn kỳ (2D)', 'Cầu (4D)'];
      onSimulationStats({
        'Mạch chỉnh lưu': modeNames[mode],
        'Đỉnh AC / Đỉnh DC': `${Vpeak.toFixed(1)}V / ${VoutPeak.toFixed(1)}V`,
        'Áp DC trung bình (Vdc)': `${Vdc.toFixed(2)} V`,
        'Độ gợn sóng (ΔV)': C_uF === 0 ? `${VoutPeak.toFixed(1)}V (Chưa lọc)` : `${Vripple.toFixed(2)}V (${ripplePct.toFixed(1)}%)`,
      });
    }
  }, [mode, Vpeak, VoutPeak, Vdc, Vripple, ripplePct, C_uF, onSimulationStats]);

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

      phase += 0.04;
      const cycleSign = Math.sin(phase) >= 0 ? 1 : -1;

      // Top zone: Live Diode conduction mini-diagram (32% height)
      const diagH = Math.min(115, height * 0.34);
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(12, diagH);
      ctx.lineTo(width - 12, diagH);
      ctx.stroke();

      const cx = width / 2;
      const cy = diagH / 2;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = cycleSign > 0 ? '#38bdf8' : '#f43f5e';
      ctx.fillText(cycleSign > 0 ? 'Bán kỳ DƯƠNG (+)' : 'Bán kỳ ÂM (-)', 18, 22);

      // Draw simplified conduction blocks
      const boxW = 90;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 140, cy - 18, boxW, 36);
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText(`AC ${Vrms}V`, cx - 95, cy + 4);

      // Diode block status
      ctx.strokeStyle = mode === 0 && cycleSign < 0 ? '#475569' : '#22c55e';
      ctx.fillStyle = mode === 0 && cycleSign < 0 ? 'rgba(71,85,105,0.15)' : 'rgba(34,197,94,0.12)';
      ctx.fillRect(cx - 25, cy - 22, 110, 44);
      ctx.strokeRect(cx - 25, cy - 22, 110, 44);
      ctx.fillStyle = mode === 0 && cycleSign < 0 ? '#94a3b8' : '#4ade80';
      const diodeTxt =
        mode === 0
          ? cycleSign > 0
            ? 'D1 DẪN'
            : 'D1 NGẮT'
          : mode === 1
          ? cycleSign > 0
            ? 'D1 DẪN · D2 NGẮT'
            : 'D2 DẪN · D1 NGẮT'
          : cycleSign > 0
          ? 'D1, D3 DẪN'
          : 'D2, D4 DẪN';
      ctx.fillText(diodeTxt, cx + 30, cy + 4);

      // Filter & Load box
      ctx.strokeStyle = C_uF > 0 ? '#f59e0b' : '#475569';
      ctx.strokeRect(cx + 110, cy - 18, 105, 36);
      ctx.fillStyle = C_uF > 0 ? '#fbbf24' : '#94a3b8';
      ctx.fillText(C_uF > 0 ? `C=${C_uF}μF | ${Rl}Ω` : `Tải ${Rl}Ω`, cx + 162, cy + 4);

      // Wires
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy);
      ctx.lineTo(cx - 25, cy);
      ctx.moveTo(cx + 85, cy);
      ctx.lineTo(cx + 110, cy);
      ctx.stroke();
      ctx.restore();

      // Bottom zone: Oscilloscope waveform simulation (stepping capacitor charge/discharge)
      const padL = 44;
      const padR = 20;
      const padT = diagH + 18;
      const padB = 26;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;
      const zeroY = padT + plotH * 0.56;
      const scaleY = (plotH * 0.44) / Math.max(Vpeak, 1);

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
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(padL, zeroY);
      ctx.lineTo(padL + plotW, zeroY);
      ctx.stroke();

      // Compute time-domain waveforms over 2.5 cycles (50ms at 50Hz)
      const totalTime = 0.05;
      const steps = 260;
      const dt = totalTime / steps;

      // Dashed AC input V_in(t)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s * dt;
        const vin = Vpeak * Math.sin(2 * Math.PI * freq * t + phase);
        const x = padL + (s / steps) * plotW;
        const y = zeroY - vin * scaleY;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Solid Rectified + Filtered Output V_out(t)
      // Simulate capacitor voltage numerically across steps
      let vCap = Vdc;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s * dt;
        const vin = Vpeak * Math.sin(2 * Math.PI * freq * t + phase);
        let vRect = 0;
        if (mode === 0) {
          vRect = Math.max(0, vin - Vdrop);
        } else {
          vRect = Math.max(0, Math.abs(vin) - Vdrop);
        }

        if (C_uF === 0) {
          vCap = vRect;
        } else {
          // Decay across RL*C
          const decay = Math.exp(-dt / (Rl * C));
          vCap = vCap * decay;
          if (vRect > vCap) {
            vCap = vRect;
          }
        }

        const x = padL + (s / steps) * plotW;
        const y = zeroY - vCap * scaleY;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Average DC line
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, zeroY - Vdc * scaleY);
      ctx.lineTo(padL + plotW, zeroY - Vdc * scaleY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('--- AC Vào', padL + 8, padT + 14);
      ctx.fillStyle = '#34d399';
      ctx.fillText('— DC Ngõ ra', padL + 95, padT + 14);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Vdc ≈ ${Vdc.toFixed(1)}V`, padL + 195, padT + 14);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode, Vrms, Vpeak, Vdrop, Vdc, C_uF, C, Rl]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          {[
            { id: 0, label: 'Nửa chu kỳ (1D)' },
            { id: 1, label: 'Toàn kỳ (2D)' },
            { id: 2, label: 'Cầu (4D)' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onParametersBatchChange?.({ mode: m.id })}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === m.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onParametersBatchChange?.({ C_uF: C_uF === 0 ? 470 : 0 })}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
            C_uF > 0
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          {C_uF > 0 ? `Tắt tụ lọc (${C_uF}μF)` : 'Bật tụ lọc (470μF)'}
        </button>
      </div>

      <div className="relative flex-1 min-h-[290px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
