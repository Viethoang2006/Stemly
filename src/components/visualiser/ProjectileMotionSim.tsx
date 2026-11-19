import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';
import { CollisionParticleSystem } from './collisionParticles';

interface ProjectileMotionSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

export const ProjectileMotionSim: React.FC<ProjectileMotionSimProps> = ({
  parameters,
  onSimulationStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleSysRef = useRef<CollisionParticleSystem>(new CollisionParticleSystem());
  const prevTimeRef = useRef<number>(0);
  const impactTriggeredRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const U = parameters.U ?? 25;
  const theta = parameters.theta ?? 45;
  const g = parameters.g ?? 9.8;

  const thetaRad = (theta * Math.PI) / 180;
  const flightTime = (2 * U * Math.sin(thetaRad)) / g;
  const maxHeight = (U * U * Math.sin(thetaRad) * Math.sin(thetaRad)) / (2 * g);
  const range = (U * U * Math.sin(2 * thetaRad)) / g;

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Thời gian bay': `${flightTime.toFixed(2)} s`,
        'Độ cao cực đại': `${maxHeight.toFixed(2)} m`,
        'Tầm bay xa': `${range.toFixed(2)} m`,
        'Vận tốc ban đầu': `${U.toFixed(1)} m/s`,
        'Góc phóng': `${theta}°`,
      });
    }
  }, [U, theta, g, flightTime, maxHeight, range, onSimulationStats]);

  useEffect(() => {
    setCurrentTime(0);
    prevTimeRef.current = 0;
    impactTriggeredRef.current = false;
    particleSysRef.current.clear();
  }, [U, theta, g]);

  useEffect(() => {
    let animId: number;
    let lastTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + deltaSec * speedMultiplier;
          if (next > flightTime + 0.95) {
            return 0;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speedMultiplier, flightTime]);

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

    const groundY = height - 44;
    const originX = 50;
    const availableWidth = width - 100;
    const availableHeight = height - 90;

    const scaleX = Math.min(availableWidth / Math.max(range * 1.15, 10), 18);
    const scaleY = Math.min(availableHeight / Math.max(maxHeight * 1.35, 8), 18);
    const scale = Math.min(scaleX, scaleY);

    const toCanvasX = (physX: number) => originX + physX * scale;
    const toCanvasY = (physY: number) => groundY - physY * scale;

    // Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#f8fafc');
    skyGrad.addColorStop(1, '#eff6ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, groundY);

    // Grid Lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = originX; x < width - 20; x += 40) {
      ctx.moveTo(x, 15);
      ctx.lineTo(x, groundY);
    }
    for (let y = groundY; y > 20; y -= 40) {
      ctx.moveTo(originX - 10, y);
      ctx.lineTo(width - 20, y);
    }
    ctx.stroke();

    // Ground
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0, '#22c55e');
    groundGrad.addColorStop(0.2, '#16a34a');
    groundGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, height - groundY);

    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // Ground ticks
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const tickStep = range > 80 ? 20 : range > 30 ? 10 : 5;
    for (let m = 0; m <= range * 1.15; m += tickStep) {
      const tx = toCanvasX(m);
      if (tx > width - 20) break;
      ctx.fillStyle = '#166534';
      ctx.fillRect(tx - 1, groundY, 2, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${m}m`, tx, groundY + 18);
    }

    // Parabolic Trajectory Path
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = (flightTime * i) / steps;
      const px = U * Math.cos(thetaRad) * t;
      const py = Math.max(0, U * Math.sin(thetaRad) * t - 0.5 * g * t * t);
      const cx = toCanvasX(px);
      const cy = toCanvasY(py);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Apex Indicator
    const apexTime = flightTime / 2;
    const apexX = U * Math.cos(thetaRad) * apexTime;
    const apexY = maxHeight;
    const apexCanvasX = toCanvasX(apexX);
    const apexCanvasY = toCanvasY(apexY);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(apexCanvasX, apexCanvasY);
    ctx.lineTo(apexCanvasX, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(apexCanvasX, apexCanvasY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fee2e2';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.roundRect(apexCanvasX - 35, apexCanvasY - 26, 70, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Đỉnh: ${maxHeight.toFixed(1)}m`, apexCanvasX, apexCanvasY - 14);

    // Target Landing Flag
    const landingX = toCanvasX(range);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(landingX, groundY);
    ctx.lineTo(landingX, groundY - 24);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(landingX, groundY - 24);
    ctx.lineTo(landingX + 16, groundY - 17);
    ctx.lineTo(landingX, groundY - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Tầm xa: ${range.toFixed(1)}m`, landingX, groundY + 32);

    // Current position
    const t = Math.min(currentTime, flightTime);
    const currentPhysX = U * Math.cos(thetaRad) * t;
    const currentPhysY = Math.max(0, U * Math.sin(thetaRad) * t - 0.5 * g * t * t);
    const currentCanvasX = toCanvasX(currentPhysX);
    const currentCanvasY = toCanvasY(currentPhysY);

    const currentVx = U * Math.cos(thetaRad);
    const currentVy = U * Math.sin(thetaRad) - g * t;
    const currentSpeed = Math.sqrt(currentVx * currentVx + currentVy * currentVy);

    // Trajectory Trail
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const trailSteps = 30;
    const trailStartT = Math.max(0, t - 0.35);
    for (let i = 0; i <= trailSteps; i++) {
      const trailT = trailStartT + ((t - trailStartT) * i) / trailSteps;
      const tx = toCanvasX(U * Math.cos(thetaRad) * trailT);
      const ty = toCanvasY(Math.max(0, U * Math.sin(thetaRad) * trailT - 0.5 * g * trailT * trailT));
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    // Velocity Vector Arrow
    const arrowLen = Math.min(currentSpeed * 0.9, 45);
    const angle = Math.atan2(-currentVy, currentVx);
    const arrowEndX = currentCanvasX + arrowLen * Math.cos(angle);
    const arrowEndY = currentCanvasY + arrowLen * Math.sin(angle);

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(currentCanvasX, currentCanvasY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    const headLen = 7;
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
      arrowEndX - headLen * Math.cos(angle - Math.PI / 6),
      arrowEndY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowEndX - headLen * Math.cos(angle + Math.PI / 6),
      arrowEndY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Projectile Sphere (with subtle impact compression & ground contact shadow)
    const timeSinceImpact = currentTime - flightTime;
    const squashFactor =
      timeSinceImpact >= 0 && timeSinceImpact < 0.14
        ? Math.sin((timeSinceImpact / 0.14) * Math.PI) * Math.min(0.26, U / 110)
        : 0;
    const sphereDrawY =
      currentTime >= flightTime
        ? Math.min(currentCanvasY, groundY - 7 * (1 - squashFactor * 0.65))
        : currentCanvasY;

    ctx.save();
    ctx.translate(currentCanvasX, sphereDrawY);
    ctx.scale(1 + squashFactor, 1 - squashFactor * 0.85);

    const ballGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 9);
    ballGrad.addColorStop(0, '#60a5fa');
    ballGrad.addColorStop(0.7, '#2563eb');
    ballGrad.addColorStop(1, '#1d4ed8');

    ctx.shadowColor = 'rgba(37, 99, 235, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Collision particle system update & render at landing impact
    const pSys = particleSysRef.current;
    if (currentTime < prevTimeRef.current) {
      pSys.clear();
      impactTriggeredRef.current = false;
    }
    const dt = Math.max(0, Math.min(0.05, currentTime - prevTimeRef.current));
    prevTimeRef.current = currentTime;

    if (!impactTriggeredRef.current && currentTime >= flightTime) {
      impactTriggeredRef.current = true;
      pSys.emitImpact({
        x: landingX,
        y: groundY,
        impactSpeed: U,
        horizontalBias: Math.cos(thetaRad) * 0.78,
        sparkColor: '#fbbf24',
        debrisColor: '#16a34a',
        secondaryDebrisColor: '#854d0e',
        dustColor: 'rgba(148, 163, 184, 0.52)',
        ringColor: '#2563eb',
      });
    }

    if (dt > 0) {
      pSys.update(dt, groundY);
    }
    pSys.render(ctx);

    // Cannon
    ctx.save();
    ctx.translate(originX, groundY);
    ctx.rotate(-thetaRad);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, -7, 24, 14);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [U, theta, g, currentTime, flightTime, maxHeight, range]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Mô hình Chuyển động Ném xiên 2D (60 FPS)
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
            title={isPlaying ? 'Tạm dừng' : 'Tiếp tục'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Đặt lại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-2.5 text-xs font-mono text-slate-300 shadow-lg pointer-events-none space-y-1">
          <div className="flex items-center justify-between gap-4 text-blue-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Đo lường trực tiếp
            </span>
            <span>t = {currentTime.toFixed(2)}s</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Vận tốc ban đầu:</div>
            <div className="text-right text-emerald-400 font-semibold">{U} m/s</div>
            <div className="text-slate-400">Góc ném:</div>
            <div className="text-right text-emerald-400 font-semibold">{theta}°</div>
            <div className="text-slate-400">Độ cao cực đại:</div>
            <div className="text-right text-amber-400 font-semibold">{maxHeight.toFixed(1)} m</div>
            <div className="text-slate-400">Tầm bay xa:</div>
            <div className="text-right text-blue-400 font-semibold">{range.toFixed(1)} m</div>
          </div>
        </div>
      </div>
    </div>
  );
};
