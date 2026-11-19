export type CompType =
  | 'source'
  | 'ac_source'
  | 'resistor'
  | 'pot'
  | 'capacitor'
  | 'inductor'
  | 'diode'
  | 'zener'
  | 'led'
  | 'bjt'
  | 'opamp'
  | 'switch'
  | 'pushbutton'
  | 'motor'
  | 'buzzer'
  | 'ldr'
  | 'multimeter'
  | 'oscilloscope'
  | 'mcu8051'
  | 'sevenseg'
  | 'dec74138'
  | 'clockgen'
  | 'ground';

export type PinIndex = number;

export type Mcu8051ProgramId =
  | 'blink_alt'
  | 'chase'
  | 'counter_7seg'
  | 'int1_alarm'
  | 'timer_sq'
  | 'traffic';

export type MultimeterMeasureMode = 'V' | 'I';

export type ProbeTarget =
  | { kind: 'pin'; compId: string; pin: PinIndex }
  | { kind: 'hole'; bbId: string; holeId: string }
  | { kind: 'wire'; wireId: string; t: number }
  | { kind: 'component'; compId: string };

export type FaultType = 'none' | 'burned' | 'leaky' | 'short' | 'open' | 'reversed';

export const FAULT_LABELS: Record<FaultType, string> = {
  none: 'Bình thường',
  burned: 'Cháy đứt mạch',
  leaky: 'Rò điện / Suy hao',
  short: 'Chập mạch (Short)',
  open: 'Hở mạch (Open)',
  reversed: 'Ngược cực',
};

export interface CircuitComp {
  id: string;
  type: CompType;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  value: number; // V, Vp, Ohms, uF, mH, Vf, Vz, Beta, or 1/0 for switch/pushbutton
  label: string;
  freq?: number; // Hz for ac_source / clockgen / mcu8051 clock
  wiper?: number; // 0.05..0.95 for pot, or 0..1 light level for ldr
  fault?: FaultType;
  color?: string; // LED color key ('red' | 'yellow' | 'green' | 'blue' | 'white')
  meterMode?: MultimeterMeasureMode; // For 'multimeter': 'V' (Voltage) or 'I' (Current)
  scopeTimeWindow?: number; // For 'oscilloscope': visible time span in seconds (0.5 | 1 | 2 | 4)
  scopeVDiv?: number; // For 'oscilloscope': Volts per division (0 = Auto, 1, 2, 5, 10)
  redTarget?: ProbeTarget | null; // Floating 3D/2D Red (+ / CH1) probe target on wire/component/pin/hole
  blackTarget?: ProbeTarget | null; // Floating 3D/2D Black (- / GND) probe target
  mcuProgram?: Mcu8051ProgramId; // For 'mcu8051': selected textbook 8051 firmware
}

export interface BreadboardObj {
  id: string;
  x: number; // x of Column 1 (snapped to GRID)
  y: number; // center y (center ravine, snapped to GRID)
  cols: number; // e.g., 25 columns (0..24)
}

export interface BreadboardHole {
  holeId: string; // e.g., "topPlus:4", "topStrip:4:2", "botStrip:4:0", "botMinus:4"
  netKey: string; // e.g., "bb1:rail:topPlus", "bb1:colTop:4", "bb1:colBot:4"
  x: number;
  y: number;
  label: string; // e.g., "+ (Cột 5)", "f5", "e10"
}

export interface PinRef {
  compId: string; // component ID or breadboard ID
  pin: PinIndex;
  holeId?: string; // present when anchored to a breadboard hole
}

export interface CircuitWire {
  id: string;
  from: PinRef;
  to: PinRef;
  color?: string; // Hex color for Tinkercad-style insulated wires
  waypoints?: { x: number; y: number }[]; // Tinkercad bend points
}

export const WIRE_COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'Xanh lá', hex: '#16a34a' },
  { name: 'Đỏ (+)', hex: '#dc2626' },
  { name: 'Đen (−)', hex: '#1e293b' },
  { name: 'Xanh dương', hex: '#2563eb' },
  { name: 'Vàng', hex: '#eab308' },
  { name: 'Cam', hex: '#ea580c' },
  { name: 'Tím', hex: '#9333ea' },
  { name: 'Ngọc lam', hex: '#0891b2' },
  { name: 'Hồng', hex: '#db2777' },
  { name: 'Nâu', hex: '#78350f' },
];

export type LedColorKey = 'red' | 'yellow' | 'green' | 'blue' | 'white';

export const LED_COLOR_MAP: Record<
  LedColorKey,
  { label: string; onFill: string; offFill: string; stroke: string; glowRgb: string }
> = {
  red: { label: 'Đỏ', onFill: '#ef4444', offFill: '#991b1b', stroke: '#dc2626', glowRgb: '239, 68, 68' },
  yellow: { label: 'Vàng', onFill: '#fde047', offFill: '#854d0e', stroke: '#eab308', glowRgb: '250, 204, 21' },
  green: { label: 'Xanh lá', onFill: '#4ade80', offFill: '#166534', stroke: '#22c55e', glowRgb: '34, 197, 94' },
  blue: { label: 'Xanh dương', onFill: '#60a5fa', offFill: '#1e40af', stroke: '#3b82f6', glowRgb: '59, 130, 246' },
  white: { label: 'Trắng', onFill: '#f8fafc', offFill: '#64748b', stroke: '#cbd5e1', glowRgb: '248, 250, 252' },
};

export interface SolvedCompState {
  vDrop: number;
  currentMa: number;
  powerMw: number;
  vPin0: number;
  vPin1: number;
  vPin2?: number;
  vPin3?: number;
  digitalValue?: number; // Decoded digit (0..15), P1 byte (0..255), 74LS138 active output (0..7 or -1)
  digitalBits?: number; // Segment mask / port bits / decoder output states
  digitalAux?: number; // Extra byte/flags (e.g. 8051 PC, IE1 interrupt active, DP lit, etc.)
  extraLabel?: string;
}

export interface SolvedWireState {
  currentMa: number;
  voltage: number;
}

export interface TraceSample {
  t: number; // Simulation elapsed time (seconds)
  vCh1: number; // Signed VOM differential voltage V(+) - V(-)
  vCh2: number; // Signed focused component voltage
  iCh2: number; // Signed focused component current (mA)
}

export interface FaultMission {
  id: string;
  title: string;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao';
  symptom: string;
  hint: string;
  faultyCompId: string;
  faultType: Exclude<FaultType, 'none'>;
  explanation: string;
  build: () => { comps: CircuitComp[]; wires: CircuitWire[]; breadboards?: BreadboardObj[] };
}

export interface SavedCircuitProject {
  id: string;
  name: string;
  savedAt: string;
  components: CircuitComp[];
  wires: CircuitWire[];
  breadboards?: BreadboardObj[];
}

export const SVG_W = 920;
export const SVG_H = 500;
export const GRID = 20;

export function snap(val: number): number {
  return Math.round(val / GRID) * GRID;
}

// ---------- Breadboard Geometry & Net Helpers ----------

const TOP_STRIP_ROWS = ['j', 'i', 'h', 'g', 'f'] as const;
const TOP_STRIP_DY = [-100, -80, -60, -40, -20] as const;
const BOT_STRIP_ROWS = ['e', 'd', 'c', 'b', 'a'] as const;
const BOT_STRIP_DY = [20, 40, 60, 80, 100] as const;

export function getBreadboardHoles(bb: BreadboardObj): BreadboardHole[] {
  const holes: BreadboardHole[] = [];
  for (let c = 0; c < bb.cols; c++) {
    const x = bb.x + c * GRID;
    const colNum = c + 1;

    // Top power rails
    holes.push({
      holeId: `topMinus:${c}`,
      netKey: `${bb.id}:rail:topMinus`,
      x,
      y: bb.y - 160,
      label: `Ray âm trên (− · Cột ${colNum})`,
    });
    holes.push({
      holeId: `topPlus:${c}`,
      netKey: `${bb.id}:rail:topPlus`,
      x,
      y: bb.y - 140,
      label: `Ray dương trên (+ · Cột ${colNum})`,
    });

    // Top 5-hole terminal strip (j..f)
    for (let r = 0; r < 5; r++) {
      holes.push({
        holeId: `topStrip:${c}:${r}`,
        netKey: `${bb.id}:colTop:${c}`,
        x,
        y: bb.y + TOP_STRIP_DY[r],
        label: `Lỗ ${TOP_STRIP_ROWS[r]}${colNum}`,
      });
    }

    // Bottom 5-hole terminal strip (e..a)
    for (let r = 0; r < 5; r++) {
      holes.push({
        holeId: `botStrip:${c}:${r}`,
        netKey: `${bb.id}:colBot:${c}`,
        x,
        y: bb.y + BOT_STRIP_DY[r],
        label: `Lỗ ${BOT_STRIP_ROWS[r]}${colNum}`,
      });
    }

    // Bottom power rails
    holes.push({
      holeId: `botPlus:${c}`,
      netKey: `${bb.id}:rail:botPlus`,
      x,
      y: bb.y + 140,
      label: `Ray dương dưới (+ · Cột ${colNum})`,
    });
    holes.push({
      holeId: `botMinus:${c}`,
      netKey: `${bb.id}:rail:botMinus`,
      x,
      y: bb.y + 160,
      label: `Ray âm dưới (− · Cột ${colNum})`,
    });
  }
  return holes;
}

export function getBreadboardHoleById(bb: BreadboardObj, holeId: string): BreadboardHole | null {
  const parts = holeId.split(':');
  const kind = parts[0];
  const c = Number(parts[1]);
  if (Number.isNaN(c) || c < 0 || c >= bb.cols) return null;
  const x = bb.x + c * GRID;
  const colNum = c + 1;

  if (kind === 'topMinus') {
    return { holeId, netKey: `${bb.id}:rail:topMinus`, x, y: bb.y - 160, label: `Ray âm trên (− · Cột ${colNum})` };
  }
  if (kind === 'topPlus') {
    return { holeId, netKey: `${bb.id}:rail:topPlus`, x, y: bb.y - 140, label: `Ray dương trên (+ · Cột ${colNum})` };
  }
  if (kind === 'botPlus') {
    return { holeId, netKey: `${bb.id}:rail:botPlus`, x, y: bb.y + 140, label: `Ray dương dưới (+ · Cột ${colNum})` };
  }
  if (kind === 'botMinus') {
    return { holeId, netKey: `${bb.id}:rail:botMinus`, x, y: bb.y + 160, label: `Ray âm dưới (− · Cột ${colNum})` };
  }
  if (kind === 'topStrip') {
    const r = Number(parts[2]);
    if (r >= 0 && r < 5) {
      return {
        holeId,
        netKey: `${bb.id}:colTop:${c}`,
        x,
        y: bb.y + TOP_STRIP_DY[r],
        label: `Lỗ ${TOP_STRIP_ROWS[r]}${colNum}`,
      };
    }
  }
  if (kind === 'botStrip') {
    const r = Number(parts[2]);
    if (r >= 0 && r < 5) {
      return {
        holeId,
        netKey: `${bb.id}:colBot:${c}`,
        x,
        y: bb.y + BOT_STRIP_DY[r],
        label: `Lỗ ${BOT_STRIP_ROWS[r]}${colNum}`,
      };
    }
  }
  return null;
}

export function getPinRefKey(ref: PinRef): string {
  return ref.holeId ? `${ref.compId}::${ref.holeId}` : `${ref.compId}:${ref.pin}`;
}

export function getPinRefPosition(
  ref: PinRef,
  components: CircuitComp[],
  breadboards: BreadboardObj[]
): { x: number; y: number } | null {
  if (ref.holeId) {
    const bb = breadboards.find((b) => b.id === ref.compId);
    if (!bb) return null;
    const h = getBreadboardHoleById(bb, ref.holeId);
    return h ? { x: h.x, y: h.y } : null;
  }
  const c = components.find((comp) => comp.id === ref.compId);
  return c ? getPinPosition(c, ref.pin) : null;
}

// ---------- Component Pins & Labels ----------

export const SEVEN_SEG_CODES: number[] = [
  0x3f, // 0
  0x06, // 1
  0x5b, // 2
  0x4f, // 3
  0x66, // 4
  0x6d, // 5
  0x7d, // 6
  0x07, // 7
  0x7f, // 8
  0x6f, // 9
  0x77, // A
  0x7c, // b
  0x39, // C
  0x5e, // d
  0x79, // E
  0x71, // F
];

export const MCU_8051_PROGRAMS: {
  id: Mcu8051ProgramId;
  title: string;
  sectionRef: string;
  summary: string;
  asmSnippet: string;
}[] = [
  {
    id: 'blink_alt',
    title: 'Nhấp nháy xen kẽ (55h / AAh)',
    sectionRef: 'Mục 3.7.1',
    summary: 'Xuất luân phiên 0x55 và 0xAA ra Port P1/P2 làm dàn LED chẵn-lẻ nhấp nháy.',
    asmSnippet: 'LOOP: MOV P1,#55H\n      ACALL DELAY\n      MOV P1,#0AAH\n      ACALL DELAY\n      SJMP LOOP',
  },
  {
    id: 'chase',
    title: 'LED chạy đuổi vòng (RL A)',
    sectionRef: 'Mục 3.7.1',
    summary: 'Dịch bit 1 tuần tự từ P1.0 → P1.1 → P1.2 → P1.3 rồi lặp vòng.',
    asmSnippet: '      MOV A,#01H\nLOOP: MOV P1,A\n      ACALL DELAY\n      RL A\n      SJMP LOOP',
  },
  {
    id: 'counter_7seg',
    title: 'Đếm BCD 0 → 9 ra LED 7 đoạn',
    sectionRef: 'Mục 3.7.2',
    summary: 'Đếm 0..9 xuất mã BCD 4-bit ra P1.0–P1.3 và P2.0–P2.1 điều khiển LED 7 đoạn.',
    asmSnippet: '      MOV DPTR,#BANGMA\nNEXT: CLR A\n      MOVC A,@A+DPTR\n      MOV P1,R0 ; BCD 0..9\n      INC DPTR',
  },
  {
    id: 'int1_alarm',
    title: 'Ngắt ngoài INT1 (P3.3) kích Còi',
    sectionRef: 'Mục 3.7.3',
    summary: 'Chờ sườn xuống tại chân INT1 (P3.3), nhảy vector 0013h kích P1.3 bật còi & LED.',
    asmSnippet: 'ORG 0013H ; ISR INT1\n      SETB P1.3\n      ACALL DELAY\n      CLR P1.3\n      RETI',
  },
  {
    id: 'timer_sq',
    title: 'Timer 0 Mode 1 tạo xung vuông',
    sectionRef: 'Mục 3.4',
    summary: 'Timer 0 nạp TH0/TL0 định thời, đảo bit CPL P1.0 và TXD tạo xung chuẩn đo Scope.',
    asmSnippet: '      MOV TMOD,#01H\nWAIT: SETB TR0\n      JNB TF0,$\n      CPL P1.0\n      SJMP WAIT',
  },
  {
    id: 'traffic',
    title: 'Đèn giao thông (Đỏ–Vàng–Xanh)',
    sectionRef: 'Ứng dụng Port',
    summary: 'Điều khiển 3 pha Đỏ (P1.0) → Xanh (P1.2) → Vàng (P1.1) theo chu kỳ.',
    asmSnippet: 'PHA1: MOV P1,#01H ; Do\n      ACALL DELAY\nPHA2: MOV P1,#04H ; Xanh\n      ACALL DELAY\nPHA3: MOV P1,#02H ; Vang',
  },
];

export interface Mcu8051EvalState {
  p1Byte: number; // 8-bit Port 1 (bits 0..3 drive P1.0..P1.3)
  p2LowBits: number; // bits 0..1 drive P2.0..P2.1
  clkOutBit: number; // bit driving CLK/TXD pin 9
  pcHex: number; // simulated Program Counter address
  accHex: number; // Accumulator A
  activeLine: number; // 0-based line in asmSnippet
  stepLabel: string;
}

export function evaluate8051ProgramState(
  program: Mcu8051ProgramId,
  simTimeSec: number,
  freqHz: number,
  int1Low: boolean
): Mcu8051EvalState {
  const f = Math.max(0.25, Math.min(20, freqHz || 1.5));
  const tick = Math.floor(Math.max(0, simTimeSec) * f);

  if (program === 'blink_alt') {
    const phase = tick % 2;
    const val = phase === 0 ? 0x55 : 0xaa;
    return {
      p1Byte: val,
      p2LowBits: phase === 0 ? 0b01 : 0b10,
      clkOutBit: phase,
      pcHex: phase === 0 ? 0x0000 : 0x0005,
      accHex: val,
      activeLine: phase === 0 ? 0 : 2,
      stepLabel: `P1=${val.toString(16).toUpperCase().padStart(2, '0')}h`,
    };
  }

  if (program === 'chase') {
    const idx = tick % 4;
    const val = 1 << idx;
    return {
      p1Byte: val,
      p2LowBits: idx & 0b11,
      clkOutBit: tick % 2,
      pcHex: 0x0002 + idx * 2,
      accHex: val,
      activeLine: idx === 0 ? 1 : 3,
      stepLabel: `RL A → P1.${idx}`,
    };
  }

  if (program === 'counter_7seg') {
    const digit = tick % 10;
    const segCode = SEVEN_SEG_CODES[digit] ?? 0x3f;
    return {
      p1Byte: digit & 0x0f,
      p2LowBits: digit % 2 === 0 ? 0b01 : 0b10,
      clkOutBit: digit === 9 ? 1 : 0,
      pcHex: 0x0010 + digit * 2,
      accHex: segCode,
      activeLine: 3,
      stepLabel: `Đếm ${digit} (Mã ${segCode.toString(16).toUpperCase().padStart(2, '0')}h)`,
    };
  }

  if (program === 'int1_alarm') {
    if (int1Low) {
      const pulse = Math.floor(Math.max(0, simTimeSec) * f * 2) % 2;
      return {
        p1Byte: 0b1001 | (pulse << 1), // P1.3 HIGH (buzzer ON), P1.0 HIGH (LED_Báo ON)
        p2LowBits: 0b11,
        clkOutBit: pulse,
        pcHex: 0x0013, // Vector ngắt ngoài INT1
        accHex: 0x09,
        activeLine: 1,
        stepLabel: 'ISR 0013h: Còi BẬT',
      };
    }
    return {
      p1Byte: 0x00,
      p2LowBits: 0b00,
      clkOutBit: 0,
      pcHex: 0x0030,
      accHex: 0x00,
      activeLine: 0,
      stepLabel: 'Chờ INT1 (P3.3)',
    };
  }

  if (program === 'timer_sq') {
    const half = Math.floor(Math.max(0, simTimeSec) * f * 2) % 2;
    return {
      p1Byte: half ? 0b0101 : 0b0010,
      p2LowBits: half ? 0b01 : 0b10,
      clkOutBit: half,
      pcHex: half ? 0x000b : 0x0007, // Timer 0 vector 000Bh
      accHex: half ? 0xff : 0x00,
      activeLine: half ? 3 : 2,
      stepLabel: `Timer0 ${half ? 'HIGH 5V' : 'LOW 0V'}`,
    };
  }

  // 'traffic': P1.0=Đỏ (4 nhịp), P1.2=Xanh (4 nhịp), P1.1=Vàng (2 nhịp)
  const step = tick % 10;
  if (step < 4) {
    return {
      p1Byte: 0b0001, // Đỏ
      p2LowBits: 0b01,
      clkOutBit: tick % 2,
      pcHex: 0x0020,
      accHex: 0x01,
      activeLine: 0,
      stepLabel: 'Pha 1: ĐÈN ĐỎ',
    };
  }
  if (step < 8) {
    return {
      p1Byte: 0b0100, // Xanh
      p2LowBits: 0b10,
      clkOutBit: tick % 2,
      pcHex: 0x0024,
      accHex: 0x04,
      activeLine: 2,
      stepLabel: 'Pha 2: ĐÈN XANH',
    };
  }
  return {
    p1Byte: 0b0010, // Vàng
    p2LowBits: 0b11,
    clkOutBit: tick % 2,
    pcHex: 0x0028,
    accHex: 0x02,
    activeLine: 4,
    stepLabel: 'Pha 3: ĐÈN VÀNG',
  };
}

export function getCompPins(type: CompType): PinIndex[] {
  if (type === 'ground') return [0];
  if (type === 'pot' || type === 'bjt' || type === 'opamp') return [0, 1, 2];
  if (type === 'pushbutton') return [0, 1, 2, 3];
  if (type === 'sevenseg') return [0, 1, 2, 3, 4, 5];
  if (type === 'mcu8051' || type === 'dec74138') return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return [0, 1];
}

export function getPinName(type: CompType, pin: PinIndex): string {
  if (type === 'source') return pin === 0 ? '−' : '+';
  if (type === 'ac_source') return pin === 0 ? 'N' : '~';
  if (type === 'clockgen') return pin === 0 ? 'GND' : 'CLK';
  if (type === 'diode' || type === 'zener' || type === 'led') return pin === 0 ? 'A' : 'K';
  if (type === 'buzzer' || type === 'motor') return pin === 0 ? '+' : '−';
  if (type === 'pot') return pin === 0 ? '1' : pin === 1 ? '3' : 'W';
  if (type === 'bjt') return pin === 0 ? 'B' : pin === 1 ? 'C' : 'E';
  if (type === 'opamp') return pin === 0 ? '−' : pin === 1 ? '+' : 'OUT';
  if (type === 'pushbutton') return pin === 0 ? '1a' : pin === 1 ? '1b' : pin === 2 ? '2a' : '2b';
  if (type === 'multimeter') return pin === 0 ? 'COM' : 'V·I';
  if (type === 'oscilloscope') return pin === 0 ? 'GND' : 'CH1';
  if (type === 'mcu8051') {
    const names = ['VCC', 'P1.0', 'P1.1', 'P1.2', 'P1.3', 'GND', 'P2.0', 'P2.1', 'INT1', 'CLK'];
    return names[pin] ?? `${pin}`;
  }
  if (type === 'dec74138') {
    const names = ['VCC', 'A0', 'A1', 'A2', 'GND', 'EN', 'Y0', 'Y1', 'Y2', 'Y3'];
    return names[pin] ?? `${pin}`;
  }
  if (type === 'sevenseg') {
    const names = ['D0', 'D1', 'D2', 'D3', 'DP', 'COM'];
    return names[pin] ?? `${pin}`;
  }
  if (type === 'ground') return 'GND';
  return pin === 0 ? '1' : '2';
}

export function getPinFullName(type: CompType, pin: PinIndex): string {
  if (type === 'source') return pin === 0 ? 'Cực âm (−)' : 'Cực dương (+)';
  if (type === 'ac_source') return pin === 0 ? 'Trung tính (N)' : 'Pha AC (~)';
  if (type === 'clockgen') return pin === 0 ? 'Mass GND (−)' : 'Ngõ ra xung Clock (0/+5V)';
  if (type === 'diode' || type === 'zener' || type === 'led') return pin === 0 ? 'Anode (A +)' : 'Cathode (K −)';
  if (type === 'buzzer') return pin === 0 ? 'Cực dương (+)' : 'Cực âm (−)';
  if (type === 'motor') return pin === 0 ? 'Cực 1 (+)' : 'Cực 2 (−)';
  if (type === 'pot') return pin === 0 ? 'Chân 1' : pin === 1 ? 'Chân 3' : 'Con trượt (Wiper)';
  if (type === 'bjt') return pin === 0 ? 'Base (B)' : pin === 1 ? 'Collector (C)' : 'Emitter (E)';
  if (type === 'opamp') return pin === 0 ? 'Đầu vào đảo (−)' : pin === 1 ? 'Đầu vào không đảo (+)' : 'Ngõ ra (OUT)';
  if (type === 'pushbutton') return pin < 2 ? `Cặp chân 1 (${pin === 0 ? '1a' : '1b'})` : `Cặp chân 2 (${pin === 2 ? '2a' : '2b'})`;
  if (type === 'multimeter') return pin === 0 ? 'Cổng COM (−)' : 'Cổng đo V / I (+)';
  if (type === 'oscilloscope') return pin === 0 ? 'Cổng GND (−)' : 'Kênh đo CH1 (+)';
  if (type === 'mcu8051') {
    const full = [
      'Nguồn nuôi VCC (+5V, chân 40)',
      'Port P1.0 (Ngõ ra số / Bit 0)',
      'Port P1.1 (Ngõ ra số / Bit 1)',
      'Port P1.2 (Ngõ ra số / Bit 2)',
      'Port P1.3 (Ngõ ra số / Bit 3)',
      'Mass GND (0V, chân 20)',
      'Port P2.0 (Bit cao / Đảo pha)',
      'Port P2.1 (Tín hiệu đồng bộ)',
      'INT1 / P3.3 (Ngắt ngoài sườn xuống)',
      'TXD / T0 (Xung Timer / UART)',
    ];
    return full[pin] ?? `Chân ${pin}`;
  }
  if (type === 'dec74138') {
    const full = [
      'Nguồn VCC (+5V, chân 16)',
      'Ngõ vào địa chỉ A0 (LSB)',
      'Ngõ vào địa chỉ A1',
      'Ngõ vào địa chỉ A2 (MSB)',
      'Mass GND (0V, chân 8)',
      'Cho phép Enable G1 (Active HIGH)',
      'Ngõ ra giải mã Y0 (Active LOW)',
      'Ngõ ra giải mã Y1 (Active LOW)',
      'Ngõ ra giải mã Y2 (Active LOW)',
      'Ngõ ra giải mã Y3 (Active LOW)',
    ];
    return full[pin] ?? `Chân ${pin}`;
  }
  if (type === 'sevenseg') {
    const full = [
      'Ngõ vào BCD D0 (Trọng số 1)',
      'Ngõ vào BCD D1 (Trọng số 2)',
      'Ngõ vào BCD D2 (Trọng số 4)',
      'Ngõ vào BCD D3 (Trọng số 8)',
      'Dấu chấm thập phân DP',
      'Cathode chung COM (nối GND)',
    ];
    return full[pin] ?? `Chân ${pin}`;
  }
  if (type === 'ground') return 'Nối đất (GND 0V)';
  if (type === 'capacitor') return pin === 0 ? 'Cực dương (+)' : 'Cực âm (−)';
  return pin === 0 ? 'Đầu 1' : 'Đầu 2';
}

export function getCompTitle(type: CompType): string {
  const map: Record<CompType, string> = {
    source: 'Pin / Nguồn DC',
    ac_source: 'Máy phát sóng AC',
    resistor: 'Điện trở',
    pot: 'Biến trở (Chiết áp)',
    capacitor: 'Tụ điện',
    inductor: 'Cuộn cảm',
    diode: 'Diode chỉnh lưu',
    zener: 'Diode Zener',
    led: 'Đèn LED',
    bjt: 'Transistor NPN',
    opamp: 'IC Op-Amp LM741',
    switch: 'Công tắc trượt',
    pushbutton: 'Nút nhấn (Pushbutton)',
    motor: 'Động cơ DC',
    buzzer: 'Còi chíp Piezo',
    ldr: 'Quang trở (LDR)',
    multimeter: 'Đồng hồ vạn năng 3D',
    oscilloscope: 'Máy hiện sóng 3D',
    mcu8051: 'Vi điều khiển 8051 (AT89C51)',
    sevenseg: 'LED 7 đoạn (BCD)',
    dec74138: 'IC Giải mã 74LS138',
    clockgen: 'Xung Clock / Thạch anh',
    ground: 'Nối đất (GND)',
  };
  return map[type];
}

export function getPinPosition(comp: CircuitComp, pin: PinIndex): { x: number; y: number } {
  if (comp.type === 'ground') {
    return { x: comp.x, y: comp.y - 20 };
  }
  const rad = (comp.rotation * Math.PI) / 180;
  let localX = 0;
  let localY = 0;

  if (comp.type === 'pot') {
    if (pin === 0) {
      localX = -40;
      localY = 0;
    } else if (pin === 1) {
      localX = 40;
      localY = 0;
    } else {
      localX = 0;
      localY = -20;
    }
  } else if (comp.type === 'bjt') {
    if (pin === 0) {
      localX = -40;
      localY = 0;
    } else if (pin === 1) {
      localX = 20;
      localY = -20;
    } else {
      localX = 20;
      localY = 20;
    }
  } else if (comp.type === 'opamp') {
    if (pin === 0) {
      localX = -40;
      localY = -20;
    } else if (pin === 1) {
      localX = -40;
      localY = 20;
    } else {
      localX = 40;
      localY = 0;
    }
  } else if (comp.type === 'pushbutton') {
    // Straddles breadboard center ravine cleanly (40px x 40px pin square)
    if (pin === 0) {
      localX = -20;
      localY = -20;
    } else if (pin === 1) {
      localX = -20;
      localY = 20;
    } else if (pin === 2) {
      localX = 20;
      localY = -20;
    } else {
      localX = 20;
      localY = 20;
    }
  } else if (comp.type === 'multimeter' || comp.type === 'oscilloscope') {
    localX = pin === 0 ? -20 : 20;
    localY = 20;
  } else if (comp.type === 'mcu8051' || comp.type === 'dec74138') {
    const isLeft = pin < 5;
    const row = pin % 5;
    localX = isLeft ? -40 : 40;
    localY = (row - 2) * 20;
  } else if (comp.type === 'sevenseg') {
    const isLeft = pin < 3;
    const row = pin % 3;
    localX = isLeft ? -40 : 40;
    localY = (row - 1) * 20;
  } else {
    localX = pin === 0 ? -40 : 40;
    localY = 0;
  }

  return {
    x: Math.round(comp.x + localX * Math.cos(rad) - localY * Math.sin(rad)),
    y: Math.round(comp.y + localX * Math.sin(rad) + localY * Math.cos(rad)),
  };
}

export function getLdrResistance(lightLevel01: number): number {
  const clamped = Math.max(0, Math.min(1, lightLevel01));
  // Exponential curve: 0 (Dark) = 100,000 Ohm, 0.5 = ~4,470 Ohm, 1.0 (Bright) = 200 Ohm
  return Math.round(100000 * Math.pow(200 / 100000, clamped));
}

export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }
    if (maxRow !== i) {
      const tmp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = tmp;
    }
    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / pivot;
      if (factor === 0) continue;
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(M[i][i]) < 1e-12) continue;
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }
  return x;
}

export function formatResistance(ohms: number): string {
  if (ohms >= 1000) return `${(ohms / 1000).toFixed(ohms % 1000 === 0 ? 0 : 1)}kΩ`;
  return `${Math.round(ohms)}Ω`;
}

export function formatCapacitance(uF: number): string {
  if (uF >= 1000) return `${(uF / 1000).toFixed(2).replace(/\.00$/, '')}mF`;
  return `${Math.round(uF)}μF`;
}

export function formatInductance(mH: number): string {
  if (mH >= 1000) return `${(mH / 1000).toFixed(2).replace(/\.00$/, '')}H`;
  return `${Math.round(mH)}mH`;
}

const BAND_HEX: Record<number, string> = {
  0: '#1e293b',
  1: '#78350f',
  2: '#dc2626',
  3: '#ea580c',
  4: '#eab308',
  5: '#16a34a',
  6: '#2563eb',
  7: '#9333ea',
  8: '#64748b',
  9: '#f8fafc',
};

export function getResistorColorBands(ohms: number): [string, string, string, string] {
  const safe = Math.max(1, Math.round(ohms));
  if (safe < 10) {
    return [BAND_HEX[safe] ?? '#1e293b', BAND_HEX[0], '#d97706', '#d97706'];
  }
  const exp = Math.max(0, Math.floor(Math.log10(safe)) - 1);
  const sig = Math.round(safe / Math.pow(10, exp));
  const d1 = Math.min(9, Math.max(1, Math.floor(sig / 10)));
  const d2 = Math.min(9, Math.max(0, sig % 10));
  const multIdx = Math.min(7, Math.max(0, exp));
  return [BAND_HEX[d1] ?? '#78350f', BAND_HEX[d2] ?? '#1e293b', BAND_HEX[multIdx] ?? '#dc2626', '#d97706'];
}

// ---------- Built-in Tinkercad Breadboard & Lab Presets ----------

export function createBreadboardLedPreset(): {
  comps: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
} {
  // Breadboard at x=240 (col 0..24 => x=240..720), y=260 (ravine at y=260)
  return {
    breadboards: [{ id: 'bb1', x: 240, y: 260, cols: 25 }],
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 240, rotation: 270, value: 9, label: 'Pin 9V' },
      { id: 'g1', type: 'ground', x: 100, y: 360, rotation: 0, value: 0, label: 'GND' },
      // Pushbutton straddling center ravine at col 5..7 (x=340..380)
      { id: 'pb1', type: 'pushbutton', x: 360, y: 260, rotation: 0, value: 1, label: 'Nút nhấn' },
      // Resistor on bottom strip row e (y=280): col 7 (x=380) to col 11 (x=460)
      { id: 'r1', type: 'resistor', x: 420, y: 280, rotation: 0, value: 330, label: 'R1' },
      // LED on bottom strip row c (y=320): col 11 (x=460) to col 15 (x=540)
      // Automatically shares column 11 with R1!
      { id: 'led1', type: 'led', x: 500, y: 320, rotation: 0, value: 2.0, color: 'red', label: 'LED1' },
    ],
    wires: [
      // Battery (+) to topPlus col 0
      {
        id: 'w1',
        from: { compId: 'v1', pin: 1 },
        to: { compId: 'bb1', pin: 0, holeId: 'topPlus:0' },
        color: '#dc2626',
        waypoints: [{ x: 100, y: 120 }],
      },
      // Battery (-) to topMinus col 0
      {
        id: 'w2',
        from: { compId: 'v1', pin: 0 },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:0' },
        color: '#1e293b',
        waypoints: [
          { x: 140, y: 280 },
          { x: 140, y: 100 },
        ],
      },
      // Battery (-) to GND
      {
        id: 'w3',
        from: { compId: 'v1', pin: 0 },
        to: { compId: 'g1', pin: 0 },
        color: '#1e293b',
      },
      // Top+ rail (col 5) down to Pushbutton left side (j5 -> shares col 5 with f5)
      {
        id: 'w4',
        from: { compId: 'bb1', pin: 0, holeId: 'topPlus:5' },
        to: { compId: 'bb1', pin: 0, holeId: 'topStrip:5:0' },
        color: '#dc2626',
      },
      // LED cathode column 15 (a15) down to bottom− rail (col 15)
      {
        id: 'w5',
        from: { compId: 'bb1', pin: 0, holeId: 'botStrip:15:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'botMinus:15' },
        color: '#1e293b',
      },
      // Link bottom− rail (col 2) to top− rail (col 2)
      {
        id: 'w6',
        from: { compId: 'bb1', pin: 0, holeId: 'botMinus:2' },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:2' },
        color: '#1e293b',
        waypoints: [
          { x: 200, y: 420 },
          { x: 200, y: 100 },
        ],
      },
    ],
  };
}

export function createBreadboardMotorPotPreset(): {
  comps: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
} {
  return {
    breadboards: [{ id: 'bb1', x: 240, y: 260, cols: 25 }],
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 240, rotation: 270, value: 12, label: 'Nguồn 12V' },
      { id: 'g1', type: 'ground', x: 100, y: 360, rotation: 0, value: 0, label: 'GND' },
      { id: 'sw1', type: 'switch', x: 340, y: 200, rotation: 0, value: 1, label: 'K1' },
      // Potentiometer on top strip row f (y=240): pins at col 7 (x=380), col 11 (x=460), wiper at (420, 220) = col 9 row g
      { id: 'pot1', type: 'pot', x: 420, y: 240, rotation: 0, value: 250, wiper: 0.35, label: 'Chiết áp' },
      // DC Motor on bottom strip row d (y=300): col 11 (x=460) to col 15 (x=540)
      { id: 'm1', type: 'motor', x: 500, y: 300, rotation: 0, value: 12, label: 'Động cơ DC' },
      // Indicator LED in series with R_led: R_led (col 16..20) -> LED_nguon (col 20..24)
      { id: 'r1', type: 'resistor', x: 600, y: 280, rotation: 0, value: 470, label: 'R_led' },
      { id: 'led1', type: 'led', x: 680, y: 320, rotation: 0, value: 2.0, color: 'green', label: 'LED_nguồn' },
    ],
    wires: [
      {
        id: 'w1',
        from: { compId: 'v1', pin: 1 },
        to: { compId: 'bb1', pin: 0, holeId: 'topPlus:0' },
        color: '#dc2626',
        waypoints: [{ x: 100, y: 120 }],
      },
      {
        id: 'w2',
        from: { compId: 'v1', pin: 0 },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:0' },
        color: '#1e293b',
        waypoints: [
          { x: 140, y: 280 },
          { x: 140, y: 100 },
        ],
      },
      {
        id: 'w3',
        from: { compId: 'v1', pin: 0 },
        to: { compId: 'g1', pin: 0 },
        color: '#1e293b',
      },
      // topPlus col 3 -> switch pin 0 (col 3)
      {
        id: 'w4',
        from: { compId: 'bb1', pin: 0, holeId: 'topPlus:3' },
        to: { compId: 'bb1', pin: 0, holeId: 'topStrip:3:0' },
        color: '#dc2626',
      },
      // Bridge pot wiper col 9 (f9) -> Motor pin 0 at col 11 (botStrip)
      {
        id: 'w5',
        from: { compId: 'bb1', pin: 0, holeId: 'topStrip:9:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'botStrip:11:0' },
        color: '#eab308',
      },
      // Pot terminal 3 (col 11) -> topMinus (col 11) for voltage divider mode
      {
        id: 'w6',
        from: { compId: 'bb1', pin: 0, holeId: 'topStrip:11:0' },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:11' },
        color: '#1e293b',
      },
      // Motor pin 1 (col 15) -> botMinus (col 15)
      {
        id: 'w7',
        from: { compId: 'bb1', pin: 0, holeId: 'botStrip:15:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'botMinus:15' },
        color: '#1e293b',
      },
      // Power LED branch: switch out (col 7) -> R_led pin 0 (col 16)
      {
        id: 'w8',
        from: { compId: 'bb1', pin: 0, holeId: 'topStrip:7:0' },
        to: { compId: 'bb1', pin: 0, holeId: 'botStrip:16:0' },
        color: '#16a34a',
      },
      // LED1 cathode (col 24) -> botMinus (col 24)
      {
        id: 'w9',
        from: { compId: 'bb1', pin: 0, holeId: 'botStrip:24:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'botMinus:24' },
        color: '#1e293b',
      },
      {
        id: 'w10',
        from: { compId: 'bb1', pin: 0, holeId: 'botMinus:1' },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:1' },
        color: '#1e293b',
        waypoints: [
          { x: 200, y: 420 },
          { x: 200, y: 100 },
        ],
      },
    ],
  };
}

export function createBreadboardLdrBuzzerPreset(): {
  comps: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
} {
  return {
    breadboards: [{ id: 'bb1', x: 240, y: 260, cols: 25 }],
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 240, rotation: 270, value: 9, label: 'Pin 9V' },
      { id: 'g1', type: 'ground', x: 100, y: 360, rotation: 0, value: 0, label: 'GND' },
      // LDR on top strip row g (y=220): col 4 (x=320) to col 8 (x=400)
      { id: 'ldr1', type: 'ldr', x: 360, y: 220, rotation: 0, value: 4470, wiper: 0.7, label: 'Quang trở' },
      // Resistor R1 in series on bottom strip row d (y=300): col 8 (x=400) to col 12 (x=480)
      { id: 'r1', type: 'resistor', x: 440, y: 300, rotation: 0, value: 330, label: 'R_chia' },
      // LED on bottom strip row b (y=340): col 12 (x=480) to col 16 (x=560)
      { id: 'led1', type: 'led', x: 520, y: 340, rotation: 0, value: 2.0, color: 'yellow', label: 'LED_báo' },
      // Buzzer in parallel with LED? Or on top strip col 12..16 (y=200)
      { id: 'bz1', type: 'buzzer', x: 520, y: 200, rotation: 0, value: 5, label: 'Còi chíp' },
    ],
    wires: [
      {
        id: 'w1',
        from: { compId: 'v1', pin: 1 },
        to: { compId: 'bb1', pin: 0, holeId: 'topPlus:0' },
        color: '#dc2626',
        waypoints: [{ x: 100, y: 120 }],
      },
      {
        id: 'w2',
        from: { compId: 'v1', pin: 0 },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:0' },
        color: '#1e293b',
        waypoints: [
          { x: 140, y: 280 },
          { x: 140, y: 100 },
        ],
      },
      {
        id: 'w3',
        from: { compId: 'v1', pin: 0 },
        to: { compId: 'g1', pin: 0 },
        color: '#1e293b',
      },
      // topPlus col 4 -> topStrip col 4 (LDR pin 0)
      {
        id: 'w4',
        from: { compId: 'bb1', pin: 0, holeId: 'topPlus:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'topStrip:4:0' },
        color: '#dc2626',
      },
      // LDR pin 1 (topStrip col 8) -> R1 pin 0 (botStrip col 8)
      {
        id: 'w5',
        from: { compId: 'bb1', pin: 0, holeId: 'topStrip:8:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'botStrip:8:0' },
        color: '#ea580c',
      },
      // botStrip col 12 (R1 & LED1) -> topStrip col 12 (Buzzer +)
      {
        id: 'w6',
        from: { compId: 'bb1', pin: 0, holeId: 'botStrip:12:0' },
        to: { compId: 'bb1', pin: 0, holeId: 'topStrip:12:4' },
        color: '#eab308',
      },
      // LED1 cathode (col 16) -> botMinus (col 16)
      {
        id: 'w7',
        from: { compId: 'bb1', pin: 0, holeId: 'botStrip:16:4' },
        to: { compId: 'bb1', pin: 0, holeId: 'botMinus:16' },
        color: '#1e293b',
      },
      // Buzzer - (col 16) -> topMinus (col 16)
      {
        id: 'w8',
        from: { compId: 'bb1', pin: 0, holeId: 'topStrip:16:0' },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:16' },
        color: '#1e293b',
      },
      {
        id: 'w9',
        from: { compId: 'bb1', pin: 0, holeId: 'botMinus:1' },
        to: { compId: 'bb1', pin: 0, holeId: 'topMinus:1' },
        color: '#1e293b',
        waypoints: [
          { x: 200, y: 420 },
          { x: 200, y: 100 },
        ],
      },
    ],
  };
}

export function createRcPreset(vSrc: number, rVal: number, cVal: number): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 140, y: 180, rotation: 270, value: vSrc, label: 'V1' },
      { id: 'sw1', type: 'switch', x: 280, y: 80, rotation: 0, value: 1, label: 'K1' },
      { id: 'r1', type: 'resistor', x: 440, y: 80, rotation: 0, value: rVal, label: 'R1' },
      { id: 'c1', type: 'capacitor', x: 580, y: 180, rotation: 90, value: cVal, label: 'C1' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ea580c' },
      { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'c1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createLedPreset(vSrc: number): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 140, y: 180, rotation: 270, value: vSrc, label: 'V1' },
      { id: 'sw1', type: 'switch', x: 280, y: 80, rotation: 0, value: 1, label: 'K1' },
      { id: 'r1', type: 'resistor', x: 440, y: 80, rotation: 0, value: 330, label: 'R1' },
      { id: 'led1', type: 'led', x: 580, y: 180, rotation: 90, value: 2.0, label: 'LED1' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ea580c' },
      { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#16a34a' },
      { id: 'w4', from: { compId: 'led1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createRectifierPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 140, y: 180, rotation: 270, value: 12, freq: 1.5, label: 'AC1' },
      { id: 'd1', type: 'diode', x: 300, y: 80, rotation: 0, value: 0.7, label: 'D1' },
      { id: 'c1', type: 'capacitor', x: 440, y: 180, rotation: 90, value: 470, label: 'C1' },
      { id: 'r1', type: 'resistor', x: 580, y: 180, rotation: 90, value: 330, label: 'R_tai' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'd1', pin: 0 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'd1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'c1', pin: 0 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626' },
      { id: 'w4', from: { compId: 'r1', pin: 1 }, to: { compId: 'c1', pin: 1 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'c1', pin: 1 }, to: { compId: 'ac1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createZenerPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 140, y: 180, rotation: 270, value: 12, label: 'V1' },
      { id: 'r1', type: 'resistor', x: 300, y: 80, rotation: 0, value: 220, label: 'R_han' },
      { id: 'z1', type: 'zener', x: 440, y: 180, rotation: 270, value: 5.1, label: 'DZ1' },
      { id: 'r2', type: 'resistor', x: 580, y: 180, rotation: 90, value: 470, label: 'R_tai' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'r1', pin: 1 }, to: { compId: 'z1', pin: 1 }, color: '#eab308' },
      { id: 'w3', from: { compId: 'z1', pin: 1 }, to: { compId: 'r2', pin: 0 }, color: '#16a34a' },
      { id: 'w4', from: { compId: 'r2', pin: 1 }, to: { compId: 'z1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'z1', pin: 0 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createBjtPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 120, y: 200, rotation: 270, value: 9, label: 'Vcc' },
      { id: 'sw1', type: 'switch', x: 240, y: 200, rotation: 0, value: 1, label: 'K_base' },
      { id: 'rb', type: 'resistor', x: 360, y: 200, rotation: 0, value: 4700, label: 'R_B' },
      { id: 'q1', type: 'bjt', x: 480, y: 200, rotation: 0, value: 120, label: 'Q1' },
      { id: 'rc', type: 'resistor', x: 360, y: 80, rotation: 0, value: 220, label: 'R_C' },
      { id: 'led1', type: 'led', x: 500, y: 120, rotation: 90, value: 2.0, label: 'LED1' },
      { id: 'g1', type: 'ground', x: 120, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'rb', pin: 0 }, color: '#eab308' },
      { id: 'w3', from: { compId: 'rb', pin: 1 }, to: { compId: 'q1', pin: 0 }, color: '#16a34a' },
      { id: 'w4', from: { compId: 'v1', pin: 1 }, to: { compId: 'rc', pin: 0 }, color: '#dc2626' },
      { id: 'w5', from: { compId: 'rc', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#ea580c' },
      { id: 'w6', from: { compId: 'led1', pin: 1 }, to: { compId: 'q1', pin: 1 }, color: '#2563eb' },
      { id: 'w7', from: { compId: 'q1', pin: 2 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w8', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createRlcPreset(vSrc: number): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 140, y: 180, rotation: 270, value: vSrc, label: 'V1' },
      { id: 'r1', type: 'resistor', x: 280, y: 80, rotation: 0, value: 47, label: 'R1' },
      { id: 'l1', type: 'inductor', x: 440, y: 80, rotation: 0, value: 150, label: 'L1' },
      { id: 'c1', type: 'capacitor', x: 580, y: 180, rotation: 90, value: 100, label: 'C1' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'r1', pin: 1 }, to: { compId: 'l1', pin: 0 }, color: '#eab308' },
      { id: 'w3', from: { compId: 'l1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#16a34a' },
      { id: 'w4', from: { compId: 'c1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createFlybackInductorPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 120, y: 180, rotation: 270, value: 12, label: 'V1' },
      { id: 'sw1', type: 'switch', x: 240, y: 80, rotation: 0, value: 1, label: 'K1' },
      { id: 'r1', type: 'resistor', x: 380, y: 80, rotation: 0, value: 100, label: 'R1' },
      { id: 'l1', type: 'inductor', x: 540, y: 180, rotation: 90, value: 250, label: 'L1' },
      { id: 'd1', type: 'diode', x: 420, y: 180, rotation: 270, value: 0.7, label: 'D_fly' },
      { id: 'g1', type: 'ground', x: 120, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ea580c' },
      { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'l1', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'r1', pin: 1 }, to: { compId: 'd1', pin: 1 }, color: '#9333ea' },
      { id: 'w5', from: { compId: 'd1', pin: 0 }, to: { compId: 'l1', pin: 1 }, color: '#9333ea' },
      { id: 'w6', from: { compId: 'l1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w7', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createDividerPreset(vSrc: number, rVal: number): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 160, y: 180, rotation: 270, value: vSrc, label: 'V1' },
      { id: 'pot1', type: 'pot', x: 400, y: 180, rotation: 0, value: rVal * 4, wiper: 0.5, label: 'RV1' },
      { id: 'r_load', type: 'resistor', x: 580, y: 200, rotation: 90, value: 1000, label: 'R_tai' },
      { id: 'g1', type: 'ground', x: 160, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'pot1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'pot1', pin: 2 }, to: { compId: 'r_load', pin: 0 }, color: '#9333ea' },
      { id: 'w3', from: { compId: 'pot1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'r_load', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createLowPassPreset(
  vSrc = 10,
  rVal = 1000,
  cVal = 100
): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 140, y: 180, rotation: 270, value: vSrc, freq: 1.5, label: 'AC1' },
      { id: 'r1', type: 'resistor', x: 320, y: 80, rotation: 0, value: rVal, label: 'R1' },
      { id: 'c1', type: 'capacitor', x: 480, y: 180, rotation: 90, value: cVal, label: 'C1' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 680,
        y: 200,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 5,
        redTarget: { kind: 'pin', compId: 'c1', pin: 0 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'Scope_Vout',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'r1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#2563eb' },
      { id: 'w3', from: { compId: 'c1', pin: 1 }, to: { compId: 'ac1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createLcOscillatorPreset(
  vSrc = 12,
  rVal = 10,
  cVal = 470,
  lVal = 150
): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 120, y: 180, rotation: 270, value: vSrc, label: 'V1' },
      { id: 'sw1', type: 'switch', x: 240, y: 80, rotation: 0, value: 1, label: 'K1' },
      { id: 'r1', type: 'resistor', x: 360, y: 80, rotation: 0, value: rVal, label: 'R_esr' },
      { id: 'l1', type: 'inductor', x: 480, y: 80, rotation: 0, value: lVal, label: 'L1' },
      { id: 'c1', type: 'capacitor', x: 580, y: 180, rotation: 90, value: cVal, label: 'C1' },
      { id: 'g1', type: 'ground', x: 120, y: 320, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 740,
        y: 200,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 0.45,
        scopeVDiv: 5,
        redTarget: { kind: 'pin', compId: 'c1', pin: 0 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'Scope_LC',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ea580c' },
      { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'l1', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'l1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#16a34a' },
      { id: 'w5', from: { compId: 'c1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createWheatstoneBridgePreset(
  vSrc = 9,
  rVal = 220
): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 180, rotation: 270, value: vSrc, label: 'Pin 9V' },
      { id: 'r1', type: 'resistor', x: 260, y: 120, rotation: 90, value: rVal, label: 'R1' },
      { id: 'r2', type: 'resistor', x: 260, y: 260, rotation: 90, value: rVal, label: 'R2' },
      { id: 'r3', type: 'resistor', x: 460, y: 120, rotation: 90, value: rVal, label: 'R3' },
      { id: 'pot1', type: 'pot', x: 460, y: 260, rotation: 90, value: rVal * 2, wiper: 0.5, label: 'Rx_Biến trở' },
      { id: 'r_g', type: 'resistor', x: 360, y: 190, rotation: 0, value: 1000, label: 'R_cầu' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 640,
        y: 210,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'pin', compId: 'r1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'r3', pin: 1 },
        label: 'VOM_Cầu AB',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'r3', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'r2', pin: 0 }, color: '#2563eb' },
      { id: 'w4', from: { compId: 'r3', pin: 1 }, to: { compId: 'pot1', pin: 0 }, color: '#16a34a' },
      { id: 'w5', from: { compId: 'r1', pin: 1 }, to: { compId: 'r_g', pin: 0 }, color: '#9333ea' },
      { id: 'w6', from: { compId: 'r_g', pin: 1 }, to: { compId: 'r3', pin: 1 }, color: '#9333ea' },
      { id: 'w7', from: { compId: 'r2', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w8', from: { compId: 'pot1', pin: 2 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w9', from: { compId: 'pot1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w10', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createHighPassPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 140, y: 180, rotation: 270, value: 10, freq: 1.5, label: 'AC1' },
      { id: 'c1', type: 'capacitor', x: 320, y: 80, rotation: 0, value: 100, label: 'C1' },
      { id: 'r1', type: 'resistor', x: 480, y: 180, rotation: 90, value: 1000, label: 'R1' },
      { id: 'g1', type: 'ground', x: 140, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'c1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#16a34a' },
      { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'ac1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createInvertingAmpPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 120, y: 180, rotation: 270, value: 2, freq: 1.5, label: 'Vin' },
      { id: 'r_in', type: 'resistor', x: 260, y: 140, rotation: 0, value: 1000, label: 'Rin' },
      { id: 'r_f', type: 'resistor', x: 440, y: 60, rotation: 0, value: 2200, label: 'Rf' },
      { id: 'u1', type: 'opamp', x: 440, y: 160, rotation: 0, value: 12, label: 'U1' },
      { id: 'r_tai', type: 'resistor', x: 600, y: 220, rotation: 90, value: 2200, label: 'R_tai' },
      { id: 'g1', type: 'ground', x: 120, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'r_in', pin: 0 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'r_in', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#2563eb' },
      { id: 'w3', from: { compId: 'u1', pin: 0 }, to: { compId: 'r_f', pin: 0 }, color: '#9333ea' },
      { id: 'w4', from: { compId: 'r_f', pin: 1 }, to: { compId: 'u1', pin: 2 }, color: '#9333ea' },
      { id: 'w5', from: { compId: 'u1', pin: 1 }, to: { compId: 'ac1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w7', from: { compId: 'u1', pin: 2 }, to: { compId: 'r_tai', pin: 0 }, color: '#16a34a' },
      { id: 'w8', from: { compId: 'r_tai', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createNonInvertingAmpPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 120, y: 180, rotation: 270, value: 2, freq: 1.5, label: 'Vin' },
      { id: 'r1', type: 'resistor', x: 280, y: 220, rotation: 90, value: 1000, label: 'R1' },
      { id: 'r_f', type: 'resistor', x: 400, y: 60, rotation: 0, value: 2200, label: 'Rf' },
      { id: 'u1', type: 'opamp', x: 400, y: 140, rotation: 0, value: 12, label: 'U1' },
      { id: 'r_tai', type: 'resistor', x: 560, y: 200, rotation: 90, value: 2200, label: 'R_tai' },
      { id: 'g1', type: 'ground', x: 120, y: 320, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'u1', pin: 1 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w3', from: { compId: 'u1', pin: 0 }, to: { compId: 'r_f', pin: 0 }, color: '#9333ea' },
      { id: 'w4', from: { compId: 'r_f', pin: 1 }, to: { compId: 'u1', pin: 2 }, color: '#9333ea' },
      { id: 'w5', from: { compId: 'u1', pin: 0 }, to: { compId: 'r1', pin: 0 }, color: '#2563eb' },
      { id: 'w6', from: { compId: 'r1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w7', from: { compId: 'u1', pin: 2 }, to: { compId: 'r_tai', pin: 0 }, color: '#16a34a' },
      { id: 'w8', from: { compId: 'r_tai', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

// ---------- New Textbook 8051 / Microprocessor & Full-Component Sample Circuits ----------

export function create8051BlinkPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'sw1', type: 'switch', x: 220, y: 80, rotation: 0, value: 1, label: 'K_nguồn' },
      { id: 'u1', type: 'mcu8051', x: 380, y: 200, rotation: 0, value: 5, freq: 1.5, mcuProgram: 'blink_alt', label: 'AT89C51' },
      { id: 'r1', type: 'resistor', x: 540, y: 120, rotation: 0, value: 220, label: 'R1' },
      { id: 'r2', type: 'resistor', x: 540, y: 180, rotation: 0, value: 220, label: 'R2' },
      { id: 'r3', type: 'resistor', x: 540, y: 240, rotation: 0, value: 220, label: 'R3' },
      { id: 'r4', type: 'resistor', x: 540, y: 300, rotation: 0, value: 220, label: 'R4' },
      { id: 'led1', type: 'led', x: 680, y: 120, rotation: 0, value: 2.0, color: 'red', label: 'LED_P1.0' },
      { id: 'led2', type: 'led', x: 680, y: 180, rotation: 0, value: 2.0, color: 'yellow', label: 'LED_P1.1' },
      { id: 'led3', type: 'led', x: 680, y: 240, rotation: 0, value: 2.0, color: 'green', label: 'LED_P1.2' },
      { id: 'led4', type: 'led', x: 680, y: 300, rotation: 0, value: 2.0, color: 'blue', label: 'LED_P1.3' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 200,
        y: 360,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 2,
        redTarget: { kind: 'pin', compId: 'u1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'OSC_P1',
      },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 780,
        y: 380,
        rotation: 0,
        value: 0,
        meterMode: 'I',
        redTarget: { kind: 'component', compId: 'led1' },
        blackTarget: null,
        label: 'DMM_LED',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 460, y: 120 }, { x: 460, y: 380 }] },
      { id: 'w5', from: { compId: 'u1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ef4444' },
      { id: 'w6', from: { compId: 'u1', pin: 2 }, to: { compId: 'r2', pin: 0 }, color: '#eab308' },
      { id: 'w7', from: { compId: 'u1', pin: 3 }, to: { compId: 'r3', pin: 0 }, color: '#16a34a' },
      { id: 'w8', from: { compId: 'u1', pin: 4 }, to: { compId: 'r4', pin: 0 }, color: '#2563eb' },
      { id: 'w9', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#ef4444' },
      { id: 'w10', from: { compId: 'r2', pin: 1 }, to: { compId: 'led2', pin: 0 }, color: '#eab308' },
      { id: 'w11', from: { compId: 'r3', pin: 1 }, to: { compId: 'led3', pin: 0 }, color: '#16a34a' },
      { id: 'w12', from: { compId: 'r4', pin: 1 }, to: { compId: 'led4', pin: 0 }, color: '#2563eb' },
      { id: 'w13', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
      { id: 'w14', from: { compId: 'led2', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
      { id: 'w15', from: { compId: 'led3', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
      { id: 'w16', from: { compId: 'led4', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
    ],
  };
}

export function create8051SevenSegPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'sw1', type: 'switch', x: 220, y: 80, rotation: 0, value: 1, label: 'K_nguồn' },
      { id: 'u1', type: 'mcu8051', x: 340, y: 200, rotation: 0, value: 5, freq: 1.2, mcuProgram: 'counter_7seg', label: 'AT89C51' },
      { id: 'seg1', type: 'sevenseg', x: 560, y: 200, rotation: 0, value: 0, label: 'LED7_Đoạn' },
      { id: 'r_dp', type: 'resistor', x: 660, y: 140, rotation: 90, value: 330, label: 'R_DP' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 740,
        y: 340,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'pin', compId: 'u1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'DMM_D0',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 400, y: 120 }, { x: 400, y: 340 }] },
      { id: 'w5', from: { compId: 'u1', pin: 1 }, to: { compId: 'seg1', pin: 0 }, color: '#ef4444' },
      { id: 'w6', from: { compId: 'u1', pin: 2 }, to: { compId: 'seg1', pin: 1 }, color: '#eab308' },
      { id: 'w7', from: { compId: 'u1', pin: 3 }, to: { compId: 'seg1', pin: 2 }, color: '#16a34a' },
      { id: 'w8', from: { compId: 'u1', pin: 4 }, to: { compId: 'seg1', pin: 3 }, color: '#2563eb', waypoints: [{ x: 460, y: 260 }, { x: 640, y: 120 }] },
      { id: 'w9', from: { compId: 'u1', pin: 9 }, to: { compId: 'r_dp', pin: 0 }, color: '#0891b2' },
      { id: 'w10', from: { compId: 'r_dp', pin: 1 }, to: { compId: 'seg1', pin: 4 }, color: '#0891b2' },
      { id: 'w11', from: { compId: 'seg1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 620, y: 340 }] },
    ],
  };
}

export function create8051Int1BuzzerPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  // Faithful to Giáo trình Mục 3.7.3: Button SW -> INT1 (P3.3) with 10k pull-up; P1.3 -> R2(220) -> BJT Base -> Còi Piezo
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 200, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'pb1', type: 'pushbutton', x: 220, y: 300, rotation: 0, value: 1, label: 'SW_INT1' },
      { id: 'r1', type: 'resistor', x: 220, y: 120, rotation: 0, value: 10000, label: 'R1_10k' },
      { id: 'u1', type: 'mcu8051', x: 380, y: 200, rotation: 0, value: 5, freq: 1.5, mcuProgram: 'int1_alarm', label: 'AT89C51' },
      { id: 'r2', type: 'resistor', x: 520, y: 260, rotation: 0, value: 220, label: 'R2_220' },
      { id: 'r3', type: 'resistor', x: 600, y: 340, rotation: 90, value: 10000, label: 'R3_10k' },
      { id: 'q1', type: 'bjt', x: 640, y: 260, rotation: 0, value: 120, label: 'BC547' },
      { id: 'bz1', type: 'buzzer', x: 660, y: 120, rotation: 90, value: 5, label: 'Còi_P1.3' },
      { id: 'r_led', type: 'resistor', x: 520, y: 120, rotation: 0, value: 220, label: 'R_LED' },
      { id: 'led1', type: 'led', x: 520, y: 180, rotation: 90, value: 2.0, color: 'red', label: 'LED_Báo' },
      { id: 'g1', type: 'ground', x: 80, y: 360, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w4', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 440, y: 100 }, { x: 440, y: 360 }] },
      // Pull-up & pushbutton to INT1 (pin 8)
      { id: 'w5', from: { compId: 'r1', pin: 1 }, to: { compId: 'u1', pin: 8 }, color: '#ea580c', waypoints: [{ x: 460, y: 120 }, { x: 460, y: 220 }] },
      { id: 'w6', from: { compId: 'u1', pin: 8 }, to: { compId: 'pb1', pin: 0 }, color: '#eab308' },
      { id: 'w7', from: { compId: 'pb1', pin: 2 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      // P1.3 (pin 4) -> R2(220) -> BJT Base + R3(10k) to GND
      { id: 'w8', from: { compId: 'u1', pin: 4 }, to: { compId: 'r2', pin: 0 }, color: '#16a34a' },
      { id: 'w9', from: { compId: 'r2', pin: 1 }, to: { compId: 'q1', pin: 0 }, color: '#16a34a' },
      { id: 'w10', from: { compId: 'q1', pin: 0 }, to: { compId: 'r3', pin: 0 }, color: '#9333ea' },
      { id: 'w11', from: { compId: 'r3', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      // VCC -> Buzzer -> Q1 Collector; Q1 Emitter -> GND
      { id: 'w12', from: { compId: 'v1', pin: 1 }, to: { compId: 'bz1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 160, y: 60 }, { x: 660, y: 60 }] },
      { id: 'w13', from: { compId: 'bz1', pin: 1 }, to: { compId: 'q1', pin: 1 }, color: '#2563eb' },
      { id: 'w14', from: { compId: 'q1', pin: 2 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      // P1.0 -> R_LED -> LED_Báo -> GND
      { id: 'w15', from: { compId: 'u1', pin: 1 }, to: { compId: 'r_led', pin: 0 }, color: '#ef4444' },
      { id: 'w16', from: { compId: 'r_led', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#ef4444' },
      { id: 'w17', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function create8051TimerScopePreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'u1', type: 'mcu8051', x: 300, y: 200, rotation: 0, value: 5, freq: 2.0, mcuProgram: 'timer_sq', label: 'AT89C51' },
      { id: 'r1', type: 'resistor', x: 460, y: 140, rotation: 0, value: 220, label: 'R1' },
      { id: 'led1', type: 'led', x: 580, y: 140, rotation: 0, value: 2.0, color: 'green', label: 'LED_T0' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 620,
        y: 300,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 2,
        redTarget: { kind: 'pin', compId: 'u1', pin: 9 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'OSC_Timer0',
      },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 420,
        y: 340,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'pin', compId: 'u1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'DMM_P1.0',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w3', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 380, y: 100 }, { x: 380, y: 340 }] },
      { id: 'w4', from: { compId: 'u1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#16a34a' },
      { id: 'w5', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#16a34a' },
      { id: 'w6', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 660, y: 140 }, { x: 660, y: 380 }] },
    ],
  };
}

export function create74138DecoderPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'sw_a0', type: 'switch', x: 220, y: 120, rotation: 0, value: 1, label: 'Bit_A0' },
      { id: 'sw_a1', type: 'switch', x: 220, y: 200, rotation: 0, value: 0, label: 'Bit_A1' },
      { id: 'sw_a2', type: 'switch', x: 220, y: 280, rotation: 0, value: 0, label: 'Bit_A2' },
      { id: 'ic1', type: 'dec74138', x: 400, y: 200, rotation: 0, value: 5, label: '74LS138' },
      { id: 'r0', type: 'resistor', x: 560, y: 120, rotation: 0, value: 220, label: 'R_Y0' },
      { id: 'r1', type: 'resistor', x: 560, y: 180, rotation: 0, value: 220, label: 'R_Y1' },
      { id: 'r2', type: 'resistor', x: 560, y: 240, rotation: 0, value: 220, label: 'R_Y2' },
      { id: 'r3', type: 'resistor', x: 560, y: 300, rotation: 0, value: 220, label: 'R_Y3' },
      { id: 'led0', type: 'led', x: 700, y: 120, rotation: 0, value: 2.0, color: 'red', label: 'CS_Y0' },
      { id: 'led1', type: 'led', x: 700, y: 180, rotation: 0, value: 2.0, color: 'green', label: 'CS_Y1' },
      { id: 'led2', type: 'led', x: 700, y: 240, rotation: 0, value: 2.0, color: 'yellow', label: 'CS_Y2' },
      { id: 'led3', type: 'led', x: 700, y: 300, rotation: 0, value: 2.0, color: 'blue', label: 'CS_Y3' },
      { id: 'g1', type: 'ground', x: 80, y: 340, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'ic1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 1 }, to: { compId: 'ic1', pin: 5 }, color: '#dc2626', waypoints: [{ x: 460, y: 80 }] },
      { id: 'w4', from: { compId: 'ic1', pin: 4 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw_a0', pin: 0 }, color: '#dc2626' },
      { id: 'w6', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw_a1', pin: 0 }, color: '#dc2626' },
      { id: 'w7', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw_a2', pin: 0 }, color: '#dc2626' },
      { id: 'w8', from: { compId: 'sw_a0', pin: 1 }, to: { compId: 'ic1', pin: 1 }, color: '#eab308' },
      { id: 'w9', from: { compId: 'sw_a1', pin: 1 }, to: { compId: 'ic1', pin: 2 }, color: '#16a34a' },
      { id: 'w10', from: { compId: 'sw_a2', pin: 1 }, to: { compId: 'ic1', pin: 3 }, color: '#2563eb' },
      // Active-LOW LED sink from +5V through 220R into Y0..Y3
      { id: 'w11', from: { compId: 'v1', pin: 1 }, to: { compId: 'r0', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w12', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w13', from: { compId: 'v1', pin: 1 }, to: { compId: 'r2', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w14', from: { compId: 'v1', pin: 1 }, to: { compId: 'r3', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w15', from: { compId: 'r0', pin: 1 }, to: { compId: 'led0', pin: 0 }, color: '#ef4444' },
      { id: 'w16', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#16a34a' },
      { id: 'w17', from: { compId: 'r2', pin: 1 }, to: { compId: 'led2', pin: 0 }, color: '#eab308' },
      { id: 'w18', from: { compId: 'r3', pin: 1 }, to: { compId: 'led3', pin: 0 }, color: '#2563eb' },
      { id: 'w19', from: { compId: 'led0', pin: 1 }, to: { compId: 'ic1', pin: 6 }, color: '#0891b2' },
      { id: 'w20', from: { compId: 'led1', pin: 1 }, to: { compId: 'ic1', pin: 7 }, color: '#0891b2' },
      { id: 'w21', from: { compId: 'led2', pin: 1 }, to: { compId: 'ic1', pin: 8 }, color: '#0891b2' },
      { id: 'w22', from: { compId: 'led3', pin: 1 }, to: { compId: 'ic1', pin: 9 }, color: '#0891b2' },
    ],
  };
}

export function createClock7SegDecoderPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'clk1', type: 'clockgen', x: 200, y: 120, rotation: 0, value: 5, freq: 1.5, label: 'XTAL_CLK' },
      { id: 'sw1', type: 'switch', x: 200, y: 220, rotation: 0, value: 1, label: 'Bit_D1' },
      { id: 'pb1', type: 'pushbutton', x: 200, y: 320, rotation: 0, value: 0, label: 'Bit_D2' },
      { id: 'seg1', type: 'sevenseg', x: 440, y: 220, rotation: 0, value: 0, label: 'HEX_7Seg' },
      { id: 'r1', type: 'resistor', x: 340, y: 120, rotation: 0, value: 220, label: 'R_LED' },
      { id: 'led1', type: 'led', x: 460, y: 100, rotation: 0, value: 2.0, color: 'yellow', label: 'LED_CLK' },
      { id: 'g1', type: 'ground', x: 80, y: 360, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 680,
        y: 220,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 2,
        redTarget: { kind: 'pin', compId: 'clk1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'OSC_CLK',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'clk1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w3', from: { compId: 'clk1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#eab308' },
      { id: 'w5', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'clk1', pin: 1 }, to: { compId: 'seg1', pin: 0 }, color: '#0891b2' },
      { id: 'w7', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w8', from: { compId: 'sw1', pin: 1 }, to: { compId: 'seg1', pin: 1 }, color: '#16a34a' },
      { id: 'w9', from: { compId: 'v1', pin: 1 }, to: { compId: 'pb1', pin: 0 }, color: '#dc2626' },
      { id: 'w10', from: { compId: 'pb1', pin: 2 }, to: { compId: 'seg1', pin: 2 }, color: '#2563eb' },
      { id: 'w11', from: { compId: 'seg1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createSwitchPotVomPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 200, rotation: 270, value: 9, label: 'Pin 9V' },
      { id: 'sw1', type: 'switch', x: 240, y: 80, rotation: 0, value: 1, label: 'K_chính' },
      { id: 'pot1', type: 'pot', x: 400, y: 100, rotation: 0, value: 1000, wiper: 0.4, label: 'Biến trở 1k' },
      { id: 'r1', type: 'resistor', x: 560, y: 80, rotation: 0, value: 220, label: 'R_bảo vệ' },
      { id: 'led1', type: 'led', x: 640, y: 200, rotation: 90, value: 2.0, color: 'blue', label: 'LED_Độ sáng' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 340,
        y: 300,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'pin', compId: 'pot1', pin: 2 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'VOM_Wiper',
      },
      {
        id: 'dmm2',
        type: 'multimeter',
        x: 500,
        y: 300,
        rotation: 0,
        value: 0,
        meterMode: 'I',
        redTarget: { kind: 'component', compId: 'led1' },
        blackTarget: null,
        label: 'DMM_Dòng',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'pot1', pin: 0 }, color: '#ea580c' },
      { id: 'w3', from: { compId: 'pot1', pin: 2 }, to: { compId: 'r1', pin: 0 }, color: '#9333ea' },
      { id: 'w4', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#2563eb' },
      { id: 'w5', from: { compId: 'led1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'pot1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w7', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createPotMotorVomPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 200, rotation: 270, value: 12, label: 'Ắc quy 12V' },
      { id: 'sw1', type: 'switch', x: 220, y: 80, rotation: 0, value: 1, label: 'Công tắc' },
      { id: 'pb1', type: 'pushbutton', x: 340, y: 100, rotation: 0, value: 1, label: 'Nút_Boost' },
      { id: 'pot1', type: 'pot', x: 460, y: 120, rotation: 0, value: 500, wiper: 0.7, label: 'RV_Tốc độ' },
      { id: 'm1', type: 'motor', x: 640, y: 200, rotation: 90, value: 12, label: 'Motor DC' },
      { id: 'd1', type: 'diode', x: 520, y: 220, rotation: 270, value: 0.7, label: 'D_Xả' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 340,
        y: 320,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'component', compId: 'm1' },
        blackTarget: null,
        label: 'VOM_Motor',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'pb1', pin: 0 }, color: '#ea580c' },
      { id: 'w3', from: { compId: 'pb1', pin: 2 }, to: { compId: 'pot1', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'pot1', pin: 2 }, to: { compId: 'm1', pin: 0 }, color: '#16a34a' },
      { id: 'w5', from: { compId: 'pot1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'm1', pin: 0 }, to: { compId: 'd1', pin: 1 }, color: '#9333ea' },
      { id: 'w7', from: { compId: 'd1', pin: 0 }, to: { compId: 'm1', pin: 1 }, color: '#9333ea' },
      { id: 'w8', from: { compId: 'm1', pin: 1 }, to: { compId: 'v1', pin: 0 }, color: '#1e293b' },
      { id: 'w9', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createAcRectifierScopePreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 120, y: 180, rotation: 270, value: 12, freq: 1.5, label: 'Nguồn AC' },
      { id: 'd1', type: 'diode', x: 280, y: 80, rotation: 0, value: 0.7, label: 'D1' },
      { id: 'c1', type: 'capacitor', x: 420, y: 180, rotation: 90, value: 470, label: 'C_lọc' },
      { id: 'r1', type: 'resistor', x: 560, y: 180, rotation: 90, value: 330, label: 'R_tải' },
      { id: 'g1', type: 'ground', x: 120, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 720,
        y: 220,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 5,
        redTarget: { kind: 'pin', compId: 'r1', pin: 0 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'Scope_DC',
      },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 340,
        y: 340,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'component', compId: 'r1' },
        blackTarget: null,
        label: 'VOM_Tải',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'd1', pin: 0 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'd1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'c1', pin: 0 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626' },
      { id: 'w4', from: { compId: 'r1', pin: 1 }, to: { compId: 'c1', pin: 1 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'c1', pin: 1 }, to: { compId: 'ac1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createOpampLdrComparatorPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 200, rotation: 270, value: 9, label: 'VCC 9V' },
      { id: 'ldr1', type: 'ldr', x: 240, y: 120, rotation: 90, value: 4470, wiper: 0.25, label: 'Quang trở' },
      { id: 'r_div', type: 'resistor', x: 240, y: 260, rotation: 90, value: 4700, label: 'R_chia' },
      { id: 'pot1', type: 'pot', x: 380, y: 280, rotation: 0, value: 10000, wiper: 0.5, label: 'RV_Ngưỡng' },
      { id: 'u1', type: 'opamp', x: 460, y: 140, rotation: 0, value: 9, label: 'LM741' },
      { id: 'r_led', type: 'resistor', x: 600, y: 140, rotation: 0, value: 330, label: 'R_LED' },
      { id: 'led1', type: 'led', x: 700, y: 200, rotation: 90, value: 2.0, color: 'red', label: 'LED_Báo' },
      { id: 'bz1', type: 'buzzer', x: 620, y: 260, rotation: 90, value: 5, label: 'Còi_Cảnh báo' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'ldr1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'ldr1', pin: 1 }, to: { compId: 'r_div', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'r_div', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'ldr1', pin: 1 }, to: { compId: 'u1', pin: 1 }, color: '#16a34a' },
      { id: 'w6', from: { compId: 'v1', pin: 1 }, to: { compId: 'pot1', pin: 0 }, color: '#dc2626' },
      { id: 'w7', from: { compId: 'pot1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w8', from: { compId: 'pot1', pin: 2 }, to: { compId: 'u1', pin: 0 }, color: '#9333ea' },
      { id: 'w9', from: { compId: 'u1', pin: 2 }, to: { compId: 'r_led', pin: 0 }, color: '#ea580c' },
      { id: 'w10', from: { compId: 'r_led', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#ef4444' },
      { id: 'w11', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w12', from: { compId: 'u1', pin: 2 }, to: { compId: 'bz1', pin: 0 }, color: '#0891b2' },
      { id: 'w13', from: { compId: 'bz1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createBreadboardSwitchPotRgbPreset(): {
  comps: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
} {
  return {
    breadboards: [{ id: 'bb1', x: 240, y: 260, cols: 25 }],
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 220, rotation: 270, value: 9, label: 'Pin 9V' },
      { id: 'g1', type: 'ground', x: 100, y: 360, rotation: 0, value: 0, label: 'GND' },
      // sw1: col 1..5 (y=200)
      { id: 'sw1', type: 'switch', x: 300, y: 200, rotation: 0, value: 1, label: 'K_chính' },
      // pot1: col 6..10, wiper col 8 (y=240)
      { id: 'pot1', type: 'pot', x: 400, y: 240, rotation: 0, value: 1000, wiper: 0.3, label: 'RV_Độ sáng' },
      // r1: col 8..12 (y=300), led1: col 12..16 (y=320)
      { id: 'r1', type: 'resistor', x: 440, y: 300, rotation: 0, value: 220, label: 'R1' },
      { id: 'led1', type: 'led', x: 520, y: 320, rotation: 0, value: 2.0, color: 'green', label: 'LED_Xanh' },
      // pb1: col 17..19 straddling ravine (y=260), r2: col 19..23 (y=200), led2: col 20..24 (y=320)
      { id: 'pb1', type: 'pushbutton', x: 600, y: 260, rotation: 0, value: 1, label: 'Nút_Đỏ' },
      { id: 'r2', type: 'resistor', x: 660, y: 200, rotation: 0, value: 330, label: 'R2' },
      { id: 'led2', type: 'led', x: 680, y: 320, rotation: 0, value: 2.0, color: 'red', label: 'LED_Đỏ' },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 780,
        y: 380,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'component', compId: 'led1' },
        blackTarget: null,
        label: 'DMM_LED',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'bb1', pin: 0, holeId: 'topPlus:0' }, color: '#dc2626', waypoints: [{ x: 100, y: 120 }] },
      { id: 'w2', from: { compId: 'v1', pin: 0 }, to: { compId: 'bb1', pin: 0, holeId: 'topMinus:0' }, color: '#1e293b', waypoints: [{ x: 140, y: 280 }, { x: 140, y: 100 }] },
      { id: 'w3', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'bb1', pin: 0, holeId: 'topPlus:1' }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:1:0' }, color: '#dc2626' },
      { id: 'w5', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:5:4' }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:6:3' }, color: '#eab308' },
      { id: 'w6', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:8:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:8:0' }, color: '#16a34a' },
      { id: 'w7', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:10:0' }, to: { compId: 'bb1', pin: 0, holeId: 'topMinus:10' }, color: '#1e293b' },
      { id: 'w8', from: { compId: 'bb1', pin: 0, holeId: 'botStrip:16:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botMinus:16' }, color: '#1e293b' },
      { id: 'w9', from: { compId: 'bb1', pin: 0, holeId: 'topPlus:17' }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:17:0' }, color: '#dc2626' },
      { id: 'w10', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:23:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:20:0' }, color: '#ea580c' },
      { id: 'w11', from: { compId: 'bb1', pin: 0, holeId: 'botStrip:24:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botMinus:24' }, color: '#1e293b' },
      { id: 'w12', from: { compId: 'bb1', pin: 0, holeId: 'botMinus:1' }, to: { compId: 'bb1', pin: 0, holeId: 'topMinus:1' }, color: '#1e293b', waypoints: [{ x: 200, y: 420 }, { x: 200, y: 100 }] },
    ],
  };
}

// ---------- Additional Rich Textbook & Full-Component Templates ----------

export function create8051ChasePreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'sw1', type: 'switch', x: 220, y: 80, rotation: 0, value: 1, label: 'K_chạy' },
      { id: 'u1', type: 'mcu8051', x: 360, y: 200, rotation: 0, value: 5, freq: 2.2, mcuProgram: 'chase', label: 'AT89C51' },
      { id: 'r1', type: 'resistor', x: 520, y: 100, rotation: 0, value: 220, label: 'R1' },
      { id: 'r2', type: 'resistor', x: 520, y: 160, rotation: 0, value: 220, label: 'R2' },
      { id: 'r3', type: 'resistor', x: 520, y: 220, rotation: 0, value: 220, label: 'R3' },
      { id: 'r4', type: 'resistor', x: 520, y: 280, rotation: 0, value: 220, label: 'R4' },
      { id: 'led1', type: 'led', x: 660, y: 100, rotation: 0, value: 2.0, color: 'red', label: 'D1_P1.0' },
      { id: 'led2', type: 'led', x: 660, y: 160, rotation: 0, value: 2.0, color: 'yellow', label: 'D2_P1.1' },
      { id: 'led3', type: 'led', x: 660, y: 220, rotation: 0, value: 2.0, color: 'green', label: 'D3_P1.2' },
      { id: 'led4', type: 'led', x: 660, y: 280, rotation: 0, value: 2.0, color: 'blue', label: 'D4_P1.3' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'dmm1',
        type: 'multimeter',
        x: 220,
        y: 360,
        rotation: 0,
        value: 0,
        meterMode: 'V',
        redTarget: { kind: 'pin', compId: 'u1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'DMM_P1.0',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 440, y: 100 }, { x: 440, y: 360 }] },
      { id: 'w5', from: { compId: 'u1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ef4444' },
      { id: 'w6', from: { compId: 'u1', pin: 2 }, to: { compId: 'r2', pin: 0 }, color: '#eab308' },
      { id: 'w7', from: { compId: 'u1', pin: 3 }, to: { compId: 'r3', pin: 0 }, color: '#16a34a' },
      { id: 'w8', from: { compId: 'u1', pin: 4 }, to: { compId: 'r4', pin: 0 }, color: '#2563eb' },
      { id: 'w9', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#ef4444' },
      { id: 'w10', from: { compId: 'r2', pin: 1 }, to: { compId: 'led2', pin: 0 }, color: '#eab308' },
      { id: 'w11', from: { compId: 'r3', pin: 1 }, to: { compId: 'led3', pin: 0 }, color: '#16a34a' },
      { id: 'w12', from: { compId: 'r4', pin: 1 }, to: { compId: 'led4', pin: 0 }, color: '#2563eb' },
      { id: 'w13', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
      { id: 'w14', from: { compId: 'led2', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
      { id: 'w15', from: { compId: 'led3', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
      { id: 'w16', from: { compId: 'led4', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 740, y: 340 }] },
    ],
  };
}

export function create8051TrafficPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'u1', type: 'mcu8051', x: 320, y: 200, rotation: 0, value: 5, freq: 1.5, mcuProgram: 'traffic', label: 'AT89C51' },
      { id: 'r1', type: 'resistor', x: 480, y: 120, rotation: 0, value: 220, label: 'R_Đỏ' },
      { id: 'r2', type: 'resistor', x: 480, y: 200, rotation: 0, value: 220, label: 'R_Vàng' },
      { id: 'r3', type: 'resistor', x: 480, y: 280, rotation: 0, value: 220, label: 'R_Xanh' },
      { id: 'led_r', type: 'led', x: 640, y: 120, rotation: 0, value: 2.0, color: 'red', label: 'ĐÈN ĐỎ' },
      { id: 'led_y', type: 'led', x: 640, y: 200, rotation: 0, value: 2.0, color: 'yellow', label: 'ĐÈN VÀNG' },
      { id: 'led_g', type: 'led', x: 640, y: 280, rotation: 0, value: 2.0, color: 'green', label: 'ĐÈN XANH' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 760,
        y: 360,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 4.0,
        scopeVDiv: 2,
        redTarget: { kind: 'pin', compId: 'u1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'OSC_ĐỎ',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w3', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 380, y: 100 }, { x: 380, y: 360 }] },
      { id: 'w4', from: { compId: 'u1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#ef4444' },
      { id: 'w5', from: { compId: 'u1', pin: 2 }, to: { compId: 'r2', pin: 0 }, color: '#eab308' },
      { id: 'w6', from: { compId: 'u1', pin: 3 }, to: { compId: 'r3', pin: 0 }, color: '#16a34a' },
      { id: 'w7', from: { compId: 'r1', pin: 1 }, to: { compId: 'led_r', pin: 0 }, color: '#ef4444' },
      { id: 'w8', from: { compId: 'r2', pin: 1 }, to: { compId: 'led_y', pin: 0 }, color: '#eab308' },
      { id: 'w9', from: { compId: 'r3', pin: 1 }, to: { compId: 'led_g', pin: 0 }, color: '#16a34a' },
      { id: 'w10', from: { compId: 'led_r', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 700, y: 340 }] },
      { id: 'w11', from: { compId: 'led_y', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 700, y: 340 }] },
      { id: 'w12', from: { compId: 'led_g', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 700, y: 340 }] },
    ],
  };
}

export function create8051And74138BusPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'u1', type: 'mcu8051', x: 240, y: 200, rotation: 0, value: 5, freq: 1.2, mcuProgram: 'counter_7seg', label: 'AT89C51' },
      { id: 'ic1', type: 'dec74138', x: 440, y: 200, rotation: 0, value: 5, label: '74LS138' },
      { id: 'r0', type: 'resistor', x: 580, y: 100, rotation: 0, value: 220, label: 'R_CS0' },
      { id: 'r1', type: 'resistor', x: 580, y: 160, rotation: 0, value: 220, label: 'R_CS1' },
      { id: 'r2', type: 'resistor', x: 580, y: 220, rotation: 0, value: 220, label: 'R_CS2' },
      { id: 'r3', type: 'resistor', x: 580, y: 280, rotation: 0, value: 220, label: 'R_CS3' },
      { id: 'led0', type: 'led', x: 720, y: 100, rotation: 0, value: 2.0, color: 'red', label: 'CS_Y0' },
      { id: 'led1', type: 'led', x: 720, y: 160, rotation: 0, value: 2.0, color: 'yellow', label: 'CS_Y1' },
      { id: 'led2', type: 'led', x: 720, y: 220, rotation: 0, value: 2.0, color: 'green', label: 'CS_Y2' },
      { id: 'led3', type: 'led', x: 720, y: 280, rotation: 0, value: 2.0, color: 'blue', label: 'CS_Y3' },
      { id: 'g1', type: 'ground', x: 80, y: 360, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 1 }, to: { compId: 'ic1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 340, y: 80 }] },
      { id: 'w4', from: { compId: 'v1', pin: 1 }, to: { compId: 'ic1', pin: 5 }, color: '#dc2626', waypoints: [{ x: 480, y: 80 }] },
      { id: 'w5', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 300, y: 360 }] },
      { id: 'w6', from: { compId: 'ic1', pin: 4 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      // Bus P1.0..P1.2 -> A0..A2
      { id: 'w7', from: { compId: 'u1', pin: 1 }, to: { compId: 'ic1', pin: 1 }, color: '#eab308' },
      { id: 'w8', from: { compId: 'u1', pin: 2 }, to: { compId: 'ic1', pin: 2 }, color: '#16a34a' },
      { id: 'w9', from: { compId: 'u1', pin: 3 }, to: { compId: 'ic1', pin: 3 }, color: '#2563eb' },
      // Active-LOW sink LEDs
      { id: 'w10', from: { compId: 'v1', pin: 1 }, to: { compId: 'r0', pin: 0 }, color: '#dc2626', waypoints: [{ x: 520, y: 60 }] },
      { id: 'w11', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 520, y: 60 }] },
      { id: 'w12', from: { compId: 'v1', pin: 1 }, to: { compId: 'r2', pin: 0 }, color: '#dc2626', waypoints: [{ x: 520, y: 60 }] },
      { id: 'w13', from: { compId: 'v1', pin: 1 }, to: { compId: 'r3', pin: 0 }, color: '#dc2626', waypoints: [{ x: 520, y: 60 }] },
      { id: 'w14', from: { compId: 'r0', pin: 1 }, to: { compId: 'led0', pin: 0 }, color: '#ef4444' },
      { id: 'w15', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#eab308' },
      { id: 'w16', from: { compId: 'r2', pin: 1 }, to: { compId: 'led2', pin: 0 }, color: '#16a34a' },
      { id: 'w17', from: { compId: 'r3', pin: 1 }, to: { compId: 'led3', pin: 0 }, color: '#2563eb' },
      { id: 'w18', from: { compId: 'led0', pin: 1 }, to: { compId: 'ic1', pin: 6 }, color: '#0891b2' },
      { id: 'w19', from: { compId: 'led1', pin: 1 }, to: { compId: 'ic1', pin: 7 }, color: '#0891b2' },
      { id: 'w20', from: { compId: 'led2', pin: 1 }, to: { compId: 'ic1', pin: 8 }, color: '#0891b2' },
      { id: 'w21', from: { compId: 'led3', pin: 1 }, to: { compId: 'ic1', pin: 9 }, color: '#0891b2' },
    ],
  };
}

export function create8051LdrAlarmPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 200, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'r_up', type: 'resistor', x: 200, y: 120, rotation: 90, value: 10000, label: 'R_kéo 10k' },
      { id: 'ldr1', type: 'ldr', x: 200, y: 280, rotation: 90, value: 4470, wiper: 0.15, label: 'LDR_Tối' },
      { id: 'u1', type: 'mcu8051', x: 380, y: 200, rotation: 0, value: 5, freq: 1.5, mcuProgram: 'int1_alarm', label: 'AT89C51' },
      { id: 'r_b', type: 'resistor', x: 520, y: 260, rotation: 0, value: 220, label: 'R_B 220' },
      { id: 'q1', type: 'bjt', x: 640, y: 260, rotation: 0, value: 120, label: 'BC547' },
      { id: 'bz1', type: 'buzzer', x: 660, y: 120, rotation: 90, value: 5, label: 'Còi_Cảnh báo' },
      { id: 'r_led', type: 'resistor', x: 520, y: 120, rotation: 0, value: 220, label: 'R_LED' },
      { id: 'led1', type: 'led', x: 520, y: 180, rotation: 90, value: 2.0, color: 'red', label: 'LED_Báo' },
      { id: 'g1', type: 'ground', x: 80, y: 360, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'v1', pin: 1 }, to: { compId: 'r_up', pin: 0 }, color: '#dc2626' },
      { id: 'w4', from: { compId: 'r_up', pin: 1 }, to: { compId: 'ldr1', pin: 0 }, color: '#eab308' },
      { id: 'w5', from: { compId: 'ldr1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      // LDR bright -> low R -> pulls INT1 (pin 8) LOW (< 1.5V) -> alarm triggers! Or user can adjust LDR light!
      { id: 'w6', from: { compId: 'r_up', pin: 1 }, to: { compId: 'u1', pin: 8 }, color: '#ea580c', waypoints: [{ x: 300, y: 200 }, { x: 460, y: 220 }] },
      { id: 'w7', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 440, y: 100 }, { x: 440, y: 360 }] },
      { id: 'w8', from: { compId: 'u1', pin: 4 }, to: { compId: 'r_b', pin: 0 }, color: '#16a34a' },
      { id: 'w9', from: { compId: 'r_b', pin: 1 }, to: { compId: 'q1', pin: 0 }, color: '#16a34a' },
      { id: 'w10', from: { compId: 'v1', pin: 1 }, to: { compId: 'bz1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 160, y: 60 }, { x: 660, y: 60 }] },
      { id: 'w11', from: { compId: 'bz1', pin: 1 }, to: { compId: 'q1', pin: 1 }, color: '#2563eb' },
      { id: 'w12', from: { compId: 'q1', pin: 2 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w13', from: { compId: 'u1', pin: 1 }, to: { compId: 'r_led', pin: 0 }, color: '#ef4444' },
      { id: 'w14', from: { compId: 'r_led', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#ef4444' },
      { id: 'w15', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function create74138ClockScanPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'clk1', type: 'clockgen', x: 200, y: 120, rotation: 0, value: 5, freq: 1.5, label: 'CLK_A0' },
      { id: 'sw_a1', type: 'switch', x: 200, y: 220, rotation: 0, value: 0, label: 'Bit_A1' },
      { id: 'ic1', type: 'dec74138', x: 400, y: 200, rotation: 0, value: 5, label: '74LS138' },
      { id: 'r0', type: 'resistor', x: 560, y: 120, rotation: 0, value: 220, label: 'R_Y0' },
      { id: 'r1', type: 'resistor', x: 560, y: 180, rotation: 0, value: 220, label: 'R_Y1' },
      { id: 'r2', type: 'resistor', x: 560, y: 240, rotation: 0, value: 220, label: 'R_Y2' },
      { id: 'r3', type: 'resistor', x: 560, y: 300, rotation: 0, value: 220, label: 'R_Y3' },
      { id: 'led0', type: 'led', x: 700, y: 120, rotation: 0, value: 2.0, color: 'red', label: 'Y0' },
      { id: 'led1', type: 'led', x: 700, y: 180, rotation: 0, value: 2.0, color: 'green', label: 'Y1' },
      { id: 'led2', type: 'led', x: 700, y: 240, rotation: 0, value: 2.0, color: 'yellow', label: 'Y2' },
      { id: 'led3', type: 'led', x: 700, y: 300, rotation: 0, value: 2.0, color: 'blue', label: 'Y3' },
      { id: 'g1', type: 'ground', x: 80, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 240,
        y: 360,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 2,
        redTarget: { kind: 'pin', compId: 'ic1', pin: 6 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'OSC_Y0',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'clk1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w3', from: { compId: 'v1', pin: 1 }, to: { compId: 'ic1', pin: 0 }, color: '#dc2626' },
      { id: 'w4', from: { compId: 'v1', pin: 1 }, to: { compId: 'ic1', pin: 5 }, color: '#dc2626', waypoints: [{ x: 460, y: 60 }] },
      { id: 'w5', from: { compId: 'ic1', pin: 4 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w6', from: { compId: 'clk1', pin: 1 }, to: { compId: 'ic1', pin: 1 }, color: '#eab308' },
      { id: 'w7', from: { compId: 'v1', pin: 1 }, to: { compId: 'sw_a1', pin: 0 }, color: '#dc2626' },
      { id: 'w8', from: { compId: 'sw_a1', pin: 1 }, to: { compId: 'ic1', pin: 2 }, color: '#16a34a' },
      { id: 'w9', from: { compId: 'ic1', pin: 3 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w10', from: { compId: 'v1', pin: 1 }, to: { compId: 'r0', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w11', from: { compId: 'v1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w12', from: { compId: 'v1', pin: 1 }, to: { compId: 'r2', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w13', from: { compId: 'v1', pin: 1 }, to: { compId: 'r3', pin: 0 }, color: '#dc2626', waypoints: [{ x: 500, y: 60 }] },
      { id: 'w14', from: { compId: 'r0', pin: 1 }, to: { compId: 'led0', pin: 0 }, color: '#ef4444' },
      { id: 'w15', from: { compId: 'r1', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#16a34a' },
      { id: 'w16', from: { compId: 'r2', pin: 1 }, to: { compId: 'led2', pin: 0 }, color: '#eab308' },
      { id: 'w17', from: { compId: 'r3', pin: 1 }, to: { compId: 'led3', pin: 0 }, color: '#2563eb' },
      { id: 'w18', from: { compId: 'led0', pin: 1 }, to: { compId: 'ic1', pin: 6 }, color: '#0891b2' },
      { id: 'w19', from: { compId: 'led1', pin: 1 }, to: { compId: 'ic1', pin: 7 }, color: '#0891b2' },
      { id: 'w20', from: { compId: 'led2', pin: 1 }, to: { compId: 'ic1', pin: 8 }, color: '#0891b2' },
      { id: 'w21', from: { compId: 'led3', pin: 1 }, to: { compId: 'ic1', pin: 9 }, color: '#0891b2' },
    ],
  };
}

export function createBreadboard8051LedLabPreset(): {
  comps: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
} {
  return {
    breadboards: [{ id: 'bb1', x: 320, y: 260, cols: 25 }],
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 180, rotation: 270, value: 5, label: 'VCC 5V' },
      { id: 'g1', type: 'ground', x: 80, y: 340, rotation: 0, value: 0, label: 'GND' },
      { id: 'u1', type: 'mcu8051', x: 200, y: 200, rotation: 0, value: 5, freq: 1.5, mcuProgram: 'blink_alt', label: 'AT89C51' },
      // Resistors on breadboard topStrip row f (y=240): col 2..6 (x=360..440) and col 10..14 (x=520..600)
      { id: 'r1', type: 'resistor', x: 400, y: 240, rotation: 0, value: 220, label: 'R1' },
      { id: 'r2', type: 'resistor', x: 560, y: 240, rotation: 0, value: 220, label: 'R2' },
      // LEDs on breadboard botStrip: col 6..10 and col 14..18
      { id: 'led1', type: 'led', x: 480, y: 300, rotation: 0, value: 2.0, color: 'red', label: 'LED_P1.0' },
      { id: 'led2', type: 'led', x: 640, y: 300, rotation: 0, value: 2.0, color: 'green', label: 'LED_P1.1' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'u1', pin: 0 }, color: '#dc2626' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'bb1', pin: 0, holeId: 'topPlus:0' }, color: '#dc2626', waypoints: [{ x: 100, y: 100 }] },
      { id: 'w3', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'u1', pin: 5 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b', waypoints: [{ x: 260, y: 360 }] },
      { id: 'w5', from: { compId: 'v1', pin: 0 }, to: { compId: 'bb1', pin: 0, holeId: 'botMinus:0' }, color: '#1e293b', waypoints: [{ x: 140, y: 420 }] },
      // P1.0 -> bb1 topStrip:2:0 (R1 left), R1 right col 6 -> botStrip:6:0 (LED1 anode)
      { id: 'w6', from: { compId: 'u1', pin: 1 }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:2:0' }, color: '#ef4444' },
      { id: 'w7', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:6:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:6:0' }, color: '#ef4444' },
      { id: 'w8', from: { compId: 'bb1', pin: 0, holeId: 'botStrip:10:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botMinus:10' }, color: '#1e293b' },
      // P1.1 -> bb1 topStrip:10:0 (R2 left), R2 right col 14 -> botStrip:14:0 (LED2 anode)
      { id: 'w9', from: { compId: 'u1', pin: 2 }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:10:0' }, color: '#16a34a' },
      { id: 'w10', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:14:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:14:0' }, color: '#16a34a' },
      { id: 'w11', from: { compId: 'bb1', pin: 0, holeId: 'botStrip:18:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botMinus:18' }, color: '#1e293b' },
    ],
  };
}

export function createBreadboardBjtNightLightPreset(): {
  comps: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
} {
  return {
    breadboards: [{ id: 'bb1', x: 240, y: 260, cols: 25 }],
    comps: [
      { id: 'v1', type: 'source', x: 100, y: 220, rotation: 270, value: 9, label: 'Pin 9V' },
      { id: 'g1', type: 'ground', x: 100, y: 360, rotation: 0, value: 0, label: 'GND' },
      // R_pullup col 2..6 (topStrip)
      { id: 'r1', type: 'resistor', x: 320, y: 200, rotation: 0, value: 4700, label: 'R_kéo 4.7k' },
      // LDR col 6..10 (botStrip) -> Base divider
      { id: 'ldr1', type: 'ldr', x: 400, y: 320, rotation: 0, value: 4470, wiper: 0.15, label: 'Quang trở' },
      // BJT at (480, 220): B=(440,220)=col 10, C=(500,200)=col 13, E=(500,240)=col 13? Wait C & E share col 13! Rotate BJT 90 deg -> B=(480,180), C=(500,240), E=(460,240)!
      // Check BJT rot=90: local B(-40,0)->(0,-40)=y180, C(20,-20)->(20,20)=x+20,y+20, E(20,20)->(-20,20)=x-20,y+20! So at (480,220) rot 90: B=(480,180) col12, C=(500,240) col13, E=(460,240) col11! All 3 pins on distinct columns!
      { id: 'q1', type: 'bjt', x: 480, y: 220, rotation: 90, value: 120, label: 'BC547' },
      // R_C col 13..17 (botStrip), LED col 17..21 (topStrip)
      { id: 'rc', type: 'resistor', x: 540, y: 300, rotation: 0, value: 220, label: 'R_C' },
      { id: 'led1', type: 'led', x: 620, y: 220, rotation: 0, value: 2.0, color: 'yellow', label: 'Đèn Đêm' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 1 }, to: { compId: 'bb1', pin: 0, holeId: 'topPlus:0' }, color: '#dc2626', waypoints: [{ x: 100, y: 120 }] },
      { id: 'w2', from: { compId: 'v1', pin: 0 }, to: { compId: 'bb1', pin: 0, holeId: 'topMinus:0' }, color: '#1e293b', waypoints: [{ x: 140, y: 280 }, { x: 140, y: 100 }] },
      { id: 'w3', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w4', from: { compId: 'bb1', pin: 0, holeId: 'botMinus:1' }, to: { compId: 'bb1', pin: 0, holeId: 'topMinus:1' }, color: '#1e293b', waypoints: [{ x: 200, y: 420 }, { x: 200, y: 100 }] },
      { id: 'w5', from: { compId: 'bb1', pin: 0, holeId: 'topPlus:2' }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:2:0' }, color: '#dc2626' },
      // col 6 topStrip (r1) -> col 6 botStrip (ldr1) and -> col 12 topStrip (BJT Base)
      { id: 'w6', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:6:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:6:0' }, color: '#eab308' },
      { id: 'w7', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:6:1' }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:12:0' }, color: '#16a34a' },
      { id: 'w8', from: { compId: 'bb1', pin: 0, holeId: 'botStrip:10:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botMinus:10' }, color: '#1e293b' },
      // Emitter col 11 -> topMinus:11
      { id: 'w9', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:11:0' }, to: { compId: 'bb1', pin: 0, holeId: 'topMinus:11' }, color: '#1e293b' },
      // Collector col 13 topStrip -> col 13 botStrip (R_C)
      { id: 'w10', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:13:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:13:0' }, color: '#2563eb' },
      // R_C col 17 botStrip -> LED1 cathode col 21 topStrip? Wait: LED1 anode col 17 (+9V), cathode col 21 -> R_C? Swap: topPlus:21 -> LED1 anode? No LED1 pin 0 is left (col 17), pin 1 is right (col 21). So topPlus:17 -> LED1 anode, LED1 cathode col 21 -> botStrip:17 (R_C)!
      { id: 'w11', from: { compId: 'bb1', pin: 0, holeId: 'topPlus:17' }, to: { compId: 'bb1', pin: 0, holeId: 'topStrip:17:0' }, color: '#dc2626' },
      { id: 'w12', from: { compId: 'bb1', pin: 0, holeId: 'topStrip:21:4' }, to: { compId: 'bb1', pin: 0, holeId: 'botStrip:17:0' }, color: '#ea580c' },
    ],
  };
}

export function createFullPowerSupplyZenerLedPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'ac1', type: 'ac_source', x: 100, y: 180, rotation: 270, value: 12, freq: 1.5, label: 'AC 12Vp' },
      { id: 'd1', type: 'diode', x: 240, y: 80, rotation: 0, value: 0.7, label: 'D_chỉnh lưu' },
      { id: 'c1', type: 'capacitor', x: 360, y: 180, rotation: 90, value: 470, label: 'C_lọc' },
      { id: 'r_han', type: 'resistor', x: 460, y: 80, rotation: 0, value: 150, label: 'R_hạn' },
      { id: 'z1', type: 'zener', x: 560, y: 180, rotation: 270, value: 5.1, label: 'DZ 5.1V' },
      { id: 'r_led', type: 'resistor', x: 680, y: 120, rotation: 90, value: 220, label: 'R_LED' },
      { id: 'led1', type: 'led', x: 680, y: 240, rotation: 90, value: 2.0, color: 'green', label: 'LED_5V' },
      { id: 'g1', type: 'ground', x: 100, y: 340, rotation: 0, value: 0, label: 'GND' },
      {
        id: 'osc1',
        type: 'oscilloscope',
        x: 240,
        y: 340,
        rotation: 0,
        value: 0,
        scopeTimeWindow: 2.0,
        scopeVDiv: 2,
        redTarget: { kind: 'pin', compId: 'z1', pin: 1 },
        blackTarget: { kind: 'pin', compId: 'g1', pin: 0 },
        label: 'Scope_5.1V',
      },
    ],
    wires: [
      { id: 'w1', from: { compId: 'ac1', pin: 1 }, to: { compId: 'd1', pin: 0 }, color: '#ea580c' },
      { id: 'w2', from: { compId: 'd1', pin: 1 }, to: { compId: 'c1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'c1', pin: 0 }, to: { compId: 'r_han', pin: 0 }, color: '#dc2626' },
      { id: 'w4', from: { compId: 'r_han', pin: 1 }, to: { compId: 'z1', pin: 1 }, color: '#eab308' },
      { id: 'w5', from: { compId: 'z1', pin: 1 }, to: { compId: 'r_led', pin: 0 }, color: '#16a34a' },
      { id: 'w6', from: { compId: 'r_led', pin: 1 }, to: { compId: 'led1', pin: 0 }, color: '#16a34a' },
      { id: 'w7', from: { compId: 'led1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w8', from: { compId: 'z1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w9', from: { compId: 'c1', pin: 1 }, to: { compId: 'ac1', pin: 0 }, color: '#1e293b' },
      { id: 'w10', from: { compId: 'ac1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export function createOpampLdrMotorPreset(): { comps: CircuitComp[]; wires: CircuitWire[] } {
  return {
    comps: [
      { id: 'v1', type: 'source', x: 80, y: 200, rotation: 270, value: 12, label: 'VCC 12V' },
      { id: 'ldr1', type: 'ldr', x: 200, y: 120, rotation: 90, value: 4470, wiper: 0.75, label: 'LDR' },
      { id: 'r1', type: 'resistor', x: 200, y: 260, rotation: 90, value: 4700, label: 'R_chia' },
      { id: 'pot1', type: 'pot', x: 320, y: 280, rotation: 0, value: 10000, wiper: 0.5, label: 'RV_Ngưỡng' },
      { id: 'u1', type: 'opamp', x: 400, y: 140, rotation: 0, value: 12, label: 'LM741' },
      { id: 'rb', type: 'resistor', x: 520, y: 160, rotation: 0, value: 470, label: 'R_B' },
      { id: 'q1', type: 'bjt', x: 640, y: 220, rotation: 0, value: 120, label: 'BC547' },
      { id: 'm1', type: 'motor', x: 660, y: 100, rotation: 90, value: 12, label: 'Quạt DC' },
      { id: 'g1', type: 'ground', x: 80, y: 360, rotation: 0, value: 0, label: 'GND' },
    ],
    wires: [
      { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w2', from: { compId: 'v1', pin: 1 }, to: { compId: 'ldr1', pin: 0 }, color: '#dc2626' },
      { id: 'w3', from: { compId: 'ldr1', pin: 1 }, to: { compId: 'r1', pin: 0 }, color: '#eab308' },
      { id: 'w4', from: { compId: 'r1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w5', from: { compId: 'ldr1', pin: 1 }, to: { compId: 'u1', pin: 1 }, color: '#16a34a' },
      { id: 'w6', from: { compId: 'v1', pin: 1 }, to: { compId: 'pot1', pin: 0 }, color: '#dc2626' },
      { id: 'w7', from: { compId: 'pot1', pin: 1 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
      { id: 'w8', from: { compId: 'pot1', pin: 2 }, to: { compId: 'u1', pin: 0 }, color: '#9333ea' },
      { id: 'w9', from: { compId: 'u1', pin: 2 }, to: { compId: 'rb', pin: 0 }, color: '#ea580c' },
      { id: 'w10', from: { compId: 'rb', pin: 1 }, to: { compId: 'q1', pin: 0 }, color: '#ea580c' },
      { id: 'w11', from: { compId: 'v1', pin: 1 }, to: { compId: 'm1', pin: 0 }, color: '#dc2626', waypoints: [{ x: 160, y: 40 }, { x: 660, y: 40 }] },
      { id: 'w12', from: { compId: 'm1', pin: 1 }, to: { compId: 'q1', pin: 1 }, color: '#2563eb' },
      { id: 'w13', from: { compId: 'q1', pin: 2 }, to: { compId: 'g1', pin: 0 }, color: '#1e293b' },
    ],
  };
}

export type TemplateCategory = 'all' | 'mcu' | 'breadboard' | 'filter' | 'amp' | 'basic';

export interface CircuitTemplateItem {
  key: string;
  title: string;
  category: Exclude<TemplateCategory, 'all'>;
  formula: string;
  description: string;
}

export const CIRCUIT_TEMPLATES: CircuitTemplateItem[] = [
  {
    key: 'mcu_8051_blink',
    title: '8051 (3.7.1): Nhấp nháy 4 LED & Scope 3D',
    category: 'mcu',
    formula: 'MOV P1,#55H ↔ #0AAH · R=220Ω',
    description: 'Vi điều khiển AT89C51 điều khiển 4 LED nhiều màu qua điện trở 220Ω, gắn sẵn Đồng hồ 3D và Máy hiện sóng.',
  },
  {
    key: 'mcu_8051_chase',
    title: '8051 (3.7.1): LED chạy đuổi vòng (RL A)',
    category: 'mcu',
    formula: 'MOV A,#01H · RL A · P1.0→P1.3',
    description: 'Dịch chuyển mức Logic HIGH tuần tự qua 4 LED nhiều màu trên Port P1 kèm Đồng hồ đo điện áp chân P1.0.',
  },
  {
    key: 'mcu_8051_traffic',
    title: '8051 (Ứng dụng): Đèn giao thông Đỏ–Vàng–Xanh',
    category: 'mcu',
    formula: 'P1.0 (Đỏ) → P1.2 (Xanh) → P1.1 (Vàng)',
    description: 'Mô phỏng trụ đèn giao thông 3 pha điều khiển bởi AT89C51 với Máy hiện sóng 3D theo dõi chu kỳ pha Đỏ.',
  },
  {
    key: 'mcu_8051_int1',
    title: '8051 (3.7.3): Ngắt ngoài INT1 kích NPN BJT & Còi',
    category: 'mcu',
    formula: 'Vector 0013H · P3.3(INT1) → P1.3 → BC547',
    description: 'Bấm nút SW_INT1 kéo chân P3.3 xuống 0V kích ngắt ngoài bật còi Piezo qua Transistor NPN theo giáo trình.',
  },
  {
    key: 'mcu_8051_ldr_alarm',
    title: '8051 + LDR + BJT: Báo động ánh sáng qua INT1',
    category: 'mcu',
    formula: 'Cầu LDR → INT1 (0013H) → BC547 → Còi',
    description: 'Kết hợp Quang trở LDR kéo chân ngắt ngoài INT1 của AT89C51 để kích còi báo động và đèn LED tự động.',
  },
  {
    key: 'mcu_8051_7seg',
    title: '8051 (3.7.2): Bộ đếm LED 7 đoạn 0 → 9',
    category: 'mcu',
    formula: 'Bảng mã 3Fh, 06h, 5Bh, 4Fh... 6Fh',
    description: 'AT89C51 xuất mã BCD 4-bit ra P1.0–P1.3 lái trực tiếp LED 7 đoạn đếm tuần tự từ 0 đến 9.',
  },
  {
    key: 'mcu_8051_timer_scope',
    title: '8051 (3.4): Timer 0 tạo xung vuông & Scope 3D',
    category: 'mcu',
    formula: 'TMOD=01h · CPL P1.0 · f_tick=11.0592MHz/12',
    description: 'Quan sát dạng sóng xung vuông TTL 0–5V tạo bởi Timer 0 trên màn hình Máy hiện sóng 3D.',
  },
  {
    key: 'mcu_8051_74138_bus',
    title: '8051 + 74LS138 (2.7.2): Giải mã địa chỉ I/O',
    category: 'mcu',
    formula: 'P1.0–P1.2 → A0–A2 · Chọn kênh Y0–Y3',
    description: 'Vi điều khiển AT89C51 xuất địa chỉ nhị phân sang IC 74LS138 để bật chọn từng thiết bị ngoại vi tích cực thấp.',
  },
  {
    key: 'mcu_74138',
    title: 'IC 74LS138 (2.7.2): Giải mã địa chỉ 3→8 & Dãy LED',
    category: 'mcu',
    formula: 'Y_k = LOW khi k = A2·4 + A1·2 + A0',
    description: 'Bật/tắt 3 công tắc địa chỉ A0, A1, A2 để chọn ngõ ra giải mã tích cực thấp Y0–Y3 làm sáng LED tương ứng.',
  },
  {
    key: 'mcu_74138_clock_scan',
    title: 'Clock XTAL + 74LS138: Quét kênh tự động & Scope',
    category: 'mcu',
    formula: 'XTAL CLK → A0 · Quét Y0 ↔ Y1 / Y2 ↔ Y3',
    description: 'Dùng bộ phát xung Clock tự động đảo bit địa chỉ A0 của 74LS138 và đo dạng sóng ngõ ra Y0 trên Scope 3D.',
  },
  {
    key: 'mcu_clock_7seg',
    title: 'Xung Clock XTAL + LED 7 đoạn BCD & Scope 3D',
    category: 'mcu',
    formula: 'CLK 0/+5V · BCD Hex 0..7',
    description: 'Kết hợp bộ phát xung Clock, công tắc và nút nhấn lái LED 7 đoạn hiển thị giá trị nhị phân theo thời gian thực.',
  },
  {
    key: 'bb_8051_led_lab',
    title: 'Breadboard + 8051: Thực hành cắm Port P1 & LED',
    category: 'breadboard',
    formula: 'AT89C51 → Dây cắm Breadboard → R 220Ω + LED',
    description: 'Nối dây trực tiếp từ Port P1 của AT89C51 sang bảng cắm Breadboard Tinkercad để lái dàn LED tải.',
  },
  {
    key: 'bb_bjt_ldr_nightlight',
    title: 'Breadboard: Đèn đêm tự động LDR + BJT BC547',
    category: 'breadboard',
    formula: 'Cầu LDR + R 4.7kΩ → Base BC547 → LED',
    description: 'Lắp mạch cảm biến ánh sáng dùng Quang trở LDR và Transistor NPN trên Breadboard tự động bật đèn khi tối.',
  },
  {
    key: 'basic_switch_pot_vom',
    title: 'Công tắc, Biến trở chỉnh sáng LED & Đo VOM 3D',
    category: 'basic',
    formula: 'V_wiper = Vin·α · I_LED = (V − 2V)/R',
    description: 'Mạch mẫu tổng hợp Công tắc, Biến trở 1kΩ, Điện trở 220Ω, LED xanh và 2 Đồng hồ vạn năng đo Áp & Dòng.',
  },
  {
    key: 'basic_pot_motor_vom',
    title: 'Điều tốc Động cơ DC bằng Biến trở & Công tắc',
    category: 'basic',
    formula: 'RPM ∝ V_motor · Diode D_xả chống sét cảm ứng',
    description: 'Sử dụng Ắc quy 12V, Công tắc, Nút nhấn, Biến trở điều tốc Motor DC kèm Diode bảo vệ và VOM 3D.',
  },
  {
    key: 'bb_switch_pot_rgb',
    title: 'Breadboard: Công tắc, Nút nhấn, Biến trở & Dàn LED',
    category: 'breadboard',
    formula: 'K_chính + RV + R 220Ω + LED xanh/đỏ + VOM',
    description: 'Trải nghiệm cắm Breadboard tổng hợp nhiều linh kiện cơ bản cùng lúc với Đồng hồ vạn năng 3D đo trực tiếp LED.',
  },
  {
    key: 'bb_led_button',
    title: 'Breadboard: Đèn LED & Nút nhấn 9V',
    category: 'breadboard',
    formula: 'I = (9V − 2V) / 330Ω ≈ 21.2 mA',
    description: 'Mạch cắm thử Breadboard chuẩn Tinkercad với Pin 9V, Nút nhấn 4 chân, Điện trở 330Ω và LED.',
  },
  {
    key: 'bb_motor_pot',
    title: 'Breadboard: Động cơ DC & Chiết áp',
    category: 'breadboard',
    formula: 'RPM ∝ V_motor (Điều chỉnh bằng Biến trở)',
    description: 'Điều tốc động cơ DC trực tiếp bằng chiết áp xoay và công tắc trượt trên bảng mạch Breadboard.',
  },
  {
    key: 'bb_ldr_buzzer',
    title: 'Breadboard: Quang trở LDR, LED & Còi',
    category: 'breadboard',
    formula: 'R_LDR ∈ [200Ω .. 100kΩ] theo ánh sáng',
    description: 'Thay đổi cường độ sáng trên Quang trở LDR để kích hoạt đèn báo và còi chíp Piezo.',
  },
  {
    key: 'filter_ac_scope',
    title: 'Chỉnh lưu AC–DC + Tụ lọc & Máy hiện sóng 3D',
    category: 'filter',
    formula: 'V_DC ≈ Vp − 0.7V · Gợn sóng ΔV',
    description: 'Quan sát trực tiếp trên Máy hiện sóng 3D cách tụ C_lọc san phẳng bán kỳ AC sau Diode D1.',
  },
  {
    key: 'amp_opamp_comparator',
    title: 'Op-Amp LM741 So sánh ngưỡng Quang trở & Còi',
    category: 'amp',
    formula: 'Vout = +Vsat khi V(+) > V(−)',
    description: 'Kết hợp Quang trở LDR, Biến trở chỉnh ngưỡng và LM741 bật còi + LED khi trời tối/sáng.',
  },
  {
    key: 'lowpass',
    title: 'Lọc thông thấp RC (Low-Pass)',
    category: 'filter',
    formula: 'fc = 1/(2πRC) ≈ 1.59 Hz',
    description: 'Cho tín hiệu tần số thấp qua C1, suy giảm tần số cao khi tăng f của AC1.',
  },
  {
    key: 'highpass',
    title: 'Lọc thông cao RC (High-Pass)',
    category: 'filter',
    formula: 'fc = 1/(2πRC) ≈ 1.59 Hz',
    description: 'Chặn thành phần DC/tần số thấp, dẫn tín hiệu tần số cao qua tải R1.',
  },
  {
    key: 'inverting_amp',
    title: 'Khuếch đại đảo (Inverting Amp)',
    category: 'amp',
    formula: 'Av = −Rf / Rin = −2.2×',
    description: 'Op-Amp U1 đảo pha 180° và khuếch đại biên độ ngõ vào lên 2.2 lần.',
  },
  {
    key: 'noninverting_amp',
    title: 'Khuếch đại không đảo',
    category: 'amp',
    formula: 'Av = 1 + Rf / R1 = +3.2×',
    description: 'Ngõ ra cùng pha ngõ vào Vin với trở kháng vào cao qua chân (+).',
  },
  {
    key: 'rc',
    title: 'Mạch nạp / xả tụ RC',
    category: 'basic',
    formula: 'τ = R · C ≈ 0.10 s',
    description: 'Quan sát đường cong nạp/xả hàm mũ trên tụ C1 khi đóng mở khóa K1.',
  },
  {
    key: 'rlc',
    title: 'Mạch dao động RLC nối tiếp',
    category: 'filter',
    formula: 'f0 = 1 / (2π√LC)',
    description: 'Đáp ứng quá độ tắt dần giữa cuộn cảm L1 và tụ điện C1.',
  },
  {
    key: 'lc_oscillator',
    title: 'Mạch dao động LC (Cộng hưởng điện từ)',
    category: 'filter',
    formula: 'f0 = 1 / (2π√LC) ≈ 19 Hz',
    description: 'Chuyển hóa năng lượng tuần hoàn giữa điện trường tụ C1 và từ trường cuộn cảm L1 kèm Scope 3D.',
  },
  {
    key: 'wheatstone',
    title: 'Mạch cầu Wheatstone (Cầu đo cân bằng)',
    category: 'basic',
    formula: 'V_AB = 0 khi R1 / R2 = R3 / Rx',
    description: 'Điều chỉnh biến trở Rx quanh điểm cân bằng để quan sát chênh áp ΔV_AB về 0V trên VOM 3D.',
  },
  {
    key: 'flyback_rl',
    title: 'Đóng ngắt Cuộn cảm & Diode dập xung',
    category: 'basic',
    formula: 'e = −L · (dI/dt)',
    description: 'Mở công tắc K1 để xem Diode D_fly xả dòng tự cảm từ cuộn cảm L1.',
  },
  {
    key: 'bjt',
    title: 'Khuếch đại & Đóng cắt BJT',
    category: 'amp',
    formula: 'Ic = β · Ib (β = 120)',
    description: 'Dùng dòng nhỏ chân Base điều khiển dòng lớn qua LED ở cực Collector.',
  },
  {
    key: 'divider',
    title: 'Cầu phân áp Biến trở',
    category: 'basic',
    formula: 'Vout = Vin · R2 / (R1+R2)',
    description: 'Điều chỉnh con trượt RV1 để chia điện áp DC cấp cho tải R_tai.',
  },
  {
    key: 'rectifier',
    title: 'Chỉnh lưu AC–DC nửa chu kỳ',
    category: 'basic',
    formula: 'Vd ≈ 0.7V · Lọc tụ C1',
    description: 'Diode D1 cắt bán kỳ âm và tụ C1 san phẳng gợn sóng trên tải.',
  },
  {
    key: 'zener',
    title: 'Ổn áp Diode Zener 5.1V',
    category: 'basic',
    formula: 'Vout ≈ Vz = 5.1 V',
    description: 'Giữ điện áp tải ổn định ở 5.1V nhờ vùng đánh thủng ngược an toàn.',
  },
  {
    key: 'basic_full_power_zener',
    title: 'Nguồn ổn áp hoàn chỉnh: AC → Lọc C → Zener 5.1V',
    category: 'basic',
    formula: 'AC 12Vp → D1 + C_lọc → DZ 5.1V → LED',
    description: 'Mạch nguồn tuyến tính hoàn chỉnh cấp áp chuẩn 5.1V nuôi LED và kiểm chứng độ phẳng trên Oscilloscope 3D.',
  },
  {
    key: 'amp_opamp_ldr_motor',
    title: 'Op-Amp LM741 + BJT: Quạt DC tự động theo ánh sáng',
    category: 'amp',
    formula: 'LM741 So sánh → BC547 → Quạt DC 12V',
    description: 'Dùng Op-Amp LM741 so sánh điện áp quang trở LDR và đóng cắt Transistor BC547 chạy động cơ quạt.',
  },
  {
    key: 'led',
    title: 'Đèn LED & Điện trở hạn dòng',
    category: 'basic',
    formula: 'I = (V − Vf) / R',
    description: 'Mạch cơ bản bảo vệ LED khỏi quá dòng bằng điện trở nối tiếp.',
  },
];

// ---------- Fault Diagnosis ("Thợ sửa mạch") Missions ----------

export const FAULT_MISSIONS: FaultMission[] = [
  {
    id: 'fault-open-r',
    title: 'Ca 1: Đèn LED không sáng dù đã đóng công tắc',
    difficulty: 'Cơ bản',
    symptom: 'Nguồn V1 = 9V, K1 đã đóng nhưng LED1 tắt hoàn toàn và dòng mạch = 0 mA.',
    hint: 'Dùng que đo VOM đo điện áp rơi trên từng linh kiện. Linh kiện bị hở mạch (đứt ngầm) sẽ giữ gần như toàn bộ 9V hai đầu của nó!',
    faultyCompId: 'r1',
    faultType: 'open',
    explanation: 'Điện trở R1 bị cháy đứt hở mạch (Open circuit), làm dòng toàn mạch bằng 0 nên toàn bộ 9V rơi trên hai đầu R1 và chân Anode LED = 0V.',
    build: () => createLedPreset(9),
  },
  {
    id: 'fault-short-cap',
    title: 'Ca 2: Tụ lọc nguồn làm sụt áp và quá nhiệt điện trở',
    difficulty: 'Trung bình',
    symptom: 'Mạch ổn áp Zener bị mất điện áp ra (Vout ≈ 0V) và điện trở hạn dòng nóng bất thường.',
    hint: 'Đo áp trên DZ1 và R_tai thấy xấp xỉ 0V, trong khi dòng qua R_han tăng vọt lên > 50mA. Linh kiện mắc song song ngõ ra nào đang bị chập?',
    faultyCompId: 'z1',
    faultType: 'short',
    explanation: 'Diode Zener DZ1 bị đánh thủng nối tắt (Short circuit), kéo toàn bộ điện áp ngõ ra xuống 0V và làm dòng qua R_han tăng cao.',
    build: () => createZenerPreset(),
  },
  {
    id: 'fault-reversed-led',
    title: 'Ca 3: Mạch có đủ áp 9V ở đầu vào nhưng LED im lìm',
    difficulty: 'Cơ bản',
    symptom: 'Công tắc K1 đóng, đo áp trước LED1 thấy 9V so với GND nhưng không có dòng chảy qua.',
    hint: 'So sánh điện áp Anode và Cathode của linh kiện bán dẫn. Nếu bị lắp ngược cực, nó sẽ chặn dòng điện một chiều!',
    faultyCompId: 'led1',
    faultType: 'reversed',
    explanation: 'LED1 bị lắp ngược cực Anode-Cathode bên trong, khiến tiếp giáp P-N bị phân cực ngược và chặn dòng điện hoàn toàn.',
    build: () => createLedPreset(9),
  },
  {
    id: 'fault-open-bjt-rb',
    title: 'Ca 4: Transistor BJT không kích sáng tải LED',
    difficulty: 'Nâng cao',
    symptom: 'Công tắc K_base đã đóng nhưng LED1 trên cực Collector vẫn tối, V_C = 9V.',
    hint: 'Kiểm tra điện áp chân Base (chân B) của Q1 so với GND. Nếu V_B ≈ 0V dù trước R_B có 9V thì đường kích dòng Base đã bị đứt!',
    faultyCompId: 'rb',
    faultType: 'open',
    explanation: 'Điện trở kích cực gốc R_B bị đứt mạch làm I_B = 0 μA, Transistor Q1 rơi vào vùng ngắt (Cut-off) nên LED1 không sáng.',
    build: () => createBjtPreset(),
  },
  {
    id: 'fault-leaky-cap',
    title: 'Ca 5: Tụ điện rò điện làm sụt áp nạp trong mạch RC',
    difficulty: 'Trung bình',
    symptom: 'Nguồn V1 = 12V nhưng điện áp trên tụ C1 chỉ nạp lên được ~6.5V rồi đứng yên, đồng thời có dòng rò ~25mA chảy liên tục qua R1.',
    hint: 'Đo áp trên C1 và mở Oscilloscope: ở mạch RC tốt, V_C phải tiến tới 12V và dòng I → 0mA. Nếu V_C bị ghìm thấp và tụ tự tụt áp khi mở K1, tụ đang bị rò điện môi!',
    faultyCompId: 'c1',
    faultType: 'leaky',
    explanation: 'Tụ điện hóa C1 bị khô/rò điện môi (R_leak ≈ 260Ω song song bên trong), tạo thành cầu phân áp với R1 khiến điện áp tụ không thể đạt 12V và liên tục tiêu hao dòng rò.',
    build: () => createRcPreset(12, 220, 470),
  },
  {
    id: 'fault-burned-r',
    title: 'Ca 6: Điện trở cháy đứt ngầm do quá tải công suất',
    difficulty: 'Cơ bản',
    symptom: 'Nguồn V1 = 12V đã bật, K1 đóng nhưng mạch mất dòng hoàn toàn (0 mA) và LED1 tắt.',
    hint: 'Đặt que đỏ (+) và đen (−) của VOM lên hai đầu điện trở R1. Nếu thấy đủ 12V rơi trên R1 mà dòng bằng 0 mA thì R1 đã bị cháy đứt lõi!',
    faultyCompId: 'r1',
    faultType: 'burned',
    explanation: 'Điện trở R1 bị cháy đứt (Open-circuit burnout), cắt đứt dòng điện qua nhánh LED1 và giữ toàn bộ hiệu điện thế nguồn hai đầu linh kiện hỏng.',
    build: () => createLedPreset(12),
  },
  {
    id: 'fault-leaky-diode',
    title: 'Ca 7: Diode chỉnh lưu bị rò ngược làm gợn sóng tải DC',
    difficulty: 'Nâng cao',
    symptom: 'Mạch chỉnh lưu AC-DC có điện áp ngõ ra bị kéo tụt và xuất hiện gợn sóng âm bất thường trên Oscilloscope.',
    hint: 'Chuyển Oscilloscope xuống 2 V/div và kẹp que VOM vào hai đầu tải R_tai: nếu bán kỳ âm lọt qua Diode, tiếp giáp P-N đang bị rò ngược!',
    faultyCompId: 'd1',
    faultType: 'leaky',
    explanation: 'Diode chỉnh lưu D1 bị suy hao lớp tiếp giáp (Reverse leakage), không còn khóa hoàn toàn ở bán kỳ âm khiến tụ lọc C1 bị xả ngược về nguồn AC.',
    build: () => createRectifierPreset(),
  },
  {
    id: 'fault-open-8051-int1-r',
    title: 'Ca 8: Vi điều khiển 8051 báo còi liên tục dù chưa nhấn nút INT1',
    difficulty: 'Trung bình',
    symptom: 'Mạch ngắt ngoài INT1 (3.7.3) vừa cấp nguồn đã kích còi Piezo kêu liên tục dù nút nhấn SW_INT1 đang ở trạng thái MỞ.',
    hint: 'Đo điện áp chân INT1 (P3.3) của AT89C51 so với GND. Ở trạng thái chờ, điện trở kéo lên R1_10k phải giữ P3.3 ở mức +5V; nếu bị đứt, chân INT1 thả nổi xuống mức 0V!',
    faultyCompId: 'r1',
    faultType: 'open',
    explanation: 'Điện trở kéo lên R1_10k bị đứt mạch (Open) khiến chân INT1 của AT89C51 mất mức logic HIGH +5V, liên tục rơi vào trạng thái kích ngắt 0013H.',
    build: () => {
      const p = create8051Int1BuzzerPreset();
      return { comps: p.comps.map((c) => (c.id === 'pb1' ? { ...c, value: 0 } : c)), wires: p.wires };
    },
  },
  {
    id: 'fault-open-74138-y1',
    title: 'Ca 9: IC 74LS138 chọn địa chỉ 001 nhưng LED kênh Y1 không sáng',
    difficulty: 'Nâng cao',
    symptom: 'Đã bật công tắc A0=1, A1=0, A2=0 (kênh Y1 = 0V), IC 74LS138 báo Y1 ACTIVE nhưng CS_Y1 vẫn tắt hoàn toàn.',
    hint: 'Dùng que đo VOM kiểm tra áp tại chân Y1 của 74LS138 (≈ 0V) và áp trên điện trở R_Y1. Điện trở hạn dòng nào đang bị hở mạch?',
    faultyCompId: 'r1',
    faultType: 'burned',
    explanation: 'Điện trở R_Y1 bị cháy đứt ngầm làm hở nhánh sink dòng từ +5V qua LED CS_Y1 về chân Y1 của IC 74LS138.',
    build: () => create74138DecoderPreset(),
  },
];

// ---------- 3D/2D Multimeter Probe Geometry & Live Measurement Helpers ----------

export function getWirePolylinePoints(
  wire: CircuitWire,
  components: CircuitComp[],
  breadboards: BreadboardObj[]
): { x: number; y: number }[] {
  const pA = getPinRefPosition(wire.from, components, breadboards);
  const pB = getPinRefPosition(wire.to, components, breadboards);
  if (!pA || !pB) return [];
  return [pA, ...(wire.waypoints ?? []), pB];
}

export function getPointOnWirePolyline(pts: { x: number; y: number }[], t: number): { x: number; y: number } | null {
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  const clamped = Math.max(0, Math.min(1, t));
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(d);
    totalLen += d;
  }
  if (totalLen < 1e-4) return pts[0];
  const targetDist = clamped * totalLen;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const l = segLens[i];
    if (acc + l >= targetDist || i === segLens.length - 1) {
      const localT = l > 1e-4 ? Math.max(0, Math.min(1, (targetDist - acc) / l)) : 0;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * localT,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * localT,
      };
    }
    acc += l;
  }
  return pts[pts.length - 1];
}

export function closestPointOnWirePolyline(
  pts: { x: number; y: number }[],
  px: number,
  py: number
): { x: number; y: number; t: number; dist: number } | null {
  if (pts.length < 2) return null;
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(d);
    totalLen += d;
  }
  if (totalLen < 1e-4) return { x: pts[0].x, y: pts[0].y, t: 0.5, dist: Math.hypot(px - pts[0].x, py - pts[0].y) };

  let bestDist = Infinity;
  let bestX = pts[0].x;
  let bestY = pts[0].y;
  let bestLen = 0;
  let acc = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const ay = pts[i].y;
    const bx = pts[i + 1].x;
    const by = pts[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const u = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;
    const cx = ax + u * dx;
    const cy = ay + u * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < bestDist) {
      bestDist = d;
      bestX = cx;
      bestY = cy;
      bestLen = acc + u * segLens[i];
    }
    acc += segLens[i];
  }

  return { x: bestX, y: bestY, t: Math.max(0, Math.min(1, bestLen / totalLen)), dist: bestDist };
}

export function getProbeTargetPosition(
  target: ProbeTarget | null | undefined,
  components: CircuitComp[],
  wires: CircuitWire[],
  breadboards: BreadboardObj[]
): { x: number; y: number } | null {
  if (!target) return null;
  if (target.kind === 'pin') {
    const c = components.find((x) => x.id === target.compId);
    return c ? getPinPosition(c, target.pin) : null;
  }
  if (target.kind === 'hole') {
    const bb = breadboards.find((b) => b.id === target.bbId);
    if (!bb) return null;
    const h = getBreadboardHoleById(bb, target.holeId);
    return h ? { x: h.x, y: h.y } : null;
  }
  if (target.kind === 'component') {
    const c = components.find((x) => x.id === target.compId);
    return c ? { x: c.x, y: c.y } : null;
  }
  if (target.kind === 'wire') {
    const w = wires.find((x) => x.id === target.wireId);
    if (!w) return null;
    const pts = getWirePolylinePoints(w, components, breadboards);
    return getPointOnWirePolyline(pts, target.t);
  }
  return null;
}

export function describeProbeTargetInfo(
  target: ProbeTarget | null | undefined,
  components: CircuitComp[],
  wires: CircuitWire[],
  breadboards: BreadboardObj[]
): string {
  if (!target) return 'Chưa gắn';
  if (target.kind === 'pin') {
    const c = components.find((x) => x.id === target.compId);
    return c ? `${c.label}:${getPinName(c.type, target.pin)}` : 'Chân LK';
  }
  if (target.kind === 'hole') {
    const bb = breadboards.find((b) => b.id === target.bbId);
    const h = bb ? getBreadboardHoleById(bb, target.holeId) : null;
    return h ? h.label : target.holeId;
  }
  if (target.kind === 'component') {
    const c = components.find((x) => x.id === target.compId);
    return c ? c.label : 'Linh kiện';
  }
  if (target.kind === 'wire') {
    const idx = wires.findIndex((w) => w.id === target.wireId);
    const w = idx >= 0 ? wires[idx] : null;
    const pct = Math.round(Math.max(0, Math.min(1, target.t)) * 100);
    if (!w) return `Dây (${pct}%)`;
    const fromComp = w.from.holeId ? 'BB' : components.find((c) => c.id === w.from.compId)?.label ?? '?';
    const toComp = w.to.holeId ? 'BB' : components.find((c) => c.id === w.to.compId)?.label ?? '?';
    return `Dây ${fromComp}→${toComp} (${pct}%)`;
  }
  return 'Chưa gắn';
}

export function getVoltageAtProbeTarget(
  target: ProbeTarget | null | undefined,
  components: CircuitComp[],
  wires: CircuitWire[],
  nodeVoltages: Record<string, number>
): number | null {
  if (!target) return null;
  if (target.kind === 'pin') {
    return nodeVoltages[`${target.compId}:${target.pin}`] ?? 0;
  }
  if (target.kind === 'hole') {
    return nodeVoltages[`${target.bbId}::${target.holeId}`] ?? 0;
  }
  if (target.kind === 'component') {
    const c = components.find((x) => x.id === target.compId);
    if (!c) return null;
    return nodeVoltages[`${c.id}:0`] ?? 0;
  }
  if (target.kind === 'wire') {
    const w = wires.find((x) => x.id === target.wireId);
    if (!w) return null;
    const vA = nodeVoltages[getPinRefKey(w.from)] ?? 0;
    const vB = nodeVoltages[getPinRefKey(w.to)] ?? 0;
    const t = Math.max(0, Math.min(1, target.t));
    return vA + (vB - vA) * t;
  }
  return null;
}

export interface MultimeterEvaluation {
  mode: MultimeterMeasureMode;
  numericVal: number;
  displayText: string;
  unit: string;
  targetLabel: string;
  hasMeasurement: boolean;
}

export function evaluateMultimeterReading(
  meter: CircuitComp,
  components: CircuitComp[],
  wires: CircuitWire[],
  breadboards: BreadboardObj[],
  solvedComps: Record<string, SolvedCompState>,
  solvedWires: Record<string, SolvedWireState>,
  nodeVoltages: Record<string, number>
): MultimeterEvaluation {
  const mode: MultimeterMeasureMode = meter.meterMode === 'I' ? 'I' : 'V';
  const red = meter.redTarget ?? null;
  const black = meter.blackTarget ?? null;

  // Check if multimeter's own physical terminals (pin 0 / pin 1) have wires attached
  const hasWiredTerminal = wires.some(
    (w) =>
      (w.from.compId === meter.id && !w.from.holeId) ||
      (w.to.compId === meter.id && !w.to.holeId)
  );

  if (mode === 'V') {
    let val = 0;
    let hasMeasurement = false;
    let targetLabel = 'Kéo que đo vào mạch';

    if (red) {
      hasMeasurement = true;
      if (red.kind === 'component' && !black) {
        const st = solvedComps[red.compId];
        val = st ? st.vDrop : 0;
        const c = components.find((x) => x.id === red.compId);
        targetLabel = c ? `Hai đầu ${c.label}` : 'Linh kiện';
      } else {
        const vR = getVoltageAtProbeTarget(red, components, wires, nodeVoltages) ?? 0;
        const vB = black ? getVoltageAtProbeTarget(black, components, wires, nodeVoltages) ?? 0 : 0;
        val = vR - vB;
        const rName = describeProbeTargetInfo(red, components, wires, breadboards);
        targetLabel = black
          ? `${rName} − ${describeProbeTargetInfo(black, components, wires, breadboards)}`
          : `${rName} (vs GND)`;
      }
    } else if (black) {
      hasMeasurement = true;
      val = -(getVoltageAtProbeTarget(black, components, wires, nodeVoltages) ?? 0);
      targetLabel = `GND − ${describeProbeTargetInfo(black, components, wires, breadboards)}`;
    } else if (hasWiredTerminal) {
      hasMeasurement = true;
      const st = solvedComps[meter.id];
      val = st ? st.vPin1 - st.vPin0 : 0;
      targetLabel = 'Cổng V·I (+) − COM';
    }

    const displayText = `${val >= 0 ? '+' : '−'}${Math.abs(val).toFixed(2)} V`;
    return { mode, numericVal: val, displayText, unit: 'V', targetLabel, hasMeasurement };
  }

  // Current (I) mode
  let iMa = 0;
  let hasMeasurement = false;
  let targetLabel = 'Chạm dây / linh kiện';

  const probeForI = red ?? black;
  if (probeForI) {
    hasMeasurement = true;
    targetLabel = describeProbeTargetInfo(probeForI, components, wires, breadboards);
    if (probeForI.kind === 'wire') {
      iMa = solvedWires[probeForI.wireId]?.currentMa ?? 0;
    } else if (probeForI.kind === 'component') {
      iMa = solvedComps[probeForI.compId]?.currentMa ?? 0;
    } else if (probeForI.kind === 'pin') {
      const targetComp = components.find((c) => c.id === probeForI.compId);
      const isMultiPin =
        targetComp &&
        (targetComp.type === 'bjt' ||
          targetComp.type === 'pot' ||
          targetComp.type === 'opamp' ||
          targetComp.type === 'mcu8051' ||
          targetComp.type === 'dec74138' ||
          targetComp.type === 'sevenseg');

      // Sum connected wire currents entering/leaving this pin when multi-terminal or unambiguous
      let pinWireSum = 0;
      let wireCount = 0;
      for (const w of wires) {
        if (w.from.compId === probeForI.compId && w.from.pin === probeForI.pin && !w.from.holeId) {
          pinWireSum += solvedWires[w.id]?.currentMa ?? 0;
          wireCount++;
        } else if (w.to.compId === probeForI.compId && w.to.pin === probeForI.pin && !w.to.holeId) {
          pinWireSum -= solvedWires[w.id]?.currentMa ?? 0;
          wireCount++;
        }
      }

      const st = solvedComps[probeForI.compId];
      if (isMultiPin && wireCount > 0) {
        iMa = pinWireSum;
      } else if (st && Math.abs(st.currentMa) > 0.01) {
        iMa = st.currentMa;
      } else if (wireCount > 0) {
        iMa = pinWireSum;
      }
    } else if (probeForI.kind === 'hole') {
      const bb = breadboards.find((b) => b.id === probeForI.bbId);
      const hole = bb ? getBreadboardHoleById(bb, probeForI.holeId) : null;
      const wireHit = wires.find(
        (w) =>
          (w.from.compId === probeForI.bbId && w.from.holeId === probeForI.holeId) ||
          (w.to.compId === probeForI.bbId && w.to.holeId === probeForI.holeId)
      );
      if (wireHit) {
        iMa = solvedWires[wireHit.id]?.currentMa ?? 0;
      } else if (hole) {
        const compHit = components.find(
          (c) =>
            c.type !== 'multimeter' &&
            c.type !== 'oscilloscope' &&
            getCompPins(c.type).some((p) => {
              const pt = getPinPosition(c, p);
              return pt.x === hole.x && pt.y === hole.y;
            })
        );
        if (compHit) {
          iMa = solvedComps[compHit.id]?.currentMa ?? 0;
        } else if (bb) {
          // Check same electrical strip on breadboard for connected component or jumper current
          const stripHoles = getBreadboardHoles(bb).filter((h) => h.netKey === hole.netKey);
          const stripWire = wires.find((w) =>
            stripHoles.some(
              (sh) =>
                (w.from.compId === bb.id && w.from.holeId === sh.holeId) ||
                (w.to.compId === bb.id && w.to.holeId === sh.holeId)
            )
          );
          if (stripWire) {
            iMa = solvedWires[stripWire.id]?.currentMa ?? 0;
          } else {
            const stripComp = components.find(
              (c) =>
                c.type !== 'multimeter' &&
                c.type !== 'oscilloscope' &&
                getCompPins(c.type).some((p) => {
                  const pt = getPinPosition(c, p);
                  return stripHoles.some((sh) => sh.x === pt.x && sh.y === pt.y);
                })
            );
            iMa = stripComp ? solvedComps[stripComp.id]?.currentMa ?? 0 : 0;
          }
        }
      }
    }
  } else if (hasWiredTerminal) {
    hasMeasurement = true;
    iMa = solvedComps[meter.id]?.currentMa ?? 0;
    targetLabel = 'Dòng qua cổng V·I';
  }

  const absMa = Math.abs(iMa);
  const displayText =
    absMa >= 1000
      ? `${iMa < 0 ? '−' : ''}${(absMa / 1000).toFixed(2)} A`
      : `${iMa < 0 ? '−' : ''}${absMa.toFixed(1)} mA`;

  return {
    mode,
    numericVal: iMa,
    displayText,
    unit: absMa >= 1000 ? 'A' : 'mA',
    targetLabel,
    hasMeasurement,
  };
}

export interface OscilloscopeSampleEval {
  vInst: number;
  targetLabel: string;
  hasMeasurement: boolean;
}

export interface OscilloscopeTraceData {
  samples: number[];
  vInst: number;
  vmin: number;
  vmax: number;
  vpp: number;
  targetLabel: string;
  hasMeasurement: boolean;
}

export function evaluateOscilloscopeSample(
  scope: CircuitComp,
  components: CircuitComp[],
  wires: CircuitWire[],
  breadboards: BreadboardObj[],
  solvedComps: Record<string, SolvedCompState>,
  nodeVoltages: Record<string, number>
): OscilloscopeSampleEval {
  const ch1 = scope.redTarget ?? null;
  const gnd = scope.blackTarget ?? null;

  const hasWiredTerminal = wires.some(
    (w) =>
      (w.from.compId === scope.id && !w.from.holeId) ||
      (w.to.compId === scope.id && !w.to.holeId)
  );

  let vInst = 0;
  let hasMeasurement = false;
  let targetLabel = 'Kéo que CH1 (+) vào mạch';

  if (ch1) {
    hasMeasurement = true;
    if (ch1.kind === 'component' && !gnd) {
      const c = components.find((x) => x.id === ch1.compId);
      const st = solvedComps[ch1.compId];
      // Positive voltage difference across component terminals
      vInst = st ? st.vPin0 - st.vPin1 : 0;
      targetLabel = c ? `CH1: Hai đầu ${c.label}` : 'CH1: Linh kiện';
    } else {
      const vR = getVoltageAtProbeTarget(ch1, components, wires, nodeVoltages) ?? 0;
      const vB = gnd ? getVoltageAtProbeTarget(gnd, components, wires, nodeVoltages) ?? 0 : 0;
      vInst = vR - vB;
      const rName = describeProbeTargetInfo(ch1, components, wires, breadboards);
      targetLabel = gnd
        ? `${rName} − ${describeProbeTargetInfo(gnd, components, wires, breadboards)}`
        : `CH1: ${rName}`;
    }
  } else if (gnd) {
    hasMeasurement = true;
    vInst = -(getVoltageAtProbeTarget(gnd, components, wires, nodeVoltages) ?? 0);
    targetLabel = `0V − ${describeProbeTargetInfo(gnd, components, wires, breadboards)}`;
  } else if (hasWiredTerminal) {
    hasMeasurement = true;
    const st = solvedComps[scope.id];
    vInst = st ? st.vPin1 - st.vPin0 : 0;
    targetLabel = 'Cổng CH1 (+) − GND';
  }

  return { vInst, targetLabel, hasMeasurement };
}
