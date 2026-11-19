import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Waves } from 'lucide-react';

interface SHMSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

export const SHMSim: React.FC<SHMSimProps> = ({ parameters, onSimulationStats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const A = parameters.A ?? 4;
  const m = parameters.m ?? 2;
  const k = parameters.k ?? 50;

  const omega = Math.sqrt(k / m);
  const period = (2 * Math.PI) / omega;
  const frequency = 1 / period;
  const totalEnergy = 0.5 * k * A * A;

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Chu kỳ (T)': `${period.toFixed(2)} s`,
        'Tần số (f)': `${frequency.toFixed(2)} Hz`,
        'Tần số góc (ω)': `${omega.toFixed(2)} rad/s`,
        'Cơ năng toàn phần (E)': `${totalEnergy.toFixed(1)} J`,
      });
    }
  }, [A, m, k, period, frequency, omega, totalEnergy, onSimulationStats]);

  useEffect(() => {
    let animId: number;
    let lastTime: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTime === null) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => prev + delta);
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

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

    const simHeight = height * 0.62;
    const graphHeight = height - simHeight;
    const wallX = 40;
    const floorY = simHeight - 30;
    const equilibriumX = width * 0.52;

    const scale = Math.min((width * 0.35) / Math.max(A * 1.25, 4), 28);

    const currentX = A * Math.cos(omega * currentTime);
    const currentV = -A * omega * Math.sin(omega * currentTime);
    const currentA = -omega * omega * currentX;
    const blockX = equilibriumX + currentX * scale;
    const blockWidth = 52;
    const blockHeight = 44;
    const blockY = floorY - blockHeight;

    const pe = 0.5 * k * currentX * currentX;
    const ke = Math.max(0, totalEnergy - pe);

    // Top Sim Area Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, simHeight);

    // Fixed Left Wall
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 20, wallX, floorY - 20);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let y = 30; y < floorY - 10; y += 12) {
      ctx.beginPath();
      ctx.moveTo(wallX - 15, y);
      ctx.lineTo(wallX, y - 10);
      ctx.stroke();
    }

    // Floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, floorY, width, 4);

    // Equilibrium & Amplitude guidelines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(equilibriumX, 30);
    ctx.lineTo(equilibriumX, floorY);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('x = 0 (VTCB)', equilibriumX, floorY + 16);

    // +A and -A markers
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.moveTo(equilibriumX + A * scale, 45);
    ctx.lineTo(equilibriumX + A * scale, floorY);
    ctx.moveTo(equilibriumX - A * scale, 45);
    ctx.lineTo(equilibriumX - A * scale, floorY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.fillText('+A', equilibriumX + A * scale, floorY + 16);
    ctx.fillText('-A', equilibriumX - A * scale, floorY + 16);

    // Spring
    const springStartX = wallX;
    const springEndX = blockX;
    const springY = floorY - blockHeight / 2;
    const springCoils = 14;
    const springWidth = springEndX - springStartX;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(springStartX, springY);
    const coilW = springWidth / (springCoils + 2);
    ctx.lineTo(springStartX + coilW, springY);

    for (let i = 0; i < springCoils; i++) {
      const cx = springStartX + coilW + (i + 0.5) * coilW;
      const cy = i % 2 === 0 ? springY - 14 : springY + 14;
      ctx.lineTo(cx, cy);
    }
    ctx.lineTo(springStartX + (springCoils + 1) * coilW, springY);
    ctx.lineTo(springEndX, springY);
    ctx.stroke();

    // Mass Block
    const blockGrad = ctx.createLinearGradient(blockX, blockY, blockX + blockWidth, blockY + blockHeight);
    blockGrad.addColorStop(0, '#3b82f6');
    blockGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = blockGrad;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.roundRect(blockX, blockY, blockWidth, blockHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${m} kg`, blockX + blockWidth / 2, blockY + blockHeight / 2 + 4);

    // Velocity Vector Arrow
    if (Math.abs(currentV) > 0.2) {
      const vLen = (currentV / (A * omega)) * 36;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(blockX + blockWidth / 2, blockY - 8);
      ctx.lineTo(blockX + blockWidth / 2 + vLen, blockY - 8);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const dir = Math.sign(vLen);
      ctx.moveTo(blockX + blockWidth / 2 + vLen, blockY - 8);
      ctx.lineTo(blockX + blockWidth / 2 + vLen - dir * 6, blockY - 12);
      ctx.lineTo(blockX + blockWidth / 2 + vLen - dir * 6, blockY - 4);
      ctx.closePath();
      ctx.fill();
    }

    // Bottom Area: Live Sinusoidal Wave x(t) Graph
    const graphY = simHeight;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, graphY, width, graphHeight);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, graphY, width, graphHeight);

    const waveMidY = graphY + graphHeight / 2;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(40, waveMidY);
    ctx.lineTo(width - 20, waveMidY);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Đồ thị dao động x(t) theo thời gian', 50, graphY + 14);

    // Plot Sinusoidal Curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const graphWidth = width - 70;
    for (let px = 0; px < graphWidth; px++) {
      const tOffset = (px / graphWidth) * (period * 2);
      const sampleT = currentTime - tOffset;
      const waveX = A * Math.cos(omega * sampleT);
      const waveCanvasY = waveMidY - (waveX / A) * (graphHeight * 0.35);

      const canvasPlotX = width - 30 - px;
      if (px === 0) ctx.moveTo(canvasPlotX, waveCanvasY);
      else ctx.lineTo(canvasPlotX, waveCanvasY);
    }
    ctx.stroke();

    const currentWaveDotY = waveMidY - (currentX / A) * (graphHeight * 0.35);
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(width - 30, currentWaveDotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Energy Bar
    const barX = width - 170;
    const barY = graphY + 8;
    const barW = 140;
    const barH = 10;

    const keRatio = totalEnergy > 0 ? ke / totalEnergy : 0;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ef4444'; // PE
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#22c55e'; // KE
    ctx.fillRect(barX, barY, barW * keRatio, barH);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.fillText(`Động năng (xanh) / Thế năng (đỏ)`, barX, barY + barH + 9);
  }, [A, m, k, omega, period, totalEnergy, currentTime]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Con lắc lò xo dao động điều hòa (SHM)
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
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <Waves className="w-3 h-3" /> Thông số dao động
            </span>
            <span>t = {currentTime.toFixed(2)}s</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Độ cứng lò xo (k):</div>
            <div className="text-right text-emerald-400 font-semibold">{k} N/m</div>
            <div className="text-slate-400">Khối lượng (m):</div>
            <div className="text-right text-blue-400 font-semibold">{m} kg</div>
            <div className="text-slate-400">Biên độ (A):</div>
            <div className="text-right text-amber-400 font-semibold">{A} m</div>
            <div className="text-slate-400">Chu kỳ (T):</div>
            <div className="text-right text-purple-400 font-semibold">{period.toFixed(2)} s</div>
          </div>
        </div>
      </div>
    </div>
  );
};
