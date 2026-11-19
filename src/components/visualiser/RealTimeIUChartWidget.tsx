import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TraceSample } from './circuitSandboxCore';

interface RealTimeIUChartWidgetProps {
  tracePoints: TraceSample[];
  focusLabel: string;
  uNow: number;
  iNowMa: number;
  vVomNow: number;
  isSimRunning: boolean;
  onClearTrace: () => void;
}

type TimeWindowOption = 3 | 6 | 12 | 0; // 0 = all

function downsamplePoints<T>(arr: T[], maxPts: number): T[] {
  if (arr.length <= maxPts) return arr;
  const step = (arr.length - 1) / (maxPts - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPts; i++) {
    out.push(arr[Math.round(i * step)]);
  }
  return out;
}

export const RealTimeIUChartWidget: React.FC<RealTimeIUChartWidgetProps> = ({
  tracePoints,
  focusLabel,
  uNow,
  iNowMa,
  vVomNow,
  isSimRunning,
  onClearTrace,
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const sync = () => setIsDarkMode(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const isLight = !isDarkMode;
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [timeWindowSec, setTimeWindowSec] = useState<TimeWindowOption>(6);
  const [isHold, setIsHold] = useState<boolean>(false);
  const [frozenPoints, setFrozenPoints] = useState<TraceSample[]>([]);
  const [showU, setShowU] = useState<boolean>(true);
  const [showI, setShowI] = useState<boolean>(true);
  const [showVom, setShowVom] = useState<boolean>(false);

  const activeBuffer = isHold ? frozenPoints : tracePoints;

  const toggleHold = () => {
    if (!isHold) {
      setFrozenPoints(tracePoints);
      setIsHold(true);
    } else {
      setIsHold(false);
    }
  };

  const chartData = useMemo(() => {
    if (activeBuffer.length === 0) return [];
    const latestT = activeBuffer[activeBuffer.length - 1].t;
    const filtered =
      timeWindowSec === 0
        ? activeBuffer
        : activeBuffer.filter((pt) => pt.t >= latestT - timeWindowSec);

    return downsamplePoints(filtered, 160).map((pt) => ({
      t: Number(pt.t.toFixed(3)),
      u: Number(pt.vCh2.toFixed(3)),
      i: Number(pt.iCh2.toFixed(2)),
      uVom: Number(pt.vCh1.toFixed(3)),
      pMw: Number(Math.abs(pt.vCh2 * pt.iCh2).toFixed(2)),
    }));
  }, [activeBuffer, timeWindowSec]);

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { uMin: 0, uMax: 0, iMin: 0, iMax: 0 };
    }
    let uMin = chartData[0].u;
    let uMax = chartData[0].u;
    let iMin = chartData[0].i;
    let iMax = chartData[0].i;
    for (let k = 1; k < chartData.length; k++) {
      const d = chartData[k];
      if (d.u < uMin) uMin = d.u;
      if (d.u > uMax) uMax = d.u;
      if (d.i < iMin) iMin = d.i;
      if (d.i > iMax) iMax = d.i;
    }
    return { uMin, uMax, iMin, iMax };
  }, [chartData]);

  const powerNowMw = Math.abs(uNow * iNowMa);

  return (
    <section
      aria-label="Đồ thị thời gian thực dòng điện và hiệu điện thế"
      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 text-slate-900 dark:text-slate-100"
    >
      {/* Header Bar */}
      <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isHold
                ? 'bg-amber-500'
                : isSimRunning
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-xs font-bold tracking-tight truncate">
            Đồ thị thời gian thực I(t) &amp; U(t)
          </span>
          <span className="hidden sm:inline-block text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-sky-100/80 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 truncate max-w-[140px]">
            {focusLabel}
          </span>
        </div>

        {/* Live Telemetry Readouts */}
        <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400">U:</span>
            <span className="font-bold text-sky-600 dark:text-sky-400">
              {uNow >= 0 ? '' : '−'}
              {Math.abs(uNow).toFixed(2)} V
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400">I:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {iNowMa.toFixed(1)} mA
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">P:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {powerNowMw.toFixed(1)} mW
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex items-center rounded-md bg-slate-200/70 dark:bg-slate-800 p-0.5 border border-slate-300/70 dark:border-slate-700 text-[10.5px] font-mono">
            {([3, 6, 12, 0] as TimeWindowOption[]).map((win) => (
              <button
                key={win}
                type="button"
                onClick={() => setTimeWindowSec(win)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  timeWindowSec === win
                    ? 'bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={win === 0 ? 'Hiển thị toàn bộ lịch sử' : `Cửa sổ ${win} giây gần nhất`}
              >
                {win === 0 ? 'Tất cả' : `${win}s`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleHold}
            className={`px-2 py-1 rounded-md border text-[10.5px] font-medium flex items-center gap-1 transition-colors ${
              isHold
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isHold ? 'Tiếp tục cập nhật đồ thị' : 'Tạm giữ đồ thị để quan sát'}
          >
            {isHold ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="hidden sm:inline">{isHold ? 'Tiếp tục' : 'Tạm giữ'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFrozenPoints([]);
              onClearTrace();
            }}
            className="p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Xóa dữ liệu đồ thị"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Thu gọn đồ thị' : 'Mở rộng đồ thị'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 py-2.5 space-y-2">
          {/* Channel Filter Toggles & Min/Max Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowU((v) => !v)}
                className={`px-2 py-0.5 rounded border flex items-center gap-1.5 font-medium transition-colors ${
                  showU
                    ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span className="w-2.5 h-0.5 rounded bg-sky-500" />
                <span>Hiệu điện thế U (V)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowI((v) => !v)}
                className={`px-2 py-0.5 rounded border flex items-center gap-1.5 font-medium transition-colors ${
                  showI
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span className="w-2.5 h-0.5 rounded bg-amber-500" />
                <span>Dòng điện I (mA)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowVom((v) => !v)}
                className={`px-2 py-0.5 rounded border flex items-center gap-1.5 font-medium transition-colors ${
                  showVom
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="w-2.5 h-0.5 border-t border-dashed border-emerald-500" />
                <span>VOM ({vVomNow.toFixed(2)}V)</span>
              </button>
            </div>

            {chartData.length >= 2 && (
              <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>
                  U: [{stats.uMin.toFixed(2)} .. {stats.uMax.toFixed(2)}] V
                </span>
                <span>
                  I: [{stats.iMin.toFixed(1)} .. {stats.iMax.toFixed(1)}] mA
                </span>
              </div>
            )}
          </div>

          {/* Recharts Dual-Axis Real-Time Chart */}
          <div className="w-full min-w-0 h-[215px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 pt-2 pr-1 pb-1 pl-0">
            {chartData.length < 2 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 px-4 text-center">
                Đang thu thập mẫu thời gian thực — nhấn Chạy mô phỏng hoặc thay đổi thông số mạch để quan sát U(t) và I(t)...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id="rtVoltageFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={isLight ? '#cbd5e1' : '#1e293b'}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tick={{
                      fill: isLight ? '#475569' : '#94a3b8',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    tickFormatter={(val: number) => `${Number(val).toFixed(1)}s`}
                    stroke={isLight ? '#94a3b8' : '#334155'}
                    minTickGap={28}
                  />
                  <YAxis
                    yAxisId="u"
                    orientation="left"
                    width={48}
                    tick={{
                      fill: isLight ? '#0284c7' : '#38bdf8',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    tickFormatter={(val: number) => `${Number(val).toFixed(1)}V`}
                    stroke={isLight ? '#94a3b8' : '#334155'}
                    domain={[
                      (min: number) => Number((Math.min(min, 0) * 1.15 - 0.5).toFixed(1)),
                      (max: number) => Number((Math.max(max, 1) * 1.15 + 0.5).toFixed(1)),
                    ]}
                  />
                  <YAxis
                    yAxisId="i"
                    orientation="right"
                    width={54}
                    tick={{
                      fill: isLight ? '#d97706' : '#fbbf24',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    tickFormatter={(val: number) => `${Math.round(Number(val))}mA`}
                    stroke={isLight ? '#94a3b8' : '#334155'}
                    domain={[
                      (min: number) => Math.floor(Math.min(min, 0) * 1.15 - 2),
                      (max: number) => Math.ceil(Math.max(max, 5) * 1.15 + 2),
                    ]}
                  />
                  <ReferenceLine
                    yAxisId="u"
                    y={0}
                    stroke={isLight ? '#64748b' : '#475569'}
                    strokeDasharray="3 3"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? '#ffffff' : '#0f172a',
                      borderColor: isLight ? '#cbd5e1' : '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: isLight ? '#0f172a' : '#f1f5f9',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)',
                    }}
                    labelFormatter={(label) => `Thời gian t = ${Number(label).toFixed(2)} s`}
                    formatter={(value: unknown, name: unknown) => {
                      const num = Number(value ?? 0);
                      const key = String(name ?? '');
                      if (key === 'u') return [`${num.toFixed(2)} V`, `Hiệu điện thế U (${focusLabel})`];
                      if (key === 'i') return [`${num.toFixed(2)} mA`, `Dòng điện I (${focusLabel})`];
                      if (key === 'uVom') return [`${num.toFixed(2)} V`, 'Đầu dò VOM'];
                      return [String(value), key];
                    }}
                  />
                  {showU && (
                    <Area
                      yAxisId="u"
                      type="monotone"
                      dataKey="u"
                      name="u"
                      stroke="#0ea5e9"
                      strokeWidth={2.2}
                      fill="url(#rtVoltageFill)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {showVom && (
                    <Line
                      yAxisId="u"
                      type="monotone"
                      dataKey="uVom"
                      name="uVom"
                      stroke="#10b981"
                      strokeWidth={1.6}
                      strokeDasharray="4 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {showI && (
                    <Line
                      yAxisId="i"
                      type="monotone"
                      dataKey="i"
                      name="i"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
