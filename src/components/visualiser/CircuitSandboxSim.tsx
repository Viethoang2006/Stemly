import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  ToggleLeft,
  ToggleRight,
  Activity,
  Wrench,
  Eye,
  Save,
  FolderOpen,
  Download,
  Upload,
  CheckCircle2,
  X,
  PanelRightClose,
  PanelRightOpen,
  Flame,
  Shuffle,
  EyeOff,
  BookOpen,
  Cpu,
  Sparkles,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Undo2,
  Redo2,
  Copy,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  Moon,
  Plus,
  ArrowLeftRight,
  Cable,
  Tag,
  Gauge,
  Box,
  Hand,
  ChevronLeft,
  ChevronRight,
  Glasses,
  Compass,
  Crosshair,
  Minimize2,
} from 'lucide-react';
import { CircuitCanvas3D, CircuitCanvas3DHandle } from './CircuitCanvas3D';
import {
  GyroPermissionState,
  needsGyroPermissionPrompt,
  requestGyroPermission,
} from './vrGyroControls';
import { DigitalOscilloscopeDeck } from './DigitalOscilloscopeDeck';
import { RealTimeIUChartWidget } from './RealTimeIUChartWidget';
import { MicroprocessorLabDrawer } from './MicroprocessorLabDrawer';
import { BreadboardPaletteIcon, CircuitComponentSvg, CompPaletteIcon } from './CircuitCompArtwork';
import { TinkercadBreadboardSvg } from './TinkercadBreadboardSvg';
import { MultimeterMode, TinkercadMultimeterWidget } from './TinkercadMultimeterWidget';
import {
  BreadboardHole,
  BreadboardObj,
  CIRCUIT_TEMPLATES,
  CircuitComp,
  CircuitWire,
  CompType,
  FAULT_LABELS,
  FAULT_MISSIONS,
  FaultMission,
  FaultType,
  GRID,
  LED_COLOR_MAP,
  LedColorKey,
  MCU_8051_PROGRAMS,
  Mcu8051ProgramId,
  OscilloscopeTraceData,
  PinIndex,
  PinRef,
  ProbeTarget,
  SEVEN_SEG_CODES,
  SVG_H,
  SVG_W,
  SavedCircuitProject,
  SolvedCompState,
  SolvedWireState,
  TemplateCategory,
  TraceSample,
  WIRE_COLOR_OPTIONS,
  closestPointOnWirePolyline,
  create74138ClockScanPreset,
  create74138DecoderPreset,
  create8051And74138BusPreset,
  create8051BlinkPreset,
  create8051ChasePreset,
  create8051Int1BuzzerPreset,
  create8051LdrAlarmPreset,
  create8051SevenSegPreset,
  create8051TimerScopePreset,
  create8051TrafficPreset,
  createAcRectifierScopePreset,
  createBjtPreset,
  createBreadboard8051LedLabPreset,
  createBreadboardBjtNightLightPreset,
  createBreadboardLdrBuzzerPreset,
  createBreadboardLedPreset,
  createBreadboardMotorPotPreset,
  createBreadboardSwitchPotRgbPreset,
  createClock7SegDecoderPreset,
  createDividerPreset,
  createFlybackInductorPreset,
  createFullPowerSupplyZenerLedPreset,
  createHighPassPreset,
  createInvertingAmpPreset,
  createLcOscillatorPreset,
  createLedPreset,
  createLowPassPreset,
  createNonInvertingAmpPreset,
  createOpampLdrComparatorPreset,
  createOpampLdrMotorPreset,
  createPotMotorVomPreset,
  createRcPreset,
  createRectifierPreset,
  createRlcPreset,
  createSwitchPotVomPreset,
  createWheatstoneBridgePreset,
  createZenerPreset,
  describeProbeTargetInfo,
  evaluate8051ProgramState,
  evaluateMultimeterReading,
  evaluateOscilloscopeSample,
  formatCapacitance,
  formatInductance,
  formatResistance,
  getBreadboardHoleById,
  getBreadboardHoles,
  getCompPins,
  getCompTitle,
  getLdrResistance,
  getPinFullName,
  getPinName,
  getPinPosition,
  getPinRefKey,
  getPinRefPosition,
  getProbeTargetPosition,
  getResistorColorBands,
  getWirePolylinePoints,
  snap,
  solveLinearSystem,
} from './circuitSandboxCore';

interface CircuitSandboxSimProps {
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
  presetRequest?: { key: string; nonce: number; parameters?: Record<string, number> };
}

interface SimFrameState {
  solvedComps: Record<string, SolvedCompState>;
  solvedWires: Record<string, SolvedWireState>;
  nodeVoltages: Record<string, number>;
  tracePoints: TraceSample[];
  scopeTraces: Record<string, OscilloscopeTraceData>;
  animPhase: number;
  simElapsedSec: number;
  shortWarning: boolean;
  ledOverloadWarning: boolean;
}

interface CircuitAuditIssue {
  severity: 'critical' | 'warning' | 'info' | string;
  componentLabel?: string;
  title: string;
  detail: string;
  recommendation: string;
}

interface CircuitAuditResult {
  overallStatus: 'ok' | 'warning' | 'critical' | string;
  summary: string;
  issues: CircuitAuditIssue[];
  recommendations: string[];
}

interface CircuitSnapshot {
  components: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
}

const STORAGE_KEY = 'stemly_saved_circuits_v1';

type PaletteCategory = 'all' | 'digital' | 'instrument' | 'source' | 'passive' | 'semi' | 'actuator';

const PALETTE_ITEMS: {
  type: CompType;
  label: string;
  spec: string;
  keywords: string;
  category: Exclude<PaletteCategory, 'all'>;
}[] = [
  { type: 'mcu8051', label: 'Vi điều khiển 8051', spec: 'AT89C51 · 40-pin', keywords: '8051 mcu at89c51 vi dieu khien port p1 ngat timer', category: 'digital' },
  { type: 'dec74138', label: 'IC Giải mã 74LS138', spec: '3 → 8 Active LOW', keywords: '74ls138 74138 giai ma dia chi decoder', category: 'digital' },
  { type: 'sevenseg', label: 'LED 7 đoạn (BCD)', spec: 'Cathode chung 0..F', keywords: 'sevenseg 7 segment led 7 doan bcd dem so', category: 'digital' },
  { type: 'clockgen', label: 'Xung Clock / XTAL', spec: 'Xung vuông TTL 5V', keywords: 'clock xtal thach anh xung vuong nhip', category: 'digital' },
  { type: 'multimeter', label: 'Đồng hồ vạn năng 3D', spec: 'Đo V / I mọi điểm', keywords: 'multimeter dong ho van nang vom do ap dong 3d probe', category: 'instrument' },
  { type: 'oscilloscope', label: 'Máy hiện sóng 3D', spec: 'Đồ thị sóng V(t)', keywords: 'oscilloscope may hien song dao dong ky ac xung 3d', category: 'instrument' },
  { type: 'resistor', label: 'Điện trở', spec: '220 Ω · 4 vòng', keywords: 'resistor tro om', category: 'passive' },
  { type: 'led', label: 'Đèn LED', spec: 'Phát sáng 2.0 V', keywords: 'led den diode phat quang', category: 'semi' },
  { type: 'pushbutton', label: 'Nút nhấn', spec: 'Tactile 4 chân', keywords: 'pushbutton button nut nhan bam', category: 'passive' },
  { type: 'pot', label: 'Biến trở', spec: '1 kΩ · Chiết áp', keywords: 'potentiometer bien tro chiet ap', category: 'passive' },
  { type: 'switch', label: 'Công tắc', spec: 'Đóng / Ngắt mạch', keywords: 'switch cong tac khoa k', category: 'passive' },
  { type: 'source', label: 'Pin 9V / DC', spec: 'Nguồn một chiều', keywords: 'battery source nguon dc pin 9v', category: 'source' },
  { type: 'capacitor', label: 'Tụ điện', spec: '470 μF · Hóa học', keywords: 'capacitor tu dien uf', category: 'passive' },
  { type: 'ldr', label: 'Quang trở LDR', spec: 'Cảm biến ánh sáng', keywords: 'ldr photoresistor quang tro cam bien anh sang', category: 'passive' },
  { type: 'motor', label: 'Động cơ DC', spec: 'Motor quay RPM', keywords: 'motor dong co dc quay', category: 'actuator' },
  { type: 'buzzer', label: 'Còi chíp Piezo', spec: 'Phát âm thanh', keywords: 'buzzer piezo coi chip am thanh', category: 'actuator' },
  { type: 'inductor', label: 'Cuộn cảm', spec: '150 mH · Lõi từ', keywords: 'inductor cuon cam mh henry', category: 'passive' },
  { type: 'diode', label: 'Diode', spec: 'Chỉnh lưu 0.7 V', keywords: 'diode chinh luu ban dan', category: 'semi' },
  { type: 'ac_source', label: 'Máy phát AC', spec: '12 Vp · Sóng sin', keywords: 'ac function generator nguon xoay chieu', category: 'source' },
  { type: 'ground', label: 'Nối đất (GND)', spec: 'Tham chiếu 0 V', keywords: 'ground gnd mass noi dat', category: 'source' },
  { type: 'zener', label: 'Diode Zener', spec: 'Ổn áp 5.1 V', keywords: 'zener on ap diode', category: 'semi' },
  { type: 'bjt', label: 'Transistor NPN', spec: 'BJT khuếch đại', keywords: 'bjt transistor npn', category: 'semi' },
  { type: 'opamp', label: 'IC Op-Amp', spec: 'LM741 · ±12 V', keywords: 'opamp ic lm741 khuech dai', category: 'semi' },
];

// Build smooth Tinkercad-style rounded jumper path across waypoints
function buildRoundedWirePath(pts: { x: number; y: number }[], radius = 10): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 < 2 || len2 < 2) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const r = Math.min(radius, len1 * 0.45, len2 * 0.45);
    const p1x = curr.x - (v1x / len1) * r;
    const p1y = curr.y - (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;
    d += ` L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x} ${curr.y} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const CircuitSandboxSim: React.FC<CircuitSandboxSimProps> = ({
  parameters,
  onSimulationStats,
  onParametersBatchChange,
  presetRequest,
}) => {
  const initialPreset = useMemo(() => createBreadboardLedPreset(), []);

  // Core Circuit Component, Wire & Breadboard State
  const [components, setComponents] = useState<CircuitComp[]>(initialPreset.comps);
  const [wires, setWires] = useState<CircuitWire[]>(initialPreset.wires);
  const [breadboards, setBreadboards] = useState<BreadboardObj[]>(initialPreset.breadboards);
  const [undoStack, setUndoStack] = useState<CircuitSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CircuitSnapshot[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>('led1');
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedBreadboardId, setSelectedBreadboardId] = useState<string | null>(null);
  const [activePlaceType, setActivePlaceType] = useState<CompType | 'breadboard' | null>(null);
  const [activeWireColor, setActiveWireColor] = useState<string>(WIRE_COLOR_OPTIONS[0].hex);
  const [wireColorPickerOpen, setWireColorPickerOpen] = useState<boolean>(false);

  const [isWireMode, setIsWireMode] = useState<boolean>(false);
  const [wireStart, setWireStart] = useState<PinRef | null>(null);
  const [wireDraftWaypoints, setWireDraftWaypoints] = useState<{ x: number; y: number }[]>([]);
  const [hoveredPin, setHoveredPin] = useState<PinRef | null>(null);
  const [hoveredHole, setHoveredHole] = useState<{ bbId: string; hole: BreadboardHole } | null>(null);
  const [cursorPt, setCursorPt] = useState<{ x: number; y: number }>({ x: 460, y: 260 });
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Dragging & Panning State
  const [draggingComp, setDraggingComp] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    hasDragged: boolean;
    preDragSnapshot: CircuitSnapshot;
  } | null>(null);

  const [draggingBreadboard, setDraggingBreadboard] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    hasDragged: boolean;
    preDragSnapshot: CircuitSnapshot;
  } | null>(null);

  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    wireId: string;
    index: number;
    preDragSnapshot: CircuitSnapshot;
  } | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    hasMoved: boolean;
  } | null>(null);

  // Tinkercad Studio View & Tooling States
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [navMode3D, setNavMode3D] = useState<'orbit' | 'pan'>('orbit');
  const [vrMode3D, setVrMode3D] = useState<boolean>(false);
  const [vrGyroEnabled, setVrGyroEnabled] = useState<boolean>(true);
  const [vrGyroPerm, setVrGyroPerm] = useState<GyroPermissionState>('idle');
  const [vrGyroSignal, setVrGyroSignal] = useState<boolean>(false);
  const [vrStereo, setVrStereo] = useState<boolean>(false);
  const vrStageRef = useRef<HTMLDivElement | null>(null);
  const [symbolMode, setSymbolMode] = useState<'realistic' | 'schematic'>('realistic');
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark'>('light');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [activePresetKey, setActivePresetKey] = useState<string>('bb_led_button');
  const [scopeOpen, setScopeOpen] = useState<boolean>(false);
  const [mcuLabOpen, setMcuLabOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<'components' | 'templates'>('components');
  const [paletteFilter, setPaletteFilter] = useState<PaletteCategory>('all');
  const [paletteSearch, setPaletteSearch] = useState<string>('');
  const [templateFilter, setTemplateFilter] = useState<TemplateCategory>('all');
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const draggingPaletteTypeRef = useRef<CompType | 'breadboard' | null>(null);

  // Tinkercad Multimeter (VOM) states
  const [showMultimeter, setShowMultimeter] = useState<boolean>(true);
  const [vomMode, setVomMode] = useState<MultimeterMode>('V');
  const [probeMode, setProbeMode] = useState<'none' | 'red' | 'black'>('none');
  const [redProbe, setRedProbe] = useState<PinRef | null>({ compId: 'led1', pin: 0 });
  const [blackProbe, setBlackProbe] = useState<PinRef | null>({ compId: 'g1', pin: 0 });
  const [activeMeterProbeEdit, setActiveMeterProbeEdit] = useState<{
    meterId: string;
    side: 'red' | 'black';
  } | null>(null);

  // Troubleshooting & Fault Simulation states
  const [repairDrawerOpen, setRepairDrawerOpen] = useState<boolean>(false);
  const [activeMission, setActiveMission] = useState<FaultMission | null>(null);
  const [missionSolved, setMissionSolved] = useState<boolean>(false);
  const [missionFeedback, setMissionFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showMissionHint, setShowMissionHint] = useState<boolean>(false);
  const [hideFaultVisuals, setHideFaultVisuals] = useState<boolean>(false);
  const [autoBurnOnOverload, setAutoBurnOnOverload] = useState<boolean>(false);
  const [burnNotice, setBurnNotice] = useState<string | null>(null);
  const overloadTicksRef = useRef<Record<string, number>>({});

  // Save / Load / Export / Import drawer
  const [projectMenuOpen, setProjectMenuOpen] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('Mạch Breadboard Tinkercad');
  const [projectNotice, setProjectNotice] = useState<string | null>(null);

  // AI Circuit Audit ('Kiểm tra mạch') drawer
  const [aiAuditOpen, setAiAuditOpen] = useState<boolean>(false);
  const [aiAuditLoading, setAiAuditLoading] = useState<boolean>(false);
  const [aiAuditError, setAiAuditError] = useState<string | null>(null);
  const [aiAuditResult, setAiAuditResult] = useState<CircuitAuditResult | null>(null);

  const [savedProjects, setSavedProjects] = useState<SavedCircuitProject[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedCircuitProject[]) : [];
    } catch {
      return [];
    }
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persistent transient energy-storage state
  const capVoltagesRef = useRef<Record<string, number>>({});
  const indCurrentsRef = useRef<Record<string, number>>({});
  const diodeModeRef = useRef<Record<string, 'off' | 'fwd' | 'zener'>>({});
  const bjtStateRef = useRef<Record<string, { conductingBE: boolean; region: 'cutoff' | 'active' | 'sat'; ib: number }>>({});
  const opampSatRef = useRef<Record<string, 'linear' | 'pos' | 'neg'>>({});
  const historyRef = useRef<TraceSample[]>([]);
  const scopeHistoryRef = useRef<Record<string, { t: number; v: number }[]>>({});
  const simTimeRef = useRef<number>(0);
  const animPhaseRef = useRef<number>(0);

  const [simFrame, setSimFrame] = useState<SimFrameState>({
    solvedComps: {},
    solvedWires: {},
    nodeVoltages: {},
    tracePoints: [],
    scopeTraces: {},
    animPhase: 0,
    simElapsedSec: 0,
    shortWarning: false,
    ledOverloadWarning: false,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvas3DRef = useRef<CircuitCanvas3DHandle | null>(null);
  const simSpeed = parameters.simSpeed ?? 1;
  const isLightCanvas = canvasTheme === 'light';

  // Helper: Push current circuit snapshot to Undo stack
  const pushUndoSnapshot = (
    prevComps: CircuitComp[] = components,
    prevWires: CircuitWire[] = wires,
    prevBreadboards: BreadboardObj[] = breadboards
  ) => {
    setUndoStack((stack) => [
      ...stack.slice(-29),
      { components: prevComps, wires: prevWires, breadboards: prevBreadboards },
    ]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, { components, wires, breadboards }]);
    setUndoStack((u) => u.slice(0, -1));
    setComponents(prev.components);
    setWires(prev.wires);
    setBreadboards(prev.breadboards);
    setSelectedId(null);
    setSelectedWireId(null);
    setSelectedBreadboardId(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, { components, wires, breadboards }]);
    setRedoStack((r) => r.slice(0, -1));
    setComponents(next.components);
    setWires(next.wires);
    setBreadboards(next.breadboards);
    setSelectedId(null);
    setSelectedWireId(null);
    setSelectedBreadboardId(null);
  };

  // Sync slider edits into currently selected component
  useEffect(() => {
    if (!selectedId) return;
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== selectedId) return c;
        if ((c.type === 'source' || c.type === 'ac_source') && parameters.V_src !== undefined && c.value !== parameters.V_src) {
          return { ...c, value: parameters.V_src };
        }
        if ((c.type === 'resistor' || c.type === 'pot') && parameters.R_val !== undefined && c.value !== parameters.R_val) {
          return { ...c, value: parameters.R_val };
        }
        if (c.type === 'capacitor' && parameters.C_val !== undefined && c.value !== parameters.C_val) {
          return { ...c, value: parameters.C_val };
        }
        if (c.type === 'inductor' && parameters.L_val !== undefined && c.value !== parameters.L_val) {
          return { ...c, value: parameters.L_val };
        }
        return c;
      })
    );
  }, [parameters.V_src, parameters.R_val, parameters.C_val, parameters.L_val, selectedId]);

  const handleSelectComponent = (comp: CircuitComp) => {
    setSelectedId(comp.id);
    setSelectedWireId(null);
    setSelectedBreadboardId(null);
    if (!onParametersBatchChange) return;
    if (comp.type === 'source' || comp.type === 'ac_source') onParametersBatchChange({ V_src: comp.value });
    else if (comp.type === 'resistor' || comp.type === 'pot') onParametersBatchChange({ R_val: comp.value });
    else if (comp.type === 'capacitor') onParametersBatchChange({ C_val: comp.value });
    else if (comp.type === 'inductor') onParametersBatchChange({ L_val: comp.value });
  };

  const resetTransientMemory = () => {
    capVoltagesRef.current = {};
    indCurrentsRef.current = {};
    diodeModeRef.current = {};
    bjtStateRef.current = {};
    opampSatRef.current = {};
    historyRef.current = [];
    scopeHistoryRef.current = {};
    simTimeRef.current = 0;
    setSimFrame((prev) => ({ ...prev, tracePoints: [], scopeTraces: {}, simElapsedSec: 0 }));
  };

  const applyCircuitData = (
    comps: CircuitComp[],
    newWires: CircuitWire[],
    focusId: string | null,
    newBreadboards: BreadboardObj[] = []
  ) => {
    resetTransientMemory();
    setComponents(comps);
    setWires(newWires);
    setBreadboards(newBreadboards);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(focusId);
    setSelectedWireId(null);
    setSelectedBreadboardId(null);
    setActivePlaceType(null);
    setActiveMeterProbeEdit(null);
    setWireStart(null);
    setWireDraftWaypoints([]);
    const firstFocus =
      comps.find((c) => c.id === focusId) ||
      comps.find((c) => c.type !== 'ground' && c.type !== 'multimeter' && c.type !== 'oscilloscope');
    const gnd = comps.find((c) => c.type === 'ground') || comps.find((c) => c.type === 'source' || c.type === 'ac_source');
    setRedProbe(
      firstFocus ? { compId: firstFocus.id, pin: firstFocus.type === 'opamp' ? 2 : firstFocus.type === 'bjt' ? 1 : 0 } : null
    );
    setBlackProbe(gnd ? { compId: gnd.id, pin: 0 } : null);
  };

  const handleLoadPreset = (key: string, overrideParams?: Record<string, number>) => {
    const pVals = overrideParams ?? parameters;
    setActivePresetKey(key);
    setActiveMission(null);
    setMissionSolved(false);
    setMissionFeedback(null);
    setShowMissionHint(false);
    setBurnNotice(null);
    setAiAuditResult(null);
    setAiAuditError(null);
    setAiAuditOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    if (key === 'mcu_8051_blink') {
      const p = create8051BlinkPreset();
      applyCircuitData(p.comps, p.wires, 'u1', []);
    } else if (key === 'mcu_8051_chase') {
      const p = create8051ChasePreset();
      applyCircuitData(p.comps, p.wires, 'u1', []);
    } else if (key === 'mcu_8051_traffic') {
      const p = create8051TrafficPreset();
      applyCircuitData(p.comps, p.wires, 'u1', []);
    } else if (key === 'mcu_8051_7seg') {
      const p = create8051SevenSegPreset();
      applyCircuitData(p.comps, p.wires, 'seg1', []);
    } else if (key === 'mcu_8051_int1') {
      const p = create8051Int1BuzzerPreset();
      applyCircuitData(p.comps, p.wires, 'pb1', []);
    } else if (key === 'mcu_8051_ldr_alarm') {
      const p = create8051LdrAlarmPreset();
      applyCircuitData(p.comps, p.wires, 'ldr1', []);
    } else if (key === 'mcu_8051_timer_scope') {
      const p = create8051TimerScopePreset();
      applyCircuitData(p.comps, p.wires, 'u1', []);
    } else if (key === 'mcu_8051_74138_bus') {
      const p = create8051And74138BusPreset();
      applyCircuitData(p.comps, p.wires, 'ic1', []);
    } else if (key === 'mcu_74138') {
      const p = create74138DecoderPreset();
      applyCircuitData(p.comps, p.wires, 'ic1', []);
    } else if (key === 'mcu_74138_clock_scan') {
      const p = create74138ClockScanPreset();
      applyCircuitData(p.comps, p.wires, 'ic1', []);
    } else if (key === 'mcu_clock_7seg') {
      const p = createClock7SegDecoderPreset();
      applyCircuitData(p.comps, p.wires, 'seg1', []);
    } else if (key === 'bb_8051_led_lab') {
      const p = createBreadboard8051LedLabPreset();
      applyCircuitData(p.comps, p.wires, 'u1', p.breadboards);
    } else if (key === 'bb_bjt_ldr_nightlight') {
      const p = createBreadboardBjtNightLightPreset();
      applyCircuitData(p.comps, p.wires, 'ldr1', p.breadboards);
    } else if (key === 'bb_switch_pot_rgb') {
      const p = createBreadboardSwitchPotRgbPreset();
      applyCircuitData(p.comps, p.wires, 'pot1', p.breadboards);
    } else if (key === 'bb_led_button') {
      const p = createBreadboardLedPreset();
      applyCircuitData(p.comps, p.wires, 'led1', p.breadboards);
    } else if (key === 'bb_motor_pot') {
      const p = createBreadboardMotorPotPreset();
      applyCircuitData(p.comps, p.wires, 'pot1', p.breadboards);
    } else if (key === 'bb_ldr_buzzer') {
      const p = createBreadboardLdrBuzzerPreset();
      applyCircuitData(p.comps, p.wires, 'ldr1', p.breadboards);
    } else if (key === 'basic_switch_pot_vom') {
      const p = createSwitchPotVomPreset();
      applyCircuitData(p.comps, p.wires, 'pot1', []);
    } else if (key === 'basic_pot_motor_vom') {
      const p = createPotMotorVomPreset();
      applyCircuitData(p.comps, p.wires, 'pot1', []);
    } else if (key === 'filter_ac_scope') {
      const p = createAcRectifierScopePreset();
      applyCircuitData(p.comps, p.wires, 'osc1', []);
    } else if (key === 'amp_opamp_comparator') {
      const p = createOpampLdrComparatorPreset();
      applyCircuitData(p.comps, p.wires, 'ldr1', []);
    } else if (key === 'amp_opamp_ldr_motor') {
      const p = createOpampLdrMotorPreset();
      applyCircuitData(p.comps, p.wires, 'ldr1', []);
    } else if (key === 'basic_full_power_zener') {
      const p = createFullPowerSupplyZenerLedPreset();
      applyCircuitData(p.comps, p.wires, 'z1', []);
    } else if (key === 'rc') {
      const p = createRcPreset(pVals.V_src ?? 12, pVals.R_val ?? 220, pVals.C_val ?? 470);
      applyCircuitData(p.comps, p.wires, 'c1', []);
    } else if (key === 'lowpass') {
      const p = createLowPassPreset(pVals.V_src ?? 10, pVals.R_val ?? 1000, pVals.C_val ?? 100);
      applyCircuitData(p.comps, p.wires, 'c1', []);
    } else if (key === 'lc_oscillator') {
      const p = createLcOscillatorPreset(pVals.V_src ?? 12, pVals.R_val ?? 10, pVals.C_val ?? 470, pVals.L_val ?? 150);
      applyCircuitData(p.comps, p.wires, 'c1', []);
    } else if (key === 'wheatstone') {
      const p = createWheatstoneBridgePreset(pVals.V_src ?? 9, pVals.R_val ?? 220);
      applyCircuitData(p.comps, p.wires, 'pot1', []);
    } else if (key === 'highpass') {
      const p = createHighPassPreset();
      applyCircuitData(p.comps, p.wires, 'r1', []);
    } else if (key === 'inverting_amp') {
      const p = createInvertingAmpPreset();
      applyCircuitData(p.comps, p.wires, 'u1', []);
    } else if (key === 'noninverting_amp') {
      const p = createNonInvertingAmpPreset();
      applyCircuitData(p.comps, p.wires, 'u1', []);
    } else if (key === 'led') {
      const p = createLedPreset(pVals.V_src ?? 9);
      applyCircuitData(p.comps, p.wires, 'led1', []);
    } else if (key === 'rectifier') {
      const p = createRectifierPreset();
      applyCircuitData(p.comps, p.wires, 'c1', []);
    } else if (key === 'zener') {
      const p = createZenerPreset();
      applyCircuitData(p.comps, p.wires, 'z1', []);
    } else if (key === 'bjt') {
      const p = createBjtPreset();
      applyCircuitData(p.comps, p.wires, 'q1', []);
    } else if (key === 'rlc') {
      const p = createRlcPreset(pVals.V_src ?? 12);
      applyCircuitData(p.comps, p.wires, 'c1', []);
    } else if (key === 'flyback_rl') {
      const p = createFlybackInductorPreset();
      applyCircuitData(p.comps, p.wires, 'l1', []);
    } else if (key === 'divider') {
      const p = createDividerPreset(pVals.V_src ?? 12, pVals.R_val ?? 220);
      applyCircuitData(p.comps, p.wires, 'pot1', []);
    } else if (key === 'clear') {
      pushUndoSnapshot();
      setComponents([]);
      setWires([]);
      setBreadboards([]);
      setSelectedId(null);
      setSelectedWireId(null);
      setSelectedBreadboardId(null);
      setRedProbe(null);
      setBlackProbe(null);
      setActiveMeterProbeEdit(null);
      resetTransientMemory();
    }
  };

  useEffect(() => {
    if (!presetRequest?.nonce || !presetRequest.key) return;
    handleLoadPreset(presetRequest.key, presetRequest.parameters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetRequest?.nonce]);

  const startFaultMission = (mission: FaultMission) => {
    const p = mission.build();
    setActiveMission(mission);
    setMissionSolved(false);
    setMissionFeedback(null);
    setShowMissionHint(false);
    setHideFaultVisuals(true);
    setBurnNotice(null);
    setRepairDrawerOpen(false);
    setShowMultimeter(true);
    setProbeMode('red');
    applyCircuitData(p.comps, p.wires, p.comps[0]?.id ?? null, p.breadboards ?? []);
  };

  const startRandomFaultChallenge = () => {
    const candidates = components.filter(
      (c) => c.type !== 'ground' && c.type !== 'source' && c.type !== 'ac_source' && c.type !== 'multimeter' && c.type !== 'oscilloscope'
    );
    if (candidates.length === 0) return;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    let faultType: Exclude<FaultType, 'none'> = 'open';
    let hint = 'Dùng que đo VOM (+ Đỏ / − Đen) đo sụt áp hai đầu từng linh kiện và quan sát dạng sóng trên Oscilloscope.';
    if (target.type === 'resistor' || target.type === 'pot' || target.type === 'ldr') {
      faultType = Math.random() < 0.65 ? 'burned' : 'short';
      hint =
        faultType === 'burned'
          ? 'Nếu điện trở bị cháy đứt, dòng nhánh bằng 0 mA và gần như toàn bộ áp nguồn sẽ rơi trên hai đầu điện trở đó.'
          : 'Nếu điện trở bị chập, sụt áp hai đầu bằng 0 V và dòng điện tăng vọt bất thường.';
    } else if (target.type === 'capacitor') {
      faultType = Math.random() < 0.7 ? 'leaky' : 'short';
      hint =
        faultType === 'leaky'
          ? 'Tụ bị rò điện môi không nạp lên đủ áp nguồn và bị sụt áp nhanh trên Oscilloscope.'
          : 'Tụ bị đánh thủng (Short) kéo điện áp tại nút nối tụ xuống ~0 V.';
    } else if (target.type === 'diode' || target.type === 'led' || target.type === 'zener') {
      const r = Math.random();
      faultType = r < 0.45 ? 'reversed' : r < 0.8 ? 'leaky' : 'open';
      hint =
        faultType === 'leaky'
          ? 'Diode bị rò ngược cho phép dòng/áp âm lọt qua trên Oscilloscope.'
          : 'Kiểm tra điện áp Anode–Cathode: linh kiện bán dẫn đứt hoặc ngược cực sẽ chặn dòng thuận.';
    } else {
      faultType = Math.random() < 0.6 ? 'open' : 'short';
    }

    const randomMission: FaultMission = {
      id: `random-${Date.now()}`,
      title: 'Thực hành Chẩn đoán Sự cố Ngẫu nhiên',
      difficulty: 'Trung bình',
      symptom: 'Một linh kiện trong mạch vừa xuất hiện lỗi ẩn. Hãy dùng Đồng hồ VOM và Oscilloscope để khoanh vùng đúng linh kiện hỏng!',
      hint,
      faultyCompId: target.id,
      faultType,
      explanation: `Linh kiện ${target.label} bị lỗi "${FAULT_LABELS[faultType]}".`,
      build: () => ({ comps: components.map((c) => ({ ...c, fault: 'none' })), wires, breadboards }),
    };

    setComponents((prev) => prev.map((c) => ({ ...c, fault: 'none' })));
    setActiveMission(randomMission);
    setMissionSolved(false);
    setMissionFeedback(null);
    setShowMissionHint(false);
    setHideFaultVisuals(true);
    setBurnNotice(null);
    setRepairDrawerOpen(false);
    setShowMultimeter(true);
    setProbeMode('red');
    resetTransientMemory();
  };

  const handleAttemptRepair = (compId: string) => {
    if (!activeMission || missionSolved) return;
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;
    if (compId === activeMission.faultyCompId) {
      setMissionSolved(true);
      setHideFaultVisuals(false);
      setComponents((prev) => prev.map((c) => (c.id === compId ? { ...c, fault: 'none' } : c)));
      setMissionFeedback({
        ok: true,
        msg: `Chính xác! Đã thay thế ${comp.label}. ${activeMission.explanation}`,
      });
      resetTransientMemory();
    } else {
      setMissionFeedback({
        ok: false,
        msg: `${comp.label} vẫn hoạt động bình thường! Hãy dùng Đồng hồ VOM (+ Đỏ / − Đen) và Oscilloscope kiểm tra áp hai đầu từng linh kiện trước khi thay.`,
      });
    }
  };

  // Compute current SVG viewBox considering zoom & pan
  const viewBoxW = SVG_W / zoom;
  const viewBoxH = SVG_H / zoom;
  const viewBoxX = (SVG_W - viewBoxW) / 2 + pan.x;
  const viewBoxY = (SVG_H - viewBoxH) / 2 + pan.y;

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 460, y: 260 };
    const rect = svg.getBoundingClientRect();
    const x = viewBoxX + ((clientX - rect.left) / rect.width) * viewBoxW;
    const y = viewBoxY + ((clientY - rect.top) / rect.height) * viewBoxH;
    return {
      x: Math.max(20, Math.min(SVG_W - 20, snap(x))),
      y: Math.max(20, Math.min(SVG_H - 20, snap(y))),
    };
  };

  const buildNewComponent = (
    type: CompType,
    x: number,
    y: number,
    initialRedTarget?: ProbeTarget | null
  ): CircuitComp => {
    const countOfType = components.filter((c) => c.type === type).length + 1;
    const prefixMap: Record<CompType, string> = {
      source: 'V',
      ac_source: 'AC',
      resistor: 'R',
      pot: 'RV',
      capacitor: 'C',
      inductor: 'L',
      diode: 'D',
      zener: 'DZ',
      led: 'LED',
      bjt: 'Q',
      opamp: 'U',
      switch: 'K',
      pushbutton: 'PB',
      motor: 'M',
      buzzer: 'BZ',
      ldr: 'LDR',
      ground: 'GND',
      multimeter: 'DMM',
      oscilloscope: 'OSC',
      mcu8051: 'MCU',
      sevenseg: 'SEG',
      dec74138: 'IC',
      clockgen: 'CLK',
    };
    const defaultVal =
      type === 'source'
        ? parameters.V_src ?? 9
        : type === 'ac_source'
        ? 12
        : type === 'mcu8051' || type === 'dec74138' || type === 'clockgen' || type === 'sevenseg'
        ? 5
        : type === 'resistor'
        ? parameters.R_val ?? 220
        : type === 'pot'
        ? 1000
        : type === 'capacitor'
        ? parameters.C_val ?? 470
        : type === 'inductor'
        ? parameters.L_val ?? 150
        : type === 'led'
        ? 2.0
        : type === 'diode'
        ? 0.7
        : type === 'zener'
        ? 5.1
        : type === 'bjt'
        ? 120
        : type === 'opamp'
        ? 12
        : type === 'switch' || type === 'pushbutton'
        ? 1
        : type === 'motor'
        ? 12
        : type === 'buzzer'
        ? 5
        : type === 'ldr'
        ? 4470
        : 0;

    // Offset instrument body slightly when dropped right onto an existing wire/component so its red probe docks cleanly beside it
    const isInstrument = type === 'multimeter' || type === 'oscilloscope';
    const bodyX =
      isInstrument && initialRedTarget
        ? Math.max(60, Math.min(SVG_W - 60, snap(x + 80 > SVG_W - 80 ? x - 80 : x + 80)))
        : Math.max(60, Math.min(SVG_W - 60, snap(x)));
    const bodyY =
      isInstrument && initialRedTarget
        ? Math.max(40, Math.min(SVG_H - 40, snap(y - 40 < 60 ? y + 60 : y - 40)))
        : Math.max(40, Math.min(SVG_H - 40, snap(y)));

    return {
      id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      x: bodyX,
      y: bodyY,
      rotation: type === 'source' || type === 'ac_source' ? 270 : 0,
      value: defaultVal,
      freq: type === 'ac_source' || type === 'clockgen' || type === 'mcu8051' ? 1.5 : undefined,
      wiper: type === 'pot' || type === 'ldr' ? 0.5 : undefined,
      color: type === 'led' ? 'red' : undefined,
      meterMode: type === 'multimeter' ? 'V' : undefined,
      scopeTimeWindow: type === 'oscilloscope' ? 2.0 : undefined,
      scopeVDiv: type === 'oscilloscope' ? 0 : undefined,
      mcuProgram: type === 'mcu8051' ? 'blink_alt' : undefined,
      redTarget: isInstrument ? (initialRedTarget ?? null) : undefined,
      blackTarget: isInstrument ? null : undefined,
      label: type === 'ground' ? 'GND' : `${prefixMap[type]}${countOfType}`,
    };
  };

  const addComponentAt = (
    type: CompType | 'breadboard',
    x: number,
    y: number,
    initialRedTarget?: ProbeTarget | null
  ) => {
    pushUndoSnapshot();
    if (type === 'breadboard') {
      const newBb: BreadboardObj = {
        id: `bb-${Date.now()}`,
        x: Math.max(60, Math.min(SVG_W - 520, snap(x - 240))),
        y: Math.max(200, Math.min(SVG_H - 200, snap(y))),
        cols: 25,
      };
      setBreadboards((prev) => [...prev, newBb]);
      setSelectedBreadboardId(newBb.id);
      setSelectedId(null);
      setSelectedWireId(null);
      return;
    }
    const newComp = buildNewComponent(type, x, y, initialRedTarget);
    setComponents((prev) => [...prev, newComp]);
    handleSelectComponent(newComp);
  };

  // Build Breadboard hole lookup map for snap highlights and electrical unioning
  const breadboardLookup = useMemo(() => {
    const byCoord: Record<string, { bbId: string; hole: BreadboardHole }> = {};
    const byKey: Record<string, BreadboardHole> = {};
    breadboards.forEach((bb) => {
      const holes = getBreadboardHoles(bb);
      holes.forEach((h) => {
        byCoord[`${h.x},${h.y}`] = { bbId: bb.id, hole: h };
        byKey[`${bb.id}::${h.holeId}`] = h;
      });
    });
    return { byCoord, byKey };
  }, [breadboards]);

  // Determine currently highlighted breadboard net (hovering a hole OR hovering a component pin on a hole)
  const highlightedNetKey = useMemo(() => {
    if (hoveredHole) return hoveredHole.hole.netKey;
    if (hoveredPin) {
      if (hoveredPin.holeId) {
        const h = breadboardLookup.byKey[`${hoveredPin.compId}::${hoveredPin.holeId}`];
        return h?.netKey ?? null;
      }
      const c = components.find((comp) => comp.id === hoveredPin.compId);
      if (c) {
        const pt = getPinPosition(c, hoveredPin.pin);
        const match = breadboardLookup.byCoord[`${pt.x},${pt.y}`];
        return match?.hole.netKey ?? null;
      }
    }
    return null;
  }, [hoveredHole, hoveredPin, components, breadboardLookup]);

  // Memoize static nodal graph topology including Breadboard internal bus/column strips
  const topology = useMemo(() => {
    const keys: string[] = [];
    const coords: Record<string, { x: number; y: number }> = {};

    components.forEach((c) => {
      const pins = getCompPins(c.type);
      pins.forEach((pin) => {
        const key = `${c.id}:${pin}`;
        keys.push(key);
        coords[key] = getPinPosition(c, pin);
      });
    });

    const bbNetFirstKey: Record<string, string> = {};
    breadboards.forEach((bb) => {
      const holes = getBreadboardHoles(bb);
      holes.forEach((h) => {
        const key = `${bb.id}::${h.holeId}`;
        keys.push(key);
        coords[key] = { x: h.x, y: h.y };
      });
    });

    const parent: Record<string, string> = {};
    keys.forEach((k) => {
      parent[k] = k;
    });
    const find = (k: string): string => {
      let cur = k;
      while (parent[cur] !== cur) {
        parent[cur] = parent[parent[cur]];
        cur = parent[cur];
      }
      return cur;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    // Union all holes belonging to the same breadboard strip or power rail
    breadboards.forEach((bb) => {
      const holes = getBreadboardHoles(bb);
      holes.forEach((h) => {
        const key = `${bb.id}::${h.holeId}`;
        if (bbNetFirstKey[h.netKey]) {
          union(bbNetFirstKey[h.netKey], key);
        } else {
          bbNetFirstKey[h.netKey] = key;
        }
      });
    });

    // Union any pins/holes occupying the exact same (x, y) coordinate
    const coordMap: Record<string, string> = {};
    keys.forEach((k) => {
      const pt = coords[k];
      const ck = `${pt.x},${pt.y}`;
      if (coordMap[ck]) union(coordMap[ck], k);
      else coordMap[ck] = k;
    });

    const pinNodeMap: Record<string, number> = {};
    const rootList: string[] = [];
    const rootIndex: Record<string, number> = {};
    keys.forEach((k) => {
      const r = find(k);
      if (rootIndex[r] === undefined) {
        rootIndex[r] = rootList.length;
        rootList.push(r);
      }
      pinNodeMap[k] = rootIndex[r];
    });

    const N = rootList.length;
    const gndNodeIndices: number[] = [];
    const gndComps = components.filter((c) => c.type === 'ground');
    if (gndComps.length > 0) {
      gndComps.forEach((gc) => {
        const idx = pinNodeMap[`${gc.id}:0`];
        if (idx !== undefined) gndNodeIndices.push(idx);
      });
    } else if (N > 0) {
      const firstSrc = components.find((c) => c.type === 'source' || c.type === 'ac_source');
      gndNodeIndices.push(firstSrc ? pinNodeMap[`${firstSrc.id}:0`] ?? 0 : 0);
    }

    const wireEdges = wires
      .map((w) => ({
        id: w.id,
        n1: pinNodeMap[getPinRefKey(w.from)],
        n2: pinNodeMap[getPinRefKey(w.to)],
      }))
      .filter((we) => we.n1 !== undefined && we.n2 !== undefined);

    const compNodes = components.map((c) => {
      const pinNodes = getCompPins(c.type).map((pin) => pinNodeMap[`${c.id}:${pin}`]);
      return {
        comp: c,
        pinNodes,
        n0: pinNodes[0],
        n1: c.type !== 'ground' ? pinNodes[1] : undefined,
        n2: pinNodes[2],
        n3: pinNodes[3],
      };
    });

    return { pinKeys: keys, pinNodeMap, N, gndNodeIndices, wireEdges, compNodes };
  }, [components, wires, breadboards]);

  // Real-time MNA Nodal Solver loop with Backward Euler + Piecewise Nonlinear Semiconductors
  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const stepSimulation = (now: number) => {
      const rawDt = Math.min(0.033, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      if (isRunning && topology.N > 0) {
        const dt = rawDt * simSpeed;
        simTimeRef.current += dt;
        animPhaseRef.current = (animPhaseRef.current + dt * 60) % 1000;

        const { N, gndNodeIndices, wireEdges, compNodes, pinKeys, pinNodeMap } = topology;
        const R_WIRE = 0.02;
        const G_WIRE = 1 / R_WIRE;
        const R_SRC_INT = 0.05;
        const G_SRC_INT = 1 / R_SRC_INT;

        const hasNonlinear = compNodes.some(
          (cn) =>
            cn.comp.type === 'diode' ||
            cn.comp.type === 'led' ||
            cn.comp.type === 'zener' ||
            cn.comp.type === 'bjt' ||
            cn.comp.type === 'opamp'
        );
        const hasDigital = compNodes.some(
          (cn) =>
            cn.comp.type === 'clockgen' ||
            cn.comp.type === 'mcu8051' ||
            cn.comp.type === 'dec74138' ||
            cn.comp.type === 'sevenseg'
        );
        const iterations = hasNonlinear || hasDigital ? 4 : 1;

        let voltages: number[] = new Array(N).fill(0);
        const capModels: Record<string, { gc: number; vcPrev: number }> = {};
        const indModels: Record<string, { gl: number; ilPrev: number }> = {};
        const acInstantV: Record<string, number> = {};
        const clkEvalMap: Record<string, { hi: boolean; vHi: number }> = {};
        const mcuEvalMap: Record<string, { vccOk: boolean; vSupply: number; int1Low: boolean; evalRes: ReturnType<typeof evaluate8051ProgramState> }> = {};
        const decEvalMap: Record<string, { vccOk: boolean; enHigh: boolean; addr: number; vSupply: number }> = {};

        const activeFaultId = activeMission && !missionSolved ? activeMission.faultyCompId : null;
        const activeFaultType = activeMission && !missionSolved ? activeMission.faultType : null;
        const getFault = (c: CircuitComp): FaultType => {
          if (activeFaultId === c.id && activeFaultType) return activeFaultType;
          return c.fault ?? 'none';
        };

        for (let iter = 0; iter < iterations; iter++) {
          const G: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
          const Ivec: number[] = new Array(N).fill(0);

          const addConductance = (a: number, b: number, g: number) => {
            G[a][a] += g;
            G[b][b] += g;
            G[a][b] -= g;
            G[b][a] -= g;
          };

          gndNodeIndices.forEach((idx) => {
            G[idx][idx] += 1e5;
          });
          for (let i = 0; i < N; i++) G[i][i] += 1e-8;

          wireEdges.forEach((we) => {
            if (we.n1 !== we.n2) addConductance(we.n1, we.n2, G_WIRE);
          });

          compNodes.forEach(({ comp: c, pinNodes, n0, n1, n2, n3 }) => {
            if (c.type === 'ground' || n0 === undefined || n1 === undefined) return;
            const fault = getFault(c);

            if (fault === 'open' || fault === 'burned') {
              addConductance(n0, n1, 1e-8);
              if (n2 !== undefined) {
                addConductance(n0, n2, 1e-8);
                addConductance(n1, n2, 1e-8);
              }
              if (n3 !== undefined) {
                addConductance(n2 ?? n0, n3, 1e-8);
              }
              return;
            }
            if (fault === 'short') {
              if (c.type === 'bjt' && n2 !== undefined) {
                addConductance(n1, n2, 1 / 0.05);
                addConductance(n0, n2, 1e-7);
              } else if (c.type === 'pushbutton' && n2 !== undefined && n3 !== undefined) {
                addConductance(n0, n1, 1 / 0.02);
                addConductance(n2, n3, 1 / 0.02);
                addConductance(n0, n2, 1 / 0.04);
              } else {
                addConductance(n0, n1, 1 / 0.05);
              }
              return;
            }

            if (c.type === 'resistor') {
              const effR = fault === 'leaky' ? Math.max(5, c.value * 0.2) : Math.max(0.5, c.value);
              addConductance(n0, n1, 1 / effR);
            } else if (c.type === 'ldr') {
              const rLdr = getLdrResistance(c.wiper ?? 0.5);
              const effR = fault === 'leaky' ? Math.max(5, rLdr * 0.2) : rLdr;
              addConductance(n0, n1, 1 / effR);
            } else if (c.type === 'motor') {
              const effR = fault === 'leaky' ? 6 : 25;
              addConductance(n0, n1, 1 / effR);
            } else if (c.type === 'buzzer') {
              const effR = fault === 'leaky' ? 30 : 150;
              addConductance(n0, n1, 1 / effR);
            } else if (c.type === 'pot' && n2 !== undefined) {
              const w = Math.min(0.95, Math.max(0.05, c.wiper ?? 0.5));
              const scale = fault === 'leaky' ? 0.2 : 1;
              const ra = Math.max(1, c.value * w * scale);
              const rb = Math.max(1, c.value * (1 - w) * scale);
              addConductance(n0, n2, 1 / ra);
              addConductance(n2, n1, 1 / rb);
            } else if (c.type === 'switch') {
              const gSw = c.value >= 0.5 || fault === 'leaky' ? 1 / (fault === 'leaky' ? 150 : 0.04) : 1e-8;
              addConductance(n0, n1, gSw);
            } else if (c.type === 'pushbutton' && n2 !== undefined && n3 !== undefined) {
              // Pins 0 & 1 are left bridge; Pins 2 & 3 are right bridge
              addConductance(n0, n1, 1 / 0.02);
              addConductance(n2, n3, 1 / 0.02);
              const gBtn = c.value >= 0.5 || fault === 'leaky' ? 1 / (fault === 'leaky' ? 150 : 0.04) : 1e-8;
              addConductance(n0, n2, gBtn);
            } else if (c.type === 'source') {
              const inorton = c.value * G_SRC_INT;
              addConductance(n0, n1, G_SRC_INT);
              Ivec[n1] += inorton;
              Ivec[n0] -= inorton;
            } else if (c.type === 'ac_source') {
              const f = Math.max(0.2, c.freq ?? 1.5);
              const vInst = c.value * Math.sin(2 * Math.PI * f * simTimeRef.current);
              acInstantV[c.id] = vInst;
              const inorton = vInst * G_SRC_INT;
              addConductance(n0, n1, G_SRC_INT);
              Ivec[n1] += inorton;
              Ivec[n0] -= inorton;
            } else if (c.type === 'clockgen') {
              const f = Math.max(0.25, Math.min(20, c.freq ?? 1.5));
              const hi = Math.sin(2 * Math.PI * f * simTimeRef.current) >= 0;
              const vHi = Math.max(3.3, c.value || 5);
              clkEvalMap[c.id] = { hi, vHi };
              const gClk = 1 / 25;
              const vOut = hi ? vHi : 0.04;
              addConductance(n0, n1, gClk);
              Ivec[n1] += vOut * gClk;
              Ivec[n0] -= vOut * gClk;
            } else if (c.type === 'mcu8051') {
              const nVcc = pinNodes[0];
              const nGnd = pinNodes[5];
              if (nVcc === undefined || nGnd === undefined) return;
              addConductance(nVcc, nGnd, 1 / 1000);
              const vSupply = iter === 0 ? (c.value || 5) : (voltages[nVcc] ?? 0) - (voltages[nGnd] ?? 0);
              const vccOk = vSupply >= 3.0;
              const nInt1 = pinNodes[8];
              if (nInt1 !== undefined) addConductance(nInt1, nGnd, 1e-5);
              const int1Low =
                iter === 0
                  ? false
                  : nInt1 !== undefined
                  ? (voltages[nInt1] ?? 0) - (voltages[nGnd] ?? 0) < 1.5
                  : false;
              const evalRes = evaluate8051ProgramState(c.mcuProgram ?? 'blink_alt', simTimeRef.current, c.freq ?? 1.5, int1Low);
              mcuEvalMap[c.id] = { vccOk, vSupply, int1Low, evalRes };
              const vHi = Math.min(5.2, Math.max(3.3, vSupply));
              const vLo = 0.05;
              const drivePin = (pNode: number | undefined, isHigh: boolean) => {
                if (pNode === undefined) return;
                if (!vccOk) {
                  addConductance(pNode, nGnd, 1e-6);
                  return;
                }
                const gOut = 1 / 35;
                const vOut = isHigh ? vHi : vLo;
                addConductance(pNode, nGnd, gOut);
                Ivec[pNode] += vOut * gOut;
                Ivec[nGnd] -= vOut * gOut;
              };
              drivePin(pinNodes[1], Boolean(evalRes.p1Byte & 1));
              drivePin(pinNodes[2], Boolean((evalRes.p1Byte >> 1) & 1));
              drivePin(pinNodes[3], Boolean((evalRes.p1Byte >> 2) & 1));
              drivePin(pinNodes[4], Boolean((evalRes.p1Byte >> 3) & 1));
              drivePin(pinNodes[6], Boolean(evalRes.p2LowBits & 1));
              drivePin(pinNodes[7], Boolean((evalRes.p2LowBits >> 1) & 1));
              drivePin(pinNodes[9], Boolean(evalRes.clkOutBit));
            } else if (c.type === 'dec74138') {
              const nVcc = pinNodes[0];
              const nGnd = pinNodes[4];
              if (nVcc === undefined || nGnd === undefined) return;
              addConductance(nVcc, nGnd, 1 / 1200);
              const vSupply = iter === 0 ? (c.value || 5) : (voltages[nVcc] ?? 0) - (voltages[nGnd] ?? 0);
              const vccOk = vSupply >= 3.0;
              [1, 2, 3, 5].forEach((pi) => {
                const pn = pinNodes[pi];
                if (pn !== undefined) addConductance(pn, nGnd, 1e-5);
              });
              const vGnd = voltages[nGnd] ?? 0;
              const readBit = (pi: number) => {
                const pn = pinNodes[pi];
                return pn !== undefined && (voltages[pn] ?? 0) - vGnd >= 1.8 ? 1 : 0;
              };
              const a0 = readBit(1);
              const a1 = readBit(2);
              const a2 = readBit(3);
              const enHigh = readBit(5) === 1;
              const addr = a0 | (a1 << 1) | (a2 << 2);
              decEvalMap[c.id] = { vccOk, enHigh, addr, vSupply };
              const vHi = Math.min(5.2, Math.max(3.3, vSupply));
              for (let k = 0; k < 4; k++) {
                const yNode = pinNodes[6 + k];
                if (yNode === undefined) continue;
                if (!vccOk) {
                  addConductance(yNode, nGnd, 1e-6);
                  continue;
                }
                const isActiveLow = enHigh && k === addr;
                const rOut = isActiveLow ? 25 : 35;
                const gOut = 1 / rOut;
                const vOut = isActiveLow ? 0.08 : vHi;
                addConductance(yNode, nGnd, gOut);
                Ivec[yNode] += vOut * gOut;
                Ivec[nGnd] -= vOut * gOut;
              }
            } else if (c.type === 'sevenseg') {
              const nCom = pinNodes[5];
              if (nCom === undefined) return;
              const vCom = voltages[nCom] ?? 0;
              for (let pi = 0; pi <= 4; pi++) {
                const pn = pinNodes[pi];
                if (pn === undefined) continue;
                const isHigh = (voltages[pn] ?? 0) - vCom >= 1.8;
                addConductance(pn, nCom, isHigh ? 1 / 470 : 1e-5);
              }
            } else if (c.type === 'capacitor') {
              const cFarad = Math.max(1e-6, c.value * 1e-6);
              const gc = cFarad / dt;
              const vcPrev = capVoltagesRef.current[c.id] ?? 0;
              capModels[c.id] = { gc, vcPrev };
              addConductance(n0, n1, gc + (fault === 'leaky' ? 1 / 260 : 0));
              const ieq = gc * vcPrev;
              Ivec[n0] += ieq;
              Ivec[n1] -= ieq;
            } else if (c.type === 'inductor') {
              const lHenry = Math.max(1e-3, c.value * 1e-3);
              const gl = dt / lHenry;
              const ilPrev = indCurrentsRef.current[c.id] ?? 0;
              indModels[c.id] = { gl, ilPrev };
              addConductance(n0, n1, gl + 1e-5 + (fault === 'leaky' ? 1 / 120 : 0));
              Ivec[n0] -= ilPrev;
              Ivec[n1] += ilPrev;
            } else if (c.type === 'diode' || c.type === 'led' || c.type === 'zener') {
              const isRevFault = fault === 'reversed';
              const aNode = isRevFault ? n1 : n0;
              const kNode = isRevFault ? n0 : n1;
              const vf = c.type === 'led' ? 2.0 : c.type === 'diode' ? Math.max(0.15, Math.min(2.5, c.value || 0.7)) : 0.7;
              const ron = c.type === 'led' ? 20 : 8;
              const mode = diodeModeRef.current[c.id] ?? 'off';

              if (fault === 'leaky') {
                addConductance(aNode, kNode, 1 / 180);
              }

              if (mode === 'fwd') {
                const gOn = 1 / ron;
                addConductance(aNode, kNode, gOn);
                const ieq = vf * gOn;
                Ivec[aNode] += ieq;
                Ivec[kNode] -= ieq;
              } else if (mode === 'zener' && c.type === 'zener') {
                const gz = 1 / 8;
                addConductance(aNode, kNode, gz);
                const ieq = Math.max(1.5, c.value) * gz;
                Ivec[kNode] += ieq;
                Ivec[aNode] -= ieq;
              } else {
                addConductance(aNode, kNode, 1e-7);
              }
            } else if (c.type === 'bjt' && n2 !== undefined) {
              const st = bjtStateRef.current[c.id] ?? { conductingBE: false, region: 'cutoff', ib: 0 };
              if (fault === 'leaky') {
                addConductance(n1, n2, 1 / 200);
              }
              if (st.conductingBE) {
                const gBe = 1 / 100;
                addConductance(n0, n2, gBe);
                const ieqBe = 0.7 * gBe;
                Ivec[n0] += ieqBe;
                Ivec[n2] -= ieqBe;
              } else {
                addConductance(n0, n2, 1e-7);
              }

              if (st.region === 'sat') {
                const gSat = 1 / 5;
                addConductance(n1, n2, gSat);
                const ieqSat = 0.2 * gSat;
                Ivec[n1] += ieqSat;
                Ivec[n2] -= ieqSat;
              } else if (st.region === 'active') {
                addConductance(n1, n2, 1e-5);
                const ic = Math.max(0, Math.min(1.5, c.value * st.ib));
                Ivec[n1] -= ic;
                Ivec[n2] += ic;
              } else {
                addConductance(n1, n2, 1e-7);
              }
            } else if (c.type === 'opamp' && n2 !== undefined) {
              const inMinus = fault === 'reversed' ? n1 : n0;
              const inPlus = fault === 'reversed' ? n0 : n1;
              addConductance(n0, n1, 1e-6);
              const aol = fault === 'leaky' ? 5 : 2500;
              const rOut = fault === 'leaky' ? 300 : 20;
              const gOut = 1 / rOut;
              const vRail = Math.max(3, c.value);
              const sat = opampSatRef.current[c.id] ?? 'linear';

              if (sat === 'pos') {
                G[n2][n2] += gOut;
                Ivec[n2] += vRail * gOut;
              } else if (sat === 'neg') {
                G[n2][n2] += gOut;
                Ivec[n2] -= vRail * gOut;
              } else {
                G[n2][n2] += gOut;
                G[n2][inPlus] -= gOut * aol;
                G[n2][inMinus] += gOut * aol;
              }
            } else if (c.type === 'multimeter') {
              const gMeter = c.meterMode === 'I' ? 1 / 0.05 : 1e-7;
              addConductance(n0, n1, gMeter);
            } else if (c.type === 'oscilloscope') {
              addConductance(n0, n1, 1e-7);
            }
          });

          voltages = solveLinearSystem(G, Ivec);

          if (hasNonlinear) {
            compNodes.forEach(({ comp: c, n0, n1 }) => {
              const fault = getFault(c);
              if (fault === 'open' || fault === 'burned' || fault === 'short') return;
              if ((c.type === 'diode' || c.type === 'led' || c.type === 'zener') && n0 !== undefined && n1 !== undefined) {
                const isRevFault = fault === 'reversed';
                const va = voltages[isRevFault ? n1 : n0] ?? 0;
                const vk = voltages[isRevFault ? n0 : n1] ?? 0;
                const dv = va - vk;
                const vf = c.type === 'led' ? 2.0 : c.type === 'diode' ? Math.max(0.15, Math.min(2.5, c.value || 0.7)) : 0.7;
                if (dv >= vf - 0.02) {
                  diodeModeRef.current[c.id] = 'fwd';
                } else if (c.type === 'zener' && -dv >= Math.max(1.5, c.value) - 0.02) {
                  diodeModeRef.current[c.id] = 'zener';
                } else {
                  diodeModeRef.current[c.id] = 'off';
                }
              } else if (c.type === 'bjt' && n0 !== undefined && n1 !== undefined) {
                const n2 = topology.compNodes.find((x) => x.comp.id === c.id)?.n2;
                if (n2 === undefined) return;
                const vb = voltages[n0] ?? 0;
                const vc = voltages[n1] ?? 0;
                const ve = voltages[n2] ?? 0;
                const vbe = vb - ve;
                const vce = vc - ve;
                const conductingBE = vbe >= 0.68;
                const ib = conductingBE ? Math.max(0, (vbe - 0.7) / 100) : 0;
                const prev = bjtStateRef.current[c.id]?.region ?? 'cutoff';

                let region: 'cutoff' | 'active' | 'sat' = 'cutoff';
                if (!conductingBE || ib <= 1e-6) {
                  region = 'cutoff';
                } else if (prev === 'sat') {
                  const icSat = (vce - 0.2) / 5;
                  region = icSat < c.value * ib ? 'sat' : 'active';
                } else {
                  region = vce <= 0.25 ? 'sat' : 'active';
                }
                bjtStateRef.current[c.id] = { conductingBE, region, ib };
              } else if (c.type === 'opamp' && n0 !== undefined && n1 !== undefined) {
                const vMinus = voltages[fault === 'reversed' ? n1 : n0] ?? 0;
                const vPlus = voltages[fault === 'reversed' ? n0 : n1] ?? 0;
                const aol = fault === 'leaky' ? 5 : 2500;
                const vRail = Math.max(3, c.value);
                const vIdeal = aol * (vPlus - vMinus);
                if (vIdeal > vRail) opampSatRef.current[c.id] = 'pos';
                else if (vIdeal < -vRail) opampSatRef.current[c.id] = 'neg';
                else opampSatRef.current[c.id] = 'linear';
              }
            });
          }
        }

        // Extract final states
        const nextSolvedComps: Record<string, SolvedCompState> = {};
        let hasShort = false;
        let hasLedOverload = false;
        let autoBurnedComp: CircuitComp | null = null;

        compNodes.forEach(({ comp: c, pinNodes, n0, n1, n2, n3 }) => {
          const v0 = n0 !== undefined ? voltages[n0] ?? 0 : 0;
          if (c.type === 'ground' || n1 === undefined) {
            nextSolvedComps[c.id] = { vDrop: 0, currentMa: 0, powerMw: 0, vPin0: v0, vPin1: 0 };
            return;
          }
          const v1 = voltages[n1] ?? 0;
          const v2 = n2 !== undefined ? voltages[n2] ?? 0 : undefined;
          const v3 = n3 !== undefined ? voltages[n3] ?? 0 : undefined;
          const dv = v0 - v1;
          const fault = getFault(c);

          if (fault === 'open' || fault === 'burned') {
            nextSolvedComps[c.id] = {
              vDrop: c.type === 'pushbutton' && v2 !== undefined ? v0 - v2 : dv,
              currentMa: 0,
              powerMw: 0,
              vPin0: v0,
              vPin1: v1,
              vPin2: v2,
              vPin3: v3,
            };
            return;
          }
          if (fault === 'short') {
            const dShort =
              c.type === 'bjt' && v2 !== undefined
                ? v1 - v2
                : c.type === 'pushbutton' && v2 !== undefined
                ? v0 - v2
                : dv;
            const iA = dShort / 0.05;
            nextSolvedComps[c.id] = {
              vDrop: dShort,
              currentMa: iA * 1000,
              powerMw: Math.abs(dShort * iA) * 1000,
              vPin0: v0,
              vPin1: v1,
              vPin2: v2,
              vPin3: v3,
            };
            return;
          }

          if (c.type === 'resistor') {
            const effR = fault === 'leaky' ? Math.max(5, c.value * 0.2) : Math.max(0.5, c.value);
            const iA = dv / effR;
            const powerMw = dv * iA * 1000;
            nextSolvedComps[c.id] = { vDrop: dv, currentMa: iA * 1000, powerMw, vPin0: v0, vPin1: v1 };
            if (autoBurnOnOverload && fault === 'none' && powerMw > 1000) {
              overloadTicksRef.current[c.id] = (overloadTicksRef.current[c.id] ?? 0) + 1;
              if (overloadTicksRef.current[c.id] > 45 && !autoBurnedComp) {
                autoBurnedComp = c;
                overloadTicksRef.current[c.id] = 0;
              }
            } else {
              overloadTicksRef.current[c.id] = 0;
            }
          } else if (c.type === 'ldr') {
            const rLdr = getLdrResistance(c.wiper ?? 0.5);
            const effR = fault === 'leaky' ? Math.max(5, rLdr * 0.2) : rLdr;
            const iA = dv / effR;
            nextSolvedComps[c.id] = {
              vDrop: dv,
              currentMa: iA * 1000,
              powerMw: dv * iA * 1000,
              vPin0: v0,
              vPin1: v1,
              extraLabel: `${formatResistance(rLdr)}`,
            };
          } else if (c.type === 'motor') {
            const effR = fault === 'leaky' ? 6 : 25;
            const iA = dv / effR;
            const rpm = Math.round(Math.abs(dv) * 260);
            nextSolvedComps[c.id] = {
              vDrop: dv,
              currentMa: iA * 1000,
              powerMw: dv * iA * 1000,
              vPin0: v0,
              vPin1: v1,
              extraLabel: `${rpm} RPM`,
            };
          } else if (c.type === 'buzzer') {
            const effR = fault === 'leaky' ? 30 : 150;
            const iA = dv / effR;
            const active = Math.abs(dv) >= 1.5;
            nextSolvedComps[c.id] = {
              vDrop: dv,
              currentMa: iA * 1000,
              powerMw: dv * iA * 1000,
              vPin0: v0,
              vPin1: v1,
              extraLabel: active ? 'Đang kêu' : 'Im lặng',
            };
          } else if (c.type === 'pot' && v2 !== undefined) {
            const w = Math.min(0.95, Math.max(0.05, c.wiper ?? 0.5));
            const scale = fault === 'leaky' ? 0.2 : 1;
            const ra = Math.max(1, c.value * w * scale);
            const rb = Math.max(1, c.value * (1 - w) * scale);
            const ia = (v0 - v2) / ra;
            const ib = (v2 - v1) / rb;
            nextSolvedComps[c.id] = {
              vDrop: v2 - v1,
              currentMa: Math.max(Math.abs(ia), Math.abs(ib)) * 1000,
              powerMw: (Math.pow(v0 - v2, 2) / ra + Math.pow(v2 - v1, 2) / rb) * 1000,
              vPin0: v0,
              vPin1: v1,
              vPin2: v2,
              extraLabel: `Vw=${v2.toFixed(1)}V`,
            };
          } else if (c.type === 'switch') {
            const gSw = c.value >= 0.5 || fault === 'leaky' ? 1 / (fault === 'leaky' ? 150 : 0.04) : 1e-8;
            const iA = dv * gSw;
            nextSolvedComps[c.id] = { vDrop: dv, currentMa: iA * 1000, powerMw: dv * iA * 1000, vPin0: v0, vPin1: v1 };
          } else if (c.type === 'pushbutton' && v2 !== undefined) {
            const dvBtn = v0 - v2;
            const gBtn = c.value >= 0.5 || fault === 'leaky' ? 1 / (fault === 'leaky' ? 150 : 0.04) : 1e-8;
            const iA = dvBtn * gBtn;
            nextSolvedComps[c.id] = {
              vDrop: dvBtn,
              currentMa: iA * 1000,
              powerMw: dvBtn * iA * 1000,
              vPin0: v0,
              vPin1: v1,
              vPin2: v2,
              vPin3: v3,
              extraLabel: c.value >= 0.5 ? 'Đang nhấn' : 'Nhả',
            };
          } else if (c.type === 'source' || c.type === 'ac_source') {
            const emf = c.type === 'ac_source' ? acInstantV[c.id] ?? 0 : c.value;
            const iA = (emf - (v1 - v0)) * G_SRC_INT;
            if (Math.abs(iA) > 8) hasShort = true;
            nextSolvedComps[c.id] = { vDrop: v1 - v0, currentMa: iA * 1000, powerMw: (v1 - v0) * iA * 1000, vPin0: v0, vPin1: v1 };
          } else if (c.type === 'capacitor') {
            const model = capModels[c.id];
            const iCap = model ? model.gc * (dv - model.vcPrev) : 0;
            const iLeak = fault === 'leaky' ? dv / 260 : 0;
            const iA = iCap + iLeak;
            capVoltagesRef.current[c.id] = dv;
            nextSolvedComps[c.id] = { vDrop: dv, currentMa: iA * 1000, powerMw: Math.abs(dv * iA) * 1000, vPin0: v0, vPin1: v1 };
          } else if (c.type === 'inductor') {
            const model = indModels[c.id];
            const iInd = model ? Math.max(-20, Math.min(20, model.ilPrev + model.gl * dv)) : 0;
            const iLeak = fault === 'leaky' ? dv / 120 : 0;
            const iA = iInd + iLeak;
            indCurrentsRef.current[c.id] = iInd;
            nextSolvedComps[c.id] = { vDrop: dv, currentMa: iA * 1000, powerMw: Math.abs(dv * iA) * 1000, vPin0: v0, vPin1: v1 };
          } else if (c.type === 'diode' || c.type === 'led' || c.type === 'zener') {
            const isRevFault = fault === 'reversed';
            const signedDv = isRevFault ? -dv : dv;
            const vf = c.type === 'led' ? 2.0 : c.type === 'diode' ? Math.max(0.15, Math.min(2.5, c.value || 0.7)) : 0.7;
            const ron = c.type === 'led' ? 20 : 8;
            const mode = diodeModeRef.current[c.id] ?? 'off';
            let iA = 0;
            if (mode === 'fwd' && signedDv > vf) iA = (signedDv - vf) / ron;
            else if (mode === 'zener' && c.type === 'zener' && -signedDv > c.value) iA = -(-signedDv - c.value) / 8;
            else iA = signedDv * 1e-7;
            if (fault === 'leaky') iA += signedDv / 180;
            const iMa = (isRevFault ? -iA : iA) * 1000;
            if (c.type === 'led' && (isRevFault ? 0 : iMa) > 30) hasLedOverload = true;
            nextSolvedComps[c.id] = {
              vDrop: dv,
              currentMa: iMa,
              powerMw: Math.abs(dv * iMa),
              vPin0: v0,
              vPin1: v1,
              extraLabel: mode === 'zener' ? `Ổn áp ${c.value}V` : c.type === 'diode' ? (mode === 'fwd' ? 'Dẫn thuận' : 'Khóa') : undefined,
            };
          } else if (c.type === 'bjt' && v2 !== undefined) {
            const bState = bjtStateRef.current[c.id] ?? { conductingBE: false, region: 'cutoff', ib: 0 };
            let icA = 0;
            if (bState.region === 'sat') icA = Math.max(0, (v1 - v2 - 0.2) / 5);
            else if (bState.region === 'active') icA = Math.max(0, Math.min(1.5, c.value * bState.ib));
            if (fault === 'leaky') icA += Math.max(0, (v1 - v2) / 200);
            const regText = bState.region === 'sat' ? 'Bão hòa' : bState.region === 'active' ? 'Khuếch đại' : 'Ngắt';
            nextSolvedComps[c.id] = {
              vDrop: v1 - v2,
              currentMa: icA * 1000,
              powerMw: Math.abs((v1 - v2) * icA) * 1000,
              vPin0: v0,
              vPin1: v1,
              vPin2: v2,
              extraLabel: `${regText} (Ib=${(bState.ib * 1e6).toFixed(0)}μA)`,
            };
          } else if (c.type === 'opamp' && v2 !== undefined) {
            const vMinus = fault === 'reversed' ? v1 : v0;
            const vPlus = fault === 'reversed' ? v0 : v1;
            const aol = fault === 'leaky' ? 5 : 2500;
            const rOut = fault === 'leaky' ? 300 : 20;
            const vRail = Math.max(3, c.value);
            const sat = opampSatRef.current[c.id] ?? 'linear';
            const vTarget = sat === 'pos' ? vRail : sat === 'neg' ? -vRail : aol * (vPlus - vMinus);
            const iOutA = (vTarget - v2) / rOut;
            nextSolvedComps[c.id] = {
              vDrop: v2,
              currentMa: iOutA * 1000,
              powerMw: Math.abs(v2 * iOutA) * 1000,
              vPin0: v0,
              vPin1: v1,
              vPin2: v2,
              extraLabel: sat === 'pos' ? '+Bão hòa' : sat === 'neg' ? '−Bão hòa' : `Vout=${v2.toFixed(2)}V`,
            };
          } else if (c.type === 'multimeter') {
            const gMeter = c.meterMode === 'I' ? 1 / 0.05 : 1e-7;
            const vMeas = v1 - v0;
            const iMa = vMeas * gMeter * 1000;
            nextSolvedComps[c.id] = {
              vDrop: vMeas,
              currentMa: iMa,
              powerMw: Math.abs(vMeas * iMa),
              vPin0: v0,
              vPin1: v1,
            };
          } else if (c.type === 'oscilloscope') {
            const vMeas = v1 - v0;
            nextSolvedComps[c.id] = {
              vDrop: vMeas,
              currentMa: 0,
              powerMw: 0,
              vPin0: v0,
              vPin1: v1,
            };
          } else if (c.type === 'clockgen') {
            const info = clkEvalMap[c.id];
            const vOut = v1 - v0;
            const iA = info ? ((info.hi ? info.vHi : 0.04) - vOut) / 25 : 0;
            nextSolvedComps[c.id] = {
              vDrop: vOut,
              currentMa: iA * 1000,
              powerMw: Math.abs(vOut * iA) * 1000,
              vPin0: v0,
              vPin1: v1,
              digitalValue: info?.hi ? 1 : 0,
              extraLabel: info?.hi ? 'CLK HIGH' : 'CLK LOW',
            };
          } else if (c.type === 'mcu8051') {
            const info = mcuEvalMap[c.id];
            const vGnd = pinNodes[5] !== undefined ? voltages[pinNodes[5]] ?? 0 : 0;
            const vSup = v0 - vGnd;
            const pwrOk = vSup >= 3.0;
            const iSupMa = (vSup / 1000) * 1000;
            const ev = info?.evalRes;
            const bits =
              ((ev?.p1Byte ?? 0) & 0x0f) |
              (((ev?.p2LowBits ?? 0) & 0x03) << 4) |
              ((ev?.clkOutBit ?? 0) << 6) |
              ((info?.int1Low ? 1 : 0) << 7);
            nextSolvedComps[c.id] = {
              vDrop: vSup,
              currentMa: iSupMa,
              powerMw: Math.abs(vSup * iSupMa),
              vPin0: v0,
              vPin1: v1,
              digitalValue: pwrOk ? ev?.p1Byte ?? 0 : 0,
              digitalBits: pwrOk ? bits : 0,
              digitalAux: pwrOk ? ev?.pcHex ?? 0 : 0,
              extraLabel: pwrOk ? ev?.stepLabel ?? 'AT89C51' : 'Mất VCC',
            };
          } else if (c.type === 'dec74138') {
            const info = decEvalMap[c.id];
            const vGnd = pinNodes[4] !== undefined ? voltages[pinNodes[4]] ?? 0 : 0;
            const vSup = v0 - vGnd;
            const outMask =
              info && info.vccOk && info.enHigh ? ~(1 << info.addr) & 0x0f : 0x0f;
            nextSolvedComps[c.id] = {
              vDrop: vSup,
              currentMa: (vSup / 1200) * 1000,
              powerMw: Math.abs((vSup * vSup) / 1200) * 1000,
              vPin0: v0,
              vPin1: v1,
              digitalValue: info && info.vccOk && info.enHigh ? info.addr : -1,
              digitalBits: outMask,
              extraLabel: !info?.vccOk
                ? 'Mất VCC'
                : !info.enHigh
                ? 'EN=0 (Khóa)'
                : `Y${info.addr} = LOW`,
            };
          } else if (c.type === 'sevenseg') {
            const nCom = pinNodes[5];
            const vCom = nCom !== undefined ? voltages[nCom] ?? 0 : 0;
            const bitHigh = (pi: number) => {
              const pn = pinNodes[pi];
              return pn !== undefined && (voltages[pn] ?? 0) - vCom >= 1.8 ? 1 : 0;
            };
            const val = bitHigh(0) | (bitHigh(1) << 1) | (bitHigh(2) << 2) | (bitHigh(3) << 3);
            const dpOn = bitHigh(4) === 1;
            const segMask = SEVEN_SEG_CODES[val] ?? 0x3f;
            let totalMa = 0;
            for (let pi = 0; pi <= 4; pi++) {
              const pn = pinNodes[pi];
              if (pn !== undefined && (voltages[pn] ?? 0) - vCom >= 1.8) {
                totalMa += (((voltages[pn] ?? 0) - vCom) / 470) * 1000;
              }
            }
            nextSolvedComps[c.id] = {
              vDrop: totalMa > 0 ? 2.0 : 0,
              currentMa: totalMa,
              powerMw: totalMa * 2.0,
              vPin0: v0,
              vPin1: v1,
              digitalValue: val,
              digitalBits: segMask,
              digitalAux: dpOn ? 1 : 0,
              extraLabel: `Số ${val.toString(16).toUpperCase()}${dpOn ? '.' : ''}`,
            };
          }
        });

        if (autoBurnedComp) {
          const burned = autoBurnedComp as CircuitComp;
          setComponents((prev) => prev.map((x) => (x.id === burned.id ? { ...x, fault: 'burned' } : x)));
          setBurnNotice(`${burned.label} đã bị cháy đứt do quá tải công suất (> 1.0W)!`);
        }

        const nextSolvedWires: Record<string, SolvedWireState> = {};
        wireEdges.forEach((we) => {
          const v1 = voltages[we.n1] ?? 0;
          const v2 = voltages[we.n2] ?? 0;
          const iA = (v1 - v2) * G_WIRE;
          nextSolvedWires[we.id] = { currentMa: iA * 1000, voltage: (v1 + v2) / 2 };
        });

        const nextPinVoltages: Record<string, number> = {};
        pinKeys.forEach((k) => {
          nextPinVoltages[k] = voltages[pinNodeMap[k]] ?? 0;
        });

        components.forEach((m) => {
          if (m.type !== 'multimeter') return;
          const evalRes = evaluateMultimeterReading(
            m,
            components,
            wires,
            breadboards,
            nextSolvedComps,
            nextSolvedWires,
            nextPinVoltages
          );
          const prevSt = nextSolvedComps[m.id] ?? {
            vDrop: 0,
            currentMa: 0,
            powerMw: 0,
            vPin0: 0,
            vPin1: 0,
          };
          nextSolvedComps[m.id] = {
            ...prevSt,
            vDrop: m.meterMode === 'I' ? prevSt.vDrop : evalRes.numericVal,
            currentMa: m.meterMode === 'I' ? evalRes.numericVal : prevSt.currentMa,
            extraLabel: evalRes.displayText,
          };
        });

        // Record 60Hz time-domain waveform history for each 3D Oscilloscope component
        const nextScopeTraces: Record<string, OscilloscopeTraceData> = {};
        const tNow = simTimeRef.current;
        components.forEach((osc) => {
          if (osc.type !== 'oscilloscope') return;
          const evalOsc = evaluateOscilloscopeSample(
            osc,
            components,
            wires,
            breadboards,
            nextSolvedComps,
            nextPinVoltages
          );
          const buf = scopeHistoryRef.current[osc.id] ?? [];
          if (evalOsc.hasMeasurement) {
            buf.push({ t: tNow, v: evalOsc.vInst });
          } else {
            buf.push({ t: tNow, v: 0 });
          }
          const cutoff = tNow - 4.5;
          while (buf.length > 360 || (buf.length > 2 && buf[0].t < cutoff)) {
            buf.shift();
          }
          scopeHistoryRef.current[osc.id] = buf;

          const win = osc.scopeTimeWindow ?? 2.0;
          const winStart = tNow - win;
          const inWin = buf.filter((pt) => pt.t >= winStart);
          const srcArr = inWin.length >= 2 ? inWin : buf;

          // Downsample cleanly to max 110 points for crisp, fast 3D CanvasTexture rendering
          const maxPts = 110;
          const samples: number[] = [];
          if (srcArr.length <= maxPts) {
            for (let i = 0; i < srcArr.length; i++) samples.push(srcArr[i].v);
          } else {
            for (let i = 0; i < maxPts; i++) {
              const idx = Math.floor((i / (maxPts - 1)) * (srcArr.length - 1));
              samples.push(srcArr[idx].v);
            }
          }

          const vmin = samples.length > 0 ? Math.min(...samples) : 0;
          const vmax = samples.length > 0 ? Math.max(...samples) : 0;
          const vpp = vmax - vmin;
          nextScopeTraces[osc.id] = {
            samples,
            vInst: evalOsc.vInst,
            vmin,
            vmax,
            vpp,
            targetLabel: evalOsc.targetLabel,
            hasMeasurement: evalOsc.hasMeasurement,
          };

          const prevSt = nextSolvedComps[osc.id] ?? {
            vDrop: 0,
            currentMa: 0,
            powerMw: 0,
            vPin0: 0,
            vPin1: 0,
          };
          nextSolvedComps[osc.id] = {
            ...prevSt,
            vDrop: evalOsc.vInst,
            extraLabel: evalOsc.hasMeasurement
              ? `${evalOsc.vInst >= 0 ? '+' : ''}${evalOsc.vInst.toFixed(1)}V · Vpp ${vpp.toFixed(1)}V`
              : 'CH1 chờ đo',
          };
        });

        const vRed = redProbe ? nextPinVoltages[getPinRefKey(redProbe)] ?? 0 : 0;
        const vBlack = blackProbe ? nextPinVoltages[getPinRefKey(blackProbe)] ?? 0 : 0;
        const vVom = vRed - vBlack;

        const focusComp =
          components.find(
            (c) => c.id === selectedId && c.type !== 'ground' && c.type !== 'multimeter' && c.type !== 'oscilloscope'
          ) ||
          components.find(
            (c) =>
              c.type === 'led' ||
              c.type === 'motor' ||
              c.type === 'opamp' ||
              c.type === 'capacitor' ||
              c.type === 'inductor' ||
              c.type === 'zener' ||
              c.type === 'bjt'
          ) ||
          components.find((c) => c.type === 'resistor') ||
          components.find((c) => c.type !== 'multimeter' && c.type !== 'oscilloscope') ||
          components[0];

        const st = focusComp ? nextSolvedComps[focusComp.id] : undefined;
        historyRef.current = [
          ...historyRef.current.slice(-899),
          {
            t: Number(simTimeRef.current.toFixed(3)),
            vCh1: Number(vVom.toFixed(3)),
            vCh2: Number((st ? st.vDrop : 0).toFixed(3)),
            iCh2: Number((st ? st.currentMa : 0).toFixed(2)),
          },
        ];

        frameCount++;
        if (frameCount % 2 === 0 || draggingComp || draggingBreadboard) {
          setSimFrame({
            solvedComps: nextSolvedComps,
            solvedWires: nextSolvedWires,
            nodeVoltages: nextPinVoltages,
            tracePoints: [...historyRef.current],
            scopeTraces: nextScopeTraces,
            animPhase: animPhaseRef.current,
            simElapsedSec: simTimeRef.current,
            shortWarning: hasShort,
            ledOverloadWarning: hasLedOverload,
          });
        }

        if (onSimulationStats && frameCount % 15 === 0) {
          const src = components.find((c) => c.type === 'source' || c.type === 'ac_source');
          const srcState = src ? nextSolvedComps[src.id] : null;
          onSimulationStats({
            'Bảng mạch': `${components.length} LK · ${wires.length} dây`,
            'VOM (V+ − V−)': `${vVom >= 0 ? '+' : ''}${vVom.toFixed(2)} V`,
            'Dòng nguồn': srcState ? `${srcState.currentMa.toFixed(1)} mA` : '0.0 mA',
            [`${focusComp?.label || 'Tải'}`]: st ? `${st.vDrop.toFixed(2)}V · ${st.currentMa.toFixed(1)}mA` : '0.00V',
          });
        }
      }

      rafId = requestAnimationFrame(stepSimulation);
    };

    rafId = requestAnimationFrame(stepSimulation);
    return () => cancelAnimationFrame(rafId);
  }, [
    topology,
    components,
    wires.length,
    isRunning,
    simSpeed,
    selectedId,
    draggingComp,
    draggingBreadboard,
    redProbe,
    blackProbe,
    activeMission,
    missionSolved,
    autoBurnOnOverload,
    onSimulationStats,
  ]);

  const handleToggleSwitch = (id: string) => {
    pushUndoSnapshot();
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.type === 'switch' || c.type === 'pushbutton') {
          return { ...c, value: c.value >= 0.5 ? 0 : 1 };
        }
        if (c.type === 'multimeter') {
          return { ...c, meterMode: c.meterMode === 'I' ? 'V' : 'I' };
        }
        if (c.type === 'oscilloscope') {
          const curW = c.scopeTimeWindow ?? 2.0;
          const nextW = curW <= 0.6 ? 1.0 : curW <= 1.2 ? 2.0 : curW <= 2.5 ? 4.0 : 0.5;
          return { ...c, scopeTimeWindow: nextW };
        }
        return c;
      })
    );
  };

  const handleSetMeterProbe = (meterId: string, side: 'red' | 'black', target: ProbeTarget | null) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === meterId ? { ...c, [side === 'red' ? 'redTarget' : 'blackTarget']: target } : c
      )
    );
  };

  const find2DProbeTargetAt = (svgX: number, svgY: number): ProbeTarget | null => {
    let bestPin: { target: ProbeTarget; d: number } | null = null;
    for (const c of components) {
      if (c.type === 'multimeter' || c.type === 'oscilloscope') continue;
      for (const p of getCompPins(c.type)) {
        const pt = getPinPosition(c, p);
        const d = Math.hypot(svgX - pt.x, svgY - pt.y);
        if (d <= 18 && (!bestPin || d < bestPin.d)) {
          bestPin = { target: { kind: 'pin', compId: c.id, pin: p }, d };
        }
      }
    }
    if (bestPin) return bestPin.target;

    let bestHole: { target: ProbeTarget; d: number } | null = null;
    for (const bb of breadboards) {
      for (const h of getBreadboardHoles(bb)) {
        const d = Math.hypot(svgX - h.x, svgY - h.y);
        if (d <= 12 && (!bestHole || d < bestHole.d)) {
          bestHole = { target: { kind: 'hole', bbId: bb.id, holeId: h.holeId }, d };
        }
      }
    }
    if (bestHole) return bestHole.target;

    let bestWire: { target: ProbeTarget; d: number } | null = null;
    for (const w of wires) {
      const poly = getWirePolylinePoints(w, components, breadboards);
      if (poly.length < 2) continue;
      const closest = closestPointOnWirePolyline(poly, svgX, svgY);
      if (closest && closest.dist <= 16 && (!bestWire || closest.dist < bestWire.d)) {
        bestWire = { target: { kind: 'wire', wireId: w.id, t: closest.t }, d: closest.dist };
      }
    }
    if (bestWire) return bestWire.target;

    let bestComp: { target: ProbeTarget; d: number } | null = null;
    for (const c of components) {
      if (c.type === 'multimeter' || c.type === 'oscilloscope') continue;
      const d = Math.hypot(svgX - c.x, svgY - c.y);
      if (d <= 36 && (!bestComp || d < bestComp.d)) {
        bestComp = { target: { kind: 'component', compId: c.id }, d };
      }
    }
    return bestComp?.target ?? null;
  };

  const finishOrStartWireAt = (targetRef: PinRef, targetPos: { x: number; y: number }) => {
    if (activeMeterProbeEdit && !wireStart) {
      const target: ProbeTarget = targetRef.holeId
        ? { kind: 'hole', bbId: targetRef.compId, holeId: targetRef.holeId }
        : { kind: 'pin', compId: targetRef.compId, pin: targetRef.pin };
      pushUndoSnapshot();
      handleSetMeterProbe(activeMeterProbeEdit.meterId, activeMeterProbeEdit.side, target);
      setActiveMeterProbeEdit(null);
      return;
    }

    if (probeMode !== 'none' && !isWireMode && !wireStart) {
      if (probeMode === 'red') setRedProbe(targetRef);
      else setBlackProbe(targetRef);
      return;
    }

    if (!wireStart) {
      setWireStart(targetRef);
      setWireDraftWaypoints([]);
      setCursorPt(targetPos);
      return;
    }

    const startKey = getPinRefKey(wireStart);
    const endKey = getPinRefKey(targetRef);
    if (startKey === endKey) {
      setWireStart(null);
      setWireDraftWaypoints([]);
      return;
    }

    const isTargetOnBb =
      Boolean(targetRef.holeId) || Boolean(breadboardLookup.byCoord[`${targetPos.x},${targetPos.y}`]);
    const targetY = isTargetOnBb ? 0.44 : 0.08;

    const exists = wires.some((w) => {
      const fk = getPinRefKey(w.from);
      const tk = getPinRefKey(w.to);
      return (fk === startKey && tk === endKey) || (fk === endKey && tk === startKey);
    });

    if (exists) {
      canvas3DRef.current?.triggerWireSpark(
        targetPos,
        targetY,
        'Nối sai: Dây dẫn giữa hai điểm này đã tồn tại!',
        'minor'
      );
      setWireStart(null);
      setWireDraftWaypoints([]);
      return;
    }

    const nStart = topology.pinNodeMap[startKey];
    const nEnd = topology.pinNodeMap[endKey];

    // 1. Connecting two points already hardwired on the exact same node / breadboard column or rail
    if (nStart !== undefined && nEnd !== undefined && nStart === nEnd) {
      canvas3DRef.current?.triggerWireSpark(
        targetPos,
        targetY,
        'Nối sai: Hai điểm đã thông mạch sẵn trên cùng hàng/nút!',
        'minor'
      );
      setWireStart(null);
      setWireDraftWaypoints([]);
      return;
    }

    // 2. Self-shorting two pins on the same non-source component
    if (!wireStart.holeId && !targetRef.holeId && wireStart.compId === targetRef.compId) {
      const sameComp = components.find((c) => c.id === targetRef.compId);
      if (sameComp && sameComp.type !== 'source' && sameComp.type !== 'ac_source') {
        canvas3DRef.current?.triggerWireSpark(
          targetPos,
          targetY,
          `Nối sai: Đấu tắt trực tiếp hai chân của ${sameComp.label}!`,
          'minor'
        );
        setWireStart(null);
        setWireDraftWaypoints([]);
        return;
      }
    }

    // 3. Check if completing this wire creates a direct zero-load short circuit across any power source
    let createsDirectShort = false;
    if (nStart !== undefined && nEnd !== undefined) {
      const adj = new Map<number, number[]>();
      const addZeroEdge = (a?: number, b?: number) => {
        if (a === undefined || b === undefined || a === b) return;
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
      };
      topology.wireEdges.forEach((we) => addZeroEdge(we.n1, we.n2));
      topology.compNodes.forEach(({ comp: c, n0, n1, n2, n3 }) => {
        if (c.fault === 'open' || c.fault === 'burned') return;
        if (c.type === 'switch' && c.value >= 0.5) addZeroEdge(n0, n1);
        if (c.type === 'pushbutton') {
          addZeroEdge(n0, n1);
          addZeroEdge(n2, n3);
          if (c.value >= 0.5) addZeroEdge(n0, n2);
        }
        if (c.fault === 'short') addZeroEdge(n0, n1);
      });

      const bfsReach = (seed: number) => {
        const visited = new Set<number>([seed]);
        const q = [seed];
        while (q.length > 0) {
          const curNode = q.shift()!;
          const nbrs = adj.get(curNode);
          if (!nbrs) continue;
          for (const nxt of nbrs) {
            if (!visited.has(nxt)) {
              visited.add(nxt);
              q.push(nxt);
            }
          }
        }
        return visited;
      };

      const reachA = bfsReach(nStart);
      const reachB = bfsReach(nEnd);
      createsDirectShort = topology.compNodes.some(({ comp: c, n0, n1 }) => {
        if ((c.type !== 'source' && c.type !== 'ac_source') || n0 === undefined || n1 === undefined) return false;
        return (reachA.has(n1) && reachB.has(n0)) || (reachA.has(n0) && reachB.has(n1));
      });
    }

    pushUndoSnapshot();
    const newWire: CircuitWire = {
      id: `w-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      from: wireStart,
      to: targetRef,
      color: activeWireColor,
      waypoints: wireDraftWaypoints.length > 0 ? wireDraftWaypoints : undefined,
    };
    setWires((prev) => [...prev, newWire]);
    setSelectedWireId(newWire.id);
    setSelectedId(null);
    setSelectedBreadboardId(null);
    setWireStart(null);
    setWireDraftWaypoints([]);

    if (createsDirectShort) {
      canvas3DRef.current?.triggerWireSpark(
        targetPos,
        targetY,
        'Đoản mạch: Nối thẳng cực (+) với cực (−) nguồn!',
        'major'
      );
    }
  };

  const handlePinClick = (e: React.MouseEvent, compId: string, pin: PinIndex) => {
    e.stopPropagation();
    if (activePlaceType) return;
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;
    finishOrStartWireAt({ compId, pin }, getPinPosition(comp, pin));
  };

  const handleHoleClick = (e: React.MouseEvent, bbId: string, hole: BreadboardHole) => {
    e.stopPropagation();
    if (activePlaceType) {
      const dropTarget: ProbeTarget | null =
        activePlaceType === 'multimeter' || activePlaceType === 'oscilloscope'
          ? { kind: 'hole', bbId, holeId: hole.holeId }
          : null;
      addComponentAt(activePlaceType, hole.x, hole.y, dropTarget);
      setActivePlaceType(null);
      return;
    }
    finishOrStartWireAt({ compId: bbId, pin: 0, holeId: hole.holeId }, { x: hole.x, y: hole.y });
  };

  const handleCompPointerDown = (e: React.PointerEvent, comp: CircuitComp) => {
    e.stopPropagation();
    if (activeMeterProbeEdit && comp.type !== 'multimeter' && comp.type !== 'oscilloscope') {
      pushUndoSnapshot();
      handleSetMeterProbe(activeMeterProbeEdit.meterId, activeMeterProbeEdit.side, { kind: 'component', compId: comp.id });
      setActiveMeterProbeEdit(null);
      return;
    }
    if (activePlaceType) {
      const dropTarget: ProbeTarget | null =
        (activePlaceType === 'multimeter' || activePlaceType === 'oscilloscope') &&
        comp.type !== 'multimeter' &&
        comp.type !== 'oscilloscope'
          ? { kind: 'component', compId: comp.id }
          : null;
      addComponentAt(activePlaceType, cursorPt.x, cursorPt.y, dropTarget);
      setActivePlaceType(null);
      return;
    }
    handleSelectComponent(comp);
    if (isWireMode || wireStart) return;
    const pt = clientToSvg(e.clientX, e.clientY);
    setDraggingComp({
      id: comp.id,
      offsetX: comp.x - pt.x,
      offsetY: comp.y - pt.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasDragged: false,
      preDragSnapshot: { components, wires, breadboards },
    });
  };

  const handleStartDragBreadboard = (e: React.PointerEvent, bb: BreadboardObj) => {
    if (activePlaceType || wireStart || isWireMode) return;
    const pt = clientToSvg(e.clientX, e.clientY);
    setDraggingBreadboard({
      id: bb.id,
      offsetX: bb.x - pt.x,
      offsetY: bb.y - pt.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasDragged: false,
      preDragSnapshot: { components, wires, breadboards },
    });
  };

  const handleSvgPointerDown = (e: React.PointerEvent) => {
    if (activePlaceType || wireStart) return;
    setPanDrag({
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      hasMoved: false,
    });
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    const pt = clientToSvg(e.clientX, e.clientY);
    setCursorPt(pt);

    if (draggingWaypoint) {
      setWires((prev) =>
        prev.map((w) => {
          if (w.id !== draggingWaypoint.wireId) return w;
          const nextWps = [...(w.waypoints ?? [])];
          nextWps[draggingWaypoint.index] = { x: pt.x, y: pt.y };
          return { ...w, waypoints: nextWps };
        })
      );
      return;
    }

    if (draggingComp) {
      const dist = Math.hypot(e.clientX - draggingComp.startClientX, e.clientY - draggingComp.startClientY);
      const nowDragged = draggingComp.hasDragged || dist > 5;
      if (nowDragged) {
        if (!draggingComp.hasDragged) {
          setDraggingComp((d) => (d ? { ...d, hasDragged: true } : null));
        }
        setComponents((prev) =>
          prev.map((c) =>
            c.id === draggingComp.id
              ? {
                  ...c,
                  x: Math.max(60, Math.min(SVG_W - 60, snap(pt.x + draggingComp.offsetX))),
                  y: Math.max(40, Math.min(SVG_H - 40, snap(pt.y + draggingComp.offsetY))),
                }
              : c
          )
        );
      }
      return;
    }

    if (draggingBreadboard) {
      const dist = Math.hypot(e.clientX - draggingBreadboard.startClientX, e.clientY - draggingBreadboard.startClientY);
      const nowDragged = draggingBreadboard.hasDragged || dist > 5;
      if (nowDragged) {
        if (!draggingBreadboard.hasDragged) {
          setDraggingBreadboard((d) => (d ? { ...d, hasDragged: true } : null));
        }
        const curBb = breadboards.find((b) => b.id === draggingBreadboard.id);
        const nextX = Math.max(40, Math.min(SVG_W - 520, snap(pt.x + draggingBreadboard.offsetX)));
        const nextY = Math.max(180, Math.min(SVG_H - 180, snap(pt.y + draggingBreadboard.offsetY)));
        if (curBb && (curBb.x !== nextX || curBb.y !== nextY)) {
          const dx = nextX - curBb.x;
          const dy = nextY - curBb.y;
          // Move components plugged onto this breadboard together with the board!
          const bbRect = {
            left: curBb.x - 20,
            right: curBb.x + (curBb.cols - 1) * GRID + 20,
            top: curBb.y - 170,
            bottom: curBb.y + 170,
          };
          setBreadboards((prev) => prev.map((b) => (b.id === curBb.id ? { ...b, x: nextX, y: nextY } : b)));
          setComponents((prev) =>
            prev.map((c) => {
              const pins = getCompPins(c.type);
              const onBoard = pins.some((p) => {
                const pos = getPinPosition(c, p);
                return pos.x >= bbRect.left && pos.x <= bbRect.right && pos.y >= bbRect.top && pos.y <= bbRect.bottom;
              });
              return onBoard ? { ...c, x: c.x + dx, y: c.y + dy } : c;
            })
          );
          setWires((prev) =>
            prev.map((w) => {
              if (!w.waypoints || w.waypoints.length === 0) return w;
              const touchesBoard = w.from.compId === curBb.id || w.to.compId === curBb.id;
              return touchesBoard
                ? { ...w, waypoints: w.waypoints.map((wp) => ({ x: wp.x + dx, y: wp.y + dy })) }
                : w;
            })
          );
        }
      }
      return;
    }

    if (panDrag && svgRef.current) {
      const dist = Math.hypot(e.clientX - panDrag.startClientX, e.clientY - panDrag.startClientY);
      if (dist > 4) {
        const rect = svgRef.current.getBoundingClientRect();
        const dxSvg = ((e.clientX - panDrag.startClientX) / rect.width) * viewBoxW;
        const dySvg = ((e.clientY - panDrag.startClientY) / rect.height) * viewBoxH;
        setPan({
          x: Math.max(-220, Math.min(220, panDrag.startPanX - dxSvg)),
          y: Math.max(-140, Math.min(140, panDrag.startPanY - dySvg)),
        });
        if (!panDrag.hasMoved) {
          setPanDrag((p) => (p ? { ...p, hasMoved: true } : null));
        }
      }
    }
  };

  const handleSvgPointerUp = () => {
    if (draggingWaypoint) {
      pushUndoSnapshot(
        draggingWaypoint.preDragSnapshot.components,
        draggingWaypoint.preDragSnapshot.wires,
        draggingWaypoint.preDragSnapshot.breadboards
      );
      setDraggingWaypoint(null);
    }
    if (draggingComp) {
      if (draggingComp.hasDragged) {
        pushUndoSnapshot(
          draggingComp.preDragSnapshot.components,
          draggingComp.preDragSnapshot.wires,
          draggingComp.preDragSnapshot.breadboards
        );
      } else {
        const clicked = components.find((c) => c.id === draggingComp.id);
        if ((clicked?.type === 'switch' || clicked?.type === 'pushbutton') && !isWireMode && probeMode === 'none') {
          handleToggleSwitch(clicked.id);
        }
      }
      setDraggingComp(null);
    }
    if (draggingBreadboard) {
      if (draggingBreadboard.hasDragged) {
        pushUndoSnapshot(
          draggingBreadboard.preDragSnapshot.components,
          draggingBreadboard.preDragSnapshot.wires,
          draggingBreadboard.preDragSnapshot.breadboards
        );
      }
      setDraggingBreadboard(null);
    }
    if (panDrag) {
      setPanDrag(null);
    }
  };

  const handleMoveCompTo = (compId: string, rawX: number, rawY: number) => {
    const nx = Math.max(60, Math.min(SVG_W - 60, snap(rawX)));
    const ny = Math.max(40, Math.min(SVG_H - 40, snap(rawY)));
    setComponents((prev) => prev.map((c) => (c.id === compId ? { ...c, x: nx, y: ny } : c)));
  };

  const handleMoveBreadboardTo = (bbId: string, rawX: number, rawY: number) => {
    const curBb = breadboards.find((b) => b.id === bbId);
    if (!curBb) return;
    const nextX = Math.max(40, Math.min(SVG_W - 520, snap(rawX)));
    const nextY = Math.max(180, Math.min(SVG_H - 180, snap(rawY)));
    if (curBb.x === nextX && curBb.y === nextY) return;
    const dx = nextX - curBb.x;
    const dy = nextY - curBb.y;
    const bbRect = {
      left: curBb.x - 20,
      right: curBb.x + (curBb.cols - 1) * GRID + 20,
      top: curBb.y - 170,
      bottom: curBb.y + 170,
    };
    setBreadboards((prev) => prev.map((b) => (b.id === bbId ? { ...b, x: nextX, y: nextY } : b)));
    setComponents((prev) =>
      prev.map((c) => {
        const pins = getCompPins(c.type);
        const onBoard = pins.some((p) => {
          const pos = getPinPosition(c, p);
          return pos.x >= bbRect.left && pos.x <= bbRect.right && pos.y >= bbRect.top && pos.y <= bbRect.bottom;
        });
        return onBoard ? { ...c, x: c.x + dx, y: c.y + dy } : c;
      })
    );
    setWires((prev) =>
      prev.map((w) => {
        if (!w.waypoints || w.waypoints.length === 0) return w;
        const touchesBoard = w.from.compId === curBb.id || w.to.compId === curBb.id;
        return touchesBoard
          ? { ...w, waypoints: w.waypoints.map((wp) => ({ x: wp.x + dx, y: wp.y + dy })) }
          : w;
      })
    );
  };

  const handleRotateSelected = () => {
    if (!selectedId) return;
    pushUndoSnapshot();
    setComponents((prev) =>
      prev.map((c) => (c.id === selectedId && c.type !== 'ground' ? { ...c, rotation: (c.rotation + 90) % 360 } : c))
    );
  };

  const handleFlipSelected180 = () => {
    if (!selectedId) return;
    pushUndoSnapshot();
    setComponents((prev) =>
      prev.map((c) => (c.id === selectedId && c.type !== 'ground' ? { ...c, rotation: (c.rotation + 180) % 360 } : c))
    );
  };

  const handleDuplicateSelected = () => {
    if (!selectedId) return;
    const target = components.find((c) => c.id === selectedId);
    if (!target) return;
    pushUndoSnapshot();
    const prefix = target.label.replace(/\d+$/, '');
    const count = components.filter((c) => c.type === target.type).length + 1;
    const clone: CircuitComp = {
      ...target,
      id: `${target.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Math.min(SVG_W - 60, target.x + 20),
      y: Math.min(SVG_H - 40, target.y + 20),
      label: target.type === 'ground' ? 'GND' : `${prefix || target.type[0].toUpperCase()}${count}`,
    };
    setComponents((prev) => [...prev, clone]);
    handleSelectComponent(clone);
  };

  const handleDeleteSelected = () => {
    if (selectedWireId) {
      pushUndoSnapshot();
      setWires((prev) => prev.filter((w) => w.id !== selectedWireId));
      setComponents((prev) =>
        prev.map((c) =>
          c.type === 'multimeter' || c.type === 'oscilloscope'
            ? {
                ...c,
                redTarget: c.redTarget?.kind === 'wire' && c.redTarget.wireId === selectedWireId ? null : c.redTarget,
                blackTarget:
                  c.blackTarget?.kind === 'wire' && c.blackTarget.wireId === selectedWireId ? null : c.blackTarget,
              }
            : c
        )
      );
      setSelectedWireId(null);
      return;
    }
    if (selectedBreadboardId) {
      pushUndoSnapshot();
      setBreadboards((prev) => prev.filter((b) => b.id !== selectedBreadboardId));
      setWires((prev) => prev.filter((w) => w.from.compId !== selectedBreadboardId && w.to.compId !== selectedBreadboardId));
      setComponents((prev) =>
        prev.map((c) =>
          c.type === 'multimeter' || c.type === 'oscilloscope'
            ? {
                ...c,
                redTarget:
                  c.redTarget?.kind === 'hole' && c.redTarget.bbId === selectedBreadboardId ? null : c.redTarget,
                blackTarget:
                  c.blackTarget?.kind === 'hole' && c.blackTarget.bbId === selectedBreadboardId
                    ? null
                    : c.blackTarget,
              }
            : c
        )
      );
      if (redProbe?.compId === selectedBreadboardId) setRedProbe(null);
      if (blackProbe?.compId === selectedBreadboardId) setBlackProbe(null);
      setSelectedBreadboardId(null);
      return;
    }
    if (!selectedId) return;
    pushUndoSnapshot();
    const removedWireIds = new Set(
      wires.filter((w) => w.from.compId === selectedId || w.to.compId === selectedId).map((w) => w.id)
    );
    const cleanTarget = (t?: ProbeTarget | null): ProbeTarget | null | undefined => {
      if (!t) return t;
      if (t.kind === 'component' && t.compId === selectedId) return null;
      if (t.kind === 'pin' && t.compId === selectedId) return null;
      if (t.kind === 'wire' && removedWireIds.has(t.wireId)) return null;
      return t;
    };
    setComponents((prev) =>
      prev
        .filter((c) => c.id !== selectedId)
        .map((c) =>
          c.type === 'multimeter' || c.type === 'oscilloscope'
            ? { ...c, redTarget: cleanTarget(c.redTarget), blackTarget: cleanTarget(c.blackTarget) }
            : c
        )
    );
    setWires((prev) => prev.filter((w) => w.from.compId !== selectedId && w.to.compId !== selectedId));
    if (redProbe?.compId === selectedId) setRedProbe(null);
    if (blackProbe?.compId === selectedId) setBlackProbe(null);
    if (activeMeterProbeEdit?.meterId === selectedId) setActiveMeterProbeEdit(null);
    delete capVoltagesRef.current[selectedId];
    delete indCurrentsRef.current[selectedId];
    delete diodeModeRef.current[selectedId];
    delete bjtStateRef.current[selectedId];
    delete opampSatRef.current[selectedId];
    delete scopeHistoryRef.current[selectedId];
    setSelectedId(null);
  };

  const updateSelectedComp = (patch: Partial<CircuitComp>) => {
    if (!selectedId) return;
    setComponents((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...patch } : c)));
    if (patch.value !== undefined && onParametersBatchChange) {
      const sel = components.find((c) => c.id === selectedId);
      if (sel?.type === 'source' || sel?.type === 'ac_source') onParametersBatchChange({ V_src: patch.value });
      if (sel?.type === 'resistor' || sel?.type === 'pot') onParametersBatchChange({ R_val: patch.value });
      if (sel?.type === 'capacitor') onParametersBatchChange({ C_val: patch.value });
      if (sel?.type === 'inductor') onParametersBatchChange({ L_val: patch.value });
    }
  };

  const handlePickWireColor = (hex: string) => {
    setActiveWireColor(hex);
    if (selectedWireId) {
      pushUndoSnapshot();
      setWires((prev) => prev.map((w) => (w.id === selectedWireId ? { ...w, color: hex } : w)));
    }
    setWireColorPickerOpen(false);
  };

  // Save / Load / Export / Import
  const handleSaveProject = () => {
    const entry: SavedCircuitProject = {
      id: `proj-${Date.now()}`,
      name: projectName.trim() || `Mạch ${savedProjects.length + 1}`,
      savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      components,
      wires,
      breadboards,
    };
    const next = [entry, ...savedProjects].slice(0, 12);
    setSavedProjects(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setProjectNotice(`Đã lưu "${entry.name}" vào trình duyệt.`);
    } catch {
      setProjectNotice('Không thể lưu vào localStorage.');
    }
  };

  const handleDeleteSavedProject = (id: string) => {
    const next = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleExportJson = () => {
    const payload = {
      name: projectName.trim() || 'stemly-circuit',
      exportedAt: new Date().toISOString(),
      components,
      wires,
      breadboards,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectName.trim() || 'mach-dien').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setProjectNotice('Đã xuất tệp mạch điện .JSON.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.components) || !Array.isArray(parsed.wires)) {
          setProjectNotice('Tệp JSON không đúng định dạng mạch điện.');
          return;
        }
        setActiveMission(null);
        setMissionSolved(false);
        applyCircuitData(
          parsed.components,
          parsed.wires,
          parsed.components[0]?.id ?? null,
          Array.isArray(parsed.breadboards) ? parsed.breadboards : []
        );
        if (parsed.name) setProjectName(String(parsed.name));
        setProjectNotice(`Đã nạp mạch "${parsed.name || file.name}".`);
        setProjectMenuOpen(false);
      } catch {
        setProjectNotice('Lỗi đọc tệp JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      handleDuplicateSelected();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteSelected();
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handleRotateSelected();
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsRunning((r) => !r);
    } else if (e.key === 'Escape') {
      setWireStart(null);
      setWireDraftWaypoints([]);
      setActivePlaceType(null);
      setActiveMeterProbeEdit(null);
      setIsWireMode(false);
      setProbeMode('none');
      setRepairDrawerOpen(false);
      setProjectMenuOpen(false);
      setAiAuditOpen(false);
      setWireColorPickerOpen(false);
    }
  };

  const handleAnalyzeCircuitWithAI = async () => {
    setRepairDrawerOpen(false);
    setProjectMenuOpen(false);
    setAiAuditOpen(true);
    setAiAuditError(null);

    if (components.length === 0) {
      setAiAuditResult(null);
      setAiAuditError('Bảng mạch đang trống. Hãy đặt linh kiện hoặc chọn mạch từ Thư viện mẫu trước khi kiểm tra.');
      return;
    }

    setAiAuditLoading(true);
    try {
      const isBlindExam = Boolean(activeMission && !missionSolved);
      const serializedComponents = components.map((c) => {
        const st = simFrame.solvedComps[c.id];
        return {
          label: c.label,
          type: c.type,
          value: c.type === 'ldr' ? getLdrResistance(c.wiper ?? 0.5) : c.value,
          freqHz: c.freq,
          wiperPct: c.wiper !== undefined ? Math.round(c.wiper * 100) : undefined,
          faultFlag: isBlindExam ? undefined : c.fault && c.fault !== 'none' ? c.fault : undefined,
          measuredVoltageDropV: st ? Number(st.vDrop.toFixed(3)) : undefined,
          measuredCurrentMa: st ? Number(st.currentMa.toFixed(2)) : undefined,
          measuredPowerMw: st ? Number(st.powerMw.toFixed(1)) : undefined,
          pinVoltagesV: st
            ? {
                [getPinName(c.type, 0)]: Number(st.vPin0.toFixed(2)),
                ...(c.type !== 'ground' ? { [getPinName(c.type, 1)]: Number(st.vPin1.toFixed(2)) } : {}),
                ...(st.vPin2 !== undefined ? { [getPinName(c.type, 2)]: Number(st.vPin2.toFixed(2)) } : {}),
              }
            : undefined,
          stateLabel: st?.extraLabel,
        };
      });

      const compById = new Map<string, CircuitComp>(components.map((c) => [c.id, c]));
      const serializedWires = wires.map((w) => {
        const fromComp = compById.get(w.from.compId);
        const toComp = compById.get(w.to.compId);
        const ws = simFrame.solvedWires[w.id];
        const fromStr = w.from.holeId
          ? `Breadboard(${w.from.holeId})`
          : `${fromComp?.label ?? w.from.compId}:${fromComp ? getPinName(fromComp.type, w.from.pin) : w.from.pin}`;
        const toStr = w.to.holeId
          ? `Breadboard(${w.to.holeId})`
          : `${toComp?.label ?? w.to.compId}:${toComp ? getPinName(toComp.type, w.to.pin) : w.to.pin}`;
        return {
          connection: `${fromStr} -> ${toStr}`,
          currentMa: ws ? Number(ws.currentMa.toFixed(2)) : 0,
        };
      });

      const res = await fetch('/api/circuit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePreset: activeMission ? activeMission.title : activePresetKey,
          flags: {
            shortWarning: simFrame.shortWarning,
            ledOverloadWarning: simFrame.ledOverloadWarning,
            hasGround: components.some((c) => c.type === 'ground'),
            hasSource: components.some((c) => c.type === 'source' || c.type === 'ac_source'),
            hasBreadboard: breadboards.length > 0,
            componentCount: components.length,
            wireCount: wires.length,
          },
          components: serializedComponents,
          wires: serializedWires,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể phân tích mạch bằng AI lúc này.');
      }
      setAiAuditResult(data as CircuitAuditResult);
    } catch (err: any) {
      setAiAuditError(err?.message || 'Lỗi kết nối khi phân tích mạch bằng AI.');
    } finally {
      setAiAuditLoading(false);
    }
  };

  const { solvedComps, solvedWires, nodeVoltages, tracePoints, animPhase, simElapsedSec, shortWarning, ledOverloadWarning } = simFrame;
  const selectedComp = components.find((c) => c.id === selectedId);
  const selectedWire = wires.find((w) => w.id === selectedWireId);
  const selectedBreadboard = breadboards.find((b) => b.id === selectedBreadboardId);
  const selectedState = selectedComp ? solvedComps[selectedComp.id] : null;
  const focusComp =
    components.find((c) => c.id === selectedId && c.type !== 'ground' && c.type !== 'multimeter' && c.type !== 'oscilloscope') ||
    components.find(
      (c) =>
        c.type === 'led' ||
        c.type === 'motor' ||
        c.type === 'opamp' ||
        c.type === 'capacitor' ||
        c.type === 'inductor' ||
        c.type === 'zener' ||
        c.type === 'bjt'
    ) ||
    components.find((c) => c.type === 'resistor') ||
    components.find((c) => c.type !== 'multimeter' && c.type !== 'oscilloscope') ||
    components[0];
  const focusState = focusComp ? solvedComps[focusComp.id] : null;

  // VOM live differential reading & Ohmmeter estimation
  const vRedVal = redProbe ? nodeVoltages[getPinRefKey(redProbe)] ?? 0 : 0;
  const vBlackVal = blackProbe ? nodeVoltages[getPinRefKey(blackProbe)] ?? 0 : 0;
  const vVomDiff = vRedVal - vBlackVal;
  const ch1Min = tracePoints.length ? Math.min(...tracePoints.map((t) => t.vCh1)) : 0;
  const ch1Max = tracePoints.length ? Math.max(...tracePoints.map((t) => t.vCh1)) : 0;
  const ch1Vpp = ch1Max - ch1Min;

  const vomCurrentMa = useMemo(() => {
    if (!redProbe) return 0;
    if (!redProbe.holeId && solvedComps[redProbe.compId]) {
      return solvedComps[redProbe.compId].currentMa;
    }
    return focusState?.currentMa ?? 0;
  }, [redProbe, solvedComps, focusState]);

  const vomResistanceOhm = useMemo(() => {
    if (vomMode !== 'R' || !redProbe || !blackProbe || topology.N === 0) return null;
    const nRed = topology.pinNodeMap[getPinRefKey(redProbe)];
    const nBlack = topology.pinNodeMap[getPinRefKey(blackProbe)];
    if (nRed === undefined || nBlack === undefined) return null;
    if (nRed === nBlack) return 0;

    // Solve passive test current 1 mA from nRed to nBlack (with sources deactivated)
    const { N, wireEdges, compNodes } = topology;
    const G: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    const Ivec: number[] = new Array(N).fill(0);
    const addG = (a: number, b: number, g: number) => {
      G[a][a] += g;
      G[b][b] += g;
      G[a][b] -= g;
      G[b][a] -= g;
    };
    G[nBlack][nBlack] += 1e6;
    for (let i = 0; i < N; i++) G[i][i] += 1e-9;
    wireEdges.forEach((we) => {
      if (we.n1 !== we.n2) addG(we.n1, we.n2, 50);
    });
    compNodes.forEach(({ comp: c, n0, n1, n2, n3 }) => {
      if (c.type === 'ground' || n0 === undefined || n1 === undefined) return;
      if (c.fault === 'open' || c.fault === 'burned') return;
      if (c.type === 'resistor') addG(n0, n1, 1 / Math.max(0.5, c.value));
      else if (c.type === 'ldr') addG(n0, n1, 1 / getLdrResistance(c.wiper ?? 0.5));
      else if (c.type === 'motor') addG(n0, n1, 1 / 25);
      else if (c.type === 'buzzer') addG(n0, n1, 1 / 150);
      else if (c.type === 'pot' && n2 !== undefined) {
        const w = Math.min(0.95, Math.max(0.05, c.wiper ?? 0.5));
        addG(n0, n2, 1 / Math.max(1, c.value * w));
        addG(n2, n1, 1 / Math.max(1, c.value * (1 - w)));
      } else if (c.type === 'switch' && c.value >= 0.5) addG(n0, n1, 25);
      else if (c.type === 'pushbutton' && n2 !== undefined && n3 !== undefined) {
        addG(n0, n1, 50);
        addG(n2, n3, 50);
        if (c.value >= 0.5) addG(n0, n2, 25);
      } else if (c.type === 'inductor') addG(n0, n1, 10);
    });
    const iTest = 0.001;
    Ivec[nRed] += iTest;
    const vSolved = solveLinearSystem(G, Ivec);
    const rEq = Math.abs(vSolved[nRed] - vSolved[nBlack]) / iTest;
    if (!Number.isFinite(rEq) || rEq > 5_000_000) return null;
    return rEq;
  }, [vomMode, redProbe, blackProbe, topology]);

  const describeProbeTarget = (ref: PinRef | null) => {
    if (!ref) return 'Chưa cắm';
    if (ref.holeId) {
      const h = breadboardLookup.byKey[`${ref.compId}::${ref.holeId}`];
      return h ? h.label : ref.holeId;
    }
    const c = components.find((x) => x.id === ref.compId);
    return c ? `${c.label}:${getPinName(c.type, ref.pin)}` : 'Chưa cắm';
  };

  const redProbeCoord = redProbe ? getPinRefPosition(redProbe, components, breadboards) : null;
  const blackProbeCoord = blackProbe ? getPinRefPosition(blackProbe, components, breadboards) : null;

  const filteredPalette = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase();
    return PALETTE_ITEMS.filter((item) => {
      const catMatch = paletteFilter === 'all' || item.category === paletteFilter;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.spec.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
      );
    });
  }, [paletteFilter, paletteSearch]);

  useEffect(() => {
    if (!vrMode3D) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVrMode3D(false);
        setVrStereo(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [vrMode3D]);

  const handleToggleVRMode3D = async () => {
    if (!vrMode3D) {
      setViewMode('3d');
      const perm = await requestGyroPermission();
      setVrGyroPerm(perm);
      setVrGyroEnabled(perm !== 'denied');
      setVrMode3D(true);
      const stage = vrStageRef.current;
      if (stage && typeof stage.requestFullscreen === 'function' && !document.fullscreenElement) {
        stage.requestFullscreen().catch(() => {});
      }
      window.setTimeout(() => {
        canvas3DRef.current?.recenterVR();
      }, 60);
    } else {
      setVrMode3D(false);
      setVrStereo(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleToggleVRGyro = async () => {
    if (!vrGyroEnabled) {
      const perm = await requestGyroPermission();
      setVrGyroPerm(perm);
      if (perm !== 'denied') {
        setVrGyroEnabled(true);
        canvas3DRef.current?.recenterVR();
      }
    } else {
      setVrGyroEnabled(false);
    }
  };

  const showFloatingInspector =
    !vrMode3D &&
    (Boolean(selectedComp) || Boolean(selectedWire) || Boolean(selectedBreadboard)) &&
    !repairDrawerOpen &&
    !projectMenuOpen;

  const formatSimClock = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 shadow-xl select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
    >
      {/* Tinkercad-Style Studio Top Action & Simulation Toolbar */}
      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Tinkercad View Switcher, Edit Tools & Wire Color Palette */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === '3d'
                  ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Không gian mô phỏng 3D tương tác (Three.js)"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === '2d'
                  ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Bảng mạch 2D phẳng cổ điển"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2D</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleVRMode3D}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors shadow-2xs cursor-pointer ${
              vrMode3D
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-200'
            }`}
            title="Chế độ VR View toàn màn hình 3D với cảm biến con quay hồi chuyển trên thiết bị di động"
          >
            <Glasses className="w-3.5 h-3.5" />
            <span>VR View</span>
          </button>
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleRotateSelected}
              disabled={!selectedId || selectedComp?.type === 'ground'}
              title="Xoay linh kiện 90° (Phím R)"
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFlipSelected180}
              disabled={!selectedId || selectedComp?.type === 'ground'}
              title="Đảo chiều linh kiện 180°"
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDuplicateSelected}
              disabled={!selectedId}
              title="Nhân bản linh kiện (Ctrl+D)"
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!selectedId && !selectedWireId && !selectedBreadboardId}
              title="Xóa đối tượng chọn (Phím Delete)"
              className="p-1.5 rounded-md text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Hoàn tác (Ctrl+Z)"
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Làm lại (Ctrl+Y)"
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Wire Color Picker (10 Tinkercad Jumper Colors) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setWireColorPickerOpen((o) => !o)}
              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              title="Chọn màu dây dẫn Tinkercad"
            >
              <Cable className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span
                className="w-3 h-3 rounded-full border border-black/20 dark:border-white/40 shrink-0"
                style={{ backgroundColor: selectedWire?.color ?? activeWireColor }}
              />
              <span className="hidden xl:inline">Màu dây</span>
            </button>
            {wireColorPickerOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-2xl grid grid-cols-5 gap-1.5 w-40">
                {WIRE_COLOR_OPTIONS.map((wc) => {
                  const isCur = (selectedWire?.color ?? activeWireColor) === wc.hex;
                  return (
                    <button
                      key={wc.hex}
                      type="button"
                      onClick={() => handlePickWireColor(wc.hex)}
                      title={wc.name}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        isCur ? 'border-blue-600 scale-110 ring-2 ring-blue-500/40' : 'border-slate-300 dark:border-slate-700'
                      }`}
                      style={{ backgroundColor: wc.hex }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowLabels((s) => !s)}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs ${
              showLabels
                ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500/50 text-blue-700 dark:text-blue-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title="Ẩn / hiện nhãn giá trị trên bảng mạch"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Nhãn</span>
          </button>

          <select
            aria-label="Chọn mạch mẫu"
            value={activePresetKey}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 max-w-[195px] shadow-2xs"
          >
            <optgroup label="Vi điều khiển 8051 & Mạch số">
              <option value="mcu_8051_blink">8051 (3.7.1): Nhấp nháy 4 LED</option>
              <option value="mcu_8051_chase">8051 (3.7.1): LED chạy đuổi RL A</option>
              <option value="mcu_8051_traffic">8051: Đèn giao thông Đỏ-Vàng-Xanh</option>
              <option value="mcu_8051_7seg">8051 (3.7.2): Đếm 7 đoạn 0→9</option>
              <option value="mcu_8051_int1">8051 (3.7.3): Ngắt INT1 + BJT + Còi</option>
              <option value="mcu_8051_ldr_alarm">8051 + LDR + BJT: Báo động sáng</option>
              <option value="mcu_8051_timer_scope">8051 (3.4): Timer 0 + Scope 3D</option>
              <option value="mcu_8051_74138_bus">8051 + 74LS138: Giải mã Bus</option>
              <option value="mcu_74138">IC 74LS138: Giải mã 3→8 & LED</option>
              <option value="mcu_74138_clock_scan">Clock + 74LS138: Quét kênh tự động</option>
              <option value="mcu_clock_7seg">Clock XTAL + LED 7 đoạn BCD</option>
            </optgroup>
            <optgroup label="Mạch Breadboard Tinkercad">
              <option value="bb_led_button">Breadboard: LED & Nút nhấn 9V</option>
              <option value="bb_8051_led_lab">Breadboard + 8051: Port P1 & LED</option>
              <option value="bb_bjt_ldr_nightlight">Breadboard: Đèn đêm LDR + BJT</option>
              <option value="bb_switch_pot_rgb">Breadboard: Công tắc, Biến trở & LED</option>
              <option value="bb_motor_pot">Breadboard: Động cơ DC & Chiết áp</option>
              <option value="bb_ldr_buzzer">Breadboard: Quang trở, LED & Còi</option>
            </optgroup>
            <optgroup label="Mạch Nguyên lý & Phân tích">
              <option value="basic_switch_pot_vom">Công tắc, Biến trở & 2 VOM 3D</option>
              <option value="basic_pot_motor_vom">Điều tốc Motor DC + Diode xả</option>
              <option value="filter_ac_scope">Chỉnh lưu AC-DC + Tụ lọc + Scope</option>
              <option value="amp_opamp_comparator">Op-Amp LM741 + LDR + Còi</option>
              <option value="amp_opamp_ldr_motor">Op-Amp LM741 + BJT + Quạt DC</option>
              <option value="basic_full_power_zener">Nguồn hoàn chỉnh AC → Zener 5.1V</option>
              <option value="rc">Mẫu: Nạp/Xả RC</option>
              <option value="flyback_rl">Mẫu: Cuộn cảm + Diode + K</option>
              <option value="rlc">Mẫu: Dao động RLC</option>
              <option value="lc_oscillator">Mẫu: Mạch dao động LC</option>
              <option value="wheatstone">Mẫu: Mạch cầu Wheatstone</option>
              <option value="led">Mẫu: LED & Hạn dòng</option>
              <option value="rectifier">Mẫu: Chỉnh lưu AC-DC</option>
              <option value="zener">Mẫu: Ổn áp Zener 5.1V</option>
              <option value="bjt">Mẫu: Khuếch đại BJT</option>
              <option value="divider">Mẫu: Cầu phân áp</option>
              <option value="lowpass">Mẫu: Lọc thông thấp RC</option>
              <option value="highpass">Mẫu: Lọc thông cao RC</option>
              <option value="inverting_amp">Mẫu: Op-Amp Đảo</option>
              <option value="noninverting_amp">Mẫu: Op-Amp Không đảo</option>
              <option value="clear">Xóa trống bảng mạch</option>
            </optgroup>
          </select>
        </div>

        {/* Right: Realistic/Schematic Mode, Multimeter, Fault Lab, AI Check & Signature Green Start Simulation */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setSymbolMode('realistic')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap transition-colors ${
                symbolMode === 'realistic'
                  ? 'bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Xem linh kiện dạng Hình dáng thực tế (Tinkercad)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Thực tế</span>
            </button>
            <button
              type="button"
              onClick={() => setSymbolMode('schematic')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap transition-colors ${
                symbolMode === 'schematic'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Xem linh kiện dạng Ký hiệu nguyên lý mạch điện"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Ký hiệu</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCanvasTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shadow-2xs"
            title="Đổi nền Bảng mạch (Studio Sáng / Lab Tối)"
          >
            {isLightCanvas ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />}
            <span className="hidden xl:inline">{isLightCanvas ? 'Studio Sáng' : 'Lab Tối'}</span>
          </button>

          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/stemly-comp', 'multimeter');
              e.dataTransfer.setData('text/plain', 'multimeter');
              e.dataTransfer.effectAllowed = 'copy';
              draggingPaletteTypeRef.current = 'multimeter';
              setActivePlaceType(null);
            }}
            onDragEnd={() => {
              draggingPaletteTypeRef.current = null;
              canvas3DRef.current?.clearDropPreview();
            }}
            onClick={() => setActivePlaceType((cur) => (cur === 'multimeter' ? null : 'multimeter'))}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs ${
              activePlaceType === 'multimeter'
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200'
            }`}
            title="Kéo thả Đồng hồ vạn năng 3D trực tiếp vào dây dẫn hoặc linh kiện để đo V / I"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Đồng hồ Vạn năng 3D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMultimeter((s) => !s);
              if (showMultimeter) setProbeMode('none');
            }}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs ${
              showMultimeter
                ? 'bg-sky-100 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/50 text-sky-900 dark:text-sky-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title="Bật / tắt bảng VOM góc màn hình"
          >
            <span className="hidden xl:inline">Bảng VOM</span>
            <span className="xl:hidden">VOM</span>
          </button>

          <button
            type="button"
            onClick={() => setMcuLabOpen((o) => !o)}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs ${
              mcuLabOpen
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-200'
            }`}
            title="Mở Phòng Lab Giáo trình Vi xử lý 8051 / 8086 / 74LS138"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Lab 8051 / 8086</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRepairDrawerOpen((o) => !o);
              setProjectMenuOpen(false);
              setAiAuditOpen(false);
            }}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs ${
              (activeMission && !missionSolved) || components.some((c) => c.fault && c.fault !== 'none')
                ? 'bg-amber-100 dark:bg-amber-500/25 border-amber-300 dark:border-amber-500/60 text-amber-900 dark:text-amber-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Sửa mạch</span>
          </button>

          <button
            type="button"
            onClick={handleAnalyzeCircuitWithAI}
            disabled={aiAuditLoading}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs ${
              aiAuditOpen
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-violet-50 dark:bg-violet-600/20 hover:bg-violet-100 dark:hover:bg-violet-600/30 border-violet-200 dark:border-violet-500/50 text-violet-700 dark:text-violet-200'
            } disabled:opacity-60`}
            title="Dùng AI kiểm tra đoản mạch, quá tải công suất và gợi ý tối ưu"
          >
            {aiAuditLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{aiAuditLoading ? 'Đang kiểm tra...' : 'Kiểm tra AI'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProjectMenuOpen((o) => !o);
              setRepairDrawerOpen(false);
              setAiAuditOpen(false);
              setProjectNotice(null);
            }}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs"
            title="Lưu trữ & Xuất/Nhập JSON"
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={resetTransientMemory}
            title="Xả tụ & Reset thời gian về 0s"
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>

          {/* Signature Tinkercad Start / Stop Simulation Button */}
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-all cursor-pointer ${
              isRunning
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-500/60'
            }`}
          >
            {isRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Đang mô phỏng' : 'Bắt đầu mô phỏng'}</span>
            <span className="font-mono tabular-nums text-[10.5px] opacity-90">
              {formatSimClock(simElapsedSec)}
            </span>
          </button>
        </div>
      </div>

      {/* Troubleshooting Mission Banner */}
      {activeMission && (
        <div
          className={`px-3 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 ${
            missionSolved
              ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-100'
              : 'bg-amber-950/90 border-amber-700/60 text-amber-100'
          }`}
        >
          <div className="space-y-0.5 flex-1 min-w-[220px]">
            <div className="font-semibold flex items-center gap-1.5">
              {missionSolved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{activeMission.title}</span>
              <span className="text-[10px] text-amber-300/90 font-normal">· {activeMission.difficulty}</span>
            </div>
            <p className="text-[11px] text-slate-200">
              {missionFeedback ? missionFeedback.msg : activeMission.symptom}
              {showMissionHint && !missionSolved && (
                <span className="block text-amber-300 mt-0.5">Gợi ý: {activeMission.hint}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!missionSolved && (
              <>
                <button
                  type="button"
                  onClick={() => setShowMissionHint((h) => !h)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-amber-300 hover:bg-slate-800 whitespace-nowrap"
                >
                  {showMissionHint ? 'Ẩn gợi ý' : 'Gợi ý đo'}
                </button>
                {selectedComp && selectedComp.type !== 'ground' && (
                  <button
                    type="button"
                    onClick={() => handleAttemptRepair(selectedComp.id)}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] whitespace-nowrap"
                  >
                    Thay / Sửa {selectedComp.label}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveMission(null);
                setMissionSolved(false);
                setMissionFeedback(null);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Thoát chế độ sửa mạch"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tinkercad 2-Column Workspace: Main Canvas Stage (Left) + Component Shelf (Right) */}
      <div className="flex flex-col md:flex-row">
        {/* Main Interactive Canvas Stage (Isolates to full-screen VR View when vrMode3D is active) */}
        <div
          ref={vrStageRef}
          className={`${
            vrMode3D
              ? 'fixed inset-0 z-[100] w-screen h-screen'
              : 'relative flex-1 min-w-0 h-[440px] sm:h-[520px]'
          } overflow-hidden transition-colors ${
            isLightCanvas ? 'bg-[#eef2f6]' : 'bg-[#070b14]'
          } ${isDragOverCanvas ? 'ring-2 ring-inset ring-blue-500' : ''}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOverCanvas(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isDragOverCanvas) setIsDragOverCanvas(true);
            if (
              viewMode === '3d' &&
              canvas3DRef.current &&
              (draggingPaletteTypeRef.current === 'multimeter' || draggingPaletteTypeRef.current === 'oscilloscope')
            ) {
              canvas3DRef.current.previewDropTarget(e.clientX, e.clientY, draggingPaletteTypeRef.current);
            }
          }}
          onDragLeave={() => {
            setIsDragOverCanvas(false);
            canvas3DRef.current?.clearDropPreview();
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverCanvas(false);
            draggingPaletteTypeRef.current = null;
            canvas3DRef.current?.clearDropPreview();
            const type = (e.dataTransfer.getData('application/stemly-comp') ||
              e.dataTransfer.getData('text/plain')) as CompType | 'breadboard';
            if (!type) return;
            if (viewMode === '3d') {
              if ((type === 'multimeter' || type === 'oscilloscope') && canvas3DRef.current) {
                const hit = canvas3DRef.current.hitTestDropTarget(e.clientX, e.clientY);
                if (hit) {
                  addComponentAt(type, hit.svgPt.x, hit.svgPt.y, hit.probeTarget);
                } else {
                  const pt = canvas3DRef.current.clientToSvgAtGround(e.clientX, e.clientY) ?? { x: 460, y: 260 };
                  addComponentAt(type, pt.x, pt.y);
                }
              } else {
                const pt = canvas3DRef.current?.clientToSvgAtGround(e.clientX, e.clientY) ?? { x: 460, y: 260 };
                addComponentAt(type, pt.x, pt.y);
              }
            } else {
              const pt = clientToSvg(e.clientX, e.clientY);
              const dropTarget =
                type === 'multimeter' || type === 'oscilloscope' ? find2DProbeTargetAt(pt.x, pt.y) : null;
              addComponentAt(type, pt.x, pt.y, dropTarget);
            }
            setActivePlaceType(null);
          }}
        >
          {viewMode === '3d' ? (
            <CircuitCanvas3D
              ref={canvas3DRef}
              components={components}
              wires={wires}
              breadboards={breadboards}
              solvedComps={solvedComps}
              solvedWires={solvedWires}
              nodeVoltages={nodeVoltages}
              scopeTraces={simFrame.scopeTraces}
              selectedId={selectedId}
              selectedWireId={selectedWireId}
              selectedBreadboardId={selectedBreadboardId}
              activePlaceType={activePlaceType}
              activeMeterProbeEdit={activeMeterProbeEdit}
              wireStart={wireStart}
              wireDraftWaypoints={wireDraftWaypoints}
              activeWireColor={activeWireColor}
              hoveredPin={hoveredPin}
              hoveredHole={hoveredHole}
              highlightedNetKey={highlightedNetKey}
              redProbe={redProbe}
              blackProbe={blackProbe}
              showMultimeter={showMultimeter}
              probeMode={probeMode}
              showLabels={showLabels}
              symbolMode={symbolMode}
              isLightCanvas={isLightCanvas}
              isRunning={isRunning}
              navMode={navMode3D}
              vrMode={vrMode3D}
              vrGyroEnabled={vrGyroEnabled}
              vrStereo={vrStereo}
              onGyroSignalChange={setVrGyroSignal}
              isBlindExam={(Boolean(activeMission) && !missionSolved) || hideFaultVisuals}
              shortWarning={shortWarning}
              ledOverloadWarning={ledOverloadWarning}
              onSelectComp={handleSelectComponent}
              onSelectWire={(wireId) => {
                setSelectedWireId(wireId);
                setSelectedId(null);
                setSelectedBreadboardId(null);
              }}
              onSelectBreadboard={(bbId) => {
                setSelectedBreadboardId(bbId);
                setSelectedId(null);
                setSelectedWireId(null);
              }}
              onClearSelection={() => {
                setSelectedId(null);
                setSelectedWireId(null);
                setSelectedBreadboardId(null);
                setActiveMeterProbeEdit(null);
                setWireColorPickerOpen(false);
              }}
              onPlaceAt={(svgX, svgY, initialRedTarget) => {
                if (!activePlaceType) return;
                addComponentAt(activePlaceType, svgX, svgY, initialRedTarget);
                setActivePlaceType(null);
              }}
              onStartDragSnapshot={() => pushUndoSnapshot()}
              onMoveComp={handleMoveCompTo}
              onMoveBreadboard={handleMoveBreadboardTo}
              onToggleSwitchOrButton={handleToggleSwitch}
              onChangePotWiper={(compId, wiper) => {
                setComponents((prev) => prev.map((c) => (c.id === compId ? { ...c, wiper } : c)));
              }}
              onSetMeterProbe={(meterId, side, target) => {
                handleSetMeterProbe(meterId, side, target);
                if (activeMeterProbeEdit) setActiveMeterProbeEdit(null);
              }}
              onPinClick={(compId, pin) => {
                const comp = components.find((c) => c.id === compId);
                if (!comp) return;
                finishOrStartWireAt({ compId, pin }, getPinPosition(comp, pin));
              }}
              onHoleClick={(bbId, hole) => {
                finishOrStartWireAt({ compId: bbId, pin: 0, holeId: hole.holeId }, { x: hole.x, y: hole.y });
              }}
              onAddWireWaypoint={(svgX, svgY) => {
                setWireDraftWaypoints((wps) => [...wps, { x: snap(svgX), y: snap(svgY) }]);
              }}
              onCancelWireOrPlace={() => {
                setActivePlaceType(null);
                setActiveMeterProbeEdit(null);
                setWireStart(null);
                setWireDraftWaypoints([]);
              }}
              onHoverPin={setHoveredPin}
              onHoverHole={setHoveredHole}
            />
          ) : (
            <svg
            ref={svgRef}
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            preserveAspectRatio="xMidYMid meet"
            className={`w-full h-full touch-none ${
              activePlaceType
                ? 'cursor-copy'
                : wireStart || activeMeterProbeEdit
                ? 'cursor-crosshair'
                : panDrag?.hasMoved
                ? 'cursor-grabbing'
                : 'cursor-default'
            }`}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onContextMenu={(e) => {
              if (activePlaceType || wireStart || activeMeterProbeEdit) {
                e.preventDefault();
                setActivePlaceType(null);
                setActiveMeterProbeEdit(null);
                setWireStart(null);
                setWireDraftWaypoints([]);
              }
            }}
            onClick={(e) => {
              if (panDrag?.hasMoved) return;
              if (activeMeterProbeEdit) {
                const pt = clientToSvg(e.clientX, e.clientY);
                const target = find2DProbeTargetAt(pt.x, pt.y);
                pushUndoSnapshot();
                handleSetMeterProbe(activeMeterProbeEdit.meterId, activeMeterProbeEdit.side, target);
                setActiveMeterProbeEdit(null);
                return;
              }
              if (activePlaceType) {
                const dropTarget =
                  activePlaceType === 'multimeter' || activePlaceType === 'oscilloscope'
                    ? find2DProbeTargetAt(cursorPt.x, cursorPt.y)
                    : null;
                addComponentAt(activePlaceType, cursorPt.x, cursorPt.y, dropTarget);
                setActivePlaceType(null);
                return;
              }
              // Clicking empty canvas while drawing a wire adds a Tinkercad bend waypoint!
              if (wireStart) {
                setWireDraftWaypoints((wps) => [...wps, { x: cursorPt.x, y: cursorPt.y }]);
                return;
              }
              setSelectedId(null);
              setSelectedWireId(null);
              setSelectedBreadboardId(null);
              setWireColorPickerOpen(false);
            }}
          >
            <defs>
              <pattern id="circuit-grid-tinker" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <circle
                  cx="1"
                  cy="1"
                  r="1"
                  fill={isLightCanvas ? 'rgba(100, 116, 139, 0.25)' : 'rgba(148, 163, 184, 0.2)'}
                />
              </pattern>
            </defs>
            <rect x={-400} y={-400} width={SVG_W + 800} height={SVG_H + 800} fill="url(#circuit-grid-tinker)" />

            {/* Breadboard Layer (underneath components & wires, just like Tinkercad!) */}
            {breadboards.map((bb) => (
              <TinkercadBreadboardSvg
                key={bb.id}
                breadboard={bb}
                highlightedNetKey={highlightedNetKey}
                hoveredHoleId={hoveredHole?.bbId === bb.id ? hoveredHole.hole.holeId : null}
                wireStartHoleId={wireStart?.compId === bb.id ? wireStart.holeId ?? null : null}
                isSelected={selectedBreadboardId === bb.id}
                isLightCanvas={isLightCanvas}
                onSelectBreadboard={(id) => {
                  setSelectedBreadboardId(id);
                  setSelectedId(null);
                  setSelectedWireId(null);
                }}
                onStartDragBreadboard={handleStartDragBreadboard}
                onHoleClick={handleHoleClick}
                onHoleHover={(hole, bbId) => setHoveredHole(hole ? { bbId, hole } : null)}
              />
            ))}

            {/* Components Layer */}
            {components.map((comp) => {
              const isSel = selectedId === comp.id;
              const st = solvedComps[comp.id];
              const pins = getCompPins(comp.type);
              const ledCurrent = comp.type === 'led' ? Math.max(0, st?.currentMa ?? 0) : 0;
              const isRealistic = symbolMode === 'realistic';

              return (
                <g key={comp.id}>
                  <g
                    transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`}
                    onPointerDown={(e) => handleCompPointerDown(e, comp)}
                    onClick={(e) => e.stopPropagation()}
                    className={
                      comp.type === 'switch' || comp.type === 'pushbutton'
                        ? 'cursor-pointer'
                        : 'cursor-grab active:cursor-grabbing'
                    }
                  >
                    {isSel && (
                      <rect
                        x={comp.type === 'ground' ? -24 : comp.type === 'pushbutton' ? -28 : -46}
                        y={
                          comp.type === 'mcu8051' || comp.type === 'dec74138'
                            ? -52
                            : comp.type === 'sevenseg'
                            ? -36
                            : -28
                        }
                        width={comp.type === 'ground' ? 48 : comp.type === 'pushbutton' ? 56 : 92}
                        height={
                          comp.type === 'mcu8051' || comp.type === 'dec74138'
                            ? 104
                            : comp.type === 'sevenseg'
                            ? 72
                            : 56
                        }
                        rx={9}
                        fill="rgba(37, 99, 235, 0.1)"
                        stroke="#2563eb"
                        strokeWidth="1.8"
                        strokeDasharray="4,3"
                      />
                    )}

                    <rect
                      x={comp.type === 'ground' ? -22 : comp.type === 'pushbutton' ? -24 : -38}
                      y={
                        comp.type === 'mcu8051' || comp.type === 'dec74138'
                          ? -48
                          : comp.type === 'sevenseg'
                          ? -32
                          : -24
                      }
                      width={comp.type === 'ground' ? 44 : comp.type === 'pushbutton' ? 48 : 76}
                      height={
                        comp.type === 'mcu8051' || comp.type === 'dec74138'
                          ? 96
                          : comp.type === 'sevenseg'
                          ? 64
                          : 48
                      }
                      fill="transparent"
                    />

                    <CircuitComponentSvg
                      comp={comp}
                      st={st}
                      isRealistic={isRealistic}
                      isLightCanvas={isLightCanvas}
                      animPhase={animPhase}
                      isRunning={isRunning}
                      scopeTrace={comp.type === 'oscilloscope' ? simFrame.scopeTraces[comp.id] : undefined}
                    />

                    {/* Visual Fault Markers (hidden during Blind Exam) */}
                    {(() => {
                      const isBlindExam = (Boolean(activeMission) && !missionSolved) || hideFaultVisuals;
                      const cFault = comp.fault ?? 'none';
                      if (isBlindExam || cFault === 'none') return null;
                      return (
                        <g className="pointer-events-none">
                          {cFault === 'burned' && (
                            <>
                              <rect x="-22" y="-12" width="44" height="24" rx="5" fill="rgba(28, 25, 23, 0.78)" stroke="#f97316" strokeWidth="1.4" strokeDasharray="3,2" />
                              <polyline points="-10,-8 -2,2 4,-4 10,8" fill="none" stroke="#fb923c" strokeWidth="1.8" />
                              <path d="M -8 -14 Q -12 -22 -5 -26 M 6 -14 Q 10 -22 4 -26" fill="none" stroke="rgba(251, 146, 60, 0.75)" strokeWidth="1.4" />
                            </>
                          )}
                          {cFault === 'leaky' && (
                            <>
                              <path d="M -18 -14 Q 0 -24 18 -14" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="3,2" />
                              <path d="M 14 8 C 18 14, 18 20, 14 20 C 10 20, 10 14, 14 8 Z" fill="#0ea5e9" opacity="0.85" />
                            </>
                          )}
                          {cFault === 'short' && (
                            <>
                              <line x1="-26" y1="-12" x2="26" y2="-12" stroke="#ef4444" strokeWidth="2.2" />
                              <polyline points="-6,-17 2,-12 -4,-7" fill="none" stroke="#fca5a5" strokeWidth="1.8" />
                            </>
                          )}
                          {cFault === 'open' && (
                            <>
                              <circle cx="0" cy="0" r="8" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.6" />
                              <line x1="-4" y1="-4" x2="4" y2="4" stroke="#f43f5e" strokeWidth="2" />
                              <line x1="4" y1="-4" x2="-4" y2="4" stroke="#f43f5e" strokeWidth="2" />
                            </>
                          )}
                          {cFault === 'reversed' && (
                            <rect x="-18" y="-15" width="36" height="30" rx="4" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3,2" />
                          )}
                        </g>
                      );
                    })()}
                  </g>

                  {showLabels && comp.type !== 'ground' && (
                    <g className="pointer-events-none">
                      <text
                        x={comp.x}
                        y={
                          comp.y -
                          (comp.type === 'mcu8051' || comp.type === 'dec74138'
                            ? 55
                            : comp.type === 'sevenseg'
                            ? 39
                            : comp.rotation % 180 === 0
                            ? 23
                            : 20)
                        }
                        textAnchor="middle"
                        fill={isLightCanvas ? '#0f172a' : '#e2e8f0'}
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {comp.label}:{' '}
                        {comp.type === 'source'
                          ? `${comp.value}V`
                          : comp.type === 'ac_source'
                          ? `${comp.value}Vp`
                          : comp.type === 'mcu8051'
                          ? st?.extraLabel ?? 'AT89C51'
                          : comp.type === 'dec74138'
                          ? st?.extraLabel ?? '74LS138'
                          : comp.type === 'sevenseg'
                          ? st?.extraLabel ?? '7-Đoạn'
                          : comp.type === 'clockgen'
                          ? `${comp.freq ?? 1.5}Hz`
                          : comp.type === 'resistor'
                          ? formatResistance(comp.value)
                          : comp.type === 'ldr'
                          ? formatResistance(getLdrResistance(comp.wiper ?? 0.5))
                          : comp.type === 'pot'
                          ? `${formatResistance(comp.value)} (${Math.round((comp.wiper ?? 0.5) * 100)}%)`
                          : comp.type === 'capacitor'
                          ? formatCapacitance(comp.value)
                          : comp.type === 'inductor'
                          ? formatInductance(comp.value)
                          : comp.type === 'zener'
                          ? `Vz=${comp.value}V`
                          : comp.type === 'bjt'
                          ? `β=${comp.value}`
                          : comp.type === 'opamp'
                          ? `±${comp.value}V`
                          : comp.type === 'switch' || comp.type === 'pushbutton'
                          ? comp.value >= 0.5
                            ? 'ĐÓNG'
                            : 'MỞ'
                          : comp.type === 'motor'
                          ? st?.extraLabel ?? 'Motor'
                          : comp.type === 'buzzer'
                          ? st?.extraLabel ?? 'Còi'
                          : comp.type === 'multimeter'
                          ? st?.extraLabel ?? (comp.meterMode === 'I' ? '0.0 mA' : '0.00 V')
                          : comp.type === 'oscilloscope'
                          ? st?.extraLabel ?? `${comp.scopeTimeWindow ?? 2}s/màn`
                          : `${comp.value}V`}
                      </text>
                      {st && (isSel || breadboards.length === 0) && (
                        <text
                          x={comp.x + (comp.rotation % 180 === 0 ? 0 : 34)}
                          y={comp.y + (comp.rotation % 180 === 0 ? 31 : 4)}
                          textAnchor={comp.rotation % 180 === 0 ? 'middle' : 'start'}
                          fill={
                            comp.fault && comp.fault !== 'none' && !((Boolean(activeMission) && !missionSolved) || hideFaultVisuals)
                              ? '#ea580c'
                              : comp.type === 'led' && ledCurrent > 30
                              ? '#e11d48'
                              : isLightCanvas
                              ? '#047857'
                              : '#34d399'
                          }
                          fontSize="9"
                          fontWeight="600"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {comp.fault && comp.fault !== 'none' && !((Boolean(activeMission) && !missionSolved) || hideFaultVisuals)
                            ? `[${FAULT_LABELS[comp.fault].toUpperCase()}] · ${Math.abs(st.vDrop).toFixed(1)}V`
                            : comp.type === 'multimeter'
                            ? `${comp.meterMode === 'I' ? 'Chế độ I' : 'Chế độ V'} · ${st.extraLabel ?? '0.00 V'}`
                            : comp.type === 'oscilloscope'
                            ? `T:${comp.scopeTimeWindow ?? 2}s · ${st.extraLabel ?? 'CH1'}`
                            : st.extraLabel
                            ? `${st.extraLabel} · ${Math.abs(st.currentMa).toFixed(1)}mA`
                            : `${Math.abs(st.vDrop).toFixed(2)}V · ${Math.abs(st.currentMa).toFixed(1)}mA`}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Component Terminal Pins */}
                  {pins.map((pin) => {
                    const pt = getPinPosition(comp, pin);
                    const vPin = nodeVoltages[`${comp.id}:${pin}`] ?? 0;
                    const isWiringPin = wireStart?.compId === comp.id && wireStart?.pin === pin && !wireStart.holeId;
                    const isHovered = hoveredPin?.compId === comp.id && hoveredPin?.pin === pin;
                    const isOnHole = Boolean(breadboardLookup.byCoord[`${pt.x},${pt.y}`]);

                    return (
                      <g
                        key={pin}
                        onClick={(e) => handlePinClick(e, comp.id, pin)}
                        onMouseEnter={() => setHoveredPin({ compId: comp.id, pin })}
                        onMouseLeave={() => setHoveredPin(null)}
                        className="cursor-pointer"
                      >
                        <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                        {(isHovered || isWiringPin) && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="7.5"
                            fill="rgba(16, 185, 129, 0.25)"
                            stroke={isWiringPin ? '#f59e0b' : '#10b981'}
                            strokeWidth="1.8"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isWiringPin || isHovered ? 5 : isOnHole ? 3.2 : 4}
                          fill={
                            isWiringPin
                              ? '#fbbf24'
                              : isHovered
                              ? '#10b981'
                              : isOnHole
                              ? '#94a3b8'
                              : isLightCanvas
                              ? '#ffffff'
                              : '#0f172a'
                          }
                          stroke={
                            comp.type === 'ground'
                              ? '#10b981'
                              : pin === 1 && comp.type === 'source'
                              ? '#ef4444'
                              : isLightCanvas
                              ? '#475569'
                              : '#94a3b8'
                          }
                          strokeWidth="1.8"
                        />
                        {isSel && comp.type !== 'ground' && (
                          <text
                            x={pt.x + 7}
                            y={pt.y - 7}
                            fill={isLightCanvas ? '#334155' : '#cbd5e1'}
                            fontSize="8.5"
                            fontWeight="600"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {getPinName(comp.type, pin)}:{vPin.toFixed(1)}V
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Wires Layer (above breadboard & components, just like real jumper wires!) */}
            {wires.map((w) => {
              const p1 = getPinRefPosition(w.from, components, breadboards);
              const p2 = getPinRefPosition(w.to, components, breadboards);
              if (!p1 || !p2) return null;

              const pts =
                w.waypoints && w.waypoints.length > 0
                  ? [p1, ...w.waypoints, p2]
                  : p1.x === p2.x || p1.y === p2.y
                  ? [p1, p2]
                  : [p1, { x: snap((p1.x + p2.x) / 2), y: p1.y }, { x: snap((p1.x + p2.x) / 2), y: p2.y }, p2];

              const pathD = buildRoundedWirePath(pts, 12);
              const ws = solvedWires[w.id];
              const iMa = ws?.currentMa ?? 0;
              const isActiveCurrent = Math.abs(iMa) > 0.2;
              const isSel = selectedWireId === w.id;
              const baseColor = w.color || '#16a34a';
              const wireColor = isSel ? '#f59e0b' : baseColor;

              const segs: { x1: number; y1: number; x2: number; y2: number; len: number }[] = [];
              let totalLen = 0;
              for (let i = 0; i < pts.length - 1; i++) {
                const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
                if (len > 0) {
                  segs.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y, len });
                  totalLen += len;
                }
              }

              const dotPositions: { x: number; y: number }[] = [];
              if (isRunning && isActiveCurrent && totalLen > 12) {
                const speed = Math.min(4.5, Math.max(0.4, Math.abs(iMa) / 25));
                const dir = iMa >= 0 ? 1 : -1;
                const numDots = Math.max(2, Math.floor(totalLen / 50));
                for (let dIdx = 0; dIdx < numDots; dIdx++) {
                  let d = (((animPhase * speed * dir + (dIdx * totalLen) / numDots) % totalLen) + totalLen) % totalLen;
                  for (const s of segs) {
                    if (d <= s.len) {
                      const t = d / s.len;
                      dotPositions.push({ x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t });
                      break;
                    }
                    d -= s.len;
                  }
                }
              }

              return (
                <g
                  key={w.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeMeterProbeEdit) {
                      const pt = clientToSvg(e.clientX, e.clientY);
                      const poly = getWirePolylinePoints(w, components, breadboards);
                      const closest = poly.length >= 2 ? closestPointOnWirePolyline(poly, pt.x, pt.y) : null;
                      pushUndoSnapshot();
                      handleSetMeterProbe(activeMeterProbeEdit.meterId, activeMeterProbeEdit.side, {
                        kind: 'wire',
                        wireId: w.id,
                        t: closest?.t ?? 0.5,
                      });
                      setActiveMeterProbeEdit(null);
                      return;
                    }
                    if (activePlaceType || wireStart) return;
                    setSelectedWireId(w.id);
                    setSelectedId(null);
                    setSelectedBreadboardId(null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    // Double click wire to add a bend waypoint at click position
                    const pt = clientToSvg(e.clientX, e.clientY);
                    pushUndoSnapshot();
                    setWires((prev) =>
                      prev.map((item) =>
                        item.id === w.id
                          ? { ...item, waypoints: [...(item.waypoints ?? []), { x: pt.x, y: pt.y }] }
                          : item
                      )
                    );
                    setSelectedWireId(w.id);
                  }}
                  className="cursor-pointer"
                >
                  <path d={pathD} stroke="transparent" strokeWidth="14" fill="none" />
                  {/* Wire drop shadow */}
                  <path
                    d={pathD}
                    stroke={isSel ? 'rgba(245, 158, 11, 0.35)' : isLightCanvas ? 'rgba(15, 23, 42, 0.16)' : 'rgba(0, 0, 0, 0.45)'}
                    strokeWidth={isSel ? 7 : 5.5}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Main PVC Wire */}
                  <path
                    d={pathD}
                    stroke={wireColor}
                    strokeWidth={isSel ? 3.8 : 3}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Plug Boots at ends */}
                  <circle cx={p1.x} cy={p1.y} r="3.2" fill="#0f172a" stroke={wireColor} strokeWidth="1.2" />
                  <circle cx={p2.x} cy={p2.y} r="3.2" fill="#0f172a" stroke={wireColor} strokeWidth="1.2" />

                  {dotPositions.map((dp, idx) => (
                    <circle key={idx} cx={dp.x} cy={dp.y} r="2.7" fill="#fef08a" stroke="#0f172a" strokeWidth="0.7" />
                  ))}

                  {/* Draggable Bend Waypoint Handles when Wire Selected */}
                  {isSel &&
                    w.waypoints?.map((wp, idx) => (
                      <circle
                        key={idx}
                        cx={wp.x}
                        cy={wp.y}
                        r="5.5"
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth="2.2"
                        className="cursor-move"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDraggingWaypoint({
                            wireId: w.id,
                            index: idx,
                            preDragSnapshot: { components, wires, breadboards },
                          });
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          pushUndoSnapshot();
                          setWires((prev) =>
                            prev.map((item) =>
                              item.id === w.id
                                ? { ...item, waypoints: item.waypoints?.filter((_, i) => i !== idx) }
                                : item
                            )
                          );
                        }}
                      />
                    ))}
                </g>
              );
            })}

            {/* In-progress Bendable Wire Preview */}
            {wireStart && (() => {
              const p1 = getPinRefPosition(wireStart, components, breadboards);
              if (!p1) return null;
              const draftPts = [p1, ...wireDraftWaypoints, cursorPt];
              const draftPath = buildRoundedWirePath(draftPts, 10);
              return (
                <g className="pointer-events-none">
                  <path
                    d={draftPath}
                    fill="none"
                    stroke={activeWireColor}
                    strokeWidth="3"
                    strokeDasharray="6,4"
                    strokeLinecap="round"
                  />
                  {wireDraftWaypoints.map((wp, idx) => (
                    <circle key={idx} cx={wp.x} cy={wp.y} r="3.5" fill={activeWireColor} stroke="#ffffff" strokeWidth="1" />
                  ))}
                </g>
              );
            })()}

            {/* Placement Ghost Preview */}
            {activePlaceType && activePlaceType !== 'breadboard' && (
              <g transform={`translate(${cursorPt.x}, ${cursorPt.y})`} opacity={0.62} className="pointer-events-none">
                <rect
                  x={activePlaceType === 'ground' ? -24 : -46}
                  y={-28}
                  width={activePlaceType === 'ground' ? 48 : 92}
                  height={56}
                  rx={8}
                  fill="rgba(59, 130, 246, 0.12)"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                />
                <CircuitComponentSvg
                  comp={{
                    id: 'ghost',
                    type: activePlaceType,
                    x: 0,
                    y: 0,
                    rotation: activePlaceType === 'source' || activePlaceType === 'ac_source' ? 270 : 0,
                    value: 0,
                    label: '',
                  }}
                  isRealistic={symbolMode === 'realistic'}
                  isLightCanvas={isLightCanvas}
                />
              </g>
            )}

            {/* Tinkercad Pin / Breadboard Hole Hover Tooltip */}
            {(hoveredPin || hoveredHole) && (() => {
              let pt: { x: number; y: number } | null = null;
              let txt = '';
              if (hoveredHole) {
                pt = { x: hoveredHole.hole.x, y: hoveredHole.hole.y };
                const vHole = nodeVoltages[`${hoveredHole.bbId}::${hoveredHole.hole.holeId}`] ?? 0;
                txt = `${hoveredHole.hole.label} · ${vHole.toFixed(2)}V`;
              } else if (hoveredPin) {
                const comp = components.find((c) => c.id === hoveredPin.compId);
                if (comp) {
                  pt = getPinPosition(comp, hoveredPin.pin);
                  const vPin = nodeVoltages[`${comp.id}:${hoveredPin.pin}`] ?? 0;
                  txt = `${comp.label} · ${getPinFullName(comp.type, hoveredPin.pin)} (${vPin.toFixed(2)}V)`;
                }
              }
              if (!pt || !txt) return null;
              const boxW = Math.max(130, txt.length * 6 + 18);
              const tx = Math.min(SVG_W - boxW - 8, Math.max(8, pt.x - boxW / 2));
              const ty = pt.y > 46 ? pt.y - 34 : pt.y + 14;
              return (
                <g className="pointer-events-none">
                  <rect x={tx} y={ty} width={boxW} height={22} rx={5} fill="#0f172a" stroke="#22c55e" strokeWidth="1" />
                  <text
                    x={tx + boxW / 2}
                    y={ty + 14.5}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {txt}
                  </text>
                </g>
              );
            })()}

            {/* VOM Red (+) and Black (-) Probes Overlay */}
            {showMultimeter && redProbeCoord && (
              <g className="pointer-events-none">
                <circle cx={redProbeCoord.x} cy={redProbeCoord.y} r="8" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth="2" />
                <line x1={redProbeCoord.x} y1={redProbeCoord.y - 8} x2={redProbeCoord.x + 10} y2={redProbeCoord.y - 20} stroke="#ef4444" strokeWidth="2.5" />
                <circle cx={redProbeCoord.x + 14} cy={redProbeCoord.y - 23} r="7" fill="#dc2626" />
                <text x={redProbeCoord.x + 14} y={redProbeCoord.y - 20} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">+</text>
              </g>
            )}
            {showMultimeter && blackProbeCoord && (
              <g className="pointer-events-none">
                <circle cx={blackProbeCoord.x} cy={blackProbeCoord.y} r="8" fill="rgba(100, 116, 139, 0.28)" stroke="#334155" strokeWidth="2" />
                <line x1={blackProbeCoord.x} y1={blackProbeCoord.y + 8} x2={blackProbeCoord.x - 10} y2={blackProbeCoord.y + 20} stroke="#334155" strokeWidth="2.5" />
                <circle cx={blackProbeCoord.x - 14} cy={blackProbeCoord.y + 23} r="7" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1" />
                <text x={blackProbeCoord.x - 14} y={blackProbeCoord.y + 26} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">−</text>
              </g>
            )}

            {/* Draggable 3D Multimeter & Oscilloscope Test Probe Leads in 2D SVG Mode */}
            {components
              .filter((c) => c.type === 'multimeter' || c.type === 'oscilloscope')
              .map((meter) => {
                const rad = (meter.rotation * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const toWorld = (lx: number, ly: number) => ({
                  x: meter.x + lx * cos - ly * sin,
                  y: meter.y + lx * sin + ly * cos,
                });
                const isScope = meter.type === 'oscilloscope';
                const comJack = toWorld(isScope ? -12 : -10, 12);
                const posJack = toWorld(isScope ? 12 : 10, 12);
                const redPt =
                  getProbeTargetPosition(meter.redTarget ?? null, components, wires, breadboards) ?? toWorld(isScope ? 34 : 28, 36);
                const blackPt =
                  getProbeTargetPosition(meter.blackTarget ?? null, components, wires, breadboards) ?? toWorld(isScope ? -34 : -28, 36);
                const redMidX = (posJack.x + redPt.x) / 2;
                const redMidY = Math.max(posJack.y, redPt.y) + 28;
                const blackMidX = (comJack.x + blackPt.x) / 2;
                const blackMidY = Math.max(comJack.y, blackPt.y) + 28;

                return (
                  <g key={`meter-leads-${meter.id}`} className="pointer-events-none">
                    <path
                      d={`M ${comJack.x} ${comJack.y} Q ${blackMidX} ${blackMidY} ${blackPt.x} ${blackPt.y}`}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${posJack.x} ${posJack.y} Q ${redMidX} ${redMidY} ${redPt.x} ${redPt.y}`}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <circle cx={blackPt.x} cy={blackPt.y} r="6.5" fill="rgba(30, 41, 59, 0.28)" stroke="#334155" strokeWidth="1.8" />
                    <circle cx={blackPt.x} cy={blackPt.y} r="2.6" fill="#0f172a" />
                    <circle cx={redPt.x} cy={redPt.y} r="6.5" fill="rgba(220, 38, 38, 0.25)" stroke="#ef4444" strokeWidth="1.8" />
                    <circle cx={redPt.x} cy={redPt.y} r="2.6" fill="#dc2626" />
                  </g>
                );
              })}
          </svg>
          )}

          {/* Empty State Hint */}
          {components.length === 0 && breadboards.length === 0 && !activePlaceType && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`text-center space-y-1.5 px-5 py-4 rounded-xl border ${
                  isLightCanvas
                    ? 'bg-white/95 border-slate-300 text-slate-700 shadow-sm'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">Bảng mạch Studio đang trống</div>
                <div className="text-xs opacity-80">
                  Kéo thả Breadboard, Pin 9V, Đồng hồ vạn năng 3D, LED... từ thư viện bên phải vào đây
                </div>
              </div>
            </div>
          )}

          {/* Active Placement / Wiring / Probe Pick Hint Banner */}
          {(activePlaceType || wireStart || activeMeterProbeEdit) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2">
              <span>
                {activeMeterProbeEdit
                  ? `Bấm vào bất kỳ điểm nào trên dây dẫn, linh kiện hoặc chân cắm để đặt que đo ${
                      activeMeterProbeEdit.side === 'red' ? 'Đỏ (+)' : 'Đen (−)'
                    }`
                  : activePlaceType
                  ? `Bấm lên bảng mạch để đặt ${activePlaceType === 'breadboard' ? 'Bảng cắm Breadboard' : getCompTitle(activePlaceType)}`
                  : 'Bấm nền để bẻ góc dây · Bấm chân hoặc lỗ Breadboard để nối (Esc để hủy)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActivePlaceType(null);
                  setActiveMeterProbeEdit(null);
                  setWireStart(null);
                  setWireDraftWaypoints([]);
                }}
                className="p-0.5 rounded hover:bg-blue-500"
                title="Hủy (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Floating Tinkercad Inspector Card (Top-Left of Canvas) */}
          {showFloatingInspector && !activePlaceType && (
            <div
              className={`absolute top-3 left-3 z-10 w-64 max-w-[85%] rounded-xl border shadow-lg p-2.5 space-y-2 text-xs ${
                viewMode === '3d' ? '' : 'backdrop-blur-md '
              }${
                isLightCanvas
                  ? 'bg-white/95 border-slate-200 text-slate-800'
                  : 'bg-slate-900/95 border-slate-700 text-slate-100'
              }`}
            >
              {selectedComp && (
                <>
                  <div className={`flex items-center justify-between gap-2 pb-1.5 border-b ${isLightCanvas ? 'border-slate-200' : 'border-slate-800'}`}>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[10px] font-semibold ${isLightCanvas ? 'text-blue-600' : 'text-sky-400'}`}>
                        {getCompTitle(selectedComp.type)}
                      </div>
                      <input
                        type="text"
                        value={selectedComp.label}
                        onChange={(e) => updateSelectedComp({ label: e.target.value.slice(0, 14) })}
                        className={`w-full font-bold text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none ${
                          isLightCanvas ? 'text-slate-900' : 'text-white'
                        }`}
                        aria-label="Tên linh kiện"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className={`p-1 rounded ${
                        isLightCanvas ? 'hover:bg-slate-200/70 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                      }`}
                      title="Đóng bảng thuộc tính"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Switch / Pushbutton Control */}
                  {(selectedComp.type === 'switch' || selectedComp.type === 'pushbutton') && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSwitch(selectedComp.id)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          selectedComp.value >= 0.5
                            ? isLightCanvas
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                            : isLightCanvas
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        {selectedComp.value >= 0.5 ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        <span>{selectedComp.value >= 0.5 ? 'Trạng thái: ĐÓNG (ON)' : 'Trạng thái: MỞ (OFF)'}</span>
                      </button>
                      <div className="text-[10px] opacity-70">
                        Mẹo: Bấm trực tiếp vào {selectedComp.type === 'pushbutton' ? 'nút nhấn' : 'công tắc'} trên mạch để đóng/ngắt.
                      </div>
                    </div>
                  )}

                  {/* 3D Digital Multimeter Inspector */}
                  {selectedComp.type === 'multimeter' && (() => {
                    const evalRes = evaluateMultimeterReading(
                      selectedComp,
                      components,
                      wires,
                      breadboards,
                      solvedComps,
                      solvedWires,
                      nodeVoltages
                    );
                    const isCurrent = selectedComp.meterMode === 'I';
                    const isPickingRed = activeMeterProbeEdit?.meterId === selectedComp.id && activeMeterProbeEdit.side === 'red';
                    const isPickingBlack = activeMeterProbeEdit?.meterId === selectedComp.id && activeMeterProbeEdit.side === 'black';
                    return (
                      <div className="space-y-2">
                        <div className="rounded-lg bg-slate-950 border border-emerald-700/60 px-2.5 py-2 text-center shadow-inner">
                          <div className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400">
                            {isCurrent ? 'ĐO DÒNG ĐIỆN (I)' : 'ĐO ĐIỆN ÁP (V)'}
                          </div>
                          <div
                            className={`text-lg font-mono font-extrabold tabular-nums mt-0.5 ${
                              isCurrent ? 'text-emerald-400' : 'text-sky-400'
                            }`}
                          >
                            {evalRes.displayText}
                          </div>
                          <div className="text-[10px] text-slate-300/90 mt-0.5 truncate">{evalRes.targetLabel}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateSelectedComp({ meterMode: 'V' })}
                            className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                              !isCurrent
                                ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                                : isLightCanvas
                                ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Đo Điện áp (V)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSelectedComp({ meterMode: 'I' })}
                            className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                              isCurrent
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                                : isLightCanvas
                                ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Đo Dòng điện (I)
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between gap-1 text-[10.5px]">
                            <span className="font-semibold text-rose-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Que Đỏ (+):
                            </span>
                            <span className="font-mono truncate max-w-[125px] opacity-90">
                              {describeProbeTargetInfo(selectedComp.redTarget, components, wires, breadboards)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMeterProbeEdit((cur) =>
                                  cur?.meterId === selectedComp.id && cur.side === 'red'
                                    ? null
                                    : { meterId: selectedComp.id, side: 'red' }
                                )
                              }
                              className={`flex-1 px-2 py-1 rounded-md border text-[10.5px] font-semibold transition-colors ${
                                isPickingRed
                                  ? 'bg-rose-600 border-rose-500 text-white'
                                  : isLightCanvas
                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                                  : 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-700/60 text-rose-200'
                              }`}
                            >
                              {isPickingRed ? 'Đang chọn trên mạch...' : 'Chạm điểm đo (+)'}
                            </button>
                            {selectedComp.redTarget && (
                              <button
                                type="button"
                                onClick={() => handleSetMeterProbe(selectedComp.id, 'red', null)}
                                title="Gỡ que đỏ"
                                className={`px-2 py-1 rounded-md border text-[10.5px] ${
                                  isLightCanvas
                                    ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                Gỡ
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[10.5px] pt-1">
                            <span className="font-semibold text-slate-500 dark:text-slate-300 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-slate-700 border border-slate-400 inline-block" /> Que Đen (−):
                            </span>
                            <span className="font-mono truncate max-w-[125px] opacity-90">
                              {describeProbeTargetInfo(selectedComp.blackTarget, components, wires, breadboards)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMeterProbeEdit((cur) =>
                                  cur?.meterId === selectedComp.id && cur.side === 'black'
                                    ? null
                                    : { meterId: selectedComp.id, side: 'black' }
                                )
                              }
                              className={`flex-1 px-2 py-1 rounded-md border text-[10.5px] font-semibold transition-colors ${
                                isPickingBlack
                                  ? 'bg-slate-700 border-slate-500 text-white'
                                  : isLightCanvas
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-200'
                              }`}
                            >
                              {isPickingBlack ? 'Đang chọn trên mạch...' : 'Chạm điểm đo (−)'}
                            </button>
                            {selectedComp.blackTarget && (
                              <button
                                type="button"
                                onClick={() => handleSetMeterProbe(selectedComp.id, 'black', null)}
                                title="Gỡ que đen"
                                className={`px-2 py-1 rounded-md border text-[10.5px] ${
                                  isLightCanvas
                                    ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                Gỡ
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          className={`rounded-md px-2 py-1.5 text-[10px] leading-snug ${
                            isLightCanvas
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-amber-950/40 text-amber-200/90 border border-amber-700/40'
                          }`}
                        >
                          Mẹo 3D: Kéo trực tiếp đầu que Đỏ/Đen trong không gian 3D thả lên bất kỳ điểm nào của dây dẫn hoặc linh kiện để đo V / I tức thì, hoặc bấm núm xoay vàng trên thân máy để đổi chế độ.
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3D Oscilloscope Inspector */}
                  {selectedComp.type === 'oscilloscope' && (() => {
                    const tr = simFrame.scopeTraces[selectedComp.id];
                    const samples = tr?.samples ?? [];
                    const timeWin = selectedComp.scopeTimeWindow ?? 2.0;
                    const vDiv = selectedComp.scopeVDiv ?? 0;
                    const vmin = tr?.vmin ?? 0;
                    const vmax = tr?.vmax ?? 0;
                    const vpp = tr?.vpp ?? 0;
                    const vInst = tr?.vInst ?? 0;

                    let yMin = -5;
                    let yMax = 5;
                    if (vDiv > 0) {
                      if (vmin >= -0.05 && vmax > vDiv * 1.9) {
                        yMin = -0.3 * vDiv;
                        yMax = 3.7 * vDiv;
                      } else {
                        yMin = -2 * vDiv;
                        yMax = 2 * vDiv;
                      }
                    } else {
                      const maxAbs = Math.max(1.5, Math.abs(vmin), Math.abs(vmax));
                      if (vmin < -0.15 && vmax > 0.15) {
                        yMax = maxAbs * 1.2;
                        yMin = -yMax;
                      } else if (vmin >= -0.15) {
                        yMin = -Math.max(0.5, maxAbs * 0.12);
                        yMax = Math.max(2.0, vmax * 1.2);
                      } else {
                        yMax = Math.max(0.5, maxAbs * 0.12);
                        yMin = Math.min(-2.0, vmin * 1.2);
                      }
                    }

                    const polyPts =
                      samples.length >= 2
                        ? samples
                            .map((val, i) => {
                              const px = (i / (samples.length - 1)) * 220;
                              const ratio = Math.max(0, Math.min(1, (val - yMin) / Math.max(0.01, yMax - yMin)));
                              const py = 72 - ratio * 64 - 4;
                              return `${px.toFixed(1)},${py.toFixed(1)}`;
                            })
                            .join(' ')
                        : '0,36 220,36';
                    const zeroRatio = Math.max(0, Math.min(1, (0 - yMin) / Math.max(0.01, yMax - yMin)));
                    const zeroY = 72 - zeroRatio * 64 - 4;

                    const isPickingRed = activeMeterProbeEdit?.meterId === selectedComp.id && activeMeterProbeEdit.side === 'red';
                    const isPickingBlack = activeMeterProbeEdit?.meterId === selectedComp.id && activeMeterProbeEdit.side === 'black';

                    return (
                      <div className="space-y-2">
                        {/* Live Mini Waveform Display */}
                        <div className="rounded-lg bg-[#031019] border border-cyan-700/70 p-2 shadow-inner space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-cyan-300 font-bold">
                              CH1: {vInst >= 0 ? '+' : '−'}{Math.abs(vInst).toFixed(2)} V
                            </span>
                            <span className="text-amber-300 font-bold">Vpp: {vpp.toFixed(2)} V</span>
                          </div>
                          <svg viewBox="0 0 220 72" className="w-full h-18 rounded bg-[#020c14] border border-cyan-900/60">
                            {[1, 2, 3].map((r) => (
                              <line key={`h-${r}`} x1="0" y1={r * 18} x2="220" y2={r * 18} stroke="rgba(34,211,238,0.14)" strokeWidth="0.7" />
                            ))}
                            {[1, 2, 3, 4, 5].map((c) => (
                              <line key={`v-${c}`} x1={c * 36.6} y1="0" x2={c * 36.6} y2="72" stroke="rgba(34,211,238,0.14)" strokeWidth="0.7" />
                            ))}
                            <line x1="0" y1={zeroY} x2="220" y2={zeroY} stroke="rgba(148,163,184,0.45)" strokeWidth="0.9" strokeDasharray="3,3" />
                            <polyline points={polyPts} fill="none" stroke="#22d3ee" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                          <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                            <span>Min {vmin.toFixed(1)}V</span>
                            <span className="truncate max-w-[100px] text-cyan-200/80">{tr?.targetLabel ?? 'CH1 chờ đo'}</span>
                            <span>Max {vmax.toFixed(1)}V</span>
                          </div>
                        </div>

                        {/* Time Window Selector */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="opacity-80 font-semibold">Khung thời gian (Timebase):</span>
                            <span className="font-mono font-bold text-cyan-500">{timeWin}s</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {[0.5, 1.0, 2.0, 4.0].map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => updateSelectedComp({ scopeTimeWindow: w })}
                                className={`py-1 rounded text-[10.5px] font-mono font-bold border transition-colors ${
                                  Math.abs(timeWin - w) < 0.05
                                    ? 'bg-cyan-600 border-cyan-500 text-white'
                                    : isLightCanvas
                                    ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {w}s
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Vertical Volts/Div Selector */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="opacity-80 font-semibold">Thang áp (V/ô):</span>
                            <span className="font-mono font-bold text-sky-500">{vDiv === 0 ? 'Auto' : `${vDiv}V/ô`}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[0, 1, 2, 5, 10].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => updateSelectedComp({ scopeVDiv: v })}
                                className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                                  vDiv === v
                                    ? 'bg-sky-600 border-sky-500 text-white'
                                    : isLightCanvas
                                    ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {v === 0 ? 'Auto' : `${v}V`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* CH1 (+) and GND (-) Probe Target Pickers */}
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between gap-1 text-[10.5px]">
                            <span className="font-semibold text-rose-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Que CH1 (+):
                            </span>
                            <span className="font-mono truncate max-w-[125px] opacity-90">
                              {describeProbeTargetInfo(selectedComp.redTarget, components, wires, breadboards)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMeterProbeEdit((cur) =>
                                  cur?.meterId === selectedComp.id && cur.side === 'red'
                                    ? null
                                    : { meterId: selectedComp.id, side: 'red' }
                                )
                              }
                              className={`flex-1 px-2 py-1 rounded-md border text-[10.5px] font-semibold transition-colors ${
                                isPickingRed
                                  ? 'bg-rose-600 border-rose-500 text-white'
                                  : isLightCanvas
                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                                  : 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-700/60 text-rose-200'
                              }`}
                            >
                              {isPickingRed ? 'Đang chọn trên mạch...' : 'Chạm điểm đo CH1'}
                            </button>
                            {selectedComp.redTarget && (
                              <button
                                type="button"
                                onClick={() => handleSetMeterProbe(selectedComp.id, 'red', null)}
                                title="Gỡ que CH1"
                                className={`px-2 py-1 rounded-md border text-[10.5px] ${
                                  isLightCanvas
                                    ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                Gỡ
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[10.5px] pt-0.5">
                            <span className="font-semibold text-slate-500 dark:text-slate-300 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-slate-700 border border-slate-400 inline-block" /> Que GND (−):
                            </span>
                            <span className="font-mono truncate max-w-[125px] opacity-90">
                              {selectedComp.blackTarget
                                ? describeProbeTargetInfo(selectedComp.blackTarget, components, wires, breadboards)
                                : 'Mặc định 0V'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMeterProbeEdit((cur) =>
                                  cur?.meterId === selectedComp.id && cur.side === 'black'
                                    ? null
                                    : { meterId: selectedComp.id, side: 'black' }
                                )
                              }
                              className={`flex-1 px-2 py-1 rounded-md border text-[10.5px] font-semibold transition-colors ${
                                isPickingBlack
                                  ? 'bg-slate-700 border-slate-500 text-white'
                                  : isLightCanvas
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-200'
                              }`}
                            >
                              {isPickingBlack ? 'Đang chọn trên mạch...' : 'Chạm tham chiếu GND'}
                            </button>
                            {selectedComp.blackTarget && (
                              <button
                                type="button"
                                onClick={() => handleSetMeterProbe(selectedComp.id, 'black', null)}
                                title="Gỡ que GND"
                                className={`px-2 py-1 rounded-md border text-[10.5px] ${
                                  isLightCanvas
                                    ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                Gỡ
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setScopeOpen((s) => !s)}
                          className={`w-full px-2 py-1.5 rounded-lg border text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            isLightCanvas
                              ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800'
                              : 'bg-cyan-950/40 hover:bg-cyan-900/50 border-cyan-700/60 text-cyan-200'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>{scopeOpen ? 'Thu gọn Bảng sóng lớn' : 'Mở Bảng sóng lớn 2 kênh'}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* LDR Photoresistor Interactive Light Slider */}
                  {selectedComp.type === 'ldr' && (
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[10.5px]">
                        <span>Cường độ ánh sáng</span>
                        <span className="font-mono font-bold">
                          {Math.round((selectedComp.wiper ?? 0.5) * 100)}% ({formatResistance(getLdrResistance(selectedComp.wiper ?? 0.5))})
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round((selectedComp.wiper ?? 0.5) * 100)}
                        onChange={(e) => updateSelectedComp({ wiper: Number(e.target.value) / 100 })}
                        className="w-full accent-amber-500"
                      />
                      <div className="flex justify-between text-[9.5px] opacity-70">
                        <span>Tối (100kΩ)</span>
                        <span>Sáng mạnh (200Ω)</span>
                      </div>
                    </label>
                  )}

                  {/* Diode Vf & Flip Polarity */}
                  {selectedComp.type === 'diode' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] opacity-80">Loại / Sụt áp Vf:</span>
                        <select
                          value={selectedComp.value}
                          onChange={(e) => updateSelectedComp({ value: Number(e.target.value) })}
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-mono ${
                            isLightCanvas ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700'
                          }`}
                        >
                          <option value={0.7}>Silicon 1N4007 (0.7V)</option>
                          <option value={0.3}>Schottky (0.3V)</option>
                          <option value={0.2}>Germanium (0.2V)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleFlipSelected180}
                        className={`w-full px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center justify-center gap-1 ${
                          isLightCanvas
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Đảo chiều Anode ↔ Cathode</span>
                      </button>
                    </div>
                  )}

                  {/* LED Color Swatches & Flip Polarity */}
                  {selectedComp.type === 'led' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] opacity-80">Màu LED:</span>
                        <div className="flex items-center gap-1">
                          {(Object.keys(LED_COLOR_MAP) as LedColorKey[]).map((ck) => (
                            <button
                              key={ck}
                              type="button"
                              onClick={() => updateSelectedComp({ color: ck })}
                              title={LED_COLOR_MAP[ck].label}
                              className={`w-4 h-4 rounded-full border transition-transform ${
                                (selectedComp.color ?? 'red') === ck ? 'ring-2 ring-blue-500 scale-110' : 'opacity-75'
                              }`}
                              style={{ backgroundColor: LED_COLOR_MAP[ck].onFill, borderColor: LED_COLOR_MAP[ck].stroke }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleFlipSelected180}
                        className={`w-full px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center justify-center gap-1 ${
                          isLightCanvas
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Đảo cực Anode ↔ Cathode</span>
                      </button>
                    </div>
                  )}

                  {/* Value Editor for Numeric Components */}
                  {(selectedComp.type === 'source' ||
                    selectedComp.type === 'ac_source' ||
                    selectedComp.type === 'resistor' ||
                    selectedComp.type === 'pot' ||
                    selectedComp.type === 'capacitor' ||
                    selectedComp.type === 'inductor' ||
                    selectedComp.type === 'zener' ||
                    selectedComp.type === 'bjt' ||
                    selectedComp.type === 'opamp') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                        <span className="text-[11px] font-sans opacity-80">
                          {selectedComp.type === 'resistor' || selectedComp.type === 'pot'
                            ? 'Điện trở:'
                            : selectedComp.type === 'capacitor'
                            ? 'Điện dung:'
                            : selectedComp.type === 'inductor'
                            ? 'Độ tự cảm:'
                            : selectedComp.type === 'zener'
                            ? 'Áp ổn áp Vz:'
                            : selectedComp.type === 'bjt'
                            ? 'Hệ số β:'
                            : selectedComp.type === 'opamp'
                            ? 'Nguồn ±Vrail:'
                            : 'Điện áp:'}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={selectedComp.value}
                            min={selectedComp.type === 'zener' ? 2.4 : 1}
                            max={selectedComp.type === 'bjt' ? 400 : selectedComp.type === 'opamp' ? 24 : 100000}
                            step={
                              selectedComp.type === 'zener'
                                ? 0.1
                                : selectedComp.type === 'source' || selectedComp.type === 'ac_source' || selectedComp.type === 'opamp'
                                ? 0.5
                                : 10
                            }
                            onChange={(e) => updateSelectedComp({ value: Math.max(1, Number(e.target.value) || 1) })}
                            className={`w-20 rounded border px-2 py-0.5 text-xs ${
                              isLightCanvas ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                            }`}
                          />
                          <span className="text-[11px] opacity-75">
                            {selectedComp.type === 'source'
                              ? 'V'
                              : selectedComp.type === 'ac_source'
                              ? 'Vp'
                              : selectedComp.type === 'resistor' || selectedComp.type === 'pot'
                              ? 'Ω'
                              : selectedComp.type === 'capacitor'
                              ? 'μF'
                              : selectedComp.type === 'inductor'
                              ? 'mH'
                              : selectedComp.type === 'zener' || selectedComp.type === 'opamp'
                              ? 'V'
                              : ''}
                          </span>
                        </div>
                      </div>

                      {selectedComp.type === 'resistor' && (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {[100, 220, 330, 470, 1000, 4700].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => updateSelectedComp({ value: v })}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  selectedComp.value === v
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : isLightCanvas
                                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {formatResistance(v)}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 pt-0.5">
                            <span className="text-[10px] opacity-70 mr-1">Vạch màu:</span>
                            {getResistorColorBands(selectedComp.value).map((hex, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-2 rounded-sm border border-black/20"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {selectedComp.type === 'inductor' && (
                        <div className="flex flex-wrap gap-1">
                          {[10, 47, 100, 150, 250, 470].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateSelectedComp({ value: v })}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                selectedComp.value === v
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : isLightCanvas
                                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {v}mH
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedComp.type === 'capacitor' && (
                        <div className="flex flex-wrap gap-1">
                          {[10, 100, 220, 470, 1000].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateSelectedComp({ value: v })}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                selectedComp.value === v
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : isLightCanvas
                                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {formatCapacitance(v)}
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedComp.type === 'zener' && (
                        <div className="flex flex-wrap gap-1">
                          {[3.3, 4.7, 5.1, 6.8, 9.1, 12].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateSelectedComp({ value: v })}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                selectedComp.value === v
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : isLightCanvas
                                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {v}V
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedComp.type === 'ac_source' && (
                        <div className="flex items-center justify-between gap-2 font-mono">
                          <span className="text-[11px] font-sans opacity-80">Tần số (f):</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={selectedComp.freq ?? 60}
                              min={1}
                              max={1000}
                              step={5}
                              onChange={(e) =>
                                updateSelectedComp({ freq: Math.max(0.25, Math.min(2000, Number(e.target.value) || 60)) })
                              }
                              className={`w-16 rounded border px-1.5 py-0.5 text-xs ${
                                isLightCanvas ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700'
                              }`}
                            />
                            <span className="text-[11px] opacity-75">Hz</span>
                          </div>
                        </div>
                      )}

                      {selectedComp.type === 'pot' && (() => {
                        const w = selectedComp.wiper ?? 0.5;
                        const r1 = selectedComp.value * w;
                        const r2 = selectedComp.value * (1 - w);
                        return (
                          <div className="space-y-1.5 pt-0.5">
                            <label className="block space-y-1">
                              <div className="flex justify-between text-[10.5px]">
                                <span>Con trượt (Wiper)</span>
                                <span className="font-mono font-bold text-violet-500">{Math.round(w * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min={5}
                                max={95}
                                value={Math.round(w * 100)}
                                onChange={(e) => updateSelectedComp({ wiper: Number(e.target.value) / 100 })}
                                className="w-full accent-violet-500"
                              />
                            </label>
                            <div
                              className={`grid grid-cols-2 gap-1 rounded-md border px-2 py-1 text-[10px] font-mono tabular-nums ${
                                isLightCanvas
                                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                                  : 'bg-slate-950 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span>R(1−W): {formatResistance(r1)}</span>
                              <span className="text-right">R(W−3): {formatResistance(r2)}</span>
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {[10, 25, 50, 75, 90].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => updateSelectedComp({ wiper: pct / 100 })}
                                  className={`py-0.5 rounded border text-[9.5px] font-mono font-semibold transition-colors ${
                                    Math.round(w * 100) === pct
                                      ? 'bg-violet-600 border-violet-500 text-white'
                                      : isLightCanvas
                                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { val: 1000, label: '1kΩ' },
                                { val: 5000, label: '5kΩ' },
                                { val: 10000, label: '10kΩ' },
                                { val: 50000, label: '50kΩ' },
                              ].map((preset) => (
                                <button
                                  key={preset.val}
                                  type="button"
                                  onClick={() => updateSelectedComp({ value: preset.val })}
                                  className={`py-0.5 rounded border text-[9.5px] font-mono transition-colors ${
                                    selectedComp.value === preset.val
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : isLightCanvas
                                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                            <div className="text-[9.5px] opacity-70">
                              Mẹo 3D: Kéo ngang núm xoay trên biến trở 3D để chỉnh trực tiếp.
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedComp.type === 'clockgen' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <span className="text-[11px] font-sans opacity-80">Tần số xung (f):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={selectedComp.freq ?? 1.5}
                            min={0.5}
                            max={10}
                            step={0.5}
                            onChange={(e) =>
                              updateSelectedComp({ freq: Math.max(0.25, Math.min(20, Number(e.target.value) || 1)) })
                            }
                            className={`w-16 rounded border px-1.5 py-0.5 text-xs ${
                              isLightCanvas ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                            }`}
                          />
                          <span className="text-[11px] opacity-75">Hz</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedComp.type === 'mcu8051' && (
                    <div className="space-y-1.5">
                      <div className="space-y-1">
                        <span className="text-[10.5px] opacity-80 block">Chương trình Firmware 8051:</span>
                        <select
                          value={selectedComp.mcuProgram ?? 'blink_alt'}
                          onChange={(e) =>
                            updateSelectedComp({ mcuProgram: e.target.value as Mcu8051ProgramId })
                          }
                          className={`w-full rounded border px-1.5 py-1 text-[11px] font-medium ${
                            isLightCanvas ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                          }`}
                        >
                          {MCU_8051_PROGRAMS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sectionRef}: {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <span className="text-[11px] font-sans opacity-80">Nhịp thực thi:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={selectedComp.freq ?? 1.5}
                            min={0.5}
                            max={10}
                            step={0.5}
                            onChange={(e) =>
                              updateSelectedComp({ freq: Math.max(0.25, Math.min(10, Number(e.target.value) || 1.5)) })
                            }
                            className={`w-16 rounded border px-1.5 py-0.5 text-xs ${
                              isLightCanvas ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                            }`}
                          />
                          <span className="text-[11px] opacity-75">Hz</span>
                        </div>
                      </div>
                      {selectedState && (
                        <div
                          className={`rounded-md border px-2 py-1 text-[10px] font-mono flex items-center justify-between ${
                            isLightCanvas ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-950/40 border-sky-800 text-sky-200'
                          }`}
                        >
                          <span>P1=0x{(selectedState.digitalValue ?? 0).toString(16).toUpperCase().padStart(2, '0')}</span>
                          <span>PC=0x{(selectedState.digitalAux ?? 0).toString(16).toUpperCase().padStart(4, '0')}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setMcuLabOpen(true)}
                        className="w-full py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold"
                      >
                        Mở Debugger ASM & SFR 8051
                      </button>
                    </div>
                  )}

                  {selectedComp.type === 'dec74138' && selectedState && (
                    <div
                      className={`rounded-md border px-2 py-1.5 text-[10.5px] font-mono space-y-0.5 ${
                        isLightCanvas ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-950/40 border-indigo-800 text-indigo-200'
                      }`}
                    >
                      <div className="font-bold">Ngõ ra tích cực LOW: {selectedState.extraLabel}</div>
                      <div className="opacity-80">
                        Y3..Y0 = {((selectedState.digitalBits ?? 0x0f) & 0x0f).toString(2).padStart(4, '0')}b
                      </div>
                    </div>
                  )}

                  {selectedComp.type === 'sevenseg' && selectedState && (
                    <div
                      className={`rounded-md border px-2 py-1.5 text-[10.5px] font-mono flex items-center justify-between ${
                        isLightCanvas ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-800 text-rose-200'
                      }`}
                    >
                      <span>Hiển thị: {selectedState.extraLabel}</span>
                      <span>Mã: 0x{(selectedState.digitalBits ?? 0).toString(16).toUpperCase().padStart(2, '0')}</span>
                    </div>
                  )}

                  {/* Live Component Telemetry */}
                  {selectedState && selectedComp.type !== 'ground' && (
                    <div
                      className={`px-2 py-1 rounded-lg border text-[10.5px] font-mono tabular-nums flex items-center justify-between ${
                        isLightCanvas ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>V={Math.abs(selectedState.vDrop).toFixed(2)}V</span>
                      <span>I={Math.abs(selectedState.currentMa).toFixed(1)}mA</span>
                      <span>P={(selectedState.powerMw / 1000).toFixed(2)}W</span>
                    </div>
                  )}

                  {/* Per-component Fault Injection */}
                  {selectedComp.type !== 'ground' &&
                    selectedComp.type !== 'source' &&
                    selectedComp.type !== 'ac_source' &&
                    selectedComp.type !== 'multimeter' &&
                    selectedComp.type !== 'oscilloscope' &&
                    selectedComp.type !== 'mcu8051' &&
                    selectedComp.type !== 'dec74138' &&
                    selectedComp.type !== 'sevenseg' &&
                    selectedComp.type !== 'clockgen' &&
                    !(activeMission && !missionSolved) && (
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <span className="text-[10.5px] opacity-80">Giả lập lỗi:</span>
                        <select
                          aria-label="Giả lập lỗi linh kiện"
                          value={selectedComp.fault ?? 'none'}
                          onChange={(e) => {
                            updateSelectedComp({ fault: e.target.value as FaultType });
                            setBurnNotice(null);
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium border focus:outline-none ${
                            selectedComp.fault && selectedComp.fault !== 'none'
                              ? 'bg-orange-950/70 border-orange-500/60 text-orange-200'
                              : isLightCanvas
                              ? 'bg-slate-50 border-slate-300 text-slate-700'
                              : 'bg-slate-950 border-slate-700 text-slate-200'
                          }`}
                        >
                          <option value="none">Bình thường</option>
                          <option value="burned">Cháy đứt mạch</option>
                          <option value="leaky">Rò điện / Suy hao</option>
                          <option value="short">Chập mạch (Short)</option>
                          <option value="open">Hở mạch (Open)</option>
                          {(selectedComp.type === 'diode' ||
                            selectedComp.type === 'led' ||
                            selectedComp.type === 'zener' ||
                            selectedComp.type === 'opamp') && <option value="reversed">Ngược cực</option>}
                        </select>
                      </div>
                    )}
                </>
              )}

              {selectedWire && (
                <>
                  <div className={`flex items-center justify-between gap-2 pb-1.5 border-b ${isLightCanvas ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className="font-bold text-xs">Dây nối dẫn điện</span>
                    <button
                      type="button"
                      onClick={() => setSelectedWireId(null)}
                      className={`p-0.5 rounded ${isLightCanvas ? 'text-slate-500 hover:bg-slate-200/70' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] opacity-80">Màu vỏ dây Tinkercad:</div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {WIRE_COLOR_OPTIONS.map((wc) => (
                        <button
                          key={wc.hex}
                          type="button"
                          onClick={() => handlePickWireColor(wc.hex)}
                          title={wc.name}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            (selectedWire.color ?? '#16a34a') === wc.hex
                              ? 'ring-2 ring-blue-500 border-white scale-110'
                              : 'border-slate-400/50'
                          }`}
                          style={{ backgroundColor: wc.hex }}
                        />
                      ))}
                    </div>
                    <div className="text-[10.5px] font-mono tabular-nums opacity-80">
                      Dòng qua dây: {Math.abs(solvedWires[selectedWire.id]?.currentMa ?? 0).toFixed(1)} mA
                    </div>
                    <div className="text-[10px] opacity-70">
                      Nháy đúp lên dây để thêm điểm bẻ góc · Kéo chấm tròn trắng để uốn dây.
                    </div>
                    {selectedWire.waypoints && selectedWire.waypoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          pushUndoSnapshot();
                          setWires((prev) => prev.map((w) => (w.id === selectedWire.id ? { ...w, waypoints: undefined } : w)));
                        }}
                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[10.5px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Duỗi thẳng dây
                      </button>
                    )}
                  </div>
                </>
              )}

              {selectedBreadboard && (
                <>
                  <div className={`flex items-center justify-between gap-2 pb-1.5 border-b ${isLightCanvas ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className="font-bold text-xs">Bảng cắm Breadboard</span>
                    <button
                      type="button"
                      onClick={() => setSelectedBreadboardId(null)}
                      className={`p-0.5 rounded ${isLightCanvas ? 'text-slate-500 hover:bg-slate-200/70' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    25 cột (a–e, f–j) + ray nguồn (+ / −) trên & dưới. Kéo viền trắng để di chuyển cả bảng mạch.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Warnings Overlay */}
          {(shortWarning || ledOverloadWarning || burnNotice) && (
            <div className="absolute top-3 right-3 z-10 bg-rose-950/95 border border-rose-500/70 text-rose-100 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg max-w-[320px]">
              {burnNotice ? (
                <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="leading-snug">
                {burnNotice
                  ? burnNotice
                  : shortWarning
                  ? 'Cảnh báo ngắn mạch nguồn!'
                  : 'Quá dòng LED (> 30mA)! Tăng điện trở hạn dòng.'}
              </span>
              {burnNotice && (
                <button
                  type="button"
                  onClick={() => setBurnNotice(null)}
                  className="ml-1 text-rose-300 hover:text-white"
                  aria-label="Đóng thông báo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Troubleshooting & Fault Simulation Drawer */}
          {repairDrawerOpen && (
            <div className="absolute top-3 left-3 z-20 w-80 sm:w-96 max-w-[92%] bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2.5 text-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  Phòng lab Chẩn đoán Sự cố Mạch điện
                </span>
                <button type="button" onClick={() => setRepairDrawerOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={startRandomFaultChallenge}
                className="w-full px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Tạo lỗi ngẫu nhiên trên mạch hiện tại (Thi mù)</span>
              </button>

              <div className="grid grid-cols-1 gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ẩn dấu hiệu lỗi (Chẩn đoán bằng VOM/Scope)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={hideFaultVisuals}
                    onChange={(e) => setHideFaultVisuals(e.target.checked)}
                    className="accent-sky-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tự cháy đứt nếu điện trở quá tải (&gt; 1W)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={autoBurnOnOverload}
                    onChange={(e) => setAutoBurnOnOverload(e.target.checked)}
                    className="accent-orange-500"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <div className="text-[10.5px] font-semibold text-slate-400">Hoặc chọn ca bệnh thực hành mẫu:</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {FAULT_MISSIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => startFaultMission(m)}
                      className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <span>{m.title}</span>
                        <span className="text-[10px] text-amber-400 shrink-0 ml-1">{m.difficulty}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 line-clamp-2">{m.symptom}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save / Load / JSON Export-Import Drawer */}
          {projectMenuOpen && (
            <div className="absolute top-3 left-3 z-20 w-80 max-w-[92%] bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2.5 text-xs text-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                  Lưu trữ & Chia sẻ Dự án Mạch
                </span>
                <button type="button" onClick={() => setProjectMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Tên mạch điện..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveProject}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap"
                >
                  Lưu
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Xuất .JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Nhập .JSON</span>
                </button>
                <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
              </div>

              {projectNotice && <div className="text-[11px] text-emerald-400">{projectNotice}</div>}

              {savedProjects.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800 space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-[10px] text-slate-400 font-semibold">Đã lưu trên máy</div>
                  {savedProjects.map((proj) => (
                    <div key={proj.id} className="flex items-center justify-between gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMission(null);
                          setMissionSolved(false);
                          applyCircuitData(proj.components, proj.wires, proj.components[0]?.id ?? null, proj.breadboards ?? []);
                          setProjectName(proj.name);
                          setProjectMenuOpen(false);
                        }}
                        className="text-left truncate flex-1 text-slate-200 hover:text-sky-300"
                      >
                        {proj.name} <span className="text-[10px] text-slate-500">({proj.savedAt})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedProject(proj.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="Xóa bản lưu"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Circuit Check Drawer */}
          {aiAuditOpen && (
            <div
              className={`absolute top-3 right-3 z-20 w-[340px] sm:w-[400px] max-w-[94%] max-h-[92%] flex flex-col bg-slate-900/95 border border-violet-500/40 rounded-xl shadow-2xl overflow-hidden text-xs text-slate-100 ${
                viewMode === '3d' ? '' : 'backdrop-blur-md'
              }`}
            >
              <div className="px-3 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <span className="font-bold text-violet-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  AI Kiểm tra & Tư vấn Sửa mạch
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAnalyzeCircuitWithAI}
                    disabled={aiAuditLoading}
                    className="px-2 py-0.5 rounded bg-violet-600/25 hover:bg-violet-600/40 border border-violet-500/40 text-violet-200 text-[10.5px] font-medium disabled:opacity-50"
                  >
                    Phân tích lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiAuditOpen(false)}
                    className="text-slate-400 hover:text-white p-0.5"
                    aria-label="Đóng bảng kiểm tra mạch"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2.5 overflow-y-auto">
                {aiAuditLoading && (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-300">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                    <div className="text-xs font-medium">Đang đọc sơ đồ netlist & số đo áp/dòng...</div>
                    <div className="text-[10.5px] text-slate-400">Kiểm tra đoản mạch, quá tải công suất và trị số linh kiện</div>
                  </div>
                )}

                {!aiAuditLoading && aiAuditError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 space-y-2">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">{aiAuditError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAnalyzeCircuitWithAI}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {!aiAuditLoading && !aiAuditError && aiAuditResult && (
                  <>
                    <div
                      className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                        aiAuditResult.overallStatus === 'critical'
                          ? 'bg-rose-950/60 border-rose-500/60 text-rose-100'
                          : aiAuditResult.overallStatus === 'warning'
                          ? 'bg-amber-950/50 border-amber-500/60 text-amber-100'
                          : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-100'
                      }`}
                    >
                      {aiAuditResult.overallStatus === 'critical' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : aiAuditResult.overallStatus === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <div className="font-bold text-[11.5px]">
                          {aiAuditResult.overallStatus === 'critical'
                            ? 'Phát hiện lỗi nghiêm trọng / Nguy cơ hỏng mạch'
                            : aiAuditResult.overallStatus === 'warning'
                            ? 'Mạch có điểm cần lưu ý & tối ưu'
                            : 'Cấu hình mạch hợp lệ & an toàn'}
                        </div>
                        <p className="text-[11px] text-slate-200/90 leading-relaxed">{aiAuditResult.summary}</p>
                      </div>
                    </div>

                    {aiAuditResult.issues.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10.5px] font-semibold text-slate-400">
                          Chi tiết phát hiện ({aiAuditResult.issues.length})
                        </div>
                        {aiAuditResult.issues.map((issue, idx) => {
                          const matchedComp = issue.componentLabel
                            ? components.find((c) => c.label.toLowerCase() === issue.componentLabel?.toLowerCase())
                            : undefined;
                          return (
                            <div key={idx} className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-semibold text-slate-100 text-[11.5px]">{issue.title}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {issue.componentLabel && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (matchedComp) handleSelectComponent(matchedComp);
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-mono text-[10px]"
                                    >
                                      {issue.componentLabel}
                                    </button>
                                  )}
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                      issue.severity === 'critical'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                        : issue.severity === 'warning'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                    }`}
                                  >
                                    {issue.severity === 'critical'
                                      ? 'Nghiêm trọng'
                                      : issue.severity === 'warning'
                                      ? 'Cảnh báo'
                                      : 'Thông tin'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10.5px] text-slate-300 leading-snug">{issue.detail}</p>
                              <div className="text-[10.5px] text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded px-2 py-1 leading-snug">
                                <span className="font-semibold">Cách sửa: </span>
                                {issue.recommendation}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {aiAuditResult.recommendations && aiAuditResult.recommendations.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-800">
                        <div className="text-[10.5px] font-semibold text-slate-400">Lời khuyên tối ưu thêm</div>
                        <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">
                          {aiAuditResult.recommendations.map((rec, i) => (
                            <li key={i} className="leading-snug">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bottom-Left Canvas Zoom / Camera Controls (hidden when isolated in VR View) */}
          {!vrMode3D && (
          <div
            className={`absolute bottom-2.5 left-2.5 flex items-center gap-0.5 rounded-lg border px-1 py-0.5 shadow-sm text-[11px] font-mono tabular-nums ${
              isLightCanvas
                ? 'bg-white/95 border-slate-200 text-slate-700'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {viewMode === '3d' ? (
              <>
                <button
                  type="button"
                  onClick={() => setNavMode3D('orbit')}
                  className={`px-1.5 py-0.5 rounded font-sans font-semibold text-[10.5px] flex items-center gap-1 transition-colors ${
                    navMode3D === 'orbit'
                      ? 'bg-sky-600 text-white'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                  title="Chế độ xoay camera 360° (Chuột phải / Shift+kéo vẫn lướt được)"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Xoay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNavMode3D('pan')}
                  className={`px-1.5 py-0.5 rounded font-sans font-semibold text-[10.5px] flex items-center gap-1 transition-colors ${
                    navMode3D === 'pan'
                      ? 'bg-sky-600 text-white'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                  title="Chế độ lướt / kéo bàn mạch qua trái, phải, lên, xuống"
                >
                  <Hand className="w-3 h-3" />
                  <span>Lướt</span>
                </button>
                <span className="mx-0.5 h-3.5 w-px bg-slate-300/70 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={() => canvas3DRef.current?.panBy(-2.6, 0)}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Lướt camera sang trái"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => canvas3DRef.current?.panBy(2.6, 0)}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Lướt camera sang phải"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="mx-0.5 h-3.5 w-px bg-slate-300/70 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={() => canvas3DRef.current?.zoomBy(1.18)}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Thu nhỏ camera 3D"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => canvas3DRef.current?.zoomBy(0.84)}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Phóng to camera 3D"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => canvas3DRef.current?.setCameraPreset('top')}
                  className="px-1.5 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 font-sans font-semibold text-[10.5px]"
                  title="Nhìn thẳng từ trên xuống"
                >
                  Từ trên
                </button>
                <button
                  type="button"
                  onClick={() => canvas3DRef.current?.setCameraPreset('3d')}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Đặt lại góc nhìn 3D chuẩn"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))))}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  title="Vừa khung hình"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          )}

          {/* Tinkercad Multimeter Widget (Bottom-Right of Workbench) */}
          {!vrMode3D && showMultimeter && (
            <div className="absolute bottom-2.5 right-2.5 z-10">
              <TinkercadMultimeterWidget
                mode={vomMode}
                onChangeMode={setVomMode}
                vVomDiff={vVomDiff}
                currentMa={vomCurrentMa}
                resistanceOhm={vomResistanceOhm}
                probeMode={probeMode}
                onToggleProbeMode={(p) => {
                  setIsWireMode(false);
                  setWireStart(null);
                  setActivePlaceType(null);
                  setProbeMode((cur) => (cur === p ? 'none' : p));
                }}
                redLabel={describeProbeTarget(redProbe)}
                blackLabel={describeProbeTarget(blackProbe)}
                onClose={() => {
                  setShowMultimeter(false);
                  setProbeMode('none');
                }}
              />
            </div>
          )}

          {!vrMode3D && !showMultimeter && (
            <div className="absolute bottom-2.5 right-2.5 bg-slate-900/95 border border-slate-700/90 rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none">
              <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                <span className="text-rose-400 font-bold">VOM</span>
                <span className="text-amber-300 font-bold">
                  {vVomDiff >= 0 ? '+' : ''}
                  {vVomDiff.toFixed(2)} V
                </span>
                {ch1Vpp > 0.3 && <span className="text-slate-400">({ch1Vpp.toFixed(1)} Vpp)</span>}
              </div>
            </div>
          )}

          {/* Dedicated Fullscreen VR View HUD Overlay */}
          {vrMode3D && (
            <>
              {vrStereo && (
                <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/30 z-10" />
              )}
              <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950/90 border border-white/15 text-white shadow-xl">
                  <Glasses className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-bold whitespace-nowrap">VR View Mạch 3D</span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-mono tabular-nums text-amber-300 whitespace-nowrap">
                    VOM {vVomDiff >= 0 ? '+' : ''}
                    {vVomDiff.toFixed(2)} V
                  </span>
                </div>

                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-white/15 shadow-xl">
                  <button
                    type="button"
                    onClick={() => setIsRunning((r) => !r)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                      isRunning ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isRunning ? 'Dừng mạch' : 'Chạy mạch'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVRGyro}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      vrGyroEnabled
                        ? vrGyroSignal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    title="Bật/Tắt xoay góc nhìn bằng con quay hồi chuyển thiết bị di động"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>
                      {vrGyroPerm === 'denied'
                        ? 'Cảm biến bị chặn'
                        : vrGyroEnabled
                        ? vrGyroSignal
                          ? 'Con quay: Đang xoay'
                          : needsGyroPermissionPrompt() && vrGyroPerm !== 'granted'
                          ? 'Cấp quyền Con quay'
                          : 'Con quay: Sẵn sàng'
                        : 'Con quay: Tắt'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => canvas3DRef.current?.recenterVR()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Đặt lại tâm nhìn 3D"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Đặt lại tâm nhìn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVrStereo((s) => !s)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                      vrStereo ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{vrStereo ? '2 Mắt VR' : '1 Màn hình'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVRMode3D}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Thoát VR View (Esc)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Thoát VR</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right-Hand Tinkercad Component Shelf & Templates Drawer */}
        <aside
          className={`shrink-0 bg-slate-50 dark:bg-slate-950 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all ${
            sidebarCollapsed ? 'md:w-12' : 'w-full md:w-72 lg:w-80'
          } md:h-[520px]`}
        >
          <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden md:flex p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0"
              title={sidebarCollapsed ? 'Mở rộng bảng linh kiện' : 'Thu gọn bảng linh kiện'}
            >
              {sidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>

            {!sidebarCollapsed && (
              <div className="flex flex-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSidebarTab('components')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    sidebarTab === 'components'
                      ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span>Linh kiện</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('templates')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    sidebarTab === 'templates'
                      ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Mạch mẫu</span>
                </button>
              </div>
            )}
          </div>

          {sidebarCollapsed && (
            <div className="hidden md:flex flex-col items-center gap-1.5 py-2">
              <button
                type="button"
                onClick={() => {
                  setSidebarTab('components');
                  setSidebarCollapsed(false);
                }}
                title="Kho linh kiện Tinkercad"
                className={`p-1.5 rounded-lg border ${
                  sidebarTab === 'components'
                    ? 'bg-blue-50 dark:bg-blue-600/25 border-blue-300 dark:border-blue-500/60 text-blue-600 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Cpu className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSidebarTab('templates');
                  setSidebarCollapsed(false);
                }}
                title="Thư viện mạch mẫu"
                className={`p-1.5 rounded-lg border ${
                  sidebarTab === 'templates'
                    ? 'bg-sky-50 dark:bg-sky-600/25 border-sky-300 dark:border-sky-500/60 text-sky-600 dark:text-sky-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {!sidebarCollapsed && sidebarTab === 'components' && (
            <>
              {/* Search & Category Filter */}
              <div className="p-2 border-b border-slate-200 dark:border-slate-900 space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    placeholder="Tìm linh kiện (breadboard, nút, motor...)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-7 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {paletteSearch && (
                    <button
                      type="button"
                      onClick={() => setPaletteSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {(
                    [
                      { id: 'all', label: 'Tất cả' },
                      { id: 'digital', label: 'Vi xử lý / Số' },
                      { id: 'instrument', label: 'Đo lường' },
                      { id: 'source', label: 'Nguồn' },
                      { id: 'passive', label: 'Thụ động' },
                      { id: 'semi', label: 'Bán dẫn' },
                      { id: 'actuator', label: 'Cơ cấu' },
                    ] as { id: PaletteCategory; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPaletteFilter(tab.id)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        paletteFilter === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tinkercad 2-Column Visual Component Cards */}
              <div className="p-2 grid grid-cols-3 md:grid-cols-2 gap-1.5 overflow-y-auto flex-1 content-start">
                {/* Featured Tinkercad Breadboard Card */}
                {(paletteFilter === 'all' || paletteFilter === 'passive') &&
                  (!paletteSearch.trim() || 'breadboard bang cam thu'.includes(paletteSearch.trim().toLowerCase())) && (
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/stemly-comp', 'breadboard');
                        e.dataTransfer.setData('text/plain', 'breadboard');
                        e.dataTransfer.effectAllowed = 'copy';
                        setActivePlaceType(null);
                      }}
                      onClick={() => addComponentAt('breadboard', 460, 260)}
                      title="Thêm Bảng cắm thử Breadboard (25 cột)"
                      className="col-span-full flex items-center gap-2.5 rounded-xl p-2 border bg-white dark:bg-slate-900/90 hover:bg-blue-50/60 dark:hover:bg-slate-800/90 border-slate-200 dark:border-slate-800 hover:border-blue-400 cursor-pointer transition-all"
                    >
                      <div className="w-16 h-10 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                        <BreadboardPaletteIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                          Breadboard (Bảng cắm)
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          25 cột · Ray nguồn +/−
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                    </div>
                  )}

                {filteredPalette.map((item) => {
                  const isPlacing = activePlaceType === item.type;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/stemly-comp', item.type);
                        e.dataTransfer.setData('text/plain', item.type);
                        e.dataTransfer.effectAllowed = 'copy';
                        draggingPaletteTypeRef.current = item.type;
                        setActivePlaceType(null);
                      }}
                      onDragEnd={() => {
                        draggingPaletteTypeRef.current = null;
                        canvas3DRef.current?.clearDropPreview();
                      }}
                      onClick={() => setActivePlaceType((cur) => (cur === item.type ? null : item.type))}
                      title={`Bấm để đặt lên bảng mạch hoặc kéo thả ${item.label}`}
                      className={`group relative flex flex-col items-center text-center rounded-xl p-2 border cursor-pointer transition-all ${
                        isPlacing
                          ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 ring-1 ring-blue-400/70'
                          : 'bg-white dark:bg-slate-900/90 hover:bg-slate-100/70 dark:hover:bg-slate-800/90 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePlaceType(null);
                          addComponentAt(
                            item.type,
                            240 + ((components.length * 40) % 440),
                            140 + ((components.length * 40) % 220)
                          );
                        }}
                        title={`Thêm nhanh ${item.label} vào bảng mạch`}
                        className="absolute top-1 right-1 p-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 text-slate-600 dark:text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <div className="w-full h-10 rounded-lg bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center mb-1.5">
                        <CompPaletteIcon type={item.type} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate w-full">
                        {item.label}
                      </div>
                      <div className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono truncate w-full mt-0.5">{item.spec}</div>
                    </div>
                  );
                })}
                {filteredPalette.length === 0 && (
                  <div className="col-span-full py-6 text-center text-[11px] text-slate-500">
                    Không tìm thấy linh kiện phù hợp.
                  </div>
                )}
              </div>

              <div className="px-2.5 py-1.5 border-t border-slate-200 dark:border-slate-900 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Kéo thả hoặc bấm để đặt</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{components.length} LK</span>
              </div>
            </>
          )}

          {!sidebarCollapsed && sidebarTab === 'templates' && (
            <>
              <div className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-900 flex items-center gap-1 overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'mcu', label: 'Vi điều khiển' },
                    { id: 'breadboard', label: 'Breadboard' },
                    { id: 'filter', label: 'Mạch lọc' },
                    { id: 'amp', label: 'Khuếch đại' },
                    { id: 'basic', label: 'Cơ bản' },
                  ] as { id: TemplateCategory; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTemplateFilter(tab.id)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      templateFilter === tab.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-2 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto flex-1">
                {CIRCUIT_TEMPLATES.filter((tpl) => templateFilter === 'all' || tpl.category === templateFilter).map((tpl) => {
                  const isActive = activePresetKey === tpl.key && !activeMission;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => handleLoadPreset(tpl.key)}
                      className={`text-left rounded-lg border p-2 transition-colors shrink-0 min-w-[205px] md:min-w-0 md:w-full space-y-1 ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500/70 shadow-sm'
                          : 'bg-white dark:bg-slate-900/90 hover:bg-slate-100/70 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-[11.5px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">{tpl.title}</span>
                        {isActive && (
                          <span className="text-[9.5px] text-sky-600 dark:text-sky-300 font-semibold shrink-0">
                            Đang mở
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-amber-600 dark:text-amber-300 truncate">{tpl.formula}</div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{tpl.description}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Real-Time I(t) & U(t) Recharts Monitor Widget directly below circuit simulation */}
      <RealTimeIUChartWidget
        tracePoints={tracePoints}
        focusLabel={focusComp?.label || 'Tải'}
        uNow={focusState?.vDrop ?? 0}
        iNowMa={focusState?.currentMa ?? 0}
        vVomNow={vVomDiff}
        isSimRunning={isRunning}
        onClearTrace={() => {
          historyRef.current = [];
          setSimFrame((prev) => ({ ...prev, tracePoints: [] }));
        }}
      />

      {/* Digital Storage Oscilloscope & Recharts Real-Time Waveform Deck */}
      <DigitalOscilloscopeDeck
        tracePoints={tracePoints}
        focusLabel={focusComp?.label || 'Tải'}
        vVomNow={vVomDiff}
        vCompNow={focusState?.vDrop ?? 0}
        iCompNow={focusState?.currentMa ?? 0}
        isSimRunning={isRunning}
        onClearTrace={() => {
          historyRef.current = [];
          setSimFrame((prev) => ({ ...prev, tracePoints: [] }));
        }}
        scopeOpen={scopeOpen}
        onToggleScopeOpen={() => setScopeOpen((s) => !s)}
      />

      {/* Microprocessor & Microcontroller Lab Drawer (Textbook Chapters 1-4) */}
      <MicroprocessorLabDrawer
        isOpen={mcuLabOpen}
        onClose={() => setMcuLabOpen(false)}
        isLight={isLightCanvas}
        isRunning={isRunning}
        simTime={simElapsedSec}
        components={components}
        solvedComps={solvedComps}
        onSelectMcuProgram={(compId, prog) => {
          pushUndoSnapshot();
          setComponents((prev) => prev.map((c) => (c.id === compId ? { ...c, mcuProgram: prog } : c)));
        }}
        onUpdateCompFreq={(compId, freq) => {
          setComponents((prev) => prev.map((c) => (c.id === compId ? { ...c, freq } : c)));
        }}
        onLoadPreset={handleLoadPreset}
      />

      {/* Bottom Quick-Action & Wiring Status Strip */}
      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsWireMode((w) => !w);
              setProbeMode('none');
              setWireStart(null);
              setWireDraftWaypoints([]);
              setActivePlaceType(null);
            }}
            className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
              isWireMode || wireStart
                ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500/60 text-amber-900 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:text-white'
            }`}
          >
            {wireStart
              ? 'Bấm nền để bẻ góc · Bấm lỗ/chân thứ 2 để nối...'
              : isWireMode
              ? 'Chế độ nối dây: BẬT'
              : 'Nối dây: Bấm 2 lỗ / chân'}
          </button>

          {probeMode !== 'none' && (
            <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setProbeMode('red')}
                className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap ${
                  probeMode === 'red' ? 'bg-rose-600 text-white' : 'text-rose-600 dark:text-rose-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Cắm Que + (Đỏ)
              </button>
              <button
                type="button"
                onClick={() => setProbeMode('black')}
                className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap ${
                  probeMode === 'black' ? 'bg-slate-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Cắm Que − (Đen)
              </button>
            </div>
          )}

          {/* Quick-Toggle Buttons for Any Switches or Pushbuttons Currently in the Circuit */}
          {components
            .filter((c) => c.type === 'switch' || c.type === 'pushbutton')
            .map((sw) => (
              <button
                key={sw.id}
                type="button"
                onClick={() => handleToggleSwitch(sw.id)}
                className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                  sw.value >= 0.5
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                }`}
                title="Đóng / ngắt nhanh"
              >
                {sw.value >= 0.5 ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                <span>
                  {sw.label}: {sw.value >= 0.5 ? 'ĐÓNG' : 'MỞ'}
                </span>
              </button>
            ))}
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>
            {components.length} linh kiện · {wires.length} dây nối
          </span>
          <span className="hidden md:inline text-slate-400 dark:text-slate-500">
            R: Xoay · Del: Xóa · Ctrl+Z: Hoàn tác · Space: Chạy/Dừng
          </span>
        </div>
      </div>
    </div>
  );
};
