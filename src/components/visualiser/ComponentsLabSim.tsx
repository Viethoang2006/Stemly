import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Cpu, Sliders } from 'lucide-react';
import { getResistorColorBands } from './circuitSandboxCore';

interface ComponentsLabSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
}

const RESISTOR_COLORS = [
  { name: 'Đen', digit: 0, mult: 1, tol: null, hex: '#1e293b' },
  { name: 'Nâu', digit: 1, mult: 10, tol: '±1%', hex: '#78350f' },
  { name: 'Đỏ', digit: 2, mult: 100, tol: '±2%', hex: '#dc2626' },
  { name: 'Cam', digit: 3, mult: 1000, tol: null, hex: '#ea580c' },
  { name: 'Vàng', digit: 4, mult: 10000, tol: null, hex: '#eab308' },
  { name: 'Lục', digit: 5, mult: 100000, tol: '±0.5%', hex: '#16a34a' },
  { name: 'Lam', digit: 6, mult: 1000000, tol: '±0.25%', hex: '#2563eb' },
  { name: 'Tím', digit: 7, mult: 10000000, tol: '±0.1%', hex: '#9333ea' },
  { name: 'Xám', digit: 8, mult: null, tol: null, hex: '#64748b' },
  { name: 'Trắng', digit: 9, mult: null, tol: null, hex: '#f8fafc' },
  { name: 'Nhũ vàng', digit: null, mult: 0.1, tol: '±5%', hex: '#d97706' },
  { name: 'Nhũ bạc', digit: null, mult: 0.01, tol: '±10%', hex: '#94a3b8' },
];

const PINOUT_PRESETS = [
  {
    id: 'c1815',
    name: 'BJT C1815 (NPN)',
    package: 'TO-92 (Mặt phẳng hướng ra)',
    pins: ['1: E (Emitter)', '2: C (Collector)', '3: B (Base)'],
    note: 'C1815 có chân C ở giữa (khác với 2N2222 hay BC547 là E-B-C). Luôn kiểm tra datasheet trước khi hàn.',
  },
  {
    id: 'irf540',
    name: 'MOSFET IRF540N (N-CH)',
    package: 'TO-220 (Mặt chữ hướng ra)',
    pins: ['1: G (Gate)', '2: D (Drain)', '3: S (Source)'],
    note: 'Tấm tản nhiệt kim loại phía sau nối chung với chân 2 (Drain). Cần trở xả G-S (10kΩ) chống kích nhiễu.',
  },
  {
    id: '7805',
    name: 'Ổn áp LM7805 (+5V)',
    package: 'TO-220 (Mặt chữ hướng ra)',
    pins: ['1: IN (7V–24V)', '2: GND (Mass)', '3: OUT (+5V)'],
    note: 'Nên lắp thêm tụ 100nF ở chân IN và OUT sát IC để chống tự kích dao động.',
  },
  {
    id: '1n4007',
    name: 'Diode 1N4007 (1A/1000V)',
    package: 'DO-41',
    pins: ['Đầu đen: Anode (+)', 'Vạch bạc trắng: Cathode (-)'],
    note: 'Sụt áp thuận khoảng 0.7V. Chỉ dẫn một chiều từ Anode sang Cathode.',
  },
];

function formatOhms(ohms: number): string {
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(2).replace(/\.00$/, '')} MΩ`;
  if (ohms >= 1e3) return `${(ohms / 1e3).toFixed(2).replace(/\.00$/, '')} kΩ`;
  return `${ohms.toFixed(2).replace(/\.00$/, '')} Ω`;
}

const E12_BASE = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const E12_VALUES: number[] = (() => {
  const vals: number[] = [];
  for (let dec = 0; dec <= 5; dec++) {
    const mult = Math.pow(10, dec);
    for (const m of E12_BASE) {
      vals.push(Math.round(m * mult * 10) / 10);
    }
  }
  vals.push(1000000);
  return vals;
})();

export const ComponentsLabSim: React.FC<ComponentsLabSimProps> = ({
  parameters,
  onSimulationStats,
  onParametersBatchChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [subMode, setSubMode] = useState<'iv' | 'decoder' | 'e12'>('iv');

  // Resistor color bands state (default 1kΩ ±5%: Nâu-Đen-Đỏ-Nhũ vàng)
  const [b1, setB1] = useState<number>(1);
  const [b2, setB2] = useState<number>(0);
  const [bMult, setBMult] = useState<number>(2);
  const [bTol, setBTol] = useState<number>(10);
  const [capCode, setCapCode] = useState<string>('104');
  const [selectedPinout, setSelectedPinout] = useState<string>('c1815');

  // E12 & Wattage Calculator state
  const [targetOhms, setTargetOhms] = useState<number>(350);
  const [loadType, setLoadType] = useState<'voltage' | 'current'>('voltage');
  const [loadVal, setLoadVal] = useState<number>(9);

  const device = Math.round(Math.min(3, Math.max(0, parameters.device ?? 0)));
  const Vcc = parameters.Vcc ?? 9;
  const Rl = Math.max(50, parameters.Rl ?? 330);
  const Ib_uA = parameters.Ib_uA ?? 30;

  // Solve Q-point mathematically
  const solveQPoint = () => {
    if (device === 0) {
      // Diode: Vf = 0.7V
      const vf = 0.7;
      if (Vcc <= vf) return { vq: Vcc, iqMa: 0, region: 'Ngắt dẫn (V < 0.7V)' };
      const iq = ((Vcc - vf) / Rl) * 1000;
      return { vq: vf + iq * 0.002, iqMa: iq, region: 'Dẫn thuận (≈0.7V)' };
    }
    if (device === 1) {
      // Zener 5.1V in reverse bias mode (Vcc plotted as reverse voltage applied across Zener+RL)
      const vz = 5.1;
      if (Vcc < vz) return { vq: -Vcc, iqMa: 0, region: 'Chặn ngược (V < 5.1V)' };
      const iz = ((Vcc - vz) / Rl) * 1000;
      return { vq: -vz - iz * 0.004, iqMa: -iz, region: '● Ổn áp Zener (Vz=5.1V)' };
    }
    if (device === 2) {
      // LED (2.0V threshold)
      const vled = 2.0;
      if (Vcc <= vled) return { vq: Vcc, iqMa: 0, region: 'Chưa đạt ngưỡng sáng (2.0V)' };
      const iled = ((Vcc - vled) / Rl) * 1000;
      return { vq: vled + iled * 0.005, iqMa: iled, region: '● Phát sáng thuận' };
    }
    // BJT NPN (beta = 150, Vce_sat = 0.2V)
    const beta = 150;
    const icTargetMa = (Ib_uA / 1000) * beta;
    const icMaxMa = (Vcc / Rl) * 1000;
    if (Ib_uA <= 0.5) {
      return { vq: Vcc, iqMa: 0, region: '✖ Ngắt (Cut-off)' };
    }
    if (icTargetMa >= (Vcc - 0.2) / (Rl / 1000)) {
      const iq = ((Vcc - 0.2) / Rl) * 1000;
      return { vq: 0.2, iqMa: iq, region: '▲ Bão hòa (Vce ≈ 0.2V)' };
    }
    const vce = Vcc - (icTargetMa / 1000) * Rl;
    return { vq: vce, iqMa: Math.min(icTargetMa, icMaxMa), region: '● Khuếch đại tuyến tính' };
  };

  const qPoint = solveQPoint();

  // Resistor decoder calc
  const d1 = RESISTOR_COLORS[b1]?.digit ?? 1;
  const d2 = RESISTOR_COLORS[b2]?.digit ?? 0;
  const mult = RESISTOR_COLORS[bMult]?.mult ?? 100;
  const tol = RESISTOR_COLORS[bTol]?.tol ?? '±5%';
  const decodedOhms = (d1 * 10 + d2) * mult;

  const e12Analysis = useMemo(() => {
    const target = Math.max(1, targetOhms);
    let nearest = E12_VALUES[0];
    let minDiff = Math.abs(E12_VALUES[0] - target);
    for (const v of E12_VALUES) {
      const d = Math.abs(v - target);
      if (d < minDiff) {
        minDiff = d;
        nearest = v;
      }
    }

    // Best 2-resistor series & parallel pairs from relevant range
    const candidates = E12_VALUES.filter((v) => v >= target * 0.02 && v <= target * 50);
    let bestSeries = { r1: nearest, r2: 0, total: nearest, errPct: ((nearest - target) / target) * 100 };
    let bestSeriesDiff = Infinity;
    let bestParallel = { r1: nearest, r2: nearest, total: nearest / 2, errPct: 100 };
    let bestParallelDiff = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i; j < candidates.length; j++) {
        const r1 = candidates[i];
        const r2 = candidates[j];
        const s = r1 + r2;
        const sDiff = Math.abs(s - target);
        if (sDiff < bestSeriesDiff) {
          bestSeriesDiff = sDiff;
          bestSeries = { r1, r2, total: s, errPct: ((s - target) / target) * 100 };
        }
        const p = (r1 * r2) / (r1 + r2);
        const pDiff = Math.abs(p - target);
        if (pDiff < bestParallelDiff) {
          bestParallelDiff = pDiff;
          bestParallel = { r1, r2, total: p, errPct: ((p - target) / target) * 100 };
        }
      }
    }

    const pActualW =
      loadType === 'voltage'
        ? (loadVal * loadVal) / target
        : Math.pow(loadVal / 1000, 2) * target;
    const pRequiredW = pActualW * 2;
    const ratings = [0.25, 0.5, 1, 2, 5, 10];
    const recWatt = ratings.find((w) => w >= pRequiredW) ?? null;

    return {
      nearest,
      nearestErrPct: ((nearest - target) / target) * 100,
      bestSeries,
      bestParallel,
      pActualW,
      pRequiredW,
      recWatt,
      bands: getResistorColorBands(nearest),
    };
  }, [targetOhms, loadType, loadVal]);

  const decodeCap = (code: string) => {
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 3) return 'Nhập đúng 3 chữ số (VD: 104)';
    const valPf = parseInt(clean.slice(0, 2), 10) * Math.pow(10, parseInt(clean[2], 10));
    if (valPf >= 1e6) return `${(valPf / 1e6).toFixed(2).replace(/\.00$/, '')} μF`;
    if (valPf >= 1000) return `${(valPf / 1000).toFixed(2).replace(/\.00$/, '')} nF (${(valPf / 1e6).toFixed(4)} μF)`;
    return `${valPf} pF`;
  };

  useEffect(() => {
    if (onSimulationStats) {
      const names = ['Diode 1N4007', 'Zener 5.1V', 'LED 5mm', 'BJT NPN'];
      onSimulationStats({
        'Linh kiện': names[device],
        'Điểm Q (V, I)': `${qPoint.vq.toFixed(2)}V · ${Math.abs(qPoint.iqMa).toFixed(1)}mA`,
        'Vùng làm việc': qPoint.region.replace(/^[●▲✖]\s*/, ''),
        'Điện trở giải mã': `${formatOhms(decodedOhms)} ${tol}`,
      });
    }
  }, [device, qPoint.vq, qPoint.iqMa, qPoint.region, decodedOhms, tol, onSimulationStats]);

  useEffect(() => {
    if (subMode !== 'iv') return;
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

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, width, height);

    const padL = 56;
    const padR = 28;
    const padT = 28;
    const padB = 38;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Subtle grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const x = padL + (i * plotW) / 8;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
    }
    for (let j = 0; j <= 6; j++) {
      const y = padT + (j * plotH) / 6;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }

    if (device === 1) {
      // Zener 4-quadrant axes (-8V to +2V, -50mA to +50mA)
      const vMin = -8;
      const vMax = 2;
      const iMax = 50;
      const toX = (v: number) => padL + ((v - vMin) / (vMax - vMin)) * plotW;
      const toY = (iMa: number) => padT + plotH / 2 - (iMa / iMax) * (plotH / 2);

      // Zero axes
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padL, toY(0));
      ctx.lineTo(padL + plotW, toY(0));
      ctx.moveTo(toX(0), padT);
      ctx.lineTo(toX(0), padT + plotH);
      ctx.stroke();

      // Zener I-V Curve
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let v = vMin; v <= vMax; v += 0.05) {
        let i = 0;
        if (v >= 0.65) i = Math.min(iMax, (v - 0.65) * 90);
        else if (v <= -5.1) i = Math.max(-iMax, (v + 5.1) * 95);
        const px = toX(v);
        const py = toY(i);
        if (v === vMin) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Reverse DC Load Line from -Vcc to I = -Vcc/RL
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(toX(-Vcc), toY(0));
      ctx.lineTo(toX(0), toY(-Math.min(iMax, (Vcc / Rl) * 1000)));
      ctx.stroke();
      ctx.setLineDash([]);

      // Q-point
      const qx = toX(Math.max(vMin, qPoint.vq));
      const qy = toY(Math.max(-iMax, Math.min(iMax, qPoint.iqMa)));
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(qx, qy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('-Vz = -5.1V', toX(-5.1) - 24, toY(0) - 8);
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`Q (${qPoint.vq.toFixed(1)}V, ${qPoint.iqMa.toFixed(1)}mA)`, Math.min(qx + 10, width - 130), qy - 8);
    } else if (device === 3) {
      // BJT Collector Characteristic Curves Ic(mA) vs Vce(V)
      const vMax = 16;
      const iMax = 20; // mA
      const toX = (v: number) => padL + (v / vMax) * plotW;
      const toY = (iMa: number) => padT + plotH - (iMa / iMax) * plotH;

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT + plotH);
      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();

      // Family of curves for IB = 20, 40, 60, 80 uA
      const ibList = [20, 40, 60, 80];
      ibList.forEach((ib) => {
        const icSat = (ib / 1000) * 150;
        const isCurrent = Math.abs(ib - Ib_uA) < 8;
        ctx.strokeStyle = isCurrent ? '#38bdf8' : 'rgba(56, 189, 248, 0.32)';
        ctx.lineWidth = isCurrent ? 2.4 : 1.3;
        ctx.beginPath();
        for (let vce = 0; vce <= vMax; vce += 0.2) {
          const ic = icSat * (1 - Math.exp(-vce / 0.35)) * (1 + vce * 0.012);
          const px = toX(vce);
          const py = toY(Math.min(iMax, ic));
          if (vce === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = isCurrent ? '#bae6fd' : '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`IB=${ib}μA`, toX(vMax - 3.2), toY(Math.min(iMax - 1, icSat * 1.15)) - 4);
      });

      // Active IB curve if distinct
      const icActive = (Ib_uA / 1000) * 150;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let vce = 0; vce <= vMax; vce += 0.2) {
        const ic = icActive * (1 - Math.exp(-vce / 0.35)) * (1 + vce * 0.012);
        const px = toX(vce);
        const py = toY(Math.min(iMax, ic));
        if (vce === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // DC Load line
      const icTop = (Vcc / Rl) * 1000;
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(Math.min(iMax, icTop)));
      ctx.lineTo(toX(Math.min(vMax, Vcc)), toY(0));
      ctx.stroke();
      ctx.setLineDash([]);

      // Q-point
      const qx = toX(Math.min(vMax, qPoint.vq));
      const qy = toY(Math.min(iMax, qPoint.iqMa));
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(qx, qy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(`Q (${qPoint.vq.toFixed(1)}V, ${qPoint.iqMa.toFixed(1)}mA)`, Math.min(qx + 10, width - 140), Math.max(padT + 14, qy - 10));
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('V_CE (V) →', padL + plotW - 60, padT + plotH + 20);
      ctx.fillText('I_C (mA)', 8, padT + 10);
    } else {
      // Forward Diode / LED I-V Curve (0 to 16V, 0 to 50mA)
      const vMax = 16;
      const iMax = 50;
      const vThreshold = device === 0 ? 0.7 : 2.0;
      const toX = (v: number) => padL + (v / vMax) * plotW;
      const toY = (iMa: number) => padT + plotH - (iMa / iMax) * plotH;

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT + plotH);
      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();

      // Forward curve
      ctx.strokeStyle = device === 0 ? '#38bdf8' : '#f43f5e';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let v = 0; v <= 3.5; v += 0.03) {
        const i = v < vThreshold ? 0.2 * Math.exp(v * 0.5) : (v - vThreshold) * 140;
        const px = toX(v);
        const py = toY(Math.min(iMax, i));
        if (v === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // DC Load Line
      const iTop = (Vcc / Rl) * 1000;
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(Math.min(iMax, iTop)));
      ctx.lineTo(toX(Math.min(vMax, Vcc)), toY(0));
      ctx.stroke();
      ctx.setLineDash([]);

      // Q-point
      const qx = toX(Math.min(vMax, qPoint.vq));
      const qy = toY(Math.min(iMax, qPoint.iqMa));
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(qx, qy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(`Q (${qPoint.vq.toFixed(2)}V, ${qPoint.iqMa.toFixed(1)}mA)`, qx + 10, Math.max(padT + 14, qy - 8));
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`Ngưỡng Vf ≈ ${vThreshold}V`, toX(vThreshold) + 6, padT + plotH - 8);
      ctx.fillText('V_D (V) →', padL + plotW - 56, padT + plotH + 20);
      ctx.fillText('I_D (mA)', 8, padT + 10);
    }
  }, [subMode, device, Vcc, Rl, Ib_uA, qPoint.vq, qPoint.iqMa]);

  const pinoutInfo = PINOUT_PRESETS.find((p) => p.id === selectedPinout) || PINOUT_PRESETS[0];

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSubMode('iv')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subMode === 'iv' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 inline mr-1" />
            Đặc tuyến I–V & Điểm Q
          </button>
          <button
            type="button"
            onClick={() => setSubMode('decoder')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subMode === 'decoder' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 inline mr-1" />
            Vạch màu, Mã tụ & Pinout
          </button>
          <button
            type="button"
            onClick={() => setSubMode('e12')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subMode === 'e12' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 inline mr-1" />
            Trở chuẩn E12 & Công suất
          </button>
        </div>

        {subMode === 'iv' && (
          <div className="flex items-center gap-1">
            {[
              { id: 0, label: 'Diode' },
              { id: 1, label: 'Zener' },
              { id: 2, label: 'LED' },
              { id: 3, label: 'BJT' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onParametersBatchChange?.({ device: d.id })}
                className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  device === d.id
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {subMode === 'iv' ? (
        <div className="relative flex-1 min-h-[290px] bg-slate-950">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono tabular-nums space-y-0.5 pointer-events-none">
            <div className="text-slate-400 text-[10px]">Trạng thái điểm làm việc Q</div>
            <div className="text-emerald-400 font-semibold">{qPoint.region}</div>
            <div className="text-slate-300 text-[11px]">
              Đường tải: Vcc={Vcc}V · RL={Rl}Ω
            </div>
          </div>
        </div>
      ) : subMode === 'decoder' ? (
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resistor 4-band Decoder */}
          <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Giải mã Vạch màu Điện trở (4 vạch)</span>
              <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
                {formatOhms(decodedOhms)} {tol}
              </span>
            </div>

            {/* Realistic Axial Resistor SVG */}
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-center justify-center">
              <svg viewBox="0 0 260 64" className="w-full max-w-[240px] h-14">
                <line x1="8" y1="32" x2="252" y2="32" stroke="#94a3b8" strokeWidth="4" />
                <rect x="46" y="14" width="168" height="36" rx="12" fill="#d6b484" stroke="#a68353" strokeWidth="1.5" />
                <rect x="72" y="14" width="14" height="36" fill={RESISTOR_COLORS[b1]?.hex} />
                <rect x="102" y="14" width="14" height="36" fill={RESISTOR_COLORS[b2]?.hex} />
                <rect x="132" y="14" width="14" height="36" fill={RESISTOR_COLORS[bMult]?.hex} />
                <rect x="178" y="14" width="14" height="36" fill={RESISTOR_COLORS[bTol]?.hex} />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Vạch 1 (Chục)</span>
                <select
                  value={b1}
                  onChange={(e) => setB1(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  {RESISTOR_COLORS.map((c, idx) =>
                    c.digit !== null && idx > 0 ? (
                      <option key={c.name} value={idx}>
                        {c.name} ({c.digit})
                      </option>
                    ) : null
                  )}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Vạch 2 (Đơn vị)</span>
                <select
                  value={b2}
                  onChange={(e) => setB2(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  {RESISTOR_COLORS.map((c, idx) =>
                    c.digit !== null ? (
                      <option key={c.name} value={idx}>
                        {c.name} ({c.digit})
                      </option>
                    ) : null
                  )}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Vạch 3 (Hệ số nhân)</span>
                <select
                  value={bMult}
                  onChange={(e) => setBMult(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  {RESISTOR_COLORS.map((c, idx) =>
                    c.mult !== null ? (
                      <option key={c.name} value={idx}>
                        {c.name} (×{c.mult})
                      </option>
                    ) : null
                  )}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Vạch 4 (Sai số)</span>
                <select
                  value={bTol}
                  onChange={(e) => setBTol(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  {RESISTOR_COLORS.map((c, idx) =>
                    c.tol !== null ? (
                      <option key={c.name} value={idx}>
                        {c.name} ({c.tol})
                      </option>
                    ) : null
                  )}
                </select>
              </label>
            </div>
          </div>

          {/* Capacitor Code & Real Component Pinout */}
          <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-900/60 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Đọc mã Tụ gốm (3 số)</span>
                <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">{decodeCap(capCode)}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={3}
                  value={capCode}
                  onChange={(e) => setCapCode(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-white"
                  placeholder="104"
                />
                <div className="flex gap-1">
                  {['104', '473', '222', '102'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCapCode(code)}
                      className={`px-2 py-1 text-[11px] font-mono rounded border ${
                        capCode === code
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-200">Tra nhanh Sơ đồ chân (Pinout)</div>
              <div className="flex flex-wrap gap-1">
                {PINOUT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPinout(p.id)}
                    className={`px-2 py-1 text-[11px] rounded border whitespace-nowrap ${
                      selectedPinout === p.id
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {p.name.split(' ')[1] || p.name}
                  </button>
                ))}
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1">
                <div className="font-semibold text-white">
                  {pinoutInfo.name} <span className="text-slate-400 font-normal">· {pinoutInfo.package}</span>
                </div>
                <div className="flex flex-wrap gap-3 font-mono text-[11px] text-emerald-400">
                  {pinoutInfo.pins.map((pin) => (
                    <span key={pin}>{pin}</span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-0.5">{pinoutInfo.note}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Inputs & Wattage Calculator */}
          <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-900/60 space-y-3">
            <div className="text-xs font-bold text-slate-200">Thông số thiết kế & Công suất tiêu tán</div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 block">Giá trị điện trở mục tiêu (Ω)</label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={targetOhms}
                  onChange={(e) => setTargetOhms(Math.max(1, Number(e.target.value) || 1))}
                  className="w-28 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
                />
                {[150, 350, 1400, 4200].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTargetOhms(v)}
                    className={`px-2 py-1 text-[11px] font-mono rounded border whitespace-nowrap ${
                      targetOhms === v
                        ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {formatOhms(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoadType('voltage');
                    setLoadVal(9);
                  }}
                  className={`px-2 py-1 text-[11px] rounded border whitespace-nowrap ${
                    loadType === 'voltage'
                      ? 'bg-sky-500/20 border-sky-500/60 text-sky-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Biết Điện áp V_R (V)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoadType('current');
                    setLoadVal(25);
                  }}
                  className={`px-2 py-1 text-[11px] rounded border whitespace-nowrap ${
                    loadType === 'current'
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Biết Dòng điện I_R (mA)
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                <input
                  type="number"
                  min={0.1}
                  step={loadType === 'voltage' ? 0.5 : 5}
                  value={loadVal}
                  onChange={(e) => setLoadVal(Math.max(0.1, Number(e.target.value) || 0.1))}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white"
                />
                <span className="text-slate-400">{loadType === 'voltage' ? 'V trên hai đầu trở' : 'mA chạy qua trở'}</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 font-mono tabular-nums text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Công suất thực tế (P = {loadType === 'voltage' ? 'V²/R' : 'I²R'}):</span>
                <span className="text-amber-300 font-bold">
                  {e12Analysis.pActualW >= 1 ? `${e12Analysis.pActualW.toFixed(2)} W` : `${(e12Analysis.pActualW * 1000).toFixed(1)} mW`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngưỡng an toàn (×2 hệ số):</span>
                <span className="text-slate-200">{e12Analysis.pRequiredW.toFixed(2)} W</span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Khuyến nghị mua trở:</span>
                <span
                  className={`font-bold ${
                    e12Analysis.recWatt === null
                      ? 'text-rose-400'
                      : e12Analysis.recWatt <= 0.25
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {e12Analysis.recWatt === null
                    ? '✖ Quá 10W (cần trở công suất đặc biệt)'
                    : e12Analysis.recWatt <= 0.25
                    ? '● Trở thường 1/4W (0.25W)'
                    : `▲ Trở công suất ${e12Analysis.recWatt}W`}
                </span>
              </div>
            </div>
          </div>

          {/* Right: E12 Nearest & 2-Resistor Series/Parallel Combos */}
          <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Giá trị chuẩn E12 & Ghép 2 điện trở</span>
              <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                Chuẩn gần nhất: {formatOhms(e12Analysis.nearest)}
              </span>
            </div>

            <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between gap-3">
              <svg viewBox="0 0 220 52" className="w-40 h-11 shrink-0">
                <line x1="6" y1="26" x2="214" y2="26" stroke="#94a3b8" strokeWidth="3.5" />
                <rect x="36" y="10" width="148" height="32" rx="10" fill="#d6b484" stroke="#a68353" strokeWidth="1.5" />
                <rect x="60" y="10" width="12" height="32" fill={e12Analysis.bands[0]} />
                <rect x="86" y="10" width="12" height="32" fill={e12Analysis.bands[1]} />
                <rect x="112" y="10" width="12" height="32" fill={e12Analysis.bands[2]} />
                <rect x="150" y="10" width="12" height="32" fill={e12Analysis.bands[3]} />
              </svg>
              <div className="text-right font-mono tabular-nums text-xs">
                <div className="text-slate-200 font-bold">{formatOhms(e12Analysis.nearest)}</div>
                <div className="text-[11px] text-slate-400">
                  Sai số: {e12Analysis.nearestErrPct >= 0 ? '+' : ''}
                  {e12Analysis.nearestErrPct.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="space-y-2 font-mono tabular-nums text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-sky-300 font-semibold">
                  <span>Ghép Nối tiếp (R1 + R2)</span>
                  <span>
                    {formatOhms(e12Analysis.bestSeries.total)} (
                    {e12Analysis.bestSeries.errPct >= 0 ? '+' : ''}
                    {e12Analysis.bestSeries.errPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {formatOhms(e12Analysis.bestSeries.r1)} + {formatOhms(e12Analysis.bestSeries.r2)}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-emerald-300 font-semibold">
                  <span>Ghép Song song (R1 ∥ R2)</span>
                  <span>
                    {formatOhms(e12Analysis.bestParallel.total)} (
                    {e12Analysis.bestParallel.errPct >= 0 ? '+' : ''}
                    {e12Analysis.bestParallel.errPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {formatOhms(e12Analysis.bestParallel.r1)} ∥ {formatOhms(e12Analysis.bestParallel.r2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
