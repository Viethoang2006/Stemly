import React, { useMemo, useState } from 'react';
import {
  Cpu,
  Binary,
  Calculator,
  Play,
  Terminal,
  Layers,
  X,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  CircuitComp,
  MCU_8051_PROGRAMS,
  Mcu8051ProgramId,
  SEVEN_SEG_CODES,
  SolvedCompState,
  evaluate8051ProgramState,
} from './circuitSandboxCore';

interface MicroprocessorLabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  isRunning: boolean;
  simTime: number;
  components: CircuitComp[];
  solvedComps: Record<string, SolvedCompState>;
  onSelectMcuProgram: (compId: string, prog: Mcu8051ProgramId) => void;
  onUpdateCompFreq: (compId: string, freq: number) => void;
  onLoadPreset: (presetKey: string) => void;
}

type LabTab = '8051' | '8086_74138' | 'radix_7seg';

const SEVEN_SEG_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];

export const MicroprocessorLabDrawer: React.FC<MicroprocessorLabDrawerProps> = ({
  isOpen,
  onClose,
  isLight,
  isRunning,
  simTime,
  components,
  solvedComps,
  onSelectMcuProgram,
  onUpdateCompFreq,
  onLoadPreset,
}) => {
  const [activeTab, setActiveTab] = useState<LabTab>('8051');

  // Offline / standalone 8051 preview if no mcu8051 is on canvas yet
  const activeMcu = useMemo(() => components.find((c) => c.type === 'mcu8051'), [components]);
  const active74138 = useMemo(() => components.find((c) => c.type === 'dec74138'), [components]);
  const active7Seg = useMemo(() => components.find((c) => c.type === 'sevenseg'), [components]);

  const [sandboxProg, setSandboxProg] = useState<Mcu8051ProgramId>('blink_alt');
  const [sandboxFreq, setSandboxFreq] = useState<number>(1.5);
  const [sandboxInt1, setSandboxInt1] = useState<boolean>(false);

  // Tab 2: 8086 BIU Physical Address + 74LS138 offline + Timer/UART calculators
  const [segHex, setSegHex] = useState<string>('1234');
  const [offHex, setOffHex] = useState<string>('0560');
  const [decG1, setDecG1] = useState<boolean>(true);
  const [decAddr, setDecAddr] = useState<number>(0); // 0..7
  const [xtalMhz, setXtalMhz] = useState<'11.0592' | '12'>('11.0592');
  const [timerUs, setTimerUs] = useState<number>(5000);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [smod, setSmod] = useState<boolean>(false);

  // Tab 3: Radix converter + 7-segment interactive byte builder
  const [radixVal, setRadixVal] = useState<number>(85); // 0x55
  const [customSegMask, setCustomSegMask] = useState<number>(SEVEN_SEG_CODES[8]);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(8);

  const currentProgId: Mcu8051ProgramId = activeMcu?.mcuProgram ?? sandboxProg;
  const currentFreq = activeMcu?.freq ?? sandboxFreq;
  const mcuSpec = MCU_8051_PROGRAMS.find((p) => p.id === currentProgId) ?? MCU_8051_PROGRAMS[0];

  const mcuState = activeMcu ? solvedComps[activeMcu.id] : undefined;
  const int1Low = activeMcu
    ? Boolean(((mcuState?.digitalBits ?? 0) >> 7) & 1)
    : sandboxInt1;

  const eval8051 = useMemo(
    () => evaluate8051ProgramState(currentProgId, isRunning ? simTime : 0, currentFreq, int1Low),
    [currentProgId, isRunning, simTime, currentFreq, int1Low]
  );

  if (!isOpen) return null;

  const p1Byte = activeMcu && mcuState?.digitalValue !== undefined ? mcuState.digitalValue : eval8051.p1Byte;
  const p2Bits = activeMcu && mcuState?.digitalBits !== undefined
    ? (mcuState.digitalBits >> 4) & 0x03
    : eval8051.p2LowBits;
  const asmLines = mcuSpec.asmSnippet.split('\n');

  // 8086 BIU calculation
  const parseHex16 = (s: string) => {
    const clean = s.replace(/[^0-9a-fA-F]/g, '').slice(0, 4);
    const n = parseInt(clean || '0', 16);
    return Number.isFinite(n) ? n & 0xffff : 0;
  };
  const segNum = parseHex16(segHex);
  const offNum = parseHex16(offHex);
  const phys20 = ((segNum << 4) + offNum) & 0xfffff;

  // Timer 0/1 Mode 1 (16-bit) math
  const fOscHz = xtalMhz === '11.0592' ? 11_059_200 : 12_000_000;
  const fMachine = fOscHz / 12;
  const tMachineUs = 1_000_000 / fMachine;
  const maxDelayUs = Math.round(65536 * tMachineUs);
  const clampedUs = Math.max(1, Math.min(maxDelayUs, timerUs));
  const countsNeeded = Math.max(1, Math.min(65535, Math.round(clampedUs / tMachineUs)));
  const reloadVal = 65536 - countsNeeded;
  const thHex = ((reloadVal >> 8) & 0xff).toString(16).toUpperCase().padStart(2, '0');
  const tlHex = (reloadVal & 0xff).toString(16).toUpperCase().padStart(2, '0');

  // UART Mode 1 TH1 reload
  const smodMul = smod ? 2 : 1;
  const th1Exact = 256 - (smodMul * fOscHz) / (384 * baudRate);
  const th1Rounded = Math.max(0, Math.min(255, Math.round(th1Exact)));
  const actualBaud = (smodMul * fOscHz) / (384 * (256 - th1Rounded));
  const baudErrPct = Math.abs(((actualBaud - baudRate) / baudRate) * 100);

  // 74LS138 Live or Interactive state
  const decState = active74138 ? solvedComps[active74138.id] : undefined;
  const live74138Active = active74138 ? (decState?.digitalValue ?? -1) : decG1 ? decAddr : -1;

  // 7-Segment Live or Interactive mask
  const live7SegState = active7Seg ? solvedComps[active7Seg.id] : undefined;
  const display7SegMask = active7Seg && live7SegState?.digitalBits !== undefined
    ? live7SegState.digitalBits
    : customSegMask;
  const display7SegVal = active7Seg && live7SegState?.digitalValue !== undefined
    ? live7SegState.digitalValue
    : selectedDigit;

  // Radix conversions (8-bit)
  const byteVal = Math.max(0, Math.min(255, Math.round(radixVal)));
  const binStr = byteVal.toString(2).padStart(8, '0');
  const hexStr = byteVal.toString(16).toUpperCase().padStart(2, '0');
  const signedInt8 = byteVal >= 128 ? byteVal - 256 : byteVal;
  const packedBcd =
    byteVal <= 99
      ? `${Math.floor(byteVal / 10).toString(2).padStart(4, '0')} ${(byteVal % 10).toString(2).padStart(4, '0')}`
      : 'Ngoài 0..99';
  const asciiChar = byteVal >= 32 && byteVal <= 126 ? `'${String.fromCharCode(byteVal)}'` : 'Điều khiển';

  const cardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-slate-900 border-slate-700/80 text-slate-100';
  const subPanel = isLight
    ? 'bg-slate-50 border-slate-200'
    : 'bg-slate-950/75 border-slate-800';
  const mutedText = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div
      className={`mt-3 rounded-2xl border shadow-lg overflow-hidden transition-colors ${cardBg}`}
      role="region"
      aria-label="Phòng Lab Giáo trình Vi xử lý & Vi điều khiển"
    >
      {/* Top Workbench Header & Tabs */}
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/90 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold tracking-tight">
              Phòng Lab Kỹ thuật Vi xử lý — Giáo trình Chương 1 → 4
            </h3>
            <p className={`text-[11px] ${mutedText}`}>
              {activeMcu
                ? `Đang đồng bộ trực tiếp với ${activeMcu.label} trên mạch`
                : 'Chế độ mô phỏng tương tác & công cụ tính chuẩn giáo trình'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('8051')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === '8051'
                ? 'bg-sky-600 text-white'
                : isLight
                ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            8051 ASM & SFR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('8086_74138')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === '8086_74138'
                ? 'bg-indigo-600 text-white'
                : isLight
                ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            8086 · 74LS138 · Timer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('radix_7seg')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'radix_7seg'
                ? 'bg-emerald-600 text-white'
                : isLight
                ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            Hệ đếm & LED 7 đoạn
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight
                ? 'border-slate-200 text-slate-500 hover:bg-slate-200/70'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Thu gọn Phòng Lab Vi xử lý"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: 8051 LIVE ASM DEBUGGER & SFR MATRIX */}
      {activeTab === '8051' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Program selector & ASM trace */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500">
                  {mcuSpec.sectionRef}
                </span>
                <select
                  value={currentProgId}
                  onChange={(e) => {
                    const nextProg = e.target.value as Mcu8051ProgramId;
                    if (activeMcu) onSelectMcuProgram(activeMcu.id, nextProg);
                    else setSandboxProg(nextProg);
                  }}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                >
                  {MCU_8051_PROGRAMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={mutedText}>Nhịp xung:</span>
                <input
                  type="range"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={currentFreq}
                  onChange={(e) => {
                    const f = Number(e.target.value);
                    if (activeMcu) onUpdateCompFreq(activeMcu.id, f);
                    else setSandboxFreq(f);
                  }}
                  className="w-20 accent-sky-600"
                />
                <span className="font-mono font-semibold tabular-nums w-11 text-right">
                  {currentFreq.toFixed(1)}Hz
                </span>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${mutedText}`}>{mcuSpec.summary}</p>

            {/* Assembly Listing with Live Program Counter Highlight */}
            <div className={`rounded-xl border overflow-hidden ${subPanel}`}>
              <div
                className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-mono ${
                  isLight ? 'bg-slate-200/60 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span>FIRMWARE_8051.ASM</span>
                <span className="text-sky-500 font-bold">
                  PC = 0x{eval8051.pcHex.toString(16).toUpperCase().padStart(4, '0')}
                </span>
              </div>
              <div className="p-2 font-mono text-xs space-y-0.5">
                {asmLines.map((line, i) => {
                  const isCurrent = i === eval8051.activeLine;
                  return (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded flex items-center gap-2 transition-colors ${
                        isCurrent
                          ? isLight
                            ? 'bg-sky-100 text-sky-950 font-bold border-l-2 border-sky-600'
                            : 'bg-sky-500/20 text-sky-200 font-bold border-l-2 border-sky-400'
                          : mutedText
                      }`}
                    >
                      <span className="w-4 text-[10px] opacity-60 shrink-0">
                        {isCurrent ? '▶' : String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="whitespace-pre">{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {!activeMcu && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSandboxInt1((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    sandboxInt1
                      ? 'bg-amber-600 text-white border-amber-500'
                      : isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" />
                  {sandboxInt1 ? 'INT1 (P3.3) = 0V (Đang ngắt)' : 'Kích thử ngắt INT1 (P3.3)'}
                </button>
                <button
                  type="button"
                  onClick={() => onLoadPreset('mcu_8051_blink')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  Nạp mạch AT89C51 ra bảng 3D
                </button>
              </div>
            )}
          </div>

          {/* Right: Live SFR Register Map & Quick Circuit Presets */}
          <div className="lg:col-span-6 space-y-3">
            <div className={`rounded-xl border p-3 ${subPanel}`}>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Thanh ghi chức năng đặc biệt (SFR 8051)
                </h4>
                <span className="font-mono text-xs font-semibold text-emerald-500">
                  {mcuState?.extraLabel ?? eval8051.stepLabel}
                </span>
              </div>

              {/* 8-bit Port P1 Visual Bus */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className={mutedText}>PORT P1 (90H) · Nhị phân / LED chân</span>
                  <span className="font-bold">
                    0x{p1Byte.toString(16).toUpperCase().padStart(2, '0')} ({p1Byte.toString(2).padStart(8, '0')}b)
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                    const isHigh = Boolean((p1Byte >> bit) & 1);
                    const isPinned = bit <= 3;
                    return (
                      <div
                        key={bit}
                        className={`rounded-lg py-1.5 text-center border font-mono ${
                          isHigh
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : isLight
                            ? 'bg-white border-slate-200 text-slate-500'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="text-[9px] font-semibold">
                          P1.{bit}
                          {isPinned ? '*' : ''}
                        </div>
                        <div className="text-xs font-extrabold">{isHigh ? '1' : '0'}</div>
                      </div>
                    );
                  })}
                </div>
                <p className={`text-[10px] mt-1 ${mutedText}`}>
                  * P1.0–P1.3 nối trực tiếp ra các chân linh kiện bên trái IC AT89C51 trên mạch 3D.
                </p>
              </div>

              {/* Key SFR Cards */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-xs">
                {[
                  { name: 'ACC (E0H)', val: `${eval8051.accHex.toString(16).toUpperCase().padStart(2, '0')}h` },
                  { name: 'PC (16-bit)', val: `${eval8051.pcHex.toString(16).toUpperCase().padStart(4, '0')}h` },
                  { name: 'P2 (A0H)', val: `0${p2Bits.toString(16).toUpperCase()}h` },
                  { name: 'INT1 (P3.3)', val: int1Low ? '0 (LOW)' : '1 (HIGH)' },
                  { name: 'TMOD (89H)', val: currentProgId === 'timer_sq' ? '01h' : '00h' },
                  { name: 'IE (A8H)', val: currentProgId === 'int1_alarm' ? '84h' : '81h' },
                ].map((r) => (
                  <div
                    key={r.name}
                    className={`rounded-lg border px-2 py-1.5 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className={`text-[10px] ${mutedText}`}>{r.name}</div>
                    <div className="font-bold tabular-nums mt-0.5">{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Textbook Preset Loader */}
            <div>
              <div className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${mutedText}`}>
                Mở nhanh bài thí nghiệm 8051 theo giáo trình:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { key: 'mcu_8051_blink', label: '3.7.1 Nhấp nháy 4 LED' },
                  { key: 'mcu_8051_chase', label: '3.7.1 LED chạy đuổi RL A' },
                  { key: 'mcu_8051_7seg', label: '3.7.2 Đếm 7 đoạn 0→9' },
                  { key: 'mcu_8051_int1', label: '3.7.3 Ngắt INT1 + Còi' },
                  { key: 'mcu_8051_timer_scope', label: '3.4 Timer 0 + Scope 3D' },
                  { key: 'mcu_8051_74138_bus', label: '2.7.2 Bus 8051 + 74138' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onLoadPreset(item.key)}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold flex items-center justify-between transition-colors ${
                      isLight
                        ? 'bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-slate-800'
                        : 'bg-slate-950 border-slate-800 hover:border-sky-500 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 8086 BIU/EU, 74LS138 TRUTH TABLE, TIMER & UART */}
      {activeTab === '8086_74138' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: 8086 BIU 20-bit Physical Address */}
          <div className={`rounded-xl border p-3.5 space-y-3 ${subPanel}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                Chương 2: CPU 8086 (BIU & EU)
              </h4>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <p className={`text-[11px] leading-relaxed ${mutedText}`}>
              Khối giao tiếp Bus (BIU) tính địa chỉ vật lý 20-bit (1 MB) từ thanh ghi đoạn 16-bit và độ lệch Offset trước khi EU thực thi.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px]">
                <span className={`block mb-1 font-semibold ${mutedText}`}>Segment (CS/DS Hex)</span>
                <input
                  type="text"
                  value={segHex}
                  onChange={(e) => setSegHex(e.target.value.toUpperCase())}
                  maxLength={4}
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                  }`}
                />
              </label>
              <label className="text-[11px]">
                <span className={`block mb-1 font-semibold ${mutedText}`}>Offset (IP/BX Hex)</span>
                <input
                  type="text"
                  value={offHex}
                  onChange={(e) => setOffHex(e.target.value.toUpperCase())}
                  maxLength={4}
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                  }`}
                />
              </label>
            </div>
            <div
              className={`rounded-lg border p-2.5 font-mono text-xs space-y-1 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className={mutedText}>
                ({segNum.toString(16).toUpperCase().padStart(4, '0')}h × 10h) +{' '}
                {offNum.toString(16).toUpperCase().padStart(4, '0')}h
              </div>
              <div className="text-sm font-extrabold text-indigo-500 tabular-nums">
                Địa chỉ vật lý: {phys20.toString(16).toUpperCase().padStart(5, '0')}h
              </div>
              <div className={`text-[10px] ${mutedText}`}>
                20-bit Bus: A19..A0 = {phys20.toString(2).padStart(20, '0')}
              </div>
            </div>
          </div>

          {/* Card 2: 74LS138 3-to-8 Decoder Truth Table */}
          <div className={`rounded-xl border p-3.5 space-y-2.5 ${subPanel}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500">
                Mục 2.7.2: Giải mã 74LS138 (3→8)
              </h4>
              <button
                type="button"
                onClick={() => onLoadPreset('mcu_74138')}
                className="text-[11px] font-semibold text-sky-500 hover:underline"
              >
                Mở mạch 74LS138 →
              </button>
            </div>
            {!active74138 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setDecG1((v) => !v)}
                  className={`px-2 py-1 rounded border font-bold ${
                    decG1
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isLight
                      ? 'bg-white border-slate-300 text-slate-600'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  EN={decG1 ? '1' : '0'}
                </button>
                {[2, 1, 0].map((bit) => {
                  const bitOn = Boolean((decAddr >> bit) & 1);
                  return (
                    <button
                      key={bit}
                      type="button"
                      onClick={() => setDecAddr((prev) => prev ^ (1 << bit))}
                      className={`px-2 py-1 rounded border font-bold ${
                        bitOn
                          ? 'bg-sky-600 text-white border-sky-500'
                          : isLight
                          ? 'bg-white border-slate-300 text-slate-600'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      A{bit}={bitOn ? '1' : '0'}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const isActive = live74138Active === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border px-2 py-1.5 text-center ${
                      isActive
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-extrabold'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      A={idx.toString(2).padStart(3, '0')}
                    </div>
                    <div>
                      Y{idx}={isActive ? '0 (ON)' : '1'}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={`text-[10px] ${mutedText}`}>
              Khi chân cho phép G1=1, ngõ ra Yk tích cực mức THẤP (0V) để kéo LED hoặc chọn chip nhớ/I/O.
            </p>
          </div>

          {/* Card 3: 8051 Timer Mode 1 & UART TH1 Calculator */}
          <div className={`rounded-xl border p-3.5 space-y-2.5 ${subPanel}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                Mục 3.4 & 3.6: Timer & UART 8051
              </h4>
              <div className="flex rounded-lg border overflow-hidden text-[11px] font-mono">
                {(['11.0592', '12'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setXtalMhz(f)}
                    className={`px-2 py-0.5 font-bold ${
                      xtalMhz === f
                        ? 'bg-emerald-600 text-white'
                        : isLight
                        ? 'bg-white text-slate-700'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {f}M
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className={mutedText}>Định thời Mode 1 (1..{maxDelayUs} µs):</span>
                <input
                  type="number"
                  min={1}
                  max={maxDelayUs}
                  value={timerUs}
                  onChange={(e) => setTimerUs(Number(e.target.value) || 100)}
                  className={`w-24 px-2 py-1 rounded border font-mono text-right font-bold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                  }`}
                />
              </div>
              <div
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] flex items-center justify-between ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span>Nạp TH0=#{thHex}H · TL0=#{tlHex}H</span>
                <span className="text-emerald-500 font-bold">{countsNeeded} chu kỳ</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-700/20">
              <div className="flex items-center justify-between gap-2">
                <span className={mutedText}>UART Mode 1 (T1 Mode 2):</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className={`px-2 py-1 rounded border font-mono text-[11px] font-bold ${
                      isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    {[1200, 2400, 4800, 9600, 19200].map((b) => (
                      <option key={b} value={b}>
                        {b} bps
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSmod((v) => !v)}
                    className={`px-1.5 py-1 rounded border font-mono text-[10px] font-bold ${
                      smod
                        ? 'bg-sky-600 text-white border-sky-500'
                        : isLight
                        ? 'bg-white border-slate-300 text-slate-600'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    SMOD={smod ? '1' : '0'}
                  </button>
                </div>
              </div>
              <div
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] flex items-center justify-between ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span>
                  TH1 = #{th1Rounded.toString(16).toUpperCase().padStart(2, '0')}H
                </span>
                <span className={baudErrPct < 1 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                  Sai số {baudErrPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RADIX CONVERTER & INTERACTIVE 7-SEGMENT ENCODER */}
      {activeTab === 'radix_7seg' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Chapter 1 Radix Converter */}
          <div className={`lg:col-span-6 rounded-xl border p-3.5 space-y-3 ${subPanel}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Chương 1: Chuyển đổi Hệ đếm, Số bù 2 & Mã BCD (8-bit)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px]">
                <span className={`block mb-1 font-semibold ${mutedText}`}>Thập phân (Dec)</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={byteVal}
                  onChange={(e) => setRadixVal(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                  }`}
                />
              </label>
              <label className="text-[11px]">
                <span className={`block mb-1 font-semibold ${mutedText}`}>Thập lục phân (Hex)</span>
                <input
                  type="text"
                  value={hexStr}
                  maxLength={2}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/[^0-9a-fA-F]/g, '') || '0', 16);
                    if (Number.isFinite(n)) setRadixVal(Math.max(0, Math.min(255, n)));
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                  }`}
                />
              </label>
              <label className="text-[11px]">
                <span className={`block mb-1 font-semibold ${mutedText}`}>Nhị phân (Bin)</span>
                <input
                  type="text"
                  value={binStr}
                  maxLength={8}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^01]/g, '');
                    const n = parseInt(clean || '0', 2);
                    if (Number.isFinite(n)) setRadixVal(Math.max(0, Math.min(255, n)));
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                  }`}
                />
              </label>
            </div>

            {/* Interactive 8-bit Toggle Bar */}
            <div className="grid grid-cols-8 gap-1">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                const on = Boolean((byteVal >> bit) & 1);
                return (
                  <button
                    key={bit}
                    type="button"
                    onClick={() => setRadixVal((v) => v ^ (1 << bit))}
                    className={`rounded-lg border py-1.5 font-mono text-center transition-colors ${
                      on
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-[9px] opacity-75">2^{bit}</div>
                    <div className="text-xs font-extrabold">{on ? '1' : '0'}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className={`rounded-lg border p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <div className={`text-[10px] ${mutedText}`}>Bù 2 (Có dấu)</div>
                <div className="font-bold mt-0.5">{signedInt8}</div>
              </div>
              <div className={`rounded-lg border p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <div className={`text-[10px] ${mutedText}`}>Mã BCD nén</div>
                <div className="font-bold mt-0.5">{packedBcd}</div>
              </div>
              <div className={`rounded-lg border p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <div className={`text-[10px] ${mutedText}`}>Ký tự ASCII</div>
                <div className="font-bold mt-0.5">{asciiChar}</div>
              </div>
            </div>
          </div>

          {/* Right: Section 3.7.2 Interactive 7-Segment Trainer */}
          <div className={`lg:col-span-6 rounded-xl border p-3.5 space-y-3 ${subPanel}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">
                Mục 3.7.2: Mã hóa LED 7 đoạn (Cathode chung)
              </h4>
              <button
                type="button"
                onClick={() => onLoadPreset('mcu_8051_7seg')}
                className="text-[11px] font-semibold text-rose-500 hover:underline"
              >
                Chạy bộ đếm 0→9 →
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Clickable Interactive SVG 7-Segment */}
              <svg viewBox="0 0 84 116" className="w-20 h-28 shrink-0 rounded-xl bg-slate-950 border border-slate-800 p-1">
                {(() => {
                  const segCol = (bit: number) => ((display7SegMask >> bit) & 1 ? '#ef4444' : '#3f1d1d');
                  const toggleSeg = (bit: number) => {
                    if (active7Seg) return;
                    setSelectedDigit(null);
                    setCustomSegMask((m) => m ^ (1 << bit));
                  };
                  return (
                    <>
                      <rect x="20" y="10" width="40" height="10" rx="3" fill={segCol(0)} onClick={() => toggleSeg(0)} className="cursor-pointer" />
                      <rect x="58" y="20" width="10" height="34" rx="3" fill={segCol(1)} onClick={() => toggleSeg(1)} className="cursor-pointer" />
                      <rect x="58" y="60" width="10" height="34" rx="3" fill={segCol(2)} onClick={() => toggleSeg(2)} className="cursor-pointer" />
                      <rect x="20" y="94" width="40" height="10" rx="3" fill={segCol(3)} onClick={() => toggleSeg(3)} className="cursor-pointer" />
                      <rect x="12" y="60" width="10" height="34" rx="3" fill={segCol(4)} onClick={() => toggleSeg(4)} className="cursor-pointer" />
                      <rect x="12" y="20" width="10" height="34" rx="3" fill={segCol(5)} onClick={() => toggleSeg(5)} className="cursor-pointer" />
                      <rect x="20" y="52" width="40" height="10" rx="3" fill={segCol(6)} onClick={() => toggleSeg(6)} className="cursor-pointer" />
                      <circle cx="74" cy="99" r="5" fill={segCol(7)} onClick={() => toggleSeg(7)} className="cursor-pointer" />
                    </>
                  );
                })()}
              </svg>

              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap gap-1">
                  {SEVEN_SEG_CODES.map((code, digit) => {
                    const isSel = display7SegVal === digit;
                    return (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => {
                          setSelectedDigit(digit);
                          setCustomSegMask(code);
                        }}
                        className={`w-7 h-7 rounded-md border font-mono text-xs font-bold transition-colors ${
                          isSel
                            ? 'bg-rose-600 text-white border-rose-500'
                            : isLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {digit.toString(16).toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div
                  className={`rounded-lg border px-3 py-2 font-mono text-xs flex flex-wrap items-center justify-between gap-2 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span>
                    Mã Hex:{' '}
                    <strong className="text-rose-500">
                      0x{(display7SegMask & 0xff).toString(16).toUpperCase().padStart(2, '0')}
                    </strong>
                  </span>
                  <span className={mutedText}>
                    Bit DP..a = {(display7SegMask & 0xff).toString(2).padStart(8, '0')}b
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {SEVEN_SEG_NAMES.map((nm, b) => {
                    const on = Boolean((display7SegMask >> b) & 1);
                    return (
                      <span
                        key={nm}
                        className={`px-1.5 py-0.5 rounded border ${
                          on
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 font-bold'
                            : isLight
                            ? 'bg-slate-100 border-slate-200 text-slate-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {nm}:{on ? '1' : '0'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
