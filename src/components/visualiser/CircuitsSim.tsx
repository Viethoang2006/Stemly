import React, { useEffect, useRef, useState } from 'react';
import { Zap, AlertTriangle, CheckCircle2, Gauge, ToggleLeft, ToggleRight, SlidersHorizontal } from 'lucide-react';

interface CircuitsSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
}

type ProbeTarget = 'source' | 'r1' | 'r2' | 'switch' | 'total';

const E12_SERIES = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

function nearestE12(val: number): string {
  if (val <= 0) return '1 Ω';
  const exp = Math.floor(Math.log10(val));
  const norm = val / Math.pow(10, exp);
  let best = E12_SERIES[0];
  let minDiff = Math.abs(norm - best);
  for (const s of E12_SERIES) {
    const diff = Math.abs(norm - s);
    if (diff < minDiff) {
      minDiff = diff;
      best = s;
    }
  }
  const res = best * Math.pow(10, exp);
  return res >= 1000 ? `${(res / 1000).toFixed(1)} kΩ` : `${Math.round(res)} Ω`;
}

export const CircuitsSim: React.FC<CircuitsSimProps> = ({
  parameters,
  onSimulationStats,
  onParametersBatchChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [probe, setProbe] = useState<ProbeTarget>('r2');
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [potWiper, setPotWiper] = useState<number>(0.55);
  const [isDraggingWiper, setIsDraggingWiper] = useState<boolean>(false);

  const topology = Math.round(Math.min(3, Math.max(0, parameters.topology ?? 1)));
  const V = parameters.V ?? 12;
  const R1 = Math.max(1, parameters.R ?? 100);
  const R2 = Math.max(1, parameters.R2 ?? 220);

  // Potentiometer split resistances when topology === 3
  const RpotTotal = R1 + R2;
  const RpotTop = Math.max(1, RpotTotal * (1 - potWiper));
  const RpotBot = Math.max(1, RpotTotal * potWiper);

  // Circuit math per topology (respecting switchClosed!)
  let Req = R1;
  let Itotal = switchClosed ? V / R1 : 0;
  let I1 = Itotal;
  let I2 = 0;
  let V1 = switchClosed ? V : 0;
  let V2 = 0;
  let P1 = V1 * I1;
  let P2 = 0;

  if (topology === 1) {
    // Series / Voltage divider
    Req = R1 + R2;
    Itotal = switchClosed ? V / Req : 0;
    I1 = Itotal;
    I2 = Itotal;
    V1 = Itotal * R1;
    V2 = Itotal * R2; // Vout across R2
    P1 = V1 * I1;
    P2 = V2 * I2;
  } else if (topology === 2) {
    // Parallel / Current divider
    Req = (R1 * R2) / (R1 + R2);
    Itotal = switchClosed ? V / Req : 0;
    I1 = switchClosed ? V / R1 : 0;
    I2 = switchClosed ? V / R2 : 0;
    V1 = switchClosed ? V : 0;
    V2 = switchClosed ? V : 0;
    P1 = V1 * I1;
    P2 = V2 * I2;
  } else if (topology === 3) {
    // 3-terminal Potentiometer (RV = R1 + R2)
    Req = RpotTotal;
    Itotal = switchClosed ? V / Req : 0;
    I1 = Itotal;
    I2 = Itotal;
    V1 = Itotal * RpotTop;
    V2 = Itotal * RpotBot; // Vout from wiper W to GND
    P1 = V1 * I1;
    P2 = V2 * I2;
  }

  const Ptotal = switchClosed ? V * Itotal : 0;
  const isR1Overload = switchClosed && P1 > 0.25;
  const isR2Overload = switchClosed && topology > 0 && P2 > 0.25;
  const hasOverload = isR1Overload || isR2Overload;

  // VOM probe reading
  const getProbeReading = () => {
    if (probe === 'source') {
      return {
        label: 'Nguồn V_in',
        volts: `${V.toFixed(2)} V`,
        amps: `${(Itotal * 1000).toFixed(1)} mA`,
      };
    }
    if (probe === 'switch') {
      return {
        label: switchClosed ? 'Công tắc K (ĐÓNG)' : 'Công tắc K (HỞ MẠCH)',
        volts: switchClosed ? '0.00 V' : `${V.toFixed(2)} V`,
        amps: `${(Itotal * 1000).toFixed(1)} mA`,
      };
    }
    if (probe === 'r1') {
      return {
        label: topology === 3 ? `Biến trở trên R_A (${Math.round((1 - potWiper) * 100)}%)` : 'Sụt áp qua R1',
        volts: `${V1.toFixed(2)} V`,
        amps: `${(I1 * 1000).toFixed(1)} mA`,
      };
    }
    if (probe === 'r2') {
      if (topology === 0) {
        return { label: 'Qua tải R1', volts: `${V1.toFixed(2)} V`, amps: `${(I1 * 1000).toFixed(1)} mA` };
      }
      if (topology === 3) {
        return {
          label: `Ngõ ra Wiper V_out (${Math.round(potWiper * 100)}%)`,
          volts: `${V2.toFixed(2)} V`,
          amps: `${(I2 * 1000).toFixed(1)} mA`,
        };
      }
      return {
        label: topology === 1 ? 'Ngõ ra V_out (R2)' : 'Nhánh R2',
        volts: `${V2.toFixed(2)} V`,
        amps: `${(I2 * 1000).toFixed(1)} mA`,
      };
    }
    return {
      label: 'Tổng trở & Công suất',
      volts: `${Req.toFixed(1)} Ω`,
      amps: `${Ptotal.toFixed(2)} W`,
    };
  };

  const probeReadout = getProbeReading();

  // Hitboxes stored for direct canvas clicking (Switch K + Potentiometer Wiper track)
  const hitRegionsRef = useRef<{
    swX: number;
    swY: number;
    potX: number;
    potTop: number;
    potBottom: number;
  }>({ swX: 200, swY: 54, potX: 400, potTop: 80, potBottom: 240 });

  useEffect(() => {
    if (onSimulationStats) {
      const kLabel = switchClosed ? 'ĐÓNG' : 'MỞ (0 mA)';
      if (topology === 0) {
        onSimulationStats({
          'Công tắc K': kLabel,
          'Dòng điện (I)': `${(Itotal * 1000).toFixed(1)} mA`,
          'Công suất tải (P)': `${Ptotal.toFixed(2)} W`,
          'Trạng thái 0.25W': isR1Overload ? 'Quá tải nhiệt' : 'An toàn',
        });
      } else if (topology === 1) {
        onSimulationStats({
          'Công tắc K': kLabel,
          'Điện áp ra V_out (R2)': `${V2.toFixed(2)} V`,
          'Dòng mạch chính (I)': `${(Itotal * 1000).toFixed(1)} mA`,
          'Trạng thái trở 0.25W': hasOverload ? 'Quá công suất!' : 'An toàn',
        });
      } else if (topology === 2) {
        onSimulationStats({
          'Công tắc K': kLabel,
          'Tổng trở (R_tđ)': `${Req.toFixed(1)} Ω`,
          'Dòng tổng (I)': `${(Itotal * 1000).toFixed(1)} mA`,
          'Dòng nhánh I1 / I2': `${(I1 * 1000).toFixed(0)} / ${(I2 * 1000).toFixed(0)} mA`,
        });
      } else {
        onSimulationStats({
          'Công tắc K': kLabel,
          'Biến trở RV (Con trượt)': `${RpotTotal} Ω (${Math.round(potWiper * 100)}%)`,
          'Điện áp ra V_out (W)': `${V2.toFixed(2)} V`,
          'Dòng mạch (I)': `${(Itotal * 1000).toFixed(1)} mA`,
        });
      }
    }
  }, [
    topology,
    switchClosed,
    potWiper,
    RpotTotal,
    V,
    R1,
    R2,
    Itotal,
    I1,
    I2,
    V1,
    V2,
    Ptotal,
    Req,
    isR1Overload,
    hasOverload,
    onSimulationStats,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offsetMain = 0;
    let offsetB1 = 0;
    let offsetB2 = 0;

    const drawSwitch = (sx: number, sy: number, closed: boolean, highlight: boolean) => {
      ctx.save();
      // Clear wire segment behind knife switch
      ctx.fillStyle = '#070b14';
      ctx.fillRect(sx - 28, sy - 20, 56, 36);

      // Terminals
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(sx - 20, sy, 4.5, 0, Math.PI * 2);
      ctx.arc(sx + 20, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Switch Blade
      ctx.strokeStyle = highlight ? '#fbbf24' : closed ? '#34d399' : '#f87171';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - 20, sy);
      if (closed) {
        ctx.lineTo(sx + 20, sy);
      } else {
        ctx.lineTo(sx + 13, sy - 20);
      }
      ctx.stroke();

      // Insulated red handle knob
      ctx.fillStyle = closed ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(closed ? sx + 10 : sx + 6, closed ? sy - 4 : sy - 16, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = closed ? '#6ee7b7' : '#fca5a5';
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`K (${closed ? 'ĐÓNG' : 'MỞ'})`, sx, sy + 18);
      ctx.restore();
    };

    const drawResistor = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      label: string,
      subLabel: string,
      highlight: boolean,
      overload: boolean
    ) => {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);

      ctx.save();
      ctx.strokeStyle = overload ? '#f43f5e' : highlight ? '#fbbf24' : '#818cf8';
      ctx.lineWidth = highlight ? 3.5 : 2.5;

      if (horizontal) {
        const w = 64;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(mx - w / 2 - 4, my - 14, w + 8, 28);
        ctx.beginPath();
        ctx.moveTo(mx - w / 2, my);
        for (let i = 0; i < 6; i++) {
          const zx = mx - w / 2 + ((i + 0.5) * w) / 6;
          const zy = i % 2 === 0 ? my - 9 : my + 9;
          ctx.lineTo(zx, zy);
        }
        ctx.lineTo(mx + w / 2, my);
        ctx.stroke();

        ctx.fillStyle = overload ? '#fda4af' : '#e2e8f0';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, mx, my - 18);
        ctx.fillStyle = overload ? '#f43f5e' : '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(subLabel, mx, my + 24);
      } else {
        const h = 58;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(mx - 14, my - h / 2 - 4, 28, h + 8);
        ctx.beginPath();
        ctx.moveTo(mx, my - h / 2);
        for (let i = 0; i < 6; i++) {
          const zy = my - h / 2 + ((i + 0.5) * h) / 6;
          const zx = i % 2 === 0 ? mx - 9 : mx + 9;
          ctx.lineTo(zx, zy);
        }
        ctx.lineTo(mx, my + h / 2);
        ctx.stroke();

        ctx.fillStyle = overload ? '#fda4af' : '#e2e8f0';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, mx + 16, my - 2);
        ctx.fillStyle = overload ? '#f43f5e' : '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(subLabel, mx + 16, my + 12);
      }
      ctx.restore();
    };

    const drawDotsAlongPath = (pts: { x: number; y: number }[], offset: number, count: number, color: string) => {
      if (!switchClosed) return;
      const segs: { x1: number; y1: number; x2: number; y2: number; len: number }[] = [];
      let totalLen = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1].x - pts[i].x;
        const dy = pts[i + 1].y - pts[i].y;
        const len = Math.hypot(dx, dy);
        segs.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y, len });
        totalLen += len;
      }
      if (totalLen <= 0) return;

      for (let i = 0; i < count; i++) {
        let d = (((offset + (i * totalLen) / count) % totalLen) + totalLen) % totalLen;
        for (const s of segs) {
          if (d <= s.len) {
            const t = d / s.len;
            const px = s.x1 + (s.x2 - s.x1) * t;
            const py = s.y1 + (s.y2 - s.y1) * t;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          d -= s.len;
        }
      }
    };

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

      // Subtle engineering grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      for (let gx = 20; gx < width; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 20; gy < height; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      const left = Math.max(70, width * 0.16);
      const right = Math.min(width - 115, width * 0.78);
      const top = 54;
      const bottom = height - 48;
      const midX = (left + right) / 2;
      const midY = (top + bottom) / 2;

      const swX = topology === 0 ? left + (right - left) * 0.25 : left + (midX - left) * 0.55;
      const swY = top;
      hitRegionsRef.current = {
        swX,
        swY,
        potX: right,
        potTop: top + 34,
        potBottom: bottom - 34,
      };

      const speedMain = switchClosed ? Math.min(4.5, Math.max(0.4, Itotal * 18)) : 0;
      const speed1 = switchClosed ? Math.min(4.5, Math.max(0.4, I1 * 18)) : 0;
      const speed2 = switchClosed ? Math.min(4.5, Math.max(0.4, I2 * 18)) : 0;
      offsetMain += speedMain;
      offsetB1 += speed1;
      offsetB2 += speed2;

      if (topology === 0) {
        ctx.strokeStyle = switchClosed ? '#475569' : '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(left, top, right - left, bottom - top, 10);
        ctx.stroke();

        const loopPts = [
          { x: left, y: bottom },
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
        drawDotsAlongPath(loopPts, offsetMain, 24, '#38bdf8');
        drawSwitch(swX, swY, switchClosed, probe === 'switch');
        drawResistor(
          midX + 20,
          top,
          right,
          top,
          `R1 = ${R1} Ω`,
          `${P1.toFixed(2)}W`,
          probe === 'r1' || probe === 'r2',
          isR1Overload
        );

        // Indicator Lamp on right leg
        if (switchClosed) {
          const glowR = Math.min(42, 12 + Math.sqrt(Ptotal) * 7);
          const g = ctx.createRadialGradient(right, midY, 2, right, midY, glowR);
          g.addColorStop(0, 'rgba(253, 224, 71, 0.75)');
          g.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(right, midY, glowR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#070b14';
        ctx.strokeStyle = switchClosed ? '#facc15' : '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(right, midY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (topology === 1) {
        ctx.strokeStyle = switchClosed ? '#475569' : '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left, bottom);
        ctx.lineTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.stroke();

        ctx.strokeStyle = probe === 'r2' ? '#fbbf24' : '#64748b';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(right, midY);
        ctx.lineTo(right + 50, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(right, midY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Vout = ${V2.toFixed(2)}V`, right + 8, midY - 8);

        const loopPts = [
          { x: left, y: bottom },
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
        drawDotsAlongPath(loopPts, offsetMain, 26, '#38bdf8');
        drawSwitch(swX, swY, switchClosed, probe === 'switch');
        drawResistor(right, top, right, midY, `R1 = ${R1}Ω`, `-${V1.toFixed(1)}V · ${P1.toFixed(2)}W`, probe === 'r1', isR1Overload);
        drawResistor(right, midY, right, bottom, `R2 = ${R2}Ω`, `-${V2.toFixed(1)}V · ${P2.toFixed(2)}W`, probe === 'r2', isR2Overload);
      } else if (topology === 2) {
        ctx.strokeStyle = switchClosed ? '#475569' : '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left, bottom);
        ctx.lineTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.moveTo(midX, top);
        ctx.lineTo(midX, bottom);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        [
          { x: midX, y: top },
          { x: midX, y: bottom },
        ].forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        drawDotsAlongPath(
          [
            { x: left, y: bottom },
            { x: left, y: top },
            { x: midX, y: top },
          ],
          offsetMain,
          10,
          '#38bdf8'
        );
        drawDotsAlongPath(
          [
            { x: midX, y: top },
            { x: midX, y: bottom },
          ],
          offsetB1,
          7,
          '#818cf8'
        );
        drawDotsAlongPath(
          [
            { x: midX, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
            { x: midX, y: bottom },
          ],
          offsetB2,
          14,
          '#34d399'
        );
        drawDotsAlongPath(
          [
            { x: midX, y: bottom },
            { x: left, y: bottom },
          ],
          offsetMain,
          7,
          '#38bdf8'
        );

        drawSwitch(swX, swY, switchClosed, probe === 'switch');
        drawResistor(midX, top, midX, bottom, `R1=${R1}Ω`, `I1=${(I1 * 1000).toFixed(0)}mA`, probe === 'r1', isR1Overload);
        drawResistor(right, top, right, bottom, `R2=${R2}Ω`, `I2=${(I2 * 1000).toFixed(0)}mA`, probe === 'r2', isR2Overload);
      } else {
        // Topology 3: 3-Terminal Potentiometer RV + Switch K
        ctx.strokeStyle = switchClosed ? '#475569' : '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left, bottom);
        ctx.lineTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.stroke();

        const loopPts = [
          { x: left, y: bottom },
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
        drawDotsAlongPath(loopPts, offsetMain, 26, '#a78bfa');
        drawSwitch(swX, swY, switchClosed, probe === 'switch');

        // Draw vertical Potentiometer track
        const trackTop = top + 34;
        const trackBot = bottom - 34;
        const trackH = trackBot - trackTop;
        const wiperY = trackBot - potWiper * trackH;

        ctx.fillStyle = '#070b14';
        ctx.fillRect(right - 16, trackTop - 4, 32, trackH + 8);
        ctx.strokeStyle = probe === 'r1' || probe === 'r2' ? '#a78bfa' : '#818cf8';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(right, trackTop);
        const zigCount = 10;
        for (let i = 0; i < zigCount; i++) {
          const zy = trackTop + ((i + 0.5) * trackH) / zigCount;
          const zx = i % 2 === 0 ? right - 10 : right + 10;
          ctx.lineTo(zx, zy);
        }
        ctx.lineTo(right, trackBot);
        ctx.stroke();

        // Movable Wiper Arrow (W)
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(right + 56, wiperY);
        ctx.lineTo(right + 14, wiperY);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(right + 11, wiperY);
        ctx.lineTo(right + 21, wiperY - 6);
        ctx.lineTo(right + 21, wiperY + 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(right + 56, wiperY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde68a';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`W (${Math.round(potWiper * 100)}%)`, right + 64, wiperY - 6);
        ctx.fillStyle = '#34d399';
        ctx.fillText(`Vout = ${V2.toFixed(2)}V`, right + 64, wiperY + 10);

        ctx.fillStyle = '#c4b5fd';
        ctx.font = '600 10.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`RV = ${RpotTotal}Ω`, right - 18, trackTop + 12);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`R_A=${Math.round(RpotTop)}Ω`, right - 18, (trackTop + wiperY) / 2);
        ctx.fillText(`R_B=${Math.round(RpotBot)}Ω`, right - 18, (wiperY + trackBot) / 2);
      }

      // Draw DC Battery
      if (topology === 0) {
        const bx = midX;
        const by = bottom;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(bx - 22, by - 20, 44, 40);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(bx - 8, by - 16);
        ctx.lineTo(bx - 8, by + 16);
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(bx + 8, by - 9);
        ctx.lineTo(bx + 8, by + 9);
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${V}V DC`, bx, by + 30);
      } else {
        const bx = left;
        const by = midY;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(bx - 22, by - 22, 44, 44);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(bx - 16, by - 8);
        ctx.lineTo(bx + 16, by - 8);
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(bx - 9, by + 8);
        ctx.lineTo(bx + 9, by + 8);
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`+${V}V`, bx - 22, by - 4);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`I=${(Itotal * 1000).toFixed(0)}mA`, bx - 22, by + 14);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [topology, switchClosed, potWiper, RpotTotal, RpotTop, RpotBot, V, R1, R2, Itotal, I1, I2, V1, V2, P1, P2, Ptotal, probe, isR1Overload, isR2Overload]);

  const updateWiperFromPointer = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = clientY - rect.top;
    const { potTop, potBottom } = hitRegionsRef.current;
    const frac = (potBottom - y) / Math.max(10, potBottom - potTop);
    setPotWiper(Math.max(0.05, Math.min(0.95, Math.round(frac * 100) / 100)));
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      {/* Lab Top Instrument Bar */}
      <div className="px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
          {[
            { id: 0, label: 'Mạch đơn' },
            { id: 1, label: 'Phân áp nối tiếp' },
            { id: 2, label: 'Song song (KCL)' },
            { id: 3, label: 'Biến trở (Chiết áp)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onParametersBatchChange?.({ topology: item.id })}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                topology === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
          <button
            type="button"
            onClick={() => setSwitchClosed((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold transition-colors whitespace-nowrap ${
              switchClosed
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 border-rose-500/50 text-rose-300 hover:bg-rose-500/25'
            }`}
            title="Bấm để đóng hoặc ngắt Công tắc K"
          >
            {switchClosed ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            <span>Công tắc K: {switchClosed ? 'ĐÓNG' : 'MỞ'}</span>
          </button>

          {!switchClosed ? (
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 font-medium">
              <Zap className="w-3.5 h-3.5" />
              Mạch hở (0 mA)
            </span>
          ) : hasOverload ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-rose-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Quá tải 0.25W
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              An toàn 1/4W
            </span>
          )}
        </div>
      </div>

      {/* Main Stage */}
      <div className="relative flex-1 min-h-[290px] bg-slate-950">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-pointer"
          onPointerDown={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const { swX, swY, potX, potTop, potBottom } = hitRegionsRef.current;
            if (Math.hypot(px - swX, py - swY) <= 34) {
              setSwitchClosed((s) => !s);
              return;
            }
            if (topology === 3 && px >= potX - 30 && px <= potX + 75 && py >= potTop - 16 && py <= potBottom + 16) {
              setIsDraggingWiper(true);
              updateWiperFromPointer(e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (isDraggingWiper && topology === 3) {
              updateWiperFromPointer(e.clientY);
            }
          }}
          onPointerUp={() => setIsDraggingWiper(false)}
          onPointerLeave={() => setIsDraggingWiper(false)}
        />

        {/* Virtual VOM Multimeter Probe & Potentiometer Overlay */}
        <div className="absolute top-3 left-3 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 text-xs font-mono tabular-nums text-slate-200 shadow-lg max-w-[250px] space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Gauge className="w-3.5 h-3.5" /> Đồng hồ VOM ảo
            </span>
            <span className="text-[10px] text-slate-400">DC</span>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {[
              { id: 'source', label: 'Nguồn V' },
              { id: 'switch', label: 'Công tắc K' },
              { id: 'r1', label: topology === 3 ? 'Nhánh R_A' : 'Đo R1' },
              { id: 'r2', label: topology === 0 ? 'Đèn' : topology === 3 ? 'V_out (W)' : 'Đo R2' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProbe(p.id as ProbeTarget)}
                className={`px-2 py-1 text-[10px] rounded border transition-colors whitespace-nowrap ${
                  probe === p.id
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {topology === 3 && (
            <div className="bg-slate-950/90 border border-violet-500/40 rounded px-2 py-1.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-violet-300 font-sans font-semibold">
                <span className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" /> Con trượt Biến trở
                </span>
                <span className="font-mono">{Math.round(potWiper * 100)}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={Math.round(potWiper * 100)}
                onChange={(e) => setPotWiper(Number(e.target.value) / 100)}
                className="w-full accent-violet-500"
              />
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 space-y-0.5">
            <div className="text-[10px] text-slate-400">{probeReadout.label}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-emerald-400">{probeReadout.volts}</span>
              <span className="text-xs text-sky-400">{probeReadout.amps}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
            <span>Chuẩn E12:</span>
            <span className="text-slate-200">
              {nearestE12(R1)}
              {topology > 0 ? ` / ${nearestE12(R2)}` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
