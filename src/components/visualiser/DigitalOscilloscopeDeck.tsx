import React, { useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Crosshair,
  LineChart as LineChartIcon,
  Minus,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TraceSample } from './circuitSandboxCore';

interface DigitalOscilloscopeDeckProps {
  tracePoints: TraceSample[];
  focusLabel: string;
  vVomNow: number;
  vCompNow: number;
  iCompNow: number;
  isSimRunning: boolean;
  onClearTrace: () => void;
  scopeOpen: boolean;
  onToggleScopeOpen: () => void;
}

const TIME_DIV_OPTIONS = [0.05, 0.1, 0.2, 0.5, 1.0]; // seconds per div (10 divs across)
const VOLT_DIV_OPTIONS = [0.5, 1, 2, 5, 10]; // Volts per div (+/- 4 divs vertical)
const CURR_DIV_OPTIONS = [5, 10, 25, 50, 100]; // mA per div (+/- 4 divs vertical)

const DSO_W = 800; // 10 horizontal divs * 80px
const DSO_H = 240; // 8 vertical divs * 30px
const DIV_X = 80;
const DIV_Y = 30;

function formatTimeDiv(sec: number): string {
  if (sec < 1) return `${Math.round(sec * 1000)} ms/div`;
  return `${sec.toFixed(1).replace(/\.0$/, '')} s/div`;
}

function downsample<T>(arr: T[], maxPts: number): T[] {
  if (arr.length <= maxPts) return arr;
  const step = (arr.length - 1) / (maxPts - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPts; i++) {
    out.push(arr[Math.round(i * step)]);
  }
  return out;
}

export const DigitalOscilloscopeDeck: React.FC<DigitalOscilloscopeDeckProps> = ({
  tracePoints,
  focusLabel,
  vVomNow,
  vCompNow,
  iCompNow,
  isSimRunning,
  onClearTrace,
  scopeOpen,
  onToggleScopeOpen,
}) => {
  const [displayMode, setDisplayMode] = useState<'dso' | 'recharts'>('dso');
  const [timeDivIdx, setTimeDivIdx] = useState<number>(2); // 200 ms/div (2.0s window)
  const [voltDivIdx, setVoltDivIdx] = useState<number>(3); // 5 V/div (+/-20V)
  const [currDivIdx, setCurrDivIdx] = useState<number>(2); // 25 mA/div (+/-100mA)

  const [coupling, setCoupling] = useState<'DC' | 'AC'>('DC');
  const [triggerMode, setTriggerMode] = useState<'auto' | 'rising' | 'falling'>('auto');
  const [triggerSrc, setTriggerSrc] = useState<'ch1' | 'ch2'>('ch1');
  const [triggerLevel, setTriggerLevel] = useState<number>(0);

  const [showCh1, setShowCh1] = useState<boolean>(true);
  const [showCh2, setShowCh2] = useState<boolean>(true);
  const [showCh3, setShowCh3] = useState<boolean>(true);

  const [isHold, setIsHold] = useState<boolean>(false);
  const [frozenPoints, setFrozenPoints] = useState<TraceSample[]>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const timeDiv = TIME_DIV_OPTIONS[timeDivIdx];
  const voltDiv = VOLT_DIV_OPTIONS[voltDivIdx];
  const currDiv = CURR_DIV_OPTIONS[currDivIdx];
  const totalWindowSec = timeDiv * 10;

  const activeBuffer = isHold ? frozenPoints : tracePoints;

  const toggleHold = () => {
    if (!isHold) {
      setFrozenPoints(tracePoints);
      setIsHold(true);
    } else {
      setIsHold(false);
    }
  };

  // Extract window aligned with either Free-Run (latest) or Edge Trigger
  const { windowSamples, startTime, dcMean1, dcMean2, metrics } = useMemo(() => {
    if (activeBuffer.length < 2) {
      return {
        windowSamples: [] as TraceSample[],
        startTime: 0,
        dcMean1: 0,
        dcMean2: 0,
        metrics: { vpp: 0, vrms: 0, vavg: 0, vmax: 0, vmin: 0, freqHz: 0, imax: 0 },
      };
    }

    const latestT = activeBuffer[activeBuffer.length - 1].t;
    let tEnd = latestT;
    let tStart = Math.max(activeBuffer[0].t, latestT - totalWindowSec);

    // Edge trigger alignment: anchor trigger crossing near horizontal center (50% = div 5)
    if (triggerMode !== 'auto') {
      const halfWin = totalWindowSec * 0.5;
      const getSig = (s: TraceSample) => (triggerSrc === 'ch1' ? s.vCh1 : s.vCh2);
      // Search backward from (latestT - halfWin * 0.6) so post-trigger half has real data
      for (let i = activeBuffer.length - 2; i >= 1; i--) {
        if (latestT - activeBuffer[i].t < halfWin * 0.4) continue;
        if (latestT - activeBuffer[i].t > totalWindowSec * 1.4) break;
        const prev = getSig(activeBuffer[i - 1]);
        const curr = getSig(activeBuffer[i]);
        const hitRising = triggerMode === 'rising' && prev < triggerLevel && curr >= triggerLevel;
        const hitFalling = triggerMode === 'falling' && prev > triggerLevel && curr <= triggerLevel;
        if (hitRising || hitFalling) {
          tStart = activeBuffer[i].t - halfWin;
          tEnd = activeBuffer[i].t + halfWin;
          break;
        }
      }
    }

    const sliced = activeBuffer.filter((p) => p.t >= tStart && p.t <= tEnd);
    const pts = sliced.length >= 2 ? sliced : activeBuffer.slice(-Math.min(60, activeBuffer.length));

    let sum1 = 0;
    let sum2 = 0;
    let sumSq1 = 0;
    let max1 = -Infinity;
    let min1 = Infinity;
    let maxI = 0;

    for (const p of pts) {
      sum1 += p.vCh1;
      sum2 += p.vCh2;
      sumSq1 += p.vCh1 * p.vCh1;
      if (p.vCh1 > max1) max1 = p.vCh1;
      if (p.vCh1 < min1) min1 = p.vCh1;
      if (Math.abs(p.iCh2) > maxI) maxI = Math.abs(p.iCh2);
    }

    const n = pts.length;
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;
    const vpp = max1 - min1;
    const vrms = Math.sqrt(sumSq1 / n);

    // Estimate frequency from mean crossings on CH1 if oscillating
    let freqHz = 0;
    if (vpp > 0.25 && n >= 6) {
      const crossings: number[] = [];
      for (let i = 1; i < n; i++) {
        const prev = pts[i - 1].vCh1 - mean1;
        const curr = pts[i].vCh1 - mean1;
        if (prev < 0 && curr >= 0) {
          const frac = -prev / Math.max(1e-6, curr - prev);
          crossings.push(pts[i - 1].t + frac * (pts[i].t - pts[i - 1].t));
        }
      }
      if (crossings.length >= 2) {
        const avgPeriod = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
        if (avgPeriod > 0.01) freqHz = 1 / avgPeriod;
      }
    }

    return {
      windowSamples: pts,
      startTime: triggerMode === 'auto' ? Math.max(0, latestT - totalWindowSec) : tStart,
      dcMean1: mean1,
      dcMean2: mean2,
      metrics: {
        vpp,
        vrms,
        vavg: mean1,
        vmax: max1,
        vmin: min1,
        freqHz,
        imax: maxI,
      },
    };
  }, [activeBuffer, totalWindowSec, triggerMode, triggerSrc, triggerLevel]);

  const sampledForChart = useMemo(() => downsample(windowSamples, 180), [windowSamples]);

  const handleAutoSet = () => {
    if (windowSamples.length < 2) return;
    const peakV = Math.max(
      1,
      ...windowSamples.map((p) => Math.abs(coupling === 'AC' ? p.vCh1 - dcMean1 : p.vCh1)),
      ...windowSamples.map((p) => Math.abs(coupling === 'AC' ? p.vCh2 - dcMean2 : p.vCh2))
    );
    const neededVoltDiv = peakV / 3.2;
    const vIdx = VOLT_DIV_OPTIONS.findIndex((v) => v >= neededVoltDiv);
    setVoltDivIdx(vIdx === -1 ? VOLT_DIV_OPTIONS.length - 1 : vIdx);

    const peakI = Math.max(1, ...windowSamples.map((p) => Math.abs(p.iCh2)));
    const neededCurrDiv = peakI / 3.2;
    const cIdx = CURR_DIV_OPTIONS.findIndex((c) => c >= neededCurrDiv);
    setCurrDivIdx(cIdx === -1 ? CURR_DIV_OPTIONS.length - 1 : cIdx);

    if (metrics.freqHz > 0.2) {
      const idealFullWindow = 3 / metrics.freqHz; // Show ~3 full cycles across 10 divs
      const neededTimeDiv = idealFullWindow / 10;
      const tIdx = TIME_DIV_OPTIONS.findIndex((t) => t >= neededTimeDiv);
      setTimeDivIdx(tIdx === -1 ? TIME_DIV_OPTIONS.length - 1 : tIdx);
    }
  };

  // Build SVG polyline strings for the 10x8 DSO graticule
  const dsoPaths = useMemo(() => {
    if (sampledForChart.length < 2) return { ch1: '', ch2: '', ch3: '', points: [] as { x: number; sample: TraceSample }[] };
    const mapped = sampledForChart.map((p) => {
      const relT = p.t - startTime;
      const x = Math.max(0, Math.min(DSO_W, (relT / totalWindowSec) * DSO_W));
      const v1 = coupling === 'AC' ? p.vCh1 - dcMean1 : p.vCh1;
      const v2 = coupling === 'AC' ? p.vCh2 - dcMean2 : p.vCh2;
      const y1 = Math.max(2, Math.min(DSO_H - 2, DSO_H / 2 - (v1 / voltDiv) * DIV_Y));
      const y2 = Math.max(2, Math.min(DSO_H - 2, DSO_H / 2 - (v2 / voltDiv) * DIV_Y));
      const y3 = Math.max(2, Math.min(DSO_H - 2, DSO_H / 2 - (p.iCh2 / currDiv) * DIV_Y));
      return { x, y1, y2, y3, sample: p };
    });

    return {
      ch1: mapped.map((m) => `${m.x.toFixed(1)},${m.y1.toFixed(1)}`).join(' '),
      ch2: mapped.map((m) => `${m.x.toFixed(1)},${m.y2.toFixed(1)}`).join(' '),
      ch3: mapped.map((m) => `${m.x.toFixed(1)},${m.y3.toFixed(1)}`).join(' '),
      points: mapped.map((m) => ({ x: m.x, sample: m.sample })),
    };
  }, [sampledForChart, startTime, totalWindowSec, coupling, dcMean1, dcMean2, voltDiv, currDiv]);

  const hoverSample = hoverIdx !== null && dsoPaths.points[hoverIdx] ? dsoPaths.points[hoverIdx] : null;
  const triggerY = Math.max(6, Math.min(DSO_H - 6, DSO_H / 2 - (triggerLevel / voltDiv) * DIV_Y));

  const rechartsData = useMemo(() => {
    if (coupling === 'DC') return sampledForChart;
    return sampledForChart.map((p) => ({
      ...p,
      vCh1: Number((p.vCh1 - dcMean1).toFixed(3)),
      vCh2: Number((p.vCh2 - dcMean2).toFixed(3)),
    }));
  }, [sampledForChart, coupling, dcMean1, dcMean2]);

  return (
    <div className="bg-[#0b1120] border-t border-slate-800 px-3 py-2.5 space-y-2">
      {/* Top Instrument Header & Display Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Oscilloscope Kỹ thuật số</span>
            <span className="text-[11px] font-normal text-slate-400 font-mono tabular-nums">
              · {focusLabel}
            </span>
          </div>

          {/* Segmented Mode Toggle: DSO vs Recharts */}
          <div className="flex items-center p-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10.5px]">
            <button
              type="button"
              onClick={() => setDisplayMode('dso')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors whitespace-nowrap ${
                displayMode === 'dso' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>DSO (10×8 Div)</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('recharts')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors whitespace-nowrap ${
                displayMode === 'recharts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChartIcon className="w-3 h-3" />
              <span>Biểu đồ Recharts</span>
            </button>
          </div>

          <span
            className={`text-[10.5px] font-mono font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${
              isHold
                ? 'bg-amber-950/70 border-amber-700/70 text-amber-300'
                : isSimRunning
                ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {isHold ? 'GIỮ SÓNG (HOLD)' : isSimRunning ? 'ĐANG QUÉT' : 'TẠM DỪNG'}
          </span>
        </div>

        {/* Live Telemetry Readouts + Collapse */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono tabular-nums mr-1">
            <span className="text-amber-300">
              CH1: {vVomNow >= 0 ? '+' : ''}
              {vVomNow.toFixed(2)}V
            </span>
            <span className="text-sky-300">
              CH2: {vCompNow.toFixed(2)}V
            </span>
            <span className="text-emerald-300">
              CH3: {iCompNow.toFixed(1)}mA
            </span>
          </div>

          <button
            type="button"
            onClick={handleAutoSet}
            className="px-2 py-0.5 rounded border border-cyan-700/60 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-200 text-[10.5px] font-semibold flex items-center gap-1 whitespace-nowrap"
            title="Tự động căn chỉnh Time/Div và Volt/Div theo tín hiệu hiện tại"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto Set</span>
          </button>

          <button
            type="button"
            onClick={toggleHold}
            className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold flex items-center gap-1 whitespace-nowrap ${
              isHold
                ? 'bg-amber-600/25 border-amber-500/60 text-amber-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
            title="Đóng băng dạng sóng hiện tại để quan sát"
          >
            {isHold ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isHold ? 'Chạy tiếp' : 'Hold'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsHold(false);
              setFrozenPoints([]);
              onClearTrace();
            }}
            className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10.5px] flex items-center gap-1 whitespace-nowrap"
            title="Xóa vùng đệm sóng"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa</span>
          </button>

          <button
            type="button"
            onClick={onToggleScopeOpen}
            className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10.5px] flex items-center gap-1 whitespace-nowrap"
          >
            <span>{scopeOpen ? 'Thu gọn' : 'Mở rộng'}</span>
            {scopeOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {scopeOpen && (
        <>
          {/* Time/Div, Volt/Div, mA/Div, Trigger & Channel Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800/90 text-[11px] font-mono tabular-nums">
            {/* Horizontal Timebase & Vertical Gain Knobs */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Time/Div Stepper */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                <span className="text-slate-400 text-[10px]">TIME</span>
                <button
                  type="button"
                  onClick={() => setTimeDivIdx((i) => Math.max(0, i - 1))}
                  disabled={timeDivIdx === 0}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                  title="Giảm Time/Div (Phóng to trục thời gian)"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-cyan-300 font-semibold min-w-[68px] text-center whitespace-nowrap">
                  {formatTimeDiv(timeDiv)}
                </span>
                <button
                  type="button"
                  onClick={() => setTimeDivIdx((i) => Math.min(TIME_DIV_OPTIONS.length - 1, i + 1))}
                  disabled={timeDivIdx === TIME_DIV_OPTIONS.length - 1}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                  title="Tăng Time/Div (Thu rộng cửa sổ thời gian)"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Volt/Div Stepper */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                <span className="text-slate-400 text-[10px]">VOLT</span>
                <button
                  type="button"
                  onClick={() => setVoltDivIdx((i) => Math.max(0, i - 1))}
                  disabled={voltDivIdx === 0}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                  title="Giảm Volt/Div (Phóng to biên độ áp)"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-amber-300 font-semibold min-w-[62px] text-center whitespace-nowrap">
                  {voltDiv} V/div
                </span>
                <button
                  type="button"
                  onClick={() => setVoltDivIdx((i) => Math.min(VOLT_DIV_OPTIONS.length - 1, i + 1))}
                  disabled={voltDivIdx === VOLT_DIV_OPTIONS.length - 1}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                  title="Tăng Volt/Div (Mở rộng thang đo áp)"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* mA/Div Stepper */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                <span className="text-slate-400 text-[10px]">CURR</span>
                <button
                  type="button"
                  onClick={() => setCurrDivIdx((i) => Math.max(0, i - 1))}
                  disabled={currDivIdx === 0}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                  title="Giảm mA/Div"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-emerald-300 font-semibold min-w-[68px] text-center whitespace-nowrap">
                  {currDiv} mA/div
                </span>
                <button
                  type="button"
                  onClick={() => setCurrDivIdx((i) => Math.min(CURR_DIV_OPTIONS.length - 1, i + 1))}
                  disabled={currDivIdx === CURR_DIV_OPTIONS.length - 1}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                  title="Tăng mA/Div"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Coupling AC/DC */}
              <button
                type="button"
                onClick={() => setCoupling((c) => (c === 'DC' ? 'AC' : 'DC'))}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold whitespace-nowrap ${
                  coupling === 'AC'
                    ? 'bg-violet-500/20 border-violet-500/60 text-violet-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Chế độ ghép DC (giữ thành phần một chiều) hoặc AC (chặn DC để phóng to gợn sóng)"
              >
                Ghép: {coupling}
              </button>
            </div>

            {/* Channel Visibility & Trigger Settings */}
            <div className="flex flex-wrap items-center gap-1.5 font-sans">
              <button
                type="button"
                onClick={() => setShowCh1((v) => !v)}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-medium whitespace-nowrap ${
                  showCh1
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                CH1 VOM
              </button>
              <button
                type="button"
                onClick={() => setShowCh2((v) => !v)}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-medium whitespace-nowrap ${
                  showCh2
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                CH2 Áp {focusLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowCh3((v) => !v)}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-medium whitespace-nowrap ${
                  showCh3
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                CH3 Dòng {focusLabel}
              </button>

              {displayMode === 'dso' && (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                  <select
                    aria-label="Chế độ Trigger"
                    value={triggerMode}
                    onChange={(e) => setTriggerMode(e.target.value as 'auto' | 'rising' | 'falling')}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10.5px] text-rose-300 font-medium"
                  >
                    <option value="auto">Trig: Auto</option>
                    <option value="rising">Trig: ↗ Lên</option>
                    <option value="falling">Trig: ↘ Xuống</option>
                  </select>

                  {triggerMode !== 'auto' && (
                    <>
                      <select
                        aria-label="Nguồn Trigger"
                        value={triggerSrc}
                        onChange={(e) => setTriggerSrc(e.target.value as 'ch1' | 'ch2')}
                        className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10.5px] text-slate-200"
                      >
                        <option value="ch1">CH1</option>
                        <option value="ch2">CH2</option>
                      </select>
                      <input
                        type="range"
                        min={-voltDiv * 3.5}
                        max={voltDiv * 3.5}
                        step={voltDiv * 0.25}
                        value={triggerLevel}
                        onChange={(e) => setTriggerLevel(Number(e.target.value))}
                        title={`Mức Trigger: ${triggerLevel.toFixed(1)} V`}
                        className="w-16 accent-rose-500"
                      />
                      <span className="text-[10px] font-mono tabular-nums text-rose-300">
                        {triggerLevel.toFixed(1)}V
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary Display Viewport: DSO Graticule OR Recharts Dual-Axis */}
          {displayMode === 'dso' ? (
            <div className="relative bg-[#040812] rounded-lg border border-slate-800 overflow-hidden">
              {windowSamples.length < 2 ? (
                <div className="h-[210px] flex items-center justify-center text-xs text-slate-500">
                  Nhấn Chạy để kích hoạt tia quét Oscilloscope...
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${DSO_W} ${DSO_H}`}
                  preserveAspectRatio="none"
                  className="w-full h-[210px] block cursor-crosshair"
                  onMouseMove={(e) => {
                    if (dsoPaths.points.length === 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = ((e.clientX - rect.left) / rect.width) * DSO_W;
                    let bestIdx = 0;
                    let bestDist = Infinity;
                    for (let i = 0; i < dsoPaths.points.length; i++) {
                      const d = Math.abs(dsoPaths.points[i].x - relX);
                      if (d < bestDist) {
                        bestDist = d;
                        bestIdx = i;
                      }
                    }
                    setHoverIdx(bestIdx);
                  }}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {/* 10x8 Major Graticule Lines */}
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const x = (idx + 1) * DIV_X;
                    const isCenter = idx === 4;
                    return (
                      <line
                        key={`vx-${idx}`}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={DSO_H}
                        stroke={isCenter ? 'rgba(100, 116, 139, 0.55)' : 'rgba(30, 41, 59, 0.85)'}
                        strokeWidth={isCenter ? 1.2 : 1}
                        strokeDasharray={isCenter ? undefined : '2,3'}
                      />
                    );
                  })}
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const y = (idx + 1) * DIV_Y;
                    const isCenter = idx === 3;
                    return (
                      <line
                        key={`hy-${idx}`}
                        x1={0}
                        y1={y}
                        x2={DSO_W}
                        y2={y}
                        stroke={isCenter ? 'rgba(100, 116, 139, 0.55)' : 'rgba(30, 41, 59, 0.85)'}
                        strokeWidth={isCenter ? 1.2 : 1}
                        strokeDasharray={isCenter ? undefined : '2,3'}
                      />
                    );
                  })}

                  {/* Fine Sub-division Ticks on Center Axes (0.2 div steps) */}
                  {Array.from({ length: 50 }).map((_, i) => (
                    <line
                      key={`tx-${i}`}
                      x1={i * (DIV_X / 5)}
                      y1={DSO_H / 2 - 3}
                      x2={i * (DIV_X / 5)}
                      y2={DSO_H / 2 + 3}
                      stroke="rgba(148, 163, 184, 0.45)"
                      strokeWidth="1"
                    />
                  ))}
                  {Array.from({ length: 40 }).map((_, i) => (
                    <line
                      key={`ty-${i}`}
                      x1={DSO_W / 2 - 3}
                      y1={i * (DIV_Y / 5)}
                      x2={DSO_W / 2 + 3}
                      y2={i * (DIV_Y / 5)}
                      stroke="rgba(148, 163, 184, 0.45)"
                      strokeWidth="1"
                    />
                  ))}

                  {/* 0V Ground Reference Marker on Left Edge */}
                  <polygon points={`0,${DSO_H / 2 - 5} 9,${DSO_H / 2} 0,${DSO_H / 2 + 5}`} fill="#64748b" />
                  <text x="12" y={DSO_H / 2 - 4} fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    0V
                  </text>

                  {/* Top/Bottom Grid Scale Labels */}
                  <text x="6" y="13" fill="#64748b" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    +{voltDiv * 4}V / +{currDiv * 4}mA
                  </text>
                  <text x="6" y={DSO_H - 6} fill="#64748b" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    −{voltDiv * 4}V / −{currDiv * 4}mA
                  </text>

                  {/* Trigger Line & Marker */}
                  {triggerMode !== 'auto' && (
                    <>
                      <line
                        x1={0}
                        y1={triggerY}
                        x2={DSO_W}
                        y2={triggerY}
                        stroke="rgba(244, 63, 94, 0.55)"
                        strokeWidth="1.2"
                        strokeDasharray="5,4"
                      />
                      <polygon
                        points={`${DSO_W},${triggerY - 5} ${DSO_W - 10},${triggerY} ${DSO_W},${triggerY + 5}`}
                        fill="#f43f5e"
                      />
                      <text
                        x={DSO_W - 44}
                        y={Math.max(12, triggerY - 4)}
                        fill="#fb7185"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        T:{triggerLevel.toFixed(1)}V
                      </text>
                    </>
                  )}

                  {/* Signal Traces */}
                  {showCh3 && dsoPaths.ch3 && (
                    <polyline points={dsoPaths.ch3} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
                  )}
                  {showCh2 && dsoPaths.ch2 && (
                    <polyline
                      points={dsoPaths.ch2}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="5,3"
                      strokeLinejoin="round"
                    />
                  )}
                  {showCh1 && dsoPaths.ch1 && (
                    <polyline points={dsoPaths.ch1} fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinejoin="round" />
                  )}

                  {/* Interactive Hover Crosshair */}
                  {hoverSample && (
                    <line
                      x1={hoverSample.x}
                      y1={0}
                      x2={hoverSample.x}
                      y2={DSO_H}
                      stroke="rgba(226, 232, 240, 0.6)"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  )}
                </svg>
              )}

              {/* Hover Cursor Readout HUD */}
              {hoverSample && (
                <div className="absolute top-2 right-2 bg-slate-900/95 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono tabular-nums text-slate-200 pointer-events-none flex items-center gap-2.5">
                  <span className="text-slate-400">t={hoverSample.sample.t.toFixed(2)}s</span>
                  {showCh1 && <span className="text-amber-300">VOM:{hoverSample.sample.vCh1.toFixed(2)}V</span>}
                  {showCh2 && <span className="text-sky-300">U:{hoverSample.sample.vCh2.toFixed(2)}V</span>}
                  {showCh3 && <span className="text-emerald-300">I:{hoverSample.sample.iCh2.toFixed(1)}mA</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full min-w-0 h-[210px] bg-slate-950/90 rounded-lg border border-slate-800/80 pt-2 pr-1 pb-1 pl-0">
              {rechartsData.length < 2 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  Nhấn Chạy để ghi nhận biến thiên điện áp & dòng điện theo thời gian thực...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={198}>
                  <ComposedChart data={rechartsData} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                      tickFormatter={(val: number) => `${Number(val).toFixed(1)}s`}
                      stroke="#334155"
                      minTickGap={28}
                    />
                    <YAxis
                      yAxisId="voltage"
                      orientation="left"
                      width={46}
                      tick={{ fill: '#38bdf8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                      tickFormatter={(val: number) => `${Number(val).toFixed(1)}V`}
                      stroke="#334155"
                      domain={[-voltDiv * 4, voltDiv * 4]}
                    />
                    <YAxis
                      yAxisId="current"
                      orientation="right"
                      width={50}
                      tick={{ fill: '#34d399', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                      tickFormatter={(val: number) => `${Math.round(Number(val))}mA`}
                      stroke="#334155"
                      domain={[-currDiv * 4, currDiv * 4]}
                    />
                    <ReferenceLine yAxisId="voltage" y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#f1f5f9',
                      }}
                      labelFormatter={(label) => `t = ${Number(label).toFixed(2)} s`}
                      formatter={(value: unknown, name: unknown) => {
                        const num = Number(value ?? 0);
                        const key = String(name ?? '');
                        if (key === 'vCh1') return [`${num.toFixed(2)} V`, 'VOM (V+ − V−)'];
                        if (key === 'vCh2') return [`${num.toFixed(2)} V`, `Áp ${focusLabel}`];
                        if (key === 'iCh2') return [`${num.toFixed(1)} mA`, `Dòng ${focusLabel}`];
                        return [String(value), key];
                      }}
                    />
                    {showCh1 && (
                      <Line
                        yAxisId="voltage"
                        type="monotone"
                        dataKey="vCh1"
                        name="vCh1"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                    {showCh2 && (
                      <Line
                        yAxisId="voltage"
                        type="monotone"
                        dataKey="vCh2"
                        name="vCh2"
                        stroke="#38bdf8"
                        strokeWidth={1.8}
                        strokeDasharray="4 2"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                    {showCh3 && (
                      <Line
                        yAxisId="current"
                        type="monotone"
                        dataKey="iCh2"
                        name="iCh2"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Bottom Hardware Measurements Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[10.5px] font-mono tabular-nums text-slate-300">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                V<sub>pp</sub>: <strong className="text-amber-300">{metrics.vpp.toFixed(2)} V</strong>
              </span>
              <span>
                V<sub>rms</sub>: <strong className="text-sky-300">{metrics.vrms.toFixed(2)} V</strong>
              </span>
              <span>
                V<sub>tb</sub>: <strong className="text-slate-100">{metrics.vavg.toFixed(2)} V</strong>
              </span>
              <span>
                V<sub>max</sub>/V<sub>min</sub>:{' '}
                <strong className="text-slate-200">
                  {metrics.vmax.toFixed(1)} / {metrics.vmin.toFixed(1)} V
                </strong>
              </span>
              <span>
                f:{' '}
                <strong className="text-violet-300">
                  {metrics.freqHz > 0.05 ? `${metrics.freqHz.toFixed(2)} Hz` : 'DC'}
                </strong>
              </span>
              <span>
                I<sub>đỉnh</sub>: <strong className="text-emerald-300">{metrics.imax.toFixed(1)} mA</strong>
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Cửa sổ: {totalWindowSec.toFixed(1)}s (10 div)
            </span>
          </div>
        </>
      )}
    </div>
  );
};
