import React, { useEffect, useRef } from 'react';
import { Atom as AtomIcon } from 'lucide-react';

interface AtomSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
}

const ELEMENT_NAMES: Record<number, { name: string; symbol: string }> = {
  1: { name: 'Hiđrô', symbol: 'H' },
  2: { name: 'Heli', symbol: 'He' },
  3: { name: 'Liti', symbol: 'Li' },
  4: { name: 'Beri', symbol: 'Be' },
  5: { name: 'Bo', symbol: 'B' },
  6: { name: 'Cacbon', symbol: 'C' },
  7: { name: 'Nitơ', symbol: 'N' },
  8: { name: 'Oxi', symbol: 'O' },
  9: { name: 'Flo', symbol: 'F' },
  10: { name: 'Neon', symbol: 'Ne' },
  11: { name: 'Natri', symbol: 'Na' },
  12: { name: 'Magie', symbol: 'Mg' },
  13: { name: 'Nhôm', symbol: 'Al' },
  14: { name: 'Silic', symbol: 'Si' },
  15: { name: 'Photpho', symbol: 'P' },
  16: { name: 'Lưu huỳnh', symbol: 'S' },
  17: { name: 'Clo', symbol: 'Cl' },
  18: { name: 'Agon', symbol: 'Ar' },
};

export const AtomSim: React.FC<AtomSimProps> = ({ parameters, onSimulationStats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const protons = Math.max(1, Math.min(18, Math.round(parameters.protons ?? 6)));
  const neutrons = Math.max(0, Math.round(parameters.neutrons ?? 6));
  const electrons = protons;

  const kElectrons = Math.min(electrons, 2);
  const lElectrons = Math.min(Math.max(0, electrons - 2), 8);
  const mElectrons = Math.max(0, electrons - 10);

  const elementInfo = ELEMENT_NAMES[protons] || { name: 'Nguyên tố', symbol: 'E' };

  useEffect(() => {
    if (onSimulationStats) {
      onSimulationStats({
        'Nguyên tố': `${elementInfo.name} (${elementInfo.symbol})`,
        'Số hiệu nguyên tử (Z)': `${protons}`,
        'Số khối (A = Z + N)': `${protons + neutrons}`,
        'Cấu hình electron': `${kElectrons}${lElectrons ? `, ${lElectrons}` : ''}${mElectrons ? `, ${mElectrons}` : ''}`,
      });
    }
  }, [protons, neutrons, kElectrons, lElectrons, mElectrons, elementInfo, onSimulationStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

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

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Dark Cosmic Background
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.6);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const shells = [
        { radius: 60, count: kElectrons, speed: 0.035, label: 'Lớp K (n=1)' },
        { radius: 105, count: lElectrons, speed: 0.022, label: 'Lớp L (n=2)' },
        { radius: 150, count: mElectrons, speed: 0.015, label: 'Lớp M (n=3)' },
      ].filter((s) => s.count > 0);

      shells.forEach((shell) => {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, shell.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(shell.label, centerX + shell.radius - 24, centerY - 8);

        for (let i = 0; i < shell.count; i++) {
          const theta = angle * shell.speed + (i * 2 * Math.PI) / shell.count;
          const ex = centerX + shell.radius * Math.cos(theta);
          const ey = centerY + shell.radius * Math.sin(theta);

          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(ex, ey, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('-', ex, ey + 2.5);
        }
      });

      // Nucleus Cluster
      const nucleusRadius = 26;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, nucleusRadius + 8, 0, Math.PI * 2);
      ctx.fill();

      const nucGrad = ctx.createRadialGradient(centerX - 4, centerY - 4, 3, centerX, centerY, nucleusRadius);
      nucGrad.addColorStop(0, '#f87171');
      nucGrad.addColorStop(0.6, '#dc2626');
      nucGrad.addColorStop(1, '#991b1b');

      ctx.shadowColor = 'rgba(220, 38, 38, 0.6)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = nucGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, nucleusRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(elementInfo.symbol, centerX, centerY + 2);
      ctx.font = '9px monospace';
      ctx.fillText(`${protons}p ${neutrons}n`, centerX, centerY + 14);

      angle += 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [protons, neutrons, kElectrons, lElectrons, mElectrons, elementInfo]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Mô phỏng Lớp vỏ Nguyên tử Bohr
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] bg-slate-950">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-2.5 text-xs font-mono text-slate-300 shadow-lg pointer-events-none space-y-1">
          <div className="flex items-center justify-between gap-4 text-blue-400 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5">
              <AtomIcon className="w-3 h-3" /> {elementInfo.name} ({elementInfo.symbol})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
            <div className="text-slate-400">Số Proton (Z):</div>
            <div className="text-right text-rose-400 font-semibold">{protons}</div>
            <div className="text-slate-400">Số Neutron (N):</div>
            <div className="text-right text-slate-300 font-semibold">{neutrons}</div>
            <div className="text-slate-400">Số Electron:</div>
            <div className="text-right text-cyan-400 font-semibold">{electrons}</div>
            <div className="text-slate-400">Phân lớp (K,L,M):</div>
            <div className="text-right text-amber-400 font-semibold">
              {kElectrons}, {lElectrons}, {mElectrons}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
