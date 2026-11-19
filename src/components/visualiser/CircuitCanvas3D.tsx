import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BreadboardHole,
  BreadboardObj,
  CircuitComp,
  CircuitWire,
  FAULT_LABELS,
  OscilloscopeTraceData,
  PinIndex,
  PinRef,
  ProbeTarget,
  SolvedCompState,
  SolvedWireState,
  evaluateMultimeterReading,
  formatCapacitance,
  formatInductance,
  formatResistance,
  getLdrResistance,
  getPinFullName,
  getPinPosition,
  getPinRefPosition,
} from './circuitSandboxCore';
import {
  BOARD_TOP_Y,
  Breadboard3DHandles,
  ElectricSparkSystem3D,
  SVG_3D_SCALE,
  UnifiedComp3DHandles,
  buildUnifiedWireGeometry,
  createBreadboard3DMesh,
  createElectricSparkSystem3D,
  createUnifiedComp3DMesh,
  createUnifiedWorkplaneTexture,
  isCompOnBreadboard,
  svgToWorld3D,
  updateUnifiedCompVisualRuntime,
  world3DToSvg,
} from './circuit3dUnifiedModels';
import { VRGyroTracker } from './vrGyroControls';

export interface CircuitCanvas3DHandle {
  clientToSvgAtGround: (clientX: number, clientY: number) => { x: number; y: number } | null;
  hitTestDropTarget: (
    clientX: number,
    clientY: number
  ) => { svgPt: { x: number; y: number }; probeTarget: ProbeTarget | null } | null;
  previewDropTarget: (clientX: number, clientY: number, instrumentType?: 'multimeter' | 'oscilloscope') => void;
  clearDropPreview: () => void;
  setCameraPreset: (preset: '3d' | 'top' | 'reset') => void;
  zoomBy: (factor: number) => void;
  panBy: (rightDelta: number, forwardDelta: number) => void;
  recenterVR: () => void;
  triggerWireSpark: (
    svgPos: { x: number; y: number },
    yHeight: number,
    message?: string,
    intensity?: 'minor' | 'major'
  ) => void;
}

export interface CircuitCanvas3DProps {
  components: CircuitComp[];
  wires: CircuitWire[];
  breadboards: BreadboardObj[];
  solvedComps: Record<string, SolvedCompState>;
  solvedWires: Record<string, SolvedWireState>;
  nodeVoltages: Record<string, number>;
  selectedId: string | null;
  selectedWireId: string | null;
  selectedBreadboardId: string | null;
  activePlaceType: string | null;
  wireStart: PinRef | null;
  wireDraftWaypoints: { x: number; y: number }[];
  activeWireColor: string;
  hoveredPin: PinRef | null;
  hoveredHole: { bbId: string; hole: BreadboardHole } | null;
  highlightedNetKey: string | null;
  redProbe: PinRef | null;
  blackProbe: PinRef | null;
  showMultimeter: boolean;
  probeMode: 'none' | 'red' | 'black';
  showLabels: boolean;
  symbolMode: 'realistic' | 'schematic';
  isLightCanvas: boolean;
  isRunning: boolean;
  isBlindExam: boolean;
  shortWarning: boolean;
  ledOverloadWarning: boolean;
  onSelectComp: (comp: CircuitComp) => void;
  onSelectWire: (wireId: string) => void;
  onSelectBreadboard: (bbId: string) => void;
  onClearSelection: () => void;
  onPlaceAt: (svgX: number, svgY: number, initialRedTarget?: ProbeTarget | null) => void;
  onStartDragSnapshot: () => void;
  onMoveComp: (compId: string, svgX: number, svgY: number) => void;
  onMoveBreadboard: (bbId: string, svgX: number, svgY: number) => void;
  onToggleSwitchOrButton: (compId: string) => void;
  onChangePotWiper?: (compId: string, wiper: number) => void;
  onPinClick: (compId: string, pin: PinIndex) => void;
  onHoleClick: (bbId: string, hole: BreadboardHole) => void;
  onAddWireWaypoint: (svgX: number, svgY: number) => void;
  onCancelWireOrPlace: () => void;
  onHoverPin: (pin: PinRef | null) => void;
  onHoverHole: (info: { bbId: string; hole: BreadboardHole } | null) => void;
  activeMeterProbeEdit?: { meterId: string; side: 'red' | 'black' } | null;
  onSetMeterProbe?: (meterId: string, side: 'red' | 'black', target: ProbeTarget | null) => void;
  scopeTraces?: Record<string, OscilloscopeTraceData>;
  navMode?: 'orbit' | 'pan';
  vrMode?: boolean;
  vrGyroEnabled?: boolean;
  vrStereo?: boolean;
  onGyroSignalChange?: (active: boolean) => void;
}

interface Wire3DRecord {
  wire: CircuitWire;
  group: THREE.Group;
  tube: THREE.Mesh;
  tubeGeo: THREE.TubeGeometry;
  tubeMat: THREE.MeshStandardMaterial;
  bootStart: THREE.Mesh;
  bootEnd: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  beads: THREE.Mesh[];
  sig: string;
}

interface MeterProbePair3D {
  red: ReturnType<typeof buildProbeMesh>;
  black: ReturnType<typeof buildProbeMesh>;
  redLeadMesh: THREE.Mesh;
  redLeadMat: THREE.MeshStandardMaterial;
  redLeadGeo: THREE.TubeGeometry | null;
  redLeadSig: string;
  blackLeadMesh: THREE.Mesh;
  blackLeadMat: THREE.MeshStandardMaterial;
  blackLeadGeo: THREE.TubeGeometry | null;
  blackLeadSig: string;
}

// Preallocated module-level scratch math objects (zero allocations in rAF)
const _pointerNdc = new THREE.Vector2();
const _hitPoint = new THREE.Vector3();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP_Y);
const _projVec = new THREE.Vector3();
const _dirVec = new THREE.Vector3();
const _curveSample = new THREE.Vector3();
const _panForward = new THREE.Vector3();
const _panRight = new THREE.Vector3();
const _vrDeltaQuat = new THREE.Quaternion();
const _vrBaseLookQuat = new THREE.Quaternion();
const _vrBaseEyePos = new THREE.Vector3();
const _vrRenderSize = new THREE.Vector2();

function detectSoftwareWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(renderer)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

function makeCompSignature(comp: CircuitComp): string {
  return `${comp.type}|${comp.value}|${comp.freq ?? ''}|${comp.color ?? ''}|${comp.meterMode ?? ''}|${comp.mcuProgram ?? ''}|${comp.scopeTimeWindow ?? ''}|${comp.scopeVDiv ?? ''}|${Math.round((comp.wiper ?? 0.5) * 100)}`;
}

function formatCompBadgeValue(comp: CircuitComp, st?: SolvedCompState): string {
  if (comp.type === 'multimeter') return st?.extraLabel ?? (comp.meterMode === 'I' ? '0.0 mA' : '+0.00 V');
  if (comp.type === 'oscilloscope') return st?.extraLabel ?? `${comp.scopeTimeWindow ?? 2}s/màn`;
  if (comp.type === 'mcu8051') return st?.extraLabel ?? (comp.mcuProgram ?? '8051');
  if (comp.type === 'dec74138') return st?.extraLabel ?? '74LS138';
  if (comp.type === 'sevenseg') return st?.extraLabel ?? `Số ${(st?.digitalValue ?? 0).toString(16).toUpperCase()}`;
  if (comp.type === 'clockgen') return `${comp.freq ?? 1.5}Hz`;
  if (comp.type === 'source') return `${comp.value}V`;
  if (comp.type === 'ac_source') return `${comp.value}Vp`;
  if (comp.type === 'resistor') return formatResistance(comp.value);
  if (comp.type === 'ldr') return formatResistance(getLdrResistance(comp.wiper ?? 0.5));
  if (comp.type === 'pot') return `${formatResistance(comp.value)} (${Math.round((comp.wiper ?? 0.5) * 100)}%)`;
  if (comp.type === 'capacitor') return formatCapacitance(comp.value);
  if (comp.type === 'inductor') return formatInductance(comp.value);
  if (comp.type === 'zener') return `Vz=${comp.value}V`;
  if (comp.type === 'bjt') return `β=${comp.value}`;
  if (comp.type === 'opamp') return `±${comp.value}V`;
  if (comp.type === 'switch' || comp.type === 'pushbutton') return comp.value >= 0.5 ? 'ĐÓNG' : 'MỞ';
  if (comp.type === 'motor') return st?.extraLabel ?? 'Motor';
  if (comp.type === 'buzzer') return st?.extraLabel ?? 'Còi';
  return `${comp.value}V`;
}

function buildProbeMesh(
  isRed: boolean,
  hitTag?: { meterId: string; side: 'red' | 'black' }
): {
  group: THREE.Group;
  hitMeshes: THREE.Object3D[];
  dispose: () => void;
} {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const hitMeshes: THREE.Object3D[] = [];

  const tipGeo = new THREE.ConeGeometry(0.06, 0.34, 14);
  tipGeo.rotateX(Math.PI);
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.y = 0.17;

  const collarGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.85, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isRed ? 0xdc2626 : 0x1e293b,
    roughness: 0.36,
    metalness: 0.12,
  });
  const collar = new THREE.Mesh(collarGeo, bodyMat);
  collar.position.y = 0.74;

  const capGeo = new THREE.SphereGeometry(0.115, 14, 14);
  const cap = new THREE.Mesh(capGeo, bodyMat);
  cap.position.y = 1.18;

  const haloGeo = new THREE.RingGeometry(0.14, 0.22, 24);
  const haloMat = new THREE.MeshBasicMaterial({
    color: isRed ? 0xef4444 : 0x64748b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = isRed ? -0.28 : 0.28;
  tiltGroup.rotation.x = 0.15;
  tiltGroup.add(tip, collar, cap);

  if (hitTag) {
    const grabGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.35, 10);
    const grabMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const grab = new THREE.Mesh(grabGeo, grabMat);
    grab.position.y = 0.65;
    grab.userData = { hitKind: 'mm_probe', meterId: hitTag.meterId, side: hitTag.side };
    tiltGroup.add(grab);
    hitMeshes.push(grab, collar, cap, tip);
    [collar, cap, tip].forEach((m) => {
      m.userData = { hitKind: 'mm_probe', meterId: hitTag.meterId, side: hitTag.side };
    });
    geos.push(grabGeo);
    mats.push(grabMat);
  }

  group.add(halo, tiltGroup);

  geos.push(tipGeo, collarGeo, capGeo, haloGeo);
  mats.push(tipMat, bodyMat, haloMat);

  return {
    group,
    hitMeshes,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export const CircuitCanvas3D = React.forwardRef<CircuitCanvas3DHandle, CircuitCanvas3DProps>(
  function CircuitCanvas3D(props, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const labelLayerRef = useRef<HTMLDivElement | null>(null);
    const labelDomMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const [contextLost, setContextLost] = useState(false);
    const [probeHoverText, setProbeHoverText] = useState<string | null>(null);
    const [sparkNotice, setSparkNotice] = useState<{ text: string; intensity: 'minor' | 'major' } | null>(null);
    const sparkNoticeTimerRef = useRef<number | null>(null);
    const spaceHeldRef = useRef(false);
    const vrRecenterPendingRef = useRef(false);

    // Keep latest props in a ref so the Three.js loop & pointer handlers never go stale
    const propsRef = useRef(props);
    propsRef.current = props;

    const threeRef = useRef<{
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
      controls: OrbitControls;
      maxAnisotropy: number;
      isSoftwareGl: boolean;
      workplaneMesh: THREE.Mesh;
      workplaneMat: THREE.MeshStandardMaterial;
      workplaneTexLight: THREE.CanvasTexture;
      workplaneTexDark: THREE.CanvasTexture;
      bbMap: Map<string, Breadboard3DHandles>;
      compMap: Map<string, { handle: UnifiedComp3DHandles; specSig: string }>;
      wireMap: Map<string, Wire3DRecord>;
      meterProbeMap: Map<string, MeterProbePair3D>;
      sparkSystem: ElectricSparkSystem3D;
      snapRingMesh: THREE.Mesh;
      draftGroup: THREE.Group;
      draftTube: THREE.Mesh | null;
      draftMat: THREE.MeshBasicMaterial;
      bootGeo: THREE.CylinderGeometry;
      beadGeo: THREE.SphereGeometry;
      beadMat: THREE.MeshBasicMaterial;
      redProbeMesh: ReturnType<typeof buildProbeMesh>;
      blackProbeMesh: ReturnType<typeof buildProbeMesh>;
      cursor3DSvg: { x: number; y: number; yHeight: number };
      raycaster: THREE.Raycaster;
      dragState:
        | null
        | {
            kind: 'component';
            id: string;
            offsetSvgX: number;
            offsetSvgY: number;
            baseY: number;
            startClientX: number;
            startClientY: number;
            hasMoved: boolean;
            snapshotPushed: boolean;
          }
        | {
            kind: 'breadboard';
            id: string;
            offsetSvgX: number;
            offsetSvgY: number;
            startClientX: number;
            startClientY: number;
            hasMoved: boolean;
            snapshotPushed: boolean;
          }
        | {
            kind: 'mm_probe';
            meterId: string;
            side: 'red' | 'black';
            lastTargetKey: string;
            snapshotPushed: boolean;
          }
        | {
            kind: 'pot_knob';
            compId: string;
            startClientX: number;
            startWiper: number;
            hasMoved: boolean;
            snapshotPushed: boolean;
          };
      syncWorldFromProps: () => void;
    } | null>(null);

    const projectClientToPlaneSvg = (clientX: number, clientY: number, yHeight = 0) => {
      const ctx = threeRef.current;
      const el = containerRef.current;
      if (!ctx || !el) return null;
      const rect = el.getBoundingClientRect();
      _pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      ctx.raycaster.setFromCamera(_pointerNdc, ctx.camera);
      const plane = yHeight > 0.1 ? _boardPlane : _groundPlane;
      if (!ctx.raycaster.ray.intersectPlane(plane, _hitPoint)) return null;
      return world3DToSvg(_hitPoint.x, _hitPoint.z);
    };

    const findProbeSnapAtClient = (
      clientX: number,
      clientY: number,
      excludeMeterId?: string
    ): { target: ProbeTarget | null; worldPt: THREE.Vector3; label: string } | null => {
      const ctx = threeRef.current;
      const el = containerRef.current;
      const cur = propsRef.current;
      if (!ctx || !el) return null;
      const rect = el.getBoundingClientRect();
      _pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      ctx.raycaster.setFromCamera(_pointerNdc, ctx.camera);

      // 1. Pins (excluding multimeter's own terminals if dragging its own probe)
      const pinTargets: THREE.Object3D[] = [];
      ctx.compMap.forEach((entry, cid) => {
        if (cid === excludeMeterId) return;
        entry.handle.pinProxies.forEach((p) => pinTargets.push(p.mesh));
      });
      const pinHits = ctx.raycaster.intersectObjects(pinTargets, false);
      if (pinHits.length > 0) {
        const ud = pinHits[0].object.userData;
        const compId = String(ud.compId);
        const pin = ud.pin as PinIndex;
        const comp = cur.components.find((c) => c.id === compId);
        return {
          target: { kind: 'pin', compId, pin },
          worldPt: pinHits[0].point.clone(),
          label: comp ? `${comp.label} · ${getPinFullName(comp.type, pin)}` : 'Chân linh kiện',
        };
      }

      // 2. Breadboard hole sockets
      for (const [bbId, h] of ctx.bbMap.entries()) {
        const holeHits = ctx.raycaster.intersectObject(h.holeSocketsMesh, false);
        if (holeHits.length > 0 && holeHits[0].instanceId !== undefined) {
          const hole = h.holes[holeHits[0].instanceId];
          if (hole) {
            return {
              target: { kind: 'hole', bbId, holeId: hole.holeId },
              worldPt: holeHits[0].point.clone(),
              label: hole.label,
            };
          }
        }
      }

      // 3. Any point along any 3D wire (exact tube hit + ray-to-curve proximity fallback so thin wires never miss)
      const wireTargets: THREE.Object3D[] = [];
      ctx.wireMap.forEach((rec) => wireTargets.push(rec.tube));
      const wireHits = ctx.raycaster.intersectObjects(wireTargets, false);
      if (wireHits.length > 0) {
        const wireId = String(wireHits[0].object.userData.wireId);
        const rec = ctx.wireMap.get(wireId);
        if (rec) {
          const hitP = wireHits[0].point;
          let bestU = 0.5;
          let bestD2 = Infinity;
          const STEPS = 28;
          for (let i = 0; i <= STEPS; i++) {
            const u = i / STEPS;
            rec.curve.getPointAt(u, _curveSample);
            const d2 = _curveSample.distanceToSquared(hitP);
            if (d2 < bestD2) {
              bestD2 = d2;
              bestU = u;
            }
          }
          const lo = Math.max(0, bestU - 1 / STEPS);
          const hi = Math.min(1, bestU + 1 / STEPS);
          for (let i = 0; i <= 8; i++) {
            const u = lo + ((hi - lo) * i) / 8;
            rec.curve.getPointAt(u, _curveSample);
            const d2 = _curveSample.distanceToSquared(hitP);
            if (d2 < bestD2) {
              bestD2 = d2;
              bestU = u;
            }
          }
          const roundedT = Math.round(bestU * 100) / 100;
          rec.curve.getPointAt(roundedT, _curveSample);
          return {
            target: { kind: 'wire', wireId, t: roundedT },
            worldPt: _curveSample.clone(),
            label: `Dây dẫn (${Math.round(roundedT * 100)}%)`,
          };
        }
      }

      // Ray-to-curve proximity fallback for thin 3D wires (radius <= 0.28 world units)
      let closestWireId: string | null = null;
      let closestU = 0.5;
      let closestDistSq = 0.28 * 0.28;
      let closestPt: THREE.Vector3 | null = null;
      ctx.wireMap.forEach((rec, wireId) => {
        const STEPS = 20;
        for (let i = 0; i <= STEPS; i++) {
          const u = i / STEPS;
          rec.curve.getPointAt(u, _curveSample);
          const d2 = ctx.raycaster.ray.distanceSqToPoint(_curveSample);
          if (d2 < closestDistSq) {
            closestDistSq = d2;
            closestWireId = wireId;
            closestU = u;
            closestPt = _curveSample.clone();
          }
        }
      });
      if (closestWireId && closestPt) {
        const roundedT = Math.round(closestU * 100) / 100;
        const rec = ctx.wireMap.get(closestWireId);
        if (rec) {
          rec.curve.getPointAt(roundedT, _curveSample);
          return {
            target: { kind: 'wire', wireId: closestWireId, t: roundedT },
            worldPt: _curveSample.clone(),
            label: `Dây dẫn (${Math.round(roundedT * 100)}%)`,
          };
        }
      }

      // 4. Any component body (excluding multimeters & oscilloscopes)
      const compTargets: THREE.Object3D[] = [];
      ctx.compMap.forEach((entry, cid) => {
        if (cid === excludeMeterId) return;
        const c = cur.components.find((x) => x.id === cid);
        if (!c || c.type === 'multimeter' || c.type === 'oscilloscope') return;
        entry.handle.root.traverse((obj) => {
          if (obj.userData?.hitKind === 'component' || obj.userData?.hitKind === 'toggle') {
            compTargets.push(obj);
          }
        });
      });
      const compHits = ctx.raycaster.intersectObjects(compTargets, false);
      if (compHits.length > 0) {
        const compId = String(compHits[0].object.userData.compId);
        const comp = cur.components.find((c) => c.id === compId);
        if (comp) {
          return {
            target: { kind: 'component', compId },
            worldPt: compHits[0].point.clone(),
            label: comp.label,
          };
        }
      }

      // 5. Fallback workplane / breadboard
      const bbTargets: THREE.Object3D[] = [];
      ctx.bbMap.forEach((h) => bbTargets.push(h.hitBody));
      const bbHits = ctx.raycaster.intersectObjects(bbTargets, false);
      if (bbHits.length > 0) {
        const bbId = String(bbHits[0].object.userData.bbId);
        const bbHandle = ctx.bbMap.get(bbId);
        if (bbHandle) {
          const ptSvg = world3DToSvg(bbHits[0].point.x, bbHits[0].point.z);
          let bestHole: BreadboardHole | null = null;
          let bestDist = 24;
          for (const h of bbHandle.holes) {
            const d = Math.hypot(h.x - ptSvg.x, h.y - ptSvg.y);
            if (d < bestDist) {
              bestDist = d;
              bestHole = h;
            }
          }
          if (bestHole) {
            return {
              target: { kind: 'hole', bbId, holeId: bestHole.holeId },
              worldPt: bbHits[0].point.clone(),
              label: bestHole.label,
            };
          }
        }
      }

      if (ctx.raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        return { target: null, worldPt: _hitPoint.clone(), label: 'Thả về vị trí chờ' };
      }
      return null;
    };

    useImperativeHandle(ref, () => ({
      clientToSvgAtGround: (clientX, clientY) => {
        const overBoard = propsRef.current.breadboards.length > 0;
        const p = projectClientToPlaneSvg(clientX, clientY, overBoard ? BOARD_TOP_Y : 0);
        return p;
      },
      hitTestDropTarget: (clientX, clientY) => {
        const overBoard = propsRef.current.breadboards.length > 0;
        const snapHit = findProbeSnapAtClient(clientX, clientY);
        const svgPt =
          snapHit && snapHit.target
            ? world3DToSvg(snapHit.worldPt.x, snapHit.worldPt.z)
            : projectClientToPlaneSvg(clientX, clientY, overBoard ? BOARD_TOP_Y : 0) ?? { x: 460, y: 260 };
        return { svgPt, probeTarget: snapHit?.target ?? null };
      },
      previewDropTarget: (clientX, clientY, instrumentType = 'multimeter') => {
        const ctx = threeRef.current;
        if (!ctx) return;
        const snapHit = findProbeSnapAtClient(clientX, clientY);
        const prefix = instrumentType === 'oscilloscope' ? 'Thả Máy hiện sóng vào' : 'Thả Đồng hồ 3D đo tại';
        if (snapHit && snapHit.target) {
          ctx.snapRingMesh.position.set(snapHit.worldPt.x, snapHit.worldPt.y + 0.05, snapHit.worldPt.z);
          ctx.snapRingMesh.visible = true;
          setProbeHoverText(`${prefix}: ${snapHit.label}`);
        } else {
          ctx.snapRingMesh.visible = false;
          setProbeHoverText(
            instrumentType === 'oscilloscope'
              ? 'Thả lên dây dẫn / linh kiện để đo sóng V(t)'
              : 'Thả lên dây dẫn / linh kiện để đo V hoặc I'
          );
        }
      },
      clearDropPreview: () => {
        const ctx = threeRef.current;
        if (ctx) ctx.snapRingMesh.visible = false;
        setProbeHoverText(null);
      },
      setCameraPreset: (preset) => {
        const ctx = threeRef.current;
        if (!ctx) return;
        if (preset === 'top') {
          ctx.camera.position.set(0, 34, 0.01);
          ctx.controls.target.set(0, 0, 0);
        } else {
          ctx.camera.position.set(0, 22, 23);
          ctx.controls.target.set(0, 0.2, 0);
        }
        ctx.controls.update();
      },
      zoomBy: (factor) => {
        const ctx = threeRef.current;
        if (!ctx) return;
        _dirVec.copy(ctx.camera.position).sub(ctx.controls.target);
        const curDist = _dirVec.length();
        const nextDist = THREE.MathUtils.clamp(curDist * factor, 8, 56);
        _dirVec.normalize().multiplyScalar(nextDist);
        ctx.camera.position.copy(ctx.controls.target).add(_dirVec);
        ctx.controls.update();
      },
      panBy: (rightDelta, forwardDelta) => {
        const ctx = threeRef.current;
        if (!ctx) return;
        _panForward.copy(ctx.controls.target).sub(ctx.camera.position);
        _panForward.y = 0;
        if (_panForward.lengthSq() < 1e-6) {
          _panForward.set(0, 0, -1);
        } else {
          _panForward.normalize();
        }
        _panRight.set(-_panForward.z, 0, _panForward.x);
        _dirVec
          .set(0, 0, 0)
          .addScaledVector(_panRight, rightDelta)
          .addScaledVector(_panForward, forwardDelta);
        const prevX = ctx.controls.target.x;
        const prevZ = ctx.controls.target.z;
        const nextX = THREE.MathUtils.clamp(prevX + _dirVec.x, -26, 26);
        const nextZ = THREE.MathUtils.clamp(prevZ + _dirVec.z, -18, 18);
        const dx = nextX - prevX;
        const dz = nextZ - prevZ;
        ctx.controls.target.x = nextX;
        ctx.controls.target.z = nextZ;
        ctx.camera.position.x += dx;
        ctx.camera.position.z += dz;
        ctx.controls.update();
      },
      recenterVR: () => {
        const ctx = threeRef.current;
        if (!ctx) return;
        ctx.camera.position.set(0, 17, 19);
        ctx.controls.target.set(0, 0.2, 0);
        ctx.camera.lookAt(ctx.controls.target);
        ctx.controls.update();
        _vrBaseLookQuat.copy(ctx.camera.quaternion);
        _vrBaseEyePos.copy(ctx.camera.position);
        vrRecenterPendingRef.current = true;
      },
      triggerWireSpark: (svgPos, yHeight, message, intensity = 'minor') => {
        const ctx = threeRef.current;
        if (ctx) {
          const w3 = svgToWorld3D(svgPos.x, svgPos.y);
          const floorY = yHeight > 0.2 ? BOARD_TOP_Y + 0.02 : 0.02;
          ctx.sparkSystem.spawnBurst(w3.wx, yHeight, w3.wz, intensity, floorY);
        }
        if (message) {
          if (sparkNoticeTimerRef.current !== null) {
            clearTimeout(sparkNoticeTimerRef.current);
          }
          setSparkNotice({ text: message, intensity });
          sparkNoticeTimerRef.current = window.setTimeout(() => {
            setSparkNotice(null);
            sparkNoticeTimerRef.current = null;
          }, 2600);
        }
      },
    }));

    // Initialize Three.js WebGL Stage
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const probeCanvas = document.createElement('canvas');
      const isSoftwareGl = detectSoftwareWebGL(probeCanvas);
      const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(dpr);
      renderer.setSize(container.clientWidth || 640, container.clientHeight || 480);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isSoftwareGl ? 1.0 : 1.05;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      container.insertBefore(renderer.domElement, container.firstChild);

      const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

      const scene = new THREE.Scene();
      const initBg = propsRef.current.isLightCanvas ? 0xeef2f6 : 0x070b14;
      scene.background = new THREE.Color(initBg);
      scene.fog = new THREE.Fog(initBg, 46, 110);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTarget = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.65;

      const camera = new THREE.PerspectiveCamera(
        42,
        (container.clientWidth || 640) / (container.clientHeight || 480),
        0.1,
        180
      );
      camera.position.set(0, 22, 23);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = true;
      controls.screenSpacePanning = false;
      controls.panSpeed = 1.15;
      controls.enableRotate = true;
      controls.minDistance = 8;
      controls.maxDistance = 58;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.mouseButtons = {
        LEFT: propsRef.current.navMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.touches = {
        ONE: propsRef.current.navMode === 'pan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
      controls.target.set(0, 0.2, 0);
      controls.update();

      const stereoCamera = new THREE.StereoCamera();
      stereoCamera.aspect = 0.5;
      stereoCamera.eyeSep = 0.064;
      const vrGyroTracker = new VRGyroTracker();
      vrGyroTracker.start(() => {
        propsRef.current.onGyroSignalChange?.(true);
      });
      let wasVrGyroActive = false;

      let shiftHeld = false;
      let pointerInsideCanvas = false;

      const applyHorizontalPan = (rightDelta: number, forwardDelta: number) => {
        _panForward.copy(controls.target).sub(camera.position);
        _panForward.y = 0;
        if (_panForward.lengthSq() < 1e-6) {
          _panForward.set(0, 0, -1);
        } else {
          _panForward.normalize();
        }
        _panRight.set(-_panForward.z, 0, _panForward.x);
        _dirVec
          .set(0, 0, 0)
          .addScaledVector(_panRight, rightDelta)
          .addScaledVector(_panForward, forwardDelta);
        const prevX = controls.target.x;
        const prevZ = controls.target.z;
        const nextX = THREE.MathUtils.clamp(prevX + _dirVec.x, -26, 26);
        const nextZ = THREE.MathUtils.clamp(prevZ + _dirVec.z, -18, 18);
        const dx = nextX - prevX;
        const dz = nextZ - prevZ;
        controls.target.x = nextX;
        controls.target.z = nextZ;
        camera.position.x += dx;
        camera.position.z += dz;
      };

      const handlePointerEnterCanvas = () => {
        pointerInsideCanvas = true;
      };
      const handlePointerLeaveCanvas = () => {
        pointerInsideCanvas = false;
      };
      const handleWheelPan = (e: WheelEvent) => {
        if (e.ctrlKey) return;
        const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0.5;
        const isShiftWheel = e.shiftKey && (Math.abs(e.deltaX) > 0.5 || Math.abs(e.deltaY) > 0.5);
        if (!isHorizontalSwipe && !isShiftWheel) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const dist = camera.position.distanceTo(controls.target);
        const scale = dist * 0.0015;
        const panRightAmt = (isShiftWheel && Math.abs(e.deltaX) < 0.5 ? e.deltaY : e.deltaX) * scale;
        const panForwardAmt = isHorizontalSwipe ? -e.deltaY * scale * 0.45 : 0;
        applyHorizontalPan(panRightAmt, panForwardAmt);
      };
      const isTextFocused = () => {
        const ae = document.activeElement as HTMLElement | null;
        if (!ae) return false;
        const tag = ae.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae.isContentEditable;
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (isTextFocused()) return;
        if (e.key === 'Shift') shiftHeld = true;
        if (e.code === 'Space' && pointerInsideCanvas) {
          spaceHeldRef.current = true;
          e.preventDefault();
        }
        if (!pointerInsideCanvas) return;
        const step = e.shiftKey ? 2.8 : 1.5;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          applyHorizontalPan(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          applyHorizontalPan(step, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          applyHorizontalPan(0, step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          applyHorizontalPan(0, -step);
        }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift') shiftHeld = false;
        if (e.code === 'Space') spaceHeldRef.current = false;
      };
      const handleWindowBlur = () => {
        shiftHeld = false;
        spaceHeldRef.current = false;
        pointerInsideCanvas = false;
      };

      renderer.domElement.addEventListener('pointerenter', handlePointerEnterCanvas);
      renderer.domElement.addEventListener('pointerleave', handlePointerLeaveCanvas);
      renderer.domElement.addEventListener('wheel', handleWheelPan, { passive: false, capture: true });
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('blur', handleWindowBlur);

      // 3-Point Studio Lighting
      const hemi = new THREE.HemisphereLight(0xf8fafc, 0x334155, 0.95);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
      keyLight.position.set(16, 28, 18);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 4;
        keyLight.shadow.camera.far = 75;
        keyLight.shadow.camera.left = -28;
        keyLight.shadow.camera.right = 28;
        keyLight.shadow.camera.top = 20;
        keyLight.shadow.camera.bottom = -20;
        keyLight.shadow.bias = -0.0005;
      }
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.55);
      rimLight.position.set(-18, 12, -14);
      scene.add(rimLight);

      // Drafting Workplane Mat
      const workplaneTexLight = createUnifiedWorkplaneTexture(false, maxAnisotropy);
      const workplaneTexDark = createUnifiedWorkplaneTexture(true, maxAnisotropy);
      const workplaneGeo = new THREE.PlaneGeometry(SVG_3D_SCALE * 960 * 1.45, SVG_3D_SCALE * 540 * 1.6);
      const workplaneMat = new THREE.MeshStandardMaterial({
        map: propsRef.current.isLightCanvas ? workplaneTexLight : workplaneTexDark,
        roughness: 0.92,
        metalness: 0.02,
      });
      const workplaneMesh = new THREE.Mesh(workplaneGeo, workplaneMat);
      workplaneMesh.rotation.x = -Math.PI / 2;
      workplaneMesh.position.y = -0.02;
      workplaneMesh.receiveShadow = true;
      workplaneMesh.userData = { hitKind: 'workplane' };
      scene.add(workplaneMesh);

      const draftGroup = new THREE.Group();
      scene.add(draftGroup);
      const draftMat = new THREE.MeshBasicMaterial({
        color: propsRef.current.activeWireColor,
        transparent: true,
        opacity: 0.78,
      });
      const bootGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.14, 12);
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });
      const beadGeo = new THREE.SphereGeometry(0.085, 10, 10);
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      const redProbeMesh = buildProbeMesh(true);
      const blackProbeMesh = buildProbeMesh(false);
      redProbeMesh.group.visible = false;
      blackProbeMesh.group.visible = false;
      scene.add(redProbeMesh.group, blackProbeMesh.group);

      const snapRingGeo = new THREE.RingGeometry(0.18, 0.3, 28);
      const snapRingMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      });
      const snapRingMesh = new THREE.Mesh(snapRingGeo, snapRingMat);
      snapRingMesh.rotation.x = -Math.PI / 2;
      snapRingMesh.visible = false;
      scene.add(snapRingMesh);

      const sparkSystem = createElectricSparkSystem3D(maxAnisotropy);
      scene.add(sparkSystem.group);

      const bbMap = new Map<string, Breadboard3DHandles>();
      const compMap = new Map<string, { handle: UnifiedComp3DHandles; specSig: string }>();
      const wireMap = new Map<string, Wire3DRecord>();
      const meterProbeMap = new Map<string, MeterProbePair3D>();

      const getPinWorldY = (refObj: PinRef, comps: CircuitComp[], bbs: BreadboardObj[]): number => {
        if (refObj.holeId) return BOARD_TOP_Y + 0.03;
        const c = comps.find((x) => x.id === refObj.compId);
        if (!c) return 0.05;
        return isCompOnBreadboard(c, bbs) ? BOARD_TOP_Y + 0.03 : 0.05;
      };

      const syncWorldFromProps = () => {
        const cur = propsRef.current;

        // 1. Theme Sync
        const bgHex = cur.isLightCanvas ? 0xeef2f6 : 0x070b14;
        if ((scene.background as THREE.Color).getHex() !== bgHex) {
          (scene.background as THREE.Color).setHex(bgHex);
          if (scene.fog instanceof THREE.Fog) scene.fog.color.setHex(bgHex);
        }
        const targetMap = cur.isLightCanvas ? workplaneTexLight : workplaneTexDark;
        if (workplaneMat.map !== targetMap) {
          workplaneMat.map = targetMap;
          workplaneMat.needsUpdate = true;
        }

        // 2. Sync Breadboards
        const aliveBb = new Set(cur.breadboards.map((b) => b.id));
        bbMap.forEach((h, id) => {
          if (!aliveBb.has(id)) {
            scene.remove(h.root);
            h.dispose();
            bbMap.delete(id);
          }
        });
        cur.breadboards.forEach((bb) => {
          let h = bbMap.get(bb.id);
          if (!h || h.holes.length !== bb.cols * 14) {
            if (h) {
              scene.remove(h.root);
              h.dispose();
            }
            h = createBreadboard3DMesh(bb, { maxAnisotropy });
            scene.add(h.root);
            bbMap.set(bb.id, h);
          } else {
            const wPos = svgToWorld3D(bb.x, bb.y);
            h.root.position.set(wPos.wx, 0, wPos.wz);
          }
          h.selectionOutline.visible = cur.selectedBreadboardId === bb.id;
          h.updateHoleHighlights(
            cur.highlightedNetKey,
            cur.hoveredHole?.bbId === bb.id ? cur.hoveredHole.hole.holeId : null,
            cur.wireStart?.compId === bb.id ? cur.wireStart.holeId ?? null : null
          );
        });

        // 3. Sync Components (all 17 types)
        const aliveComp = new Set(cur.components.map((c) => c.id));
        compMap.forEach((entry, id) => {
          if (!aliveComp.has(id)) {
            scene.remove(entry.handle.root);
            entry.handle.dispose();
            compMap.delete(id);
            const dom = labelDomMapRef.current.get(id);
            if (dom) {
              dom.remove();
              labelDomMapRef.current.delete(id);
            }
          }
        });

        cur.components.forEach((comp) => {
          const overBoard = isCompOnBreadboard(comp, cur.breadboards);
          const nextSig = makeCompSignature(comp);
          let entry = compMap.get(comp.id);
          if (
            !entry ||
            entry.handle.root.userData.compType !== comp.type ||
            entry.handle.root.userData.symbolMode !== cur.symbolMode ||
            (cur.symbolMode === 'schematic' && entry.handle.root.userData.isLightCanvas !== cur.isLightCanvas)
          ) {
            if (entry) {
              scene.remove(entry.handle.root);
              entry.handle.dispose();
            }
            const handle = createUnifiedComp3DMesh(comp, overBoard, {
              isSoftwareGl,
              maxAnisotropy,
              symbolMode: cur.symbolMode,
              isLightCanvas: cur.isLightCanvas,
            });
            handle.root.userData.compType = comp.type;
            handle.root.userData.symbolMode = cur.symbolMode;
            handle.root.userData.isLightCanvas = cur.isLightCanvas;
            scene.add(handle.root);
            entry = { handle, specSig: nextSig };
            compMap.set(comp.id, entry);
          } else {
            const pos3 = svgToWorld3D(comp.x, comp.y);
            const targetBaseY = overBoard ? BOARD_TOP_Y : 0;
            entry.handle.baseY = targetBaseY;
            entry.handle.root.position.set(pos3.wx, targetBaseY, pos3.wz);
            entry.handle.root.rotation.y =
              comp.type === 'ground' ? 0 : -THREE.MathUtils.degToRad(comp.rotation);
            if (entry.specSig !== nextSig) {
              entry.handle.updateDynamicSpec?.(comp, maxAnisotropy);
              entry.specSig = nextSig;
            }
          }

          entry.handle.selectionRing.visible = cur.selectedId === comp.id;
          entry.handle.pinProxies.forEach(({ pin, halo }) => {
            const isStart = cur.wireStart?.compId === comp.id && cur.wireStart?.pin === pin && !cur.wireStart.holeId;
            const isHover = cur.hoveredPin?.compId === comp.id && cur.hoveredPin?.pin === pin;
            const mat = halo.material as THREE.MeshBasicMaterial;
            if (isStart) {
              mat.color.setHex(0xf59e0b);
              mat.opacity = 0.9;
            } else if (isHover) {
              mat.color.setHex(0x10b981);
              mat.opacity = 0.85;
            } else {
              mat.opacity = 0;
            }
          });
        });

        // 4. Sync 3D Wires
        const aliveWires = new Set(cur.wires.map((w) => w.id));
        wireMap.forEach((rec, id) => {
          if (!aliveWires.has(id)) {
            scene.remove(rec.group);
            rec.tubeGeo.dispose();
            rec.tubeMat.dispose();
            wireMap.delete(id);
          }
        });

        cur.wires.forEach((w, wIdx) => {
          const pA = getPinRefPosition(w.from, cur.components, cur.breadboards);
          const pB = getPinRefPosition(w.to, cur.components, cur.breadboards);
          if (!pA || !pB) return;
          const yA = getPinWorldY(w.from, cur.components, cur.breadboards);
          const yB = getPinWorldY(w.to, cur.components, cur.breadboards);
          const wpStr = w.waypoints ? w.waypoints.map((pt) => `${pt.x},${pt.y}`).join(';') : '';
          const geoSig = `${pA.x},${pA.y},${yA}|${pB.x},${pB.y},${yB}|${wpStr}`;
          const wireHex = w.color || '#16a34a';
          const isSel = cur.selectedWireId === w.id;

          let rec = wireMap.get(w.id);
          if (!rec) {
            const group = new THREE.Group();
            const built = buildUnifiedWireGeometry(pA, yA, pB, yB, w.waypoints, (wIdx % 4) * 0.08);
            const tubeMat = new THREE.MeshStandardMaterial({
              color: wireHex,
              roughness: 0.36,
              metalness: 0.06,
              emissive: isSel ? 0xf59e0b : 0x000000,
              emissiveIntensity: isSel ? 0.45 : 0,
            });
            const tube = new THREE.Mesh(built.geometry, tubeMat);
            tube.castShadow = true;
            tube.userData = { hitKind: 'wire', wireId: w.id };

            const bootStart = new THREE.Mesh(bootGeo, bootMat);
            const bootEnd = new THREE.Mesh(bootGeo, bootMat);
            const a3 = svgToWorld3D(pA.x, pA.y);
            const b3 = svgToWorld3D(pB.x, pB.y);
            bootStart.position.set(a3.wx, yA + 0.04, a3.wz);
            bootEnd.position.set(b3.wx, yB + 0.04, b3.wz);
            group.add(tube, bootStart, bootEnd);

            const beads: THREE.Mesh[] = [];
            for (let b = 0; b < 4; b++) {
              const bead = new THREE.Mesh(beadGeo, beadMat);
              bead.visible = false;
              group.add(bead);
              beads.push(bead);
            }

            scene.add(group);
            wireMap.set(w.id, {
              wire: w,
              group,
              tube,
              tubeGeo: built.geometry,
              tubeMat,
              bootStart,
              bootEnd,
              curve: built.curve,
              beads,
              sig: geoSig,
            });
          } else {
            rec.wire = w;
            rec.tubeMat.color.set(wireHex);
            rec.tubeMat.emissive.setHex(isSel ? 0xf59e0b : 0x000000);
            rec.tubeMat.emissiveIntensity = isSel ? 0.45 : 0;
            if (rec.sig !== geoSig) {
              const rebuilt = buildUnifiedWireGeometry(pA, yA, pB, yB, w.waypoints, (wIdx % 4) * 0.08);
              rec.tube.geometry = rebuilt.geometry;
              rec.tubeGeo.dispose();
              rec.tubeGeo = rebuilt.geometry;
              rec.curve = rebuilt.curve;
              const a3 = svgToWorld3D(pA.x, pA.y);
              const b3 = svgToWorld3D(pB.x, pB.y);
              rec.bootStart.position.set(a3.wx, yA + 0.04, a3.wz);
              rec.bootEnd.position.set(b3.wx, yB + 0.04, b3.wz);
              rec.sig = geoSig;
            }
          }
        });

        // 5. Sync Live Draft Wire Preview
        while (draftGroup.children.length > 0) {
          const ch = draftGroup.children[0] as THREE.Mesh;
          draftGroup.remove(ch);
          ch.geometry.dispose();
        }
        if (cur.wireStart) {
          const pA = getPinRefPosition(cur.wireStart, cur.components, cur.breadboards);
          const curCtx = threeRef.current;
          if (pA && curCtx) {
            const yA = getPinWorldY(cur.wireStart, cur.components, cur.breadboards);
            const yB = curCtx.cursor3DSvg.yHeight;
            draftMat.color.set(cur.activeWireColor);
            const built = buildUnifiedWireGeometry(
              pA,
              yA,
              { x: curCtx.cursor3DSvg.x, y: curCtx.cursor3DSvg.y },
              yB,
              cur.wireDraftWaypoints,
              0.18
            );
            const previewTube = new THREE.Mesh(built.geometry, draftMat);
            draftGroup.add(previewTube);
          }
        }

        // 6. Sync 3D Multimeter Probes
        if (cur.showMultimeter && cur.redProbe) {
          const pos = getPinRefPosition(cur.redProbe, cur.components, cur.breadboards);
          if (pos) {
            const w3 = svgToWorld3D(pos.x, pos.y);
            const y = getPinWorldY(cur.redProbe, cur.components, cur.breadboards);
            redProbeMesh.group.position.set(w3.wx, y + 0.02, w3.wz);
            redProbeMesh.group.visible = true;
          } else {
            redProbeMesh.group.visible = false;
          }
        } else {
          redProbeMesh.group.visible = false;
        }

        if (cur.showMultimeter && cur.blackProbe) {
          const pos = getPinRefPosition(cur.blackProbe, cur.components, cur.breadboards);
          if (pos) {
            const w3 = svgToWorld3D(pos.x, pos.y);
            const y = getPinWorldY(cur.blackProbe, cur.components, cur.breadboards);
            blackProbeMesh.group.position.set(w3.wx, y + 0.02, w3.wz);
            blackProbeMesh.group.visible = true;
          } else {
            blackProbeMesh.group.visible = false;
          }
        } else {
          blackProbeMesh.group.visible = false;
        }
        // 7. Sync 3D Multimeter & Oscilloscope Draggable Test Probes & Leads
        const aliveMeters = new Set(
          cur.components
            .filter((c) => c.type === 'multimeter' || c.type === 'oscilloscope')
            .map((c) => c.id)
        );
        meterProbeMap.forEach((pair, id) => {
          if (!aliveMeters.has(id)) {
            scene.remove(pair.red.group, pair.black.group, pair.redLeadMesh, pair.blackLeadMesh);
            pair.red.dispose();
            pair.black.dispose();
            pair.redLeadGeo?.dispose();
            pair.blackLeadGeo?.dispose();
            pair.redLeadMat.dispose();
            pair.blackLeadMat.dispose();
            meterProbeMap.delete(id);
          }
        });

        const resolveProbeWorld = (
          meter: CircuitComp,
          target: ProbeTarget | null | undefined,
          side: 'red' | 'black'
        ): THREE.Vector3 => {
          if (target) {
            if (target.kind === 'wire') {
              const rec = wireMap.get(target.wireId);
              if (rec) {
                const pt = rec.curve.getPointAt(Math.max(0, Math.min(1, target.t)));
                return pt.add(new THREE.Vector3(0, 0.03, 0));
              }
            } else if (target.kind === 'component') {
              const tc = cur.components.find((x) => x.id === target.compId);
              if (tc) {
                const w3 = svgToWorld3D(tc.x, tc.y);
                const over = isCompOnBreadboard(tc, cur.breadboards);
                const hOffset = tc.type === 'capacitor' ? 1.15 : tc.type === 'led' ? 0.95 : 0.48;
                return new THREE.Vector3(w3.wx, (over ? BOARD_TOP_Y : 0) + hOffset, w3.wz);
              }
            } else if (target.kind === 'pin') {
              const tc = cur.components.find((x) => x.id === target.compId);
              if (tc) {
                const pos = getPinPosition(tc, target.pin);
                const w3 = svgToWorld3D(pos.x, pos.y);
                const over = isCompOnBreadboard(tc, cur.breadboards);
                return new THREE.Vector3(w3.wx, (over ? BOARD_TOP_Y : 0) + 0.05, w3.wz);
              }
            } else if (target.kind === 'hole') {
              const pos = getPinRefPosition({ compId: target.bbId, pin: 0, holeId: target.holeId }, cur.components, cur.breadboards);
              if (pos) {
                const w3 = svgToWorld3D(pos.x, pos.y);
                return new THREE.Vector3(w3.wx, BOARD_TOP_Y + 0.05, w3.wz);
              }
            }
          }
          // Default parked resting dock right next to the 3D instrument body
          const mOver = isCompOnBreadboard(meter, cur.breadboards);
          const mBaseY = mOver ? BOARD_TOP_Y : 0;
          const mPos = svgToWorld3D(meter.x, meter.y);
          const rad = -THREE.MathUtils.degToRad(meter.rotation);
          const distSide = meter.type === 'oscilloscope' ? 2.05 : 1.75;
          const lx = side === 'red' ? distSide : -distSide;
          const lz = 0.6;
          const wx = mPos.wx + lx * Math.cos(rad) + lz * Math.sin(rad);
          const wz = mPos.wz - lx * Math.sin(rad) + lz * Math.cos(rad);
          return new THREE.Vector3(wx, mBaseY + 0.03, wz);
        };

        const resolveJackWorld = (meter: CircuitComp, side: 'red' | 'black'): THREE.Vector3 => {
          const mOver = isCompOnBreadboard(meter, cur.breadboards);
          const mBaseY = mOver ? BOARD_TOP_Y : 0;
          const mPos = svgToWorld3D(meter.x, meter.y);
          const rad = -THREE.MathUtils.degToRad(meter.rotation);
          const isScope = meter.type === 'oscilloscope';
          const lx = side === 'red' ? (isScope ? 0.78 : 0.72) : isScope ? -0.78 : -0.72;
          const lz = isScope ? 1.04 : 0.96;
          const yOff = isScope ? 1.02 : 0.72;
          const wx = mPos.wx + lx * Math.cos(rad) + lz * Math.sin(rad);
          const wz = mPos.wz - lx * Math.sin(rad) + lz * Math.cos(rad);
          return new THREE.Vector3(wx, mBaseY + yOff, wz);
        };

        cur.components.forEach((comp) => {
          if (comp.type !== 'multimeter' && comp.type !== 'oscilloscope') return;
          let pair = meterProbeMap.get(comp.id);
          if (!pair) {
            const red = buildProbeMesh(true, { meterId: comp.id, side: 'red' });
            const black = buildProbeMesh(false, { meterId: comp.id, side: 'black' });
            const redLeadMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });
            const blackLeadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48 });
            const redLeadMesh = new THREE.Mesh(new THREE.BufferGeometry(), redLeadMat);
            const blackLeadMesh = new THREE.Mesh(new THREE.BufferGeometry(), blackLeadMat);
            scene.add(red.group, black.group, redLeadMesh, blackLeadMesh);
            pair = {
              red,
              black,
              redLeadMesh,
              redLeadMat,
              redLeadGeo: null,
              redLeadSig: '',
              blackLeadMesh,
              blackLeadMat,
              blackLeadGeo: null,
              blackLeadSig: '',
            };
            meterProbeMap.set(comp.id, pair);
          }

          const rTip = resolveProbeWorld(comp, comp.redTarget, 'red');
          const bTip = resolveProbeWorld(comp, comp.blackTarget, 'black');
          pair.red.group.position.copy(rTip);
          pair.black.group.position.copy(bTip);

          const rJack = resolveJackWorld(comp, 'red');
          const bJack = resolveJackWorld(comp, 'black');
          // Tail of tilted red/black probe handle sits slightly offset above tip
          const rTail = new THREE.Vector3(rTip.x + 0.34, rTip.y + 1.12, rTip.z + 0.16);
          const bTail = new THREE.Vector3(bTip.x - 0.34, bTip.y + 1.12, bTip.z + 0.16);

          const rSig = `${rJack.x.toFixed(2)},${rJack.y.toFixed(2)},${rJack.z.toFixed(2)}|${rTail.x.toFixed(2)},${rTail.y.toFixed(2)},${rTail.z.toFixed(2)}`;
          if (pair.redLeadSig !== rSig) {
            const mid = new THREE.Vector3().lerpVectors(rJack, rTail, 0.5);
            mid.y = Math.max(rJack.y, rTail.y) + 0.65;
            const curve = new THREE.CatmullRomCurve3([rJack, mid, rTail]);
            const nextGeo = new THREE.TubeGeometry(curve, 22, 0.038, 7, false);
            pair.redLeadMesh.geometry.dispose();
            pair.redLeadGeo?.dispose();
            pair.redLeadMesh.geometry = nextGeo;
            pair.redLeadGeo = nextGeo;
            pair.redLeadSig = rSig;
          }

          const bSig = `${bJack.x.toFixed(2)},${bJack.y.toFixed(2)},${bJack.z.toFixed(2)}|${bTail.x.toFixed(2)},${bTail.y.toFixed(2)},${bTail.z.toFixed(2)}`;
          if (pair.blackLeadSig !== bSig) {
            const mid = new THREE.Vector3().lerpVectors(bJack, bTail, 0.5);
            mid.y = Math.max(bJack.y, bTail.y) + 0.65;
            const curve = new THREE.CatmullRomCurve3([bJack, mid, bTail]);
            const nextGeo = new THREE.TubeGeometry(curve, 22, 0.038, 7, false);
            pair.blackLeadMesh.geometry.dispose();
            pair.blackLeadGeo?.dispose();
            pair.blackLeadMesh.geometry = nextGeo;
            pair.blackLeadGeo = nextGeo;
            pair.blackLeadSig = bSig;
          }
        });
      };

      const ctxState = {
        scene,
        camera,
        renderer,
        controls,
        maxAnisotropy,
        isSoftwareGl,
        workplaneMesh,
        workplaneMat,
        workplaneTexLight,
        workplaneTexDark,
        bbMap,
        compMap,
        wireMap,
        meterProbeMap,
        sparkSystem,
        snapRingMesh,
        draftGroup,
        draftTube: null,
        draftMat,
        bootGeo,
        beadGeo,
        beadMat,
        redProbeMesh,
        blackProbeMesh,
        cursor3DSvg: { x: 460, y: 260, yHeight: 0.06 },
        raycaster: new THREE.Raycaster(),
        dragState: null as any,
        syncWorldFromProps,
      };
      threeRef.current = ctxState;
      syncWorldFromProps();

      // WebGL context loss safety
      const handleContextLost = (ev: Event) => {
        ev.preventDefault();
        setContextLost(true);
      };
      const handleContextRestored = () => {
        setContextLost(false);
        syncWorldFromProps();
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      // ResizeObserver
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const w = Math.max(1, entry.contentRect.width);
        const h = Math.max(1, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      ro.observe(container);

      // Animation Loop with afterDraw pacing when software WebGL
      let disposed = false;
      let rafId = 0;
      let swTimer: number | null = null;
      let lastTime = performance.now();
      let elapsed = 0;
      let shortSparkAccum = 0;

      const tick = (now: number) => {
        if (disposed) return;
        const dt = Math.min(0.05, Math.max(0.002, (now - lastTime) / 1000));
        lastTime = now;

        const cur = propsRef.current;
        if (cur.isRunning) elapsed += dt;

        // Lock OrbitControls whenever dragging component/breadboard OR actively wiring OR VR gyro head-look active
        if (vrRecenterPendingRef.current) {
          vrRecenterPendingRef.current = false;
          vrGyroTracker.recenter();
        }
        const wantsVrGyro = Boolean(cur.vrMode && cur.vrGyroEnabled);
        const vrGyroActive = wantsVrGyro && vrGyroTracker.updateRelativeQuaternion(dt, _vrDeltaQuat);
        if (vrGyroActive) {
          if (!wasVrGyroActive) {
            camera.lookAt(controls.target);
            _vrBaseLookQuat.copy(camera.quaternion);
            _vrBaseEyePos.copy(camera.position);
            vrGyroTracker.recenter();
            vrGyroTracker.updateRelativeQuaternion(dt, _vrDeltaQuat);
          }
          controls.enabled = false;
          camera.position.copy(_vrBaseEyePos);
          camera.quaternion.multiplyQuaternions(_vrBaseLookQuat, _vrDeltaQuat);
          wasVrGyroActive = true;
        } else {
          if (wasVrGyroActive) {
            wasVrGyroActive = false;
            controls.update();
          }
          const shouldLockOrbit = Boolean(ctxState.dragState) || Boolean(cur.wireStart);
          controls.enabled = !shouldLockOrbit;
          const usePanPrimary = cur.navMode === 'pan' || spaceHeldRef.current || shiftHeld;
          const desiredLeft = usePanPrimary ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
          if (controls.mouseButtons.LEFT !== desiredLeft) {
            controls.mouseButtons.LEFT = desiredLeft;
            controls.touches.ONE = usePanPrimary ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
          }
          // Keep pan target within workbench bounds without extra allocations
          const clampedX = THREE.MathUtils.clamp(controls.target.x, -26, 26);
          const clampedY = THREE.MathUtils.clamp(controls.target.y, 0, 3);
          const clampedZ = THREE.MathUtils.clamp(controls.target.z, -18, 18);
          if (clampedX !== controls.target.x || clampedY !== controls.target.y || clampedZ !== controls.target.z) {
            camera.position.x += clampedX - controls.target.x;
            camera.position.y += clampedY - controls.target.y;
            camera.position.z += clampedZ - controls.target.z;
            controls.target.set(clampedX, clampedY, clampedZ);
          }
          controls.update();
        }

        // Runtime 3D animations (LED glow, spinning motor rotor, switch/pushbutton damping, buzzer wave, multimeter LCD)
        compMap.forEach((entry, id) => {
          const comp = cur.components.find((c) => c.id === id);
          if (!comp) return;
          if (comp.type === 'multimeter' && entry.handle.updateMultimeterLcd) {
            const evalRes = evaluateMultimeterReading(
              comp,
              cur.components,
              cur.wires,
              cur.breadboards,
              cur.solvedComps,
              cur.solvedWires,
              cur.nodeVoltages
            );
            entry.handle.updateMultimeterLcd(
              evalRes.displayText,
              evalRes.mode,
              evalRes.targetLabel,
              evalRes.hasMeasurement
            );
          }
          if (comp.type === 'oscilloscope' && entry.handle.updateOscilloscopeScreen) {
            entry.handle.updateOscilloscopeScreen(
              cur.scopeTraces?.[comp.id],
              comp.scopeTimeWindow ?? 2.0,
              comp.scopeVDiv ?? 0,
              cur.isRunning
            );
          }
          updateUnifiedCompVisualRuntime(comp, entry.handle, cur.solvedComps[id], {
            isRunning: cur.isRunning,
            elapsed,
            dt,
            isBlindExam: cur.isBlindExam,
            shortWarning: cur.shortWarning,
            ledOverloadWarning: cur.ledOverloadWarning,
          });
        });

        // Animate electrical charge beads & heat glow along energized / shorted 3D wires
        wireMap.forEach((rec, id) => {
          const ws = cur.solvedWires[id];
          const iMa = ws?.currentMa ?? 0;
          const isShortedWire = cur.isRunning && Math.abs(iMa) > 6000;
          const isSel = cur.selectedWireId === id;

          if (isShortedWire && !isSel) {
            const flicker = 0.45 + 0.55 * Math.sin(elapsed * 26);
            rec.tubeMat.emissive.setHex(0xff3b00);
            rec.tubeMat.emissiveIntensity = 0.4 + flicker * 0.75;
          } else if (!isSel) {
            rec.tubeMat.emissive.setHex(0x000000);
            rec.tubeMat.emissiveIntensity = 0;
          }

          const active = cur.isRunning && Math.abs(iMa) > 0.25;
          if (!active) {
            rec.beads.forEach((b) => {
              b.visible = false;
            });
            return;
          }
          const speed = THREE.MathUtils.clamp(Math.abs(iMa) * 0.015, 0.25, 1.8);
          const dir = iMa >= 0 ? 1 : -1;
          rec.beads.forEach((b, idx) => {
            b.visible = true;
            const rawT = (elapsed * speed * dir + idx / rec.beads.length) % 1;
            const t = rawT < 0 ? rawT + 1 : rawT;
            rec.curve.getPointAt(t, _projVec);
            b.position.copy(_projVec);
          });
        });

        // Continuous 3D electrical sparks & micro-arcs during active short circuits
        if (cur.isRunning) {
          shortSparkAccum += dt;
          if (shortSparkAccum >= 0.11) {
            shortSparkAccum = 0;

            // 1. Shorted power sources
            cur.components.forEach((c) => {
              const st = cur.solvedComps[c.id];
              const isSrcShort =
                (c.type === 'source' || c.type === 'ac_source') &&
                cur.shortWarning &&
                Math.abs(st?.currentMa ?? 0) > 6000;
              const isFaultShort = !cur.isBlindExam && c.fault === 'short' && Math.abs(st?.currentMa ?? 0) > 80;

              if (isSrcShort || isFaultShort) {
                const pinIdx: PinIndex = Math.random() < 0.5 ? 1 : 0;
                const pSvg = getPinPosition(c, pinIdx);
                const w3 = svgToWorld3D(pSvg.x, pSvg.y);
                const overBb = isCompOnBreadboard(c, cur.breadboards);
                const floorY = overBb ? BOARD_TOP_Y + 0.02 : 0.02;
                sparkSystem.spawnBurst(w3.wx, floorY + 0.18, w3.wz, 'major', floorY);
              }
            });

            // 2. Shorted high-current wires (cap max bursts per tick to keep pool crisp)
            let wireBurstCount = 0;
            wireMap.forEach((rec, id) => {
              if (wireBurstCount >= 2) return;
              const ws = cur.solvedWires[id];
              if (Math.abs(ws?.currentMa ?? 0) > 6000 && Math.random() < 0.72) {
                const u = Math.random() < 0.4 ? 0.05 : Math.random() < 0.5 ? 0.95 : 0.35 + Math.random() * 0.3;
                rec.curve.getPointAt(u, _projVec);
                sparkSystem.spawnBurst(_projVec.x, _projVec.y, _projVec.z, 'minor', 0.02);
                wireBurstCount++;
              }
            });
          }
        }

        sparkSystem.update(dt);

        // Project crisp DOM labels for visible components (zero React re-renders)
        const labelContainer = labelLayerRef.current;
        if (labelContainer) {
          const cw = container.clientWidth || 640;
          const ch = container.clientHeight || 480;
          if (!cur.showLabels) {
            labelContainer.style.display = 'none';
          } else {
            labelContainer.style.display = 'block';
            cur.components.forEach((comp) => {
              if (comp.type === 'ground') return;
              const entry = compMap.get(comp.id);
              if (!entry) return;
              let badge = labelDomMapRef.current.get(comp.id);
              if (!badge) {
                badge = document.createElement('div');
                badge.className =
                  'absolute top-0 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap pointer-events-none border shadow-2xs';
                labelContainer.appendChild(badge);
                labelDomMapRef.current.set(comp.id, badge);
              }
              const st = cur.solvedComps[comp.id];
              const isSel = cur.selectedId === comp.id;
              const fault = comp.fault ?? 'none';
              const showFault = !cur.isBlindExam && fault !== 'none';
              const isLedOver =
                comp.type === 'led' &&
                cur.isRunning &&
                (st?.currentMa ?? 0) > 30 &&
                !(showFault && fault === 'burned');

              _projVec.set(
                entry.handle.root.position.x,
                entry.handle.baseY +
                  (comp.type === 'capacitor'
                    ? 1.45
                    : comp.type === 'oscilloscope'
                    ? 1.32
                    : comp.type === 'mcu8051' || comp.type === 'dec74138'
                    ? 0.92
                    : comp.type === 'sevenseg'
                    ? 0.85
                    : isLedOver
                    ? 1.48
                    : 1.05),
                entry.handle.root.position.z
              );
              _projVec.project(camera);
              if (_projVec.z > 1) {
                badge.style.display = 'none';
                return;
              }
              const sx = (_projVec.x * 0.5 + 0.5) * cw;
              const sy = (-_projVec.y * 0.5 + 0.5) * ch;
              badge.style.display = 'block';
              badge.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;

              const text = showFault
                ? `${comp.label} [${FAULT_LABELS[fault].toUpperCase()}]`
                : isLedOver
                ? `⚠ ${comp.label}: QUÁ DÒNG (${(st?.currentMa ?? 0).toFixed(0)}mA)`
                : isSel && st
                ? `${comp.label}: ${formatCompBadgeValue(comp, st)} · ${Math.abs(st.vDrop).toFixed(1)}V/${Math.abs(st.currentMa).toFixed(1)}mA`
                : `${comp.label}: ${formatCompBadgeValue(comp, st)}`;
              if (badge.textContent !== text) badge.textContent = text;

              badge.style.backgroundColor = isLedOver
                ? 'rgba(185, 28, 28, 0.94)'
                : showFault
                ? 'rgba(124, 45, 18, 0.92)'
                : cur.isLightCanvas
                ? 'rgba(255, 255, 255, 0.92)'
                : 'rgba(15, 23, 42, 0.9)';
              badge.style.color = isLedOver
                ? '#fef2f2'
                : showFault
                ? '#fed7aa'
                : cur.isLightCanvas
                ? '#0f172a'
                : '#f1f5f9';
              badge.style.borderColor = isLedOver
                ? '#f87171'
                : isSel
                ? '#2563eb'
                : showFault
                ? '#f97316'
                : cur.isLightCanvas
                ? 'rgba(148, 163, 184, 0.45)'
                : 'rgba(51, 65, 85, 0.8)';
            });
          }
        }

        if (cur.vrMode && cur.vrStereo) {
          renderer.getSize(_vrRenderSize);
          const rw = _vrRenderSize.x;
          const rh = _vrRenderSize.y;
          camera.updateMatrixWorld();
          stereoCamera.update(camera);
          renderer.setScissorTest(true);
          renderer.setScissor(0, 0, rw / 2, rh);
          renderer.setViewport(0, 0, rw / 2, rh);
          renderer.render(scene, stereoCamera.cameraL);
          renderer.setScissor(rw / 2, 0, rw / 2, rh);
          renderer.setViewport(rw / 2, 0, rw / 2, rh);
          renderer.render(scene, stereoCamera.cameraR);
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, rw, rh);
        } else {
          renderer.setScissorTest(false);
          renderer.render(scene, camera);
        }

        if (isSoftwareGl) {
          swTimer = window.setTimeout(() => {
            if (!disposed) rafId = requestAnimationFrame(tick);
          }, 0);
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        if (swTimer !== null) clearTimeout(swTimer);
        ro.disconnect();
        vrGyroTracker.stop();
        renderer.domElement.removeEventListener('pointerenter', handlePointerEnterCanvas);
        renderer.domElement.removeEventListener('pointerleave', handlePointerLeaveCanvas);
        renderer.domElement.removeEventListener('wheel', handleWheelPan, { capture: true });
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleWindowBlur);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

        bbMap.forEach((h) => h.dispose());
        compMap.forEach((e) => e.handle.dispose());
        wireMap.forEach((rec) => {
          rec.tubeGeo.dispose();
          rec.tubeMat.dispose();
        });
        meterProbeMap.forEach((pair) => {
          pair.red.dispose();
          pair.black.dispose();
          pair.redLeadGeo?.dispose();
          pair.blackLeadGeo?.dispose();
          pair.redLeadMesh.geometry.dispose();
          pair.blackLeadMesh.geometry.dispose();
          pair.redLeadMat.dispose();
          pair.blackLeadMat.dispose();
        });
        while (draftGroup.children.length > 0) {
          const ch = draftGroup.children[0] as THREE.Mesh;
          draftGroup.remove(ch);
          ch.geometry.dispose();
        }
        redProbeMesh.dispose();
        blackProbeMesh.dispose();
        sparkSystem.dispose();
        if (sparkNoticeTimerRef.current !== null) {
          clearTimeout(sparkNoticeTimerRef.current);
          sparkNoticeTimerRef.current = null;
        }
        snapRingGeo.dispose();
        snapRingMat.dispose();
        workplaneGeo.dispose();
        workplaneMat.dispose();
        workplaneTexLight.dispose();
        workplaneTexDark.dispose();
        draftMat.dispose();
        bootGeo.dispose();
        bootMat.dispose();
        beadGeo.dispose();
        beadMat.dispose();
        envTarget.dispose();
        roomEnv.dispose();
        pmrem.dispose();
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        threeRef.current = null;
      };
    }, []);

    // Synchronize Three.js scene whenever circuit state/selection/hover/probes change
    useEffect(() => {
      threeRef.current?.syncWorldFromProps();
    }, [
      props.components,
      props.wires,
      props.breadboards,
      props.selectedId,
      props.selectedWireId,
      props.selectedBreadboardId,
      props.activePlaceType,
      props.wireStart,
      props.wireDraftWaypoints,
      props.activeWireColor,
      props.hoveredPin,
      props.hoveredHole,
      props.highlightedNetKey,
      props.redProbe,
      props.blackProbe,
      props.showMultimeter,
      props.symbolMode,
      props.isLightCanvas,
    ]);

    // Helper: Collect raycast hits against pins, breadboard sockets, components, wires, breadboards
    const performRaycast = (clientX: number, clientY: number) => {
      const ctx = threeRef.current;
      const el = containerRef.current;
      if (!ctx || !el) return null;
      const rect = el.getBoundingClientRect();
      _pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      ctx.raycaster.setFromCamera(_pointerNdc, ctx.camera);

      // 0. 3D Multimeter Test Probe Handles (highest priority when grabbing!)
      const mmProbeTargets: THREE.Object3D[] = [];
      ctx.meterProbeMap.forEach((pair) => {
        pair.red.hitMeshes.forEach((m) => mmProbeTargets.push(m));
        pair.black.hitMeshes.forEach((m) => mmProbeTargets.push(m));
      });
      if (mmProbeTargets.length > 0) {
        const probeHits = ctx.raycaster.intersectObjects(mmProbeTargets, false);
        if (probeHits.length > 0) {
          const ud = probeHits[0].object.userData;
          return {
            kind: 'mm_probe' as const,
            meterId: String(ud.meterId),
            side: ud.side as 'red' | 'black',
            point: probeHits[0].point,
          };
        }
      }

      // 1. Pin Proxies
      const pinTargets: THREE.Object3D[] = [];
      ctx.compMap.forEach((entry) => {
        entry.handle.pinProxies.forEach((p) => pinTargets.push(p.mesh));
      });
      const pinHits = ctx.raycaster.intersectObjects(pinTargets, false);
      if (pinHits.length > 0) {
        const ud = pinHits[0].object.userData;
        return { kind: 'pin' as const, compId: String(ud.compId), pin: ud.pin as PinIndex, point: pinHits[0].point };
      }

      // 2. Breadboard Hole Sockets (InstancedMesh)
      for (const [bbId, h] of ctx.bbMap.entries()) {
        const holeHits = ctx.raycaster.intersectObject(h.holeSocketsMesh, false);
        if (holeHits.length > 0 && holeHits[0].instanceId !== undefined) {
          const hole = h.holes[holeHits[0].instanceId];
          if (hole) return { kind: 'hole' as const, bbId, hole, point: holeHits[0].point };
        }
      }

      // 3. Component Bodies, Toggle Levers & Potentiometer Knobs
      const compTargets: THREE.Object3D[] = [];
      ctx.compMap.forEach((entry) => {
        entry.handle.root.traverse((obj) => {
          if (
            obj.userData?.hitKind === 'toggle' ||
            obj.userData?.hitKind === 'pot_knob' ||
            obj.userData?.hitKind === 'component'
          ) {
            compTargets.push(obj);
          }
        });
      });
      const compHits = ctx.raycaster.intersectObjects(compTargets, false);
      if (compHits.length > 0) {
        const ud = compHits[0].object.userData;
        return {
          kind:
            ud.hitKind === 'toggle'
              ? ('toggle' as const)
              : ud.hitKind === 'pot_knob'
              ? ('pot_knob' as const)
              : ('component' as const),
          compId: String(ud.compId),
          point: compHits[0].point,
        };
      }

      // 4. Wires
      const wireTargets: THREE.Object3D[] = [];
      ctx.wireMap.forEach((rec) => wireTargets.push(rec.tube));
      const wireHits = ctx.raycaster.intersectObjects(wireTargets, false);
      if (wireHits.length > 0) {
        return { kind: 'wire' as const, wireId: String(wireHits[0].object.userData.wireId), point: wireHits[0].point };
      }

      // 5. Breadboard Bodies (if wiring or probing or placing, snap nearest hole on top surface!)
      const bbTargets: THREE.Object3D[] = [];
      ctx.bbMap.forEach((h) => bbTargets.push(h.hitBody));
      const bbHits = ctx.raycaster.intersectObjects(bbTargets, false);
      if (bbHits.length > 0) {
        const bbId = String(bbHits[0].object.userData.bbId);
        const bbHandle = ctx.bbMap.get(bbId);
        const cur = propsRef.current;
        if (bbHandle && (cur.wireStart || cur.probeMode !== 'none')) {
          const ptSvg = world3DToSvg(bbHits[0].point.x, bbHits[0].point.z);
          let bestHole: BreadboardHole | null = null;
          let bestDist = 28;
          for (const h of bbHandle.holes) {
            const d = Math.hypot(h.x - ptSvg.x, h.y - ptSvg.y);
            if (d < bestDist) {
              bestDist = d;
              bestHole = h;
            }
          }
          if (bestHole) {
            return { kind: 'hole' as const, bbId, hole: bestHole, point: bbHits[0].point };
          }
        }
        return { kind: 'breadboard' as const, bbId, point: bbHits[0].point };
      }

      // 6. Workplane fallback
      if (ctx.raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        return { kind: 'workplane' as const, point: _hitPoint.clone() };
      }
      return null;
    };

    const wireDragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button === 2) {
        if (props.activePlaceType || props.wireStart) {
          e.preventDefault();
          props.onCancelWireOrPlace();
        }
        return;
      }
      if (e.button !== 0) return;

      const ctx = threeRef.current;
      if (!ctx) return;

      // Active click-to-place probe mode for a selected 3D Multimeter
      if (props.activeMeterProbeEdit && props.onSetMeterProbe) {
        const snapRes = findProbeSnapAtClient(e.clientX, e.clientY, props.activeMeterProbeEdit.meterId);
        if (snapRes) {
          props.onSetMeterProbe(props.activeMeterProbeEdit.meterId, props.activeMeterProbeEdit.side, snapRes.target);
        }
        return;
      }

      // When Pan (Lướt) mode or Shift/Space modifier is active (and not placing/wiring/probing), let OrbitControls pan cleanly anywhere
      if (
        (props.navMode === 'pan' || e.shiftKey || spaceHeldRef.current) &&
        !props.activePlaceType &&
        !props.wireStart &&
        props.probeMode === 'none'
      ) {
        return;
      }

      const hit = performRaycast(e.clientX, e.clientY);
      if (!hit) return;

      if (props.activePlaceType) {
        if (props.activePlaceType === 'multimeter' || props.activePlaceType === 'oscilloscope') {
          const snapRes = findProbeSnapAtClient(e.clientX, e.clientY);
          ctx.snapRingMesh.visible = false;
          setProbeHoverText(null);
          if (snapRes && snapRes.target) {
            const svgPt = world3DToSvg(snapRes.worldPt.x, snapRes.worldPt.z);
            props.onPlaceAt(svgPt.x, svgPt.y, snapRes.target);
            return;
          }
        }
        if (hit.kind === 'hole') {
          props.onPlaceAt(hit.hole.x, hit.hole.y);
        } else {
          const svgPt = world3DToSvg(hit.point.x, hit.point.z);
          props.onPlaceAt(svgPt.x, svgPt.y);
        }
        return;
      }

      if (hit.kind === 'mm_probe') {
        const meterComp = props.components.find((c) => c.id === hit.meterId);
        if (meterComp) props.onSelectComp(meterComp);
        ctx.controls.enabled = false;
        ctx.dragState = {
          kind: 'mm_probe',
          meterId: hit.meterId,
          side: hit.side,
          lastTargetKey: '',
          snapshotPushed: false,
        };
        return;
      }

      if (hit.kind === 'pin') {
        if (!props.wireStart && props.probeMode === 'none') {
          wireDragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
        }
        props.onPinClick(hit.compId, hit.pin);
        return;
      }

      if (hit.kind === 'hole') {
        if (!props.wireStart && props.probeMode === 'none') {
          wireDragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
        }
        props.onHoleClick(hit.bbId, hit.hole);
        return;
      }

      if (hit.kind === 'toggle') {
        if (!props.wireStart && props.probeMode === 'none') {
          props.onToggleSwitchOrButton(hit.compId);
        }
        return;
      }

      if (hit.kind === 'pot_knob') {
        const comp = props.components.find((c) => c.id === hit.compId);
        if (!comp) return;
        props.onSelectComp(comp);
        if (props.wireStart || props.probeMode !== 'none') return;
        ctx.controls.enabled = false;
        ctx.dragState = {
          kind: 'pot_knob',
          compId: comp.id,
          startClientX: e.clientX,
          startWiper: comp.wiper ?? 0.5,
          hasMoved: false,
          snapshotPushed: false,
        };
        return;
      }

      if (hit.kind === 'component') {
        const comp = props.components.find((c) => c.id === hit.compId);
        if (!comp) return;
        props.onSelectComp(comp);
        if (props.wireStart) return;
        const baseY = isCompOnBreadboard(comp, props.breadboards) ? BOARD_TOP_Y : 0;
        const dragPt = projectClientToPlaneSvg(e.clientX, e.clientY, baseY) ?? { x: comp.x, y: comp.y };
        ctx.controls.enabled = false;
        ctx.dragState = {
          kind: 'component',
          id: comp.id,
          offsetSvgX: comp.x - dragPt.x,
          offsetSvgY: comp.y - dragPt.y,
          baseY,
          startClientX: e.clientX,
          startClientY: e.clientY,
          hasMoved: false,
          snapshotPushed: false,
        };
        return;
      }

      if (hit.kind === 'wire') {
        if (!props.wireStart) {
          props.onSelectWire(hit.wireId);
        }
        return;
      }

      if (hit.kind === 'breadboard') {
        const bb = props.breadboards.find((b) => b.id === hit.bbId);
        if (!bb) return;
        props.onSelectBreadboard(bb.id);
        if (props.wireStart) return;
        const dragPt = projectClientToPlaneSvg(e.clientX, e.clientY, 0) ?? { x: bb.x, y: bb.y };
        ctx.controls.enabled = false;
        ctx.dragState = {
          kind: 'breadboard',
          id: bb.id,
          offsetSvgX: bb.x - dragPt.x,
          offsetSvgY: bb.y - dragPt.y,
          startClientX: e.clientX,
          startClientY: e.clientY,
          hasMoved: false,
          snapshotPushed: false,
        };
        return;
      }

      if (hit.kind === 'workplane') {
        if (props.wireStart) {
          const svgPt = world3DToSvg(hit.point.x, hit.point.z);
          props.onAddWireWaypoint(svgPt.x, svgPt.y);
        } else {
          props.onClearSelection();
        }
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const ctx = threeRef.current;
      if (!ctx) return;

      // Handle active 3D drag of Multimeter Probe, Component, or Breadboard
      if (ctx.dragState) {
        const ds = ctx.dragState;
        if (ds.kind === 'mm_probe') {
          const snapRes = findProbeSnapAtClient(e.clientX, e.clientY, ds.meterId);
          if (snapRes) {
            if (snapRes.target) {
              ctx.snapRingMesh.position.set(snapRes.worldPt.x, snapRes.worldPt.y + 0.04, snapRes.worldPt.z);
              ctx.snapRingMesh.visible = true;
            } else {
              ctx.snapRingMesh.visible = false;
            }
            const nextKey = JSON.stringify(snapRes.target);
            if (nextKey !== ds.lastTargetKey) {
              ds.lastTargetKey = nextKey;
              if (!ds.snapshotPushed) {
                props.onStartDragSnapshot();
                ds.snapshotPushed = true;
              }
              props.onSetMeterProbe?.(ds.meterId, ds.side, snapRes.target);
            }
            const sideText = ds.side === 'red' ? 'Que Đỏ (+)' : 'Que Đen (−)';
            setProbeHoverText(`${sideText} → ${snapRes.label}`);
          }
          return;
        }

        if (ds.kind === 'pot_knob') {
          const dx = e.clientX - ds.startClientX;
          if (Math.abs(dx) > 3 || ds.hasMoved) {
            ds.hasMoved = true;
            if (!ds.snapshotPushed) {
              props.onStartDragSnapshot();
              ds.snapshotPushed = true;
            }
            const nextW = Math.max(0.05, Math.min(0.95, Math.round((ds.startWiper + dx / 140) * 100) / 100));
            props.onChangePotWiper?.(ds.compId, nextW);
            const potComp = props.components.find((c) => c.id === ds.compId);
            if (potComp) {
              const r1 = potComp.value * nextW;
              const r2 = potComp.value * (1 - nextW);
              setProbeHoverText(
                `Xoay ${potComp.label}: ${Math.round(nextW * 100)}% (${formatResistance(r1)} / ${formatResistance(r2)})`
              );
            }
          }
          return;
        }

        const dist = Math.hypot(e.clientX - ds.startClientX, e.clientY - ds.startClientY);
        if (dist > 5 || ds.hasMoved) {
          ds.hasMoved = true;
          if (!ds.snapshotPushed) {
            props.onStartDragSnapshot();
            ds.snapshotPushed = true;
          }
          const planePt = projectClientToPlaneSvg(e.clientX, e.clientY, ds.kind === 'component' ? ds.baseY : 0);
          if (planePt) {
            if (ds.kind === 'component') {
              props.onMoveComp(ds.id, planePt.x + ds.offsetSvgX, planePt.y + ds.offsetSvgY);
            } else {
              props.onMoveBreadboard(ds.id, planePt.x + ds.offsetSvgX, planePt.y + ds.offsetSvgY);
            }
          }
        }
        return;
      }

      // Live snap preview when user is picking a point for a 3D Multimeter probe or placing a 3D instrument
      if (props.activeMeterProbeEdit) {
        const snapRes = findProbeSnapAtClient(e.clientX, e.clientY, props.activeMeterProbeEdit.meterId);
        if (snapRes && snapRes.target) {
          ctx.snapRingMesh.position.set(snapRes.worldPt.x, snapRes.worldPt.y + 0.04, snapRes.worldPt.z);
          ctx.snapRingMesh.visible = true;
          const sideText = props.activeMeterProbeEdit.side === 'red' ? 'Chạm điểm đo (+)' : 'Chạm điểm đo (−)';
          setProbeHoverText(`${sideText}: ${snapRes.label}`);
        } else {
          ctx.snapRingMesh.visible = false;
          setProbeHoverText(null);
        }
        return;
      } else if (props.activePlaceType === 'multimeter' || props.activePlaceType === 'oscilloscope') {
        const snapRes = findProbeSnapAtClient(e.clientX, e.clientY);
        if (snapRes && snapRes.target) {
          ctx.snapRingMesh.position.set(snapRes.worldPt.x, snapRes.worldPt.y + 0.05, snapRes.worldPt.z);
          ctx.snapRingMesh.visible = true;
          const labelPrefix =
            props.activePlaceType === 'oscilloscope' ? 'Đặt Máy hiện sóng đo tại' : 'Đặt Đồng hồ 3D đo tại';
          setProbeHoverText(`${labelPrefix}: ${snapRes.label}`);
        } else {
          ctx.snapRingMesh.visible = false;
          setProbeHoverText(
            props.activePlaceType === 'oscilloscope'
              ? 'Bấm vào dây / linh kiện bất kỳ để đặt Máy hiện sóng 3D'
              : 'Bấm vào dây / linh kiện bất kỳ để đặt Đồng hồ 3D & đo ngay'
          );
        }
        return;
      } else if (ctx.snapRingMesh.visible) {
        ctx.snapRingMesh.visible = false;
      }

      // Hover detection for 3D Pin & Breadboard Hole highlighting
      const hit = performRaycast(e.clientX, e.clientY);
      if (!hit) {
        if (props.hoveredPin) props.onHoverPin(null);
        if (props.hoveredHole) props.onHoverHole(null);
        if (probeHoverText) setProbeHoverText(null);
        return;
      }

      if (hit.kind === 'mm_probe') {
        const sideText = hit.side === 'red' ? 'Que Đỏ (+)' : 'Que Đen (−)';
        setProbeHoverText(`Kéo ${sideText} vào bất kỳ dây dẫn hoặc linh kiện nào để đo`);
        if (props.hoveredPin) props.onHoverPin(null);
        if (props.hoveredHole) props.onHoverHole(null);
        return;
      }
      if (hit.kind === 'pot_knob') {
        const potComp = props.components.find((c) => c.id === hit.compId);
        if (potComp) {
          const w = potComp.wiper ?? 0.5;
          setProbeHoverText(
            `Kéo ngang để xoay ${potComp.label} (${Math.round(w * 100)}%) · Bấm để chuyển nấc`
          );
        }
        if (props.hoveredPin) props.onHoverPin(null);
        if (props.hoveredHole) props.onHoverHole(null);
        return;
      }
      if (probeHoverText) setProbeHoverText(null);

      if (hit.kind === 'hole') {
        ctx.cursor3DSvg = { x: hit.hole.x, y: hit.hole.y, yHeight: BOARD_TOP_Y + 0.03 };
        if (props.hoveredPin) props.onHoverPin(null);
        if (props.hoveredHole?.bbId !== hit.bbId || props.hoveredHole?.hole.holeId !== hit.hole.holeId) {
          props.onHoverHole({ bbId: hit.bbId, hole: hit.hole });
        }
      } else if (hit.kind === 'pin') {
        const comp = props.components.find((c) => c.id === hit.compId);
        if (comp) {
          const pos = getPinPosition(comp, hit.pin);
          ctx.cursor3DSvg = {
            x: pos.x,
            y: pos.y,
            yHeight: isCompOnBreadboard(comp, props.breadboards) ? BOARD_TOP_Y + 0.03 : 0.06,
          };
        }
        if (props.hoveredHole) props.onHoverHole(null);
        if (props.hoveredPin?.compId !== hit.compId || props.hoveredPin?.pin !== hit.pin) {
          props.onHoverPin({ compId: hit.compId, pin: hit.pin });
        }
      } else {
        const svgPt = world3DToSvg(hit.point.x, hit.point.z);
        ctx.cursor3DSvg = {
          x: svgPt.x,
          y: svgPt.y,
          yHeight: hit.kind === 'breadboard' ? BOARD_TOP_Y + 0.05 : 0.06,
        };
        if (props.hoveredPin) props.onHoverPin(null);
        if (props.hoveredHole) props.onHoverHole(null);
      }

      if (props.wireStart) {
        ctx.syncWorldFromProps();
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      const ctx = threeRef.current;
      if (!ctx) return;
      if (wireDragStartRef.current && props.wireStart) {
        const dist = Math.hypot(
          e.clientX - wireDragStartRef.current.clientX,
          e.clientY - wireDragStartRef.current.clientY
        );
        wireDragStartRef.current = null;
        if (dist > 10) {
          const hit = performRaycast(e.clientX, e.clientY);
          if (hit?.kind === 'pin') {
            props.onPinClick(hit.compId, hit.pin);
          } else if (hit?.kind === 'hole') {
            props.onHoleClick(hit.bbId, hit.hole);
          }
        }
      } else {
        wireDragStartRef.current = null;
      }
      if (ctx.dragState) {
        const ds = ctx.dragState;
        if (ds.kind === 'mm_probe') {
          ctx.snapRingMesh.visible = false;
          setProbeHoverText(null);
        } else if (ds.kind === 'pot_knob') {
          if (!ds.hasMoved) {
            props.onStartDragSnapshot();
            const steps = [0.1, 0.25, 0.5, 0.75, 0.9];
            const next = steps.find((s) => s > ds.startWiper + 0.04) ?? steps[0];
            props.onChangePotWiper?.(ds.compId, next);
          }
          setProbeHoverText(null);
        } else if (!ds.hasMoved && ds.kind === 'component' && !props.wireStart && props.probeMode === 'none') {
          const clicked = props.components.find((c) => c.id === ds.id);
          if (clicked && (clicked.type === 'switch' || clicked.type === 'pushbutton')) {
            props.onToggleSwitchOrButton(clicked.id);
          }
        }
        ctx.dragState = null;
        ctx.controls.enabled = !props.wireStart;
      }
    };

    // Compute live hover badge text cleanly
    let hoverCaption: string | null = probeHoverText;
    if (!hoverCaption && props.hoveredHole) {
      const vHole = props.nodeVoltages[`${props.hoveredHole.bbId}::${props.hoveredHole.hole.holeId}`] ?? 0;
      hoverCaption = `${props.hoveredHole.hole.label} · ${vHole.toFixed(2)}V`;
    } else if (!hoverCaption && props.hoveredPin) {
      const comp = props.components.find((c) => c.id === props.hoveredPin?.compId);
      if (comp) {
        const vPin = props.nodeVoltages[`${comp.id}:${props.hoveredPin.pin}`] ?? 0;
        hoverCaption = `${comp.label} · ${getPinFullName(comp.type, props.hoveredPin.pin)} (${vPin.toFixed(2)}V)`;
      }
    }

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none ${
          props.activePlaceType
            ? 'cursor-copy'
            : props.wireStart || props.probeMode !== 'none' || props.activeMeterProbeEdit
            ? 'cursor-crosshair'
            : props.navMode === 'pan'
            ? 'cursor-move'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          if (props.activePlaceType || props.wireStart) {
            props.onCancelWireOrPlace();
          }
        }}
      >
        {/* Projected crisp HTML Component Labels Layer (ref-mutated at 60fps, zero re-renders) */}
        <div ref={labelLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

        {/* Transient Electrical Spark / Wiring Error Callout */}
        {sparkNotice && (
          <div
            className={`pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg font-mono text-xs font-bold shadow-xl border flex items-center gap-1.5 whitespace-nowrap ${
              sparkNotice.intensity === 'major'
                ? 'bg-rose-950/95 border-rose-400/80 text-rose-100'
                : 'bg-amber-950/95 border-amber-400/80 text-amber-100'
            }`}
          >
            <span>⚡</span>
            <span>{sparkNotice.text}</span>
          </div>
        )}

        {/* Live 3D Pin / Breadboard Hole / Multimeter Probe Hover Callout */}
        {hoverCaption && (
          <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-md bg-slate-900/95 border border-emerald-500/70 text-slate-50 font-mono text-[11px] font-semibold shadow-lg whitespace-nowrap">
            {hoverCaption}
          </div>
        )}

        {/* 3D Orbit / Pan Helper Caption */}
        {!hoverCaption && !props.vrMode && (
          <div
            className={`pointer-events-none hidden lg:flex items-center gap-2 absolute bottom-2.5 left-80 z-10 px-2.5 py-1 rounded-md text-[10px] font-medium border ${
              props.isLightCanvas
                ? 'bg-white/90 border-slate-300/80 text-slate-600'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
            }`}
          >
            <span>
              {props.navMode === 'pan'
                ? 'Chế độ Lướt: Kéo trái/phải/lên/xuống để di chuyển bàn mạch · Cuộn để zoom'
                : 'Kéo nền: xoay 360° · Chuột phải / Shift+kéo / Phím mũi tên: lướt trái–phải · Cuộn: zoom'}
            </span>
          </div>
        )}

        {/* WebGL Context Lost Fallback */}
        {contextLost && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 text-slate-100 text-xs font-medium">
            Khung cảnh WebGL 3D đang khởi tạo lại...
          </div>
        )}
      </div>
    );
  }
);
