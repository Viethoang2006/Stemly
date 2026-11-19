import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Gauge } from 'lucide-react';
import { CollisionParticleSystem } from './collisionParticles';

interface FreeFallSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

export const FreeFallSim: React.FC<FreeFallSimProps> = ({
  parameters,
  onSimulationStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleSysRef = useRef<CollisionParticleSystem>(new CollisionParticleSystem());
  const prevTimeRef = useRef<number>(0);
  const impactTriggeredRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const h = parameters.h ?? 45;
  const g = parameters.g ?? 9.8;

  const totalFallTime = Math.sqrt((2 * h) / g);
  const finalVelocity = Math.sqrt(2 * g * h);

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Thời gian rơi': `${totalFallTime.toFixed(2)} s`,
        'Vận tốc chạm đất': `${finalVelocity.toFixed(2)} m/s`,
        'Độ cao thả': `${h} m`,
        'Gia tốc trọng trường': `${g} m/s²`,
      });
    }
  }, [h, g, totalFallTime, finalVelocity, onSimulationStats]);

  useEffect(() => {
    setCurrentTime(0);
    prevTimeRef.current = 0;
    impactTriggeredRef.current = false;
    particleSysRef.current.clear();
  }, [h, g]);

  useEffect(() => {
    let animId: number;
    let lastTime: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTime === null) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta * speedMultiplier;
          if (next > totalFallTime + 1.2) {
            return 0;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speedMultiplier, totalFallTime]);

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

    const groundY = height - 50;
    const topMargin = 40;
    const availableH = groundY - topMargin;
    const scale = availableH / Math.max(h, 10);

    const toCanvasY = (physH: number) => groundY - physH * scale;
    const centerX = width * 0.45;

    // Background Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(1, '#1e293b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, groundY);

    // Ground
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, groundY, width, 5);

    // Drop Tower Platform on Left
    const platformW = 100;
    ctx.fillStyle = '#334155';
    ctx.fillRect(centerX - platformW, toCanvasY(h), platformW, 14);
    ctx.fillStyle = '#475569';
    ctx.fillRect(centerX - platformW + 10, toCanvasY(h) + 14, 20, groundY - (toCanvasY(h) + 14));

    ctx.fillStyle = '#eab308';
    ctx.fillRect(centerX - 40, toCanvasY(h) - 4, 35, 4);

    // Vertical Height Ruler
    const rulerX = centerX - 120;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(rulerX - 25, topMargin - 10, 50, availableH + 20);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rulerX, groundY);
    ctx.lineTo(rulerX, toCanvasY(h));
    ctx.stroke();

    const step = h > 60 ? 15 : h > 25 ? 10 : 5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let meter = 0; meter <= h; meter += step) {
      const y = toCanvasY(meter);
      ctx.beginPath();
      ctx.moveTo(rulerX - 6, y);
      ctx.lineTo(rulerX + 6, y);
      ctx.stroke();
      ctx.fillText(`${meter}m`, rulerX - 10, y + 3);
    }

    const fallT = Math.min(currentTime, totalFallTime);
    const currentHeight = Math.max(0, h - 0.5 * g * fallT * fallT);
    const currentVelocity = g * fallT;
    const currentCanvasY = toCanvasY(currentHeight);

    // Height Guide Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rulerX, currentCanvasY);
    ctx.lineTo(centerX + 30, currentCanvasY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Velocity Blur Trail
    if (currentVelocity > 4) {
      for (let i = 1; i <= 4; i++) {
        ctx.fillStyle = `rgba(236, 72, 153, ${0.25 - i * 0.05})`;
        ctx.beginPath();
        ctx.arc(centerX, currentCanvasY - i * 6, 12 - i * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ball (with subtle impact squash right at collision)
    const timeSinceImpact = currentTime - totalFallTime;
    const squashFactor =
      timeSinceImpact >= 0 && timeSinceImpact < 0.14
        ? Math.sin((timeSinceImpact / 0.14) * Math.PI) * Math.min(0.28, finalVelocity / 120)
        : 0;
    const ballDrawY =
      currentTime >= totalFallTime
        ? Math.min(currentCanvasY, groundY - 12 * (1 - squashFactor * 0.7))
        : currentCanvasY;

    ctx.save();
    ctx.translate(centerX, ballDrawY);
    ctx.scale(1 + squashFactor, 1 - squashFactor * 0.85);

    const ballGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, 14);
    ballGrad.addColorStop(0, '#f472b6');
    ballGrad.addColorStop(0.7, '#db2777');
    ballGrad.addColorStop(1, '#9d174d');

    ctx.shadowColor = '#db2777';
    ctx.shadowBlur = 12;
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Collision particle system update & render
    const pSys = particleSysRef.current;
    if (currentTime < prevTimeRef.current) {
      pSys.clear();
      impactTriggeredRef.current = false;
    }
    const dt = Math.max(0, Math.min(0.05, currentTime - prevTimeRef.current));
    prevTimeRef.current = currentTime;

    if (!impactTriggeredRef.current && currentTime >= totalFallTime) {
      impactTriggeredRef.current = true;
      pSys.emitImpact({
        x: centerX,
        y: groundY,
        impactSpeed: finalVelocity,
        horizontalBias: 0,
        sparkColor: '#f472b6',
        debrisColor: '#22c55e',
        secondaryDebrisColor: '#92400e',
        dustColor: 'rgba(226, 232, 240, 0.45)',
        ringColor: '#f59e0b',
      });
    }

    if (dt > 0) {
      pSys.update(dt, groundY);
    }
    pSys.render(ctx);

    // Velocity Gauge Meter on the right
    const gaugeX = width - 80;
    const gaugeY = 70;
    const gaugeH = 160;
    const gaugeW = 22;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.roundRect(gaugeX - 10, gaugeY - 24, gaugeW + 20, gaugeH + 48, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VẬN TỐC', gaugeX + gaugeW / 2, gaugeY - 10);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

    const fillRatio = Math.min(currentVelocity / Math.max(finalVelocity, 1), 1);
    const fillHeight = fillRatio * gaugeH;

    const fillGrad = ctx.createLinearGradient(0, gaugeY + gaugeH, 0, gaugeY);
    fillGrad.addColorStop(0, '#22c55e');
    fillGrad.addColorStop(0.6, '#eab308');
    fillGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(gaugeX, gaugeY + gaugeH - fillHeight, gaugeW, fillHeight);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${currentVelocity.toFixed(1)}`, gaugeX + gaugeW / 2, gaugeY + gaugeH + 16);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('m/s', gaugeX + gaugeW / 2, gaugeY + gaugeH + 28);
  }, [h, g, currentTime, totalFallTime, finalVelocity]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Mô phỏng Rơi tự do thẳng đứng
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 0.5 : prev === 0.5 ? 0.25 : 1))}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
          >
            Tốc độ {speedMultiplier}x
          </button>
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
          <div className="flex items-center justify-between gap-4 text-pink-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3 h-3" /> Động lực học rơi tự do
            </span>
            <span>t = {currentTime.toFixed(2)}s</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Thời gian rơi:</div>
            <div className="text-right text-emerald-400 font-semibold">{totalFallTime.toFixed(2)} s</div>
            <div className="text-slate-400">Vận tốc chạm đất:</div>
            <div className="text-right text-rose-400 font-semibold">{finalVelocity.toFixed(1)} m/s</div>
            <div className="text-slate-400">Độ cao ban đầu:</div>
            <div className="text-right text-amber-400 font-semibold">{h} m</div>
          </div>
        </div>
      </div>
    </div>
  );
};
