import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, TrendingUp } from 'lucide-react';

interface KinematicsSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

export const KinematicsSim: React.FC<KinematicsSimProps> = ({
  parameters,
  onSimulationStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const u = parameters.u ?? 10;
  const a = parameters.a ?? 3;
  const tMax = parameters.t_max ?? 10;

  const finalVelocity = u + a * tMax;
  const totalDisplacement = u * tMax + 0.5 * a * tMax * tMax;

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Vận tốc cuối': `${finalVelocity.toFixed(1)} m/s`,
        'Tổng quãng đường': `${totalDisplacement.toFixed(1)} m`,
        'Vận tốc ban đầu': `${u} m/s`,
        'Gia tốc': `${a} m/s²`,
        'Thời gian': `${tMax} s`,
      });
    }
  }, [u, a, tMax, finalVelocity, totalDisplacement, onSimulationStats]);

  useEffect(() => {
    setCurrentTime(0);
  }, [u, a, tMax]);

  useEffect(() => {
    let animId: number;
    let lastTime: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTime === null) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next > tMax + 1) return 0;
          return next;
        });
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, tMax]);

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

    const trackY = height * 0.45;
    const roadHeight = 60;
    const graphY = height * 0.68;
    const graphH = height - graphY - 10;

    const t = Math.min(currentTime, tMax);
    const s = Math.max(0, u * t + 0.5 * a * t * t);
    const v = u + a * t;

    // Road Track Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Highway Road
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, trackY, width, roadHeight);

    // Road Markings
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 12]);
    ctx.beginPath();
    ctx.moveTo(0, trackY + roadHeight / 2);
    ctx.lineTo(width, trackY + roadHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Road Bounds
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, trackY, width, 3);
    ctx.fillRect(0, trackY + roadHeight - 3, width, 3);

    const maxDisplacement = Math.max(totalDisplacement, 20);
    const carProgress = (s / maxDisplacement) % 1;
    const carX = 40 + carProgress * (width - 120);
    const carY = trackY + roadHeight / 2 - 12;

    // Car Body
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.roundRect(carX, carY, 46, 22, 6);
    ctx.fill();
    ctx.stroke();

    // Car Cabin
    ctx.fillStyle = '#0369a1';
    ctx.roundRect(carX + 10, carY + 3, 22, 16, 4);
    ctx.fill();

    // Headlight Beam
    const lightGrad = ctx.createLinearGradient(carX + 46, carY + 11, carX + 85, carY + 11);
    lightGrad.addColorStop(0, 'rgba(253, 224, 71, 0.7)');
    lightGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.moveTo(carX + 46, carY + 6);
    ctx.lineTo(carX + 85, carY - 2);
    ctx.lineTo(carX + 85, carY + 24);
    ctx.lineTo(carX + 46, carY + 16);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(carX + 10, carY + 22, 5, 0, Math.PI * 2);
    ctx.arc(carX + 36, carY + 22, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${Math.round(v)} m/s`, carX + 4, carY - 6);

    // Mini v-t Graph on bottom
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.roundRect(30, graphY, width - 60, graphH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('Đồ thị Vận tốc - Thời gian v(t) = u + at', 45, graphY + 16);

    const plotStartX = 50;
    const plotEndX = width - 50;
    const plotW = plotEndX - plotStartX;
    const maxV = Math.max(Math.abs(u), Math.abs(finalVelocity), 20);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const sampleT = (tMax * i) / 50;
      const sampleV = u + a * sampleT;
      const plotX = plotStartX + (sampleT / tMax) * plotW;
      const plotY = graphY + graphH - 15 - (sampleV / maxV) * (graphH - 35);
      if (i === 0) ctx.moveTo(plotX, plotY);
      else ctx.lineTo(plotX, plotY);
    }
    ctx.stroke();

    const currentPlotX = plotStartX + (t / tMax) * plotW;
    const currentPlotY = graphY + graphH - 15 - (v / maxV) * (graphH - 35);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(currentPlotX, currentPlotY, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }, [u, a, tMax, currentTime, totalDisplacement, finalVelocity]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Động học 1D & Đồ thị Vận tốc - Thời gian
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-2.5 text-xs font-mono text-slate-300 shadow-lg pointer-events-none space-y-1">
          <div className="flex items-center justify-between gap-4 text-cyan-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Đo lường chuyển động
            </span>
            <span>t = {currentTime.toFixed(2)}s</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Vận tốc hiện tại:</div>
            <div className="text-right text-emerald-400 font-semibold">
              {(u + a * Math.min(currentTime, tMax)).toFixed(1)} m/s
            </div>
            <div className="text-slate-400">Quãng đường:</div>
            <div className="text-right text-blue-400 font-semibold">
              {(u * currentTime + 0.5 * a * currentTime * currentTime).toFixed(1)} m
            </div>
            <div className="text-slate-400">Gia tốc:</div>
            <div className="text-right text-amber-400 font-semibold">{a} m/s²</div>
          </div>
        </div>
      </div>
    </div>
  );
};
