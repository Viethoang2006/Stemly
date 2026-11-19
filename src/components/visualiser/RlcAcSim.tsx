import React, { useEffect, useRef, useState } from 'react';
import { Activity, Crosshair } from 'lucide-react';

interface RlcAcSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
}

export const RlcAcSim: React.FC<RlcAcSimProps> = ({
  parameters,
  onSimulationStats,
  onParametersBatchChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showComponents, setShowComponents] = useState<boolean>(true);

  const U0 = parameters.U0 ?? 12;
  const f = parameters.f ?? 120;
  const R = Math.max(1, parameters.R ?? 40);
  const L = (parameters.L_mH ?? 100) * 1e-3;
  const C = Math.max(0.1, parameters.C_uF ?? 15) * 1e-6;

  const omega = 2 * Math.PI * f;
  const ZL = omega * L;
  const ZC = 1 / (omega * C);
  const Z = Math.sqrt(R * R + (ZL - ZC) * (ZL - ZC));
  const I0 = U0 / Z;
  const phiRad = Math.atan2(ZL - ZC, R);
  const phiDeg = (phiRad * 180) / Math.PI;
  const cosPhi = Math.cos(phiRad);
  const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
  const isResonance = Math.abs(ZL - ZC) / Math.max(1, Z) < 0.06;

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Tổng trở (Z)': `${Z.toFixed(1)} Ω`,
        'Cảm / Dung kháng': `${ZL.toFixed(1)} / ${ZC.toFixed(1)} Ω`,
        'Độ lệch pha (φ)': `${phiDeg >= 0 ? '+' : ''}${phiDeg.toFixed(1)}°`,
        'Tần số cộng hưởng (f₀)': `${f0.toFixed(1)} Hz`,
      });
    }
  }, [Z, ZL, ZC, phiDeg, f0, onSimulationStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phaseShift = 0;

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

      const isWide = width >= 560;
      const scopeW = isWide ? width * 0.62 : width;
      const scopeH = isWide ? height : height * 0.6;
      const phasorX = isWide ? scopeW + (width - scopeW) / 2 : width / 2;
      const phasorY = isWide ? height / 2 : scopeH + (height - scopeH) / 2;

      // 1. Oscilloscope Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1;
      const gxStep = scopeW / 10;
      const gyStep = scopeH / 6;
      for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gxStep, 12);
        ctx.lineTo(i * gxStep, scopeH - 12);
        ctx.stroke();
      }
      for (let j = 1; j < 6; j++) {
        ctx.beginPath();
        ctx.moveTo(12, j * gyStep);
        ctx.lineTo(scopeW - 12, j * gyStep);
        ctx.stroke();
      }

      // Center zero-axis
      const midY = scopeH / 2;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, midY);
      ctx.lineTo(scopeW - 12, midY);
      ctx.stroke();

      // Divider line between scope and phasor
      if (isWide) {
        ctx.beginPath();
        ctx.moveTo(scopeW, 12);
        ctx.lineTo(scopeW, height - 12);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(12, scopeH);
        ctx.lineTo(width - 12, scopeH);
        ctx.stroke();
      }

      // Animate phase smoothly scaled by frequency
      phaseShift += 0.03 + Math.min(0.06, f / 6000);

      const vScale = (scopeH * 0.36) / Math.max(U0, 1);
      const iAmp = I0 * R; // plot i(t) scaled as uR(t) = i*R or scaled nicely
      const iVisScale = (scopeH * 0.28) / Math.max(I0, 0.01);

      const drawWave = (ampPx: number, phaseOffset: number, color: string, lineW: number, dashed = false) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        if (dashed) ctx.setLineDash([5, 4]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        const startX = 16;
        const endX = scopeW - 16;
        for (let x = startX; x <= endX; x += 2) {
          const normX = (x - startX) / (endX - startX);
          const theta = normX * Math.PI * 4 - phaseShift + phaseOffset;
          const y = midY - Math.sin(theta) * ampPx;
          if (x === startX) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // Optional uL & uC component waveforms
      const uRAmp = Math.min(scopeH * 0.42, I0 * R * vScale);
      const uLAmp = Math.min(scopeH * 0.42, I0 * ZL * vScale);
      const uCAmp = Math.min(scopeH * 0.42, I0 * ZC * vScale);

      if (showComponents) {
        drawWave(uLAmp, -phiRad + Math.PI / 2, 'rgba(168, 85, 247, 0.45)', 1.2, true);
        drawWave(uCAmp, -phiRad - Math.PI / 2, 'rgba(52, 211, 153, 0.45)', 1.2, true);
      }

      // Primary CH1: u(t)
      drawWave(Math.min(scopeH * 0.4, U0 * vScale), 0, '#38bdf8', 2.4);
      // Primary CH2: i(t) (phase = -phi relative to u)
      drawWave(Math.min(scopeH * 0.3, I0 * iVisScale), -phiRad, '#f59e0b', 2.2);

      // Oscilloscope Legend
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`CH1 u(t): ${U0.toFixed(0)}V`, 20, 26);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`CH2 i(t): ${(I0 * 1000).toFixed(0)}mA`, 132, 26);
      if (showComponents) {
        ctx.fillStyle = '#c084fc';
        ctx.fillText('uL', 270, 26);
        ctx.fillStyle = '#34d399';
        ctx.fillText('uC', 298, 26);
      }
      ctx.restore();

      // 2. Phasor Diagram (Right / Bottom)
      ctx.save();
      const maxR = Math.min(isWide ? (width - scopeW) * 0.38 : width * 0.3, (isWide ? height : height - scopeH) * 0.38);
      const maxVoltage = Math.max(U0, I0 * ZL, I0 * ZC, 1);
      const pScale = maxR / maxVoltage;

      // Polar reference circle
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(phasorX, phasorY, maxR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(phasorX - maxR - 8, phasorY);
      ctx.lineTo(phasorX + maxR + 8, phasorY);
      ctx.moveTo(phasorX, phasorY - maxR - 8);
      ctx.lineTo(phasorX, phasorY + maxR + 8);
      ctx.stroke();

      const drawVector = (dx: number, dy: number, color: string, label: string) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(phasorX, phasorY);
        ctx.lineTo(phasorX + dx, phasorY + dy);
        ctx.stroke();

        const ang = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(phasorX + dx, phasorY + dy);
        ctx.lineTo(phasorX + dx - 8 * Math.cos(ang - 0.4), phasorY + dy - 8 * Math.sin(ang - 0.4));
        ctx.lineTo(phasorX + dx - 8 * Math.cos(ang + 0.4), phasorY + dy - 8 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();

        if (Math.hypot(dx, dy) > 10) {
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, phasorX + dx * 1.15, phasorY + dy * 1.15 + 3);
        }
      };

      // Reference I along +x rotating slowly or stationary Phasor frame (stationary I on +X is clearest in EE!)
      const vrPx = I0 * R * pScale;
      const vlPx = I0 * ZL * pScale;
      const vcPx = I0 * ZC * pScale;
      const netReactPx = vcPx - vlPx; // canvas y+ is downward, so +ZL is upward (-y)

      // I vector (reference axis)
      drawVector(Math.max(24, vrPx * 0.8), 0, '#f59e0b', 'I');
      // UR
      drawVector(vrPx, 0, '#94a3b8', 'UR');
      // UL (upward: -y)
      drawVector(0, -vlPx, '#c084fc', 'UL');
      // UC (downward: +y)
      drawVector(0, vcPx, '#34d399', 'UC');
      // Resultant U
      drawVector(vrPx, netReactPx, '#38bdf8', 'U');

      // Dotted parallelogram guide
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(phasorX + vrPx, phasorY);
      ctx.lineTo(phasorX + vrPx, phasorY + netReactPx);
      ctx.lineTo(phasorX, phasorY + netReactPx);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Giản đồ Vector (cosφ = ${cosPhi.toFixed(2)})`, phasorX, isWide ? 24 : scopeH + 20);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [U0, f, R, L, C, Z, ZL, ZC, I0, phiRad, cosPhi, showComponents]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          {isResonance ? (
            <span className="text-emerald-400 font-semibold">● CỘNG HƯỞNG (ZL ≈ ZC)</span>
          ) : ZL > ZC ? (
            <span className="text-purple-400 font-semibold">▲ Cảm kháng (u sớm pha φ={phiDeg.toFixed(1)}°)</span>
          ) : (
            <span className="text-sky-400 font-semibold">▼ Dung kháng (u trễ pha φ={phiDeg.toFixed(1)}°)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowComponents((s) => !s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
              showComponents
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1" />
            {showComponents ? 'Ẩn sóng uL, uC' : 'Hiện sóng uL, uC'}
          </button>

          <button
            type="button"
            onClick={() => {
              const targetF = Math.min(500, Math.max(20, Math.round(f0)));
              onParametersBatchChange?.({ f: targetF });
            }}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Đặt cộng hưởng ({Math.round(f0)} Hz)
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[290px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
