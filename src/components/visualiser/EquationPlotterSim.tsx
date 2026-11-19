import React, { useEffect, useRef } from 'react';
import { FunctionSquare } from 'lucide-react';

interface EquationPlotterSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

export const EquationPlotterSim: React.FC<EquationPlotterSimProps> = ({
  parameters,
  onSimulationStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const a = parameters.a ?? 1;
  const b = parameters.b ?? 0;
  const c = parameters.c ?? -4;

  const delta = b * b - 4 * a * c;
  const hasRealRoots = delta >= 0;
  const root1 = a !== 0 && hasRealRoots ? (-b + Math.sqrt(delta)) / (2 * a) : null;
  const root2 = a !== 0 && hasRealRoots ? (-b - Math.sqrt(delta)) / (2 * a) : null;

  const vertexX = a !== 0 ? -b / (2 * a) : 0;
  const vertexY = a !== 0 ? c - (b * b) / (4 * a) : c;

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Tọa độ đỉnh V(x, y)': `(${vertexX.toFixed(2)}, ${vertexY.toFixed(2)})`,
        'Nghiệm':
          root1 !== null && root2 !== null
            ? `x1=${root1.toFixed(2)}, x2=${root2.toFixed(2)}`
            : 'Vô nghiệm thực',
        'Biệt thức (Δ)': `${delta.toFixed(2)}`,
        'Giao điểm trục tung Oy': `(0, ${c})`,
      });
    }
  }, [a, b, c, delta, root1, root2, vertexX, vertexY, onSimulationStats]);

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

    const originX = width / 2;
    const originY = height / 2;
    const unitScale = 22;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = originX % unitScale; x < width; x += unitScale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % unitScale; y < height; y += unitScale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis Ticks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    for (let u = -15; u <= 15; u += 2) {
      if (u === 0) continue;
      const px = originX + u * unitScale;
      if (px > 20 && px < width - 20) {
        ctx.fillText(`${u}`, px, originY + 14);
      }
      const py = originY - u * unitScale;
      if (py > 20 && py < height - 20) {
        ctx.fillText(`${u}`, originX - 12, py + 3);
      }
    }

    // Plot Parabola y = ax^2 + bx + c
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const minMathX = (0 - originX) / unitScale;
    const maxMathX = (width - originX) / unitScale;
    const steps = 300;

    for (let i = 0; i <= steps; i++) {
      const mathX = minMathX + (i * (maxMathX - minMathX)) / steps;
      const mathY = a * mathX * mathX + b * mathX + c;

      const screenX = originX + mathX * unitScale;
      const screenY = originY - mathY * unitScale;

      if (i === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.stroke();

    // Vertex Dot
    const vScreenX = originX + vertexX * unitScale;
    const vScreenY = originY - vertexY * unitScale;
    if (vScreenX >= 0 && vScreenX <= width && vScreenY >= 0 && vScreenY <= height) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(vScreenX, vScreenY, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fecaca';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.roundRect(vScreenX - 35, vScreenY - 26, 70, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Đỉnh(${vertexX.toFixed(1)}, ${vertexY.toFixed(1)})`, vScreenX, vScreenY - 14);
    }

    // Roots
    if (root1 !== null && root2 !== null) {
      [root1, root2].forEach((r) => {
        const rScreenX = originX + r * unitScale;
        const rScreenY = originY;
        if (rScreenX >= 0 && rScreenX <= width) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(rScreenX, rScreenY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [a, b, c, vertexX, vertexY, root1, root2]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Khảo sát đồ thị Parabol bậc hai Descartes
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-2.5 text-xs font-mono text-slate-300 shadow-lg pointer-events-none space-y-1">
          <div className="flex items-center justify-between gap-4 text-sky-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <FunctionSquare className="w-3 h-3" /> y = {a}x² + {b}x + {c}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Tọa độ đỉnh:</div>
            <div className="text-right text-rose-400 font-semibold">
              ({vertexX.toFixed(2)}, {vertexY.toFixed(2)})
            </div>
            <div className="text-slate-400">Biệt thức (Δ):</div>
            <div className="text-right text-amber-400 font-semibold">{delta.toFixed(2)}</div>
            <div className="text-slate-400">Nghiệm thực:</div>
            <div className="text-right text-emerald-400 font-semibold">
              {root1 !== null ? `${root1.toFixed(1)}, ${root2?.toFixed(1)}` : 'Vô nghiệm'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
