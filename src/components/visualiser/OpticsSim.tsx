import React, { useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';

interface OpticsSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

export const OpticsSim: React.FC<OpticsSimProps> = ({ parameters, onSimulationStats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const f = parameters.f ?? 15;
  const u = parameters.u ?? 30;
  const h_o = parameters.h_o ?? 6;

  // Thin lens calculations
  const isAtFocus = Math.abs(u - f) < 0.2;
  const v = isAtFocus ? 9999 : (f * u) / (u - f);
  const m = isAtFocus ? 9999 : -v / u;
  const h_i = m * h_o;
  const isVirtual = v < 0;

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Khoảng cách ảnh (v)': isAtFocus ? 'Vô cực (∞)' : `${v.toFixed(1)} cm`,
        'Độ phóng đại (m)': isAtFocus ? 'Không xác định' : `${Math.abs(m).toFixed(2)}x`,
        'Tính chất ảnh': isAtFocus
          ? 'Tia song song (Ảnh ở vô cực)'
          : isVirtual
          ? 'Ảnh ảo, cùng chiều, phóng đại'
          : 'Ảnh thật, ngược chiều',
        'Tiêu cự (f)': `${f} cm`,
        'Khoảng cách vật (u)': `${u} cm`,
      });
    }
  }, [f, u, h_o, v, m, isVirtual, isAtFocus, onSimulationStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const lensX = width * 0.48;

    const maxDistance = Math.max(u, Math.abs(v < 1000 ? v : 50), f * 2.2, 40);
    const scale = Math.min((width * 0.42) / maxDistance, 8.5);

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Principal Optical Axis
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Convex Lens Drawing
    const lensHeight = Math.min(height * 0.72, 220);
    const lensRadius = 14;

    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(lensX, centerY, lensRadius, lensHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(lensX, centerY - lensHeight / 2);
    ctx.lineTo(lensX, centerY + lensHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Optical Center O
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(lensX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '10px monospace';
    ctx.fillText('O', lensX + 5, centerY + 14);

    // Focal Points F1, F2, 2F1, 2F2
    const drawPoint = (cx: number, label: string) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(cx, centerY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, centerY + 16);
    };

    drawPoint(lensX - f * scale, 'F1');
    drawPoint(lensX - 2 * f * scale, '2F1');
    drawPoint(lensX + f * scale, 'F2');
    drawPoint(lensX + 2 * f * scale, '2F2');

    const drawArrow = (
      x: number,
      arrowHeightCm: number,
      color: string,
      label: string,
      isDashed = false
    ) => {
      const arrowHeightPx = arrowHeightCm * scale * 2.2;
      const tipY = centerY - arrowHeightPx;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (isDashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, tipY);
      ctx.stroke();

      const dir = arrowHeightCm >= 0 ? -1 : 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.lineTo(x - 5, tipY - dir * 10);
      ctx.lineTo(x + 5, tipY - dir * 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = color;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, centerY + (arrowHeightCm >= 0 ? -arrowHeightPx - 12 : -arrowHeightPx + 16));
    };

    // Object Arrow (Blue, Left side)
    const objX = lensX - u * scale;
    drawArrow(objX, h_o, '#3b82f6', `Vật (${h_o}cm)`);

    const objTipY = centerY - h_o * scale * 2.2;

    // Image Arrow & Ray Tracing
    if (!isAtFocus && Math.abs(v) < 1200) {
      const imgX = lensX + v * scale;
      const imgTipY = centerY - h_i * scale * 2.2;

      drawArrow(imgX, h_i, '#ef4444', isVirtual ? `Ảnh ảo (${Math.abs(h_i).toFixed(1)}cm)` : `Ảnh thật (${Math.abs(h_i).toFixed(1)}cm)`, isVirtual);

      ctx.lineWidth = 1.5;

      // Ray 1: Song song trục chính khúc xạ qua F2
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(lensX, objTipY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(lensX, objTipY);
      ctx.lineTo(isVirtual ? width : imgX + 50, isVirtual ? centerY - (objTipY - centerY) : imgTipY);
      ctx.stroke();

      if (isVirtual) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(lensX, objTipY);
        ctx.lineTo(imgX, imgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Ray 2: Qua quang tâm O truyền thẳng
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(objX, objTipY);
      ctx.lineTo(lensX, centerY);
      ctx.lineTo(isVirtual ? imgX : imgX + 30, isVirtual ? imgTipY : centerY + (centerY - objTipY) * (imgX + 30 - lensX) / (lensX - objX));
      ctx.stroke();

      if (isVirtual) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(lensX, centerY);
        ctx.lineTo(imgX, imgTipY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [f, u, h_o, v, m, h_i, isVirtual, isAtFocus]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Vẽ đường truyền tia sáng qua Thấu kính mỏng
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-2.5 text-xs font-mono text-slate-300 shadow-lg pointer-events-none space-y-1">
          <div className="flex items-center justify-between gap-4 text-cyan-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3 h-3" /> Thông số Quang học
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Tiêu cự (f):</div>
            <div className="text-right text-cyan-400 font-semibold">{f} cm</div>
            <div className="text-slate-400">Khoảng cách vật (u):</div>
            <div className="text-right text-blue-400 font-semibold">{u} cm</div>
            <div className="text-slate-400">Khoảng cách ảnh (v):</div>
            <div className="text-right text-amber-400 font-semibold">
              {isAtFocus ? '∞' : `${v.toFixed(1)} cm`}
            </div>
            <div className="text-slate-400">Độ phóng đại:</div>
            <div className="text-right text-rose-400 font-semibold">
              {isAtFocus ? 'Không xác định' : `${Math.abs(m).toFixed(2)}x`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
