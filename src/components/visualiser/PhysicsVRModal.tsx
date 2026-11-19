import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Compass,
  Crosshair,
  Eye,
  Glasses,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { TemplateId } from '../../types/stemly';
import {
  GyroPermissionState,
  VRGyroTracker,
  needsGyroPermissionPrompt,
  requestGyroPermission,
} from './vrGyroControls';

interface PhysicsVRModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: TemplateId;
  topic: string;
  title: string;
  parameters: Record<string, number>;
  initialGyroPermission?: GyroPermissionState;
}

// Preallocated module-level scratch math objects (zero allocations in rAF tick)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _renderSize = new THREE.Vector2();
const _qGyro = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion();
const _qPitch = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3(1, 0, 0);

const ELEMENT_SYMBOLS: Record<number, string> = {
  1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C',
  7: 'N', 8: 'O', 9: 'F', 10: 'Ne', 11: 'Na', 12: 'Mg',
  13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar',
};

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createLabFloorTexture(isCosmic: boolean, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isCosmic ? '#070d1c' : '#0f172a';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = isCosmic ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  ctx.strokeStyle = isCosmic ? 'rgba(56, 189, 248, 0.28)' : 'rgba(59, 130, 246, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const PhysicsVRModal: React.FC<PhysicsVRModalProps> = ({
  isOpen,
  onClose,
  templateId,
  topic,
  title,
  parameters,
  initialGyroPermission = 'idle',
}) => {
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [stereoVR, setStereoVR] = useState(false);
  const [gyroEnabled, setGyroEnabled] = useState(true);
  const [gyroPerm, setGyroPerm] = useState<GyroPermissionState>(initialGyroPermission);
  const [hasGyroSignal, setHasGyroSignal] = useState(false);
  const [gyroAngles, setGyroAngles] = useState<{ alpha: number; beta: number; gamma: number }>({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });
  const [liveTelemetry, setLiveTelemetry] = useState<string>('');
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const stateRef = useRef({
    templateId,
    parameters,
    isPlaying,
    stereoVR,
    gyroEnabled,
    simTime: 0,
    recenterFlag: false,
    zoomDelta: 0,
  });
  stateRef.current.templateId = templateId;
  stateRef.current.parameters = parameters;
  stateRef.current.isPlaying = isPlaying;
  stateRef.current.stereoVR = stereoVR;
  stateRef.current.gyroEnabled = gyroEnabled;

  // Attempt native fullscreen on modal mount (gracefully ignored in restricted iframes)
  useEffect(() => {
    if (!isOpen) return;
    const el = modalRootRef.current;
    if (el && typeof el.requestFullscreen === 'function' && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isOpen]);

  // Escape key exits VR View
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleToggleGyro = async () => {
    if (!gyroEnabled) {
      const perm = await requestGyroPermission();
      setGyroPerm(perm);
      if (perm !== 'denied') {
        stateRef.current.recenterFlag = true;
        setGyroEnabled(true);
      }
    } else {
      setGyroEnabled(false);
    }
  };

  const handleRecenter = () => {
    stateRef.current.recenterFlag = true;
  };

  const handleResetSim = () => {
    stateRef.current.simTime = 0;
  };

  // Main Three.js VR Stage Lifecycle
  useEffect(() => {
    if (!isOpen) return;
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

    const scene = new THREE.Scene();
    const isCosmic = templateId === 'atom';
    const bgHex = isCosmic ? 0x030712 : 0x0b1220;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, isCosmic ? 0.015 : 0.014);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.75;

    const camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || 800) / (container.clientHeight || 600),
      0.1,
      160
    );

    const stereoCamera = new THREE.StereoCamera();
    stereoCamera.aspect = 0.5;
    stereoCamera.eyeSep = 0.064;

    // Default vantage points per physics template
    const getPresetPose = (tid: TemplateId) => {
      switch (tid) {
        case 'projectile_motion':
          return { pos: new THREE.Vector3(6, 5.2, 18.5), target: new THREE.Vector3(6, 2.5, 0) };
        case 'free_fall':
          return { pos: new THREE.Vector3(0, 6.2, 15.5), target: new THREE.Vector3(0, 4.5, 0) };
        case 'shm':
          return { pos: new THREE.Vector3(1.5, 3.6, 11.5), target: new THREE.Vector3(1.5, 1.4, 0) };
        case 'atom':
          return { pos: new THREE.Vector3(0, 2.6, 13.5), target: new THREE.Vector3(0, 0, 0) };
        case 'kinematics':
          return { pos: new THREE.Vector3(6, 3.6, 14), target: new THREE.Vector3(6, 1.0, 0) };
        case 'optics':
          return { pos: new THREE.Vector3(0, 3.2, 13.5), target: new THREE.Vector3(0, 1.6, 0) };
        case 'equation_plotter':
          return { pos: new THREE.Vector3(0, 4.5, 16), target: new THREE.Vector3(0, 2.0, 0) };
        default:
          return { pos: new THREE.Vector3(0, 4.5, 15), target: new THREE.Vector3(0, 2, 0) };
      }
    };

    const initialPose = getPresetPose(templateId);
    camera.position.copy(initialPose.pos);
    camera.lookAt(initialPose.target);

    // Track base orientation for VR gyro head-look + touch yaw/pitch adjustments
    const baseLookQuat = camera.quaternion.clone();
    let baseEyePos = initialPose.pos.clone();
    let manualYawOffset = 0;
    let manualPitchOffset = 0;
    let isDraggingLook = false;
    let lastDragX = 0;
    let lastDragY = 0;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = !isSoftwareGl;
    orbit.dampingFactor = 0.08;
    orbit.target.copy(initialPose.target);
    orbit.minDistance = 4;
    orbit.maxDistance = 45;
    orbit.maxPolarAngle = Math.PI * 0.85;
    orbit.update();

    // Three-point Studio Lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.65);
    keyLight.position.set(14, 22, 16);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 65;
      keyLight.shadow.camera.left = -22;
      keyLight.shadow.camera.right = 22;
      keyLight.shadow.camera.top = 20;
      keyLight.shadow.camera.bottom = -20;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-14, 10, -14);
    scene.add(rimLight);

    // Track disposables
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const texs: THREE.Texture[] = [];

    const floorTex = createLabFloorTexture(isCosmic, maxAnisotropy);
    texs.push(floorTex);
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.08,
    });
    geos.push(floorGeo);
    mats.push(floorMat);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = isCosmic ? -6.5 : 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle starry/reference particles around 360° VR sphere so head-turning always has depth cues
    const starCount = 260;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = 34 + Math.random() * 24;
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 1;
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: isCosmic ? 0x7dd3fc : 0x94a3b8,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
    });
    geos.push(starGeo);
    mats.push(starMat);
    scene.add(new THREE.Points(starGeo, starMat));

    // Build Template-Specific 3D Apparatus
    const apparatusGroup = new THREE.Group();
    scene.add(apparatusGroup);

    // Dynamic handles updated inside tick()
    let updateSceneFn: (simT: number, dt: number) => string = () => '';

    if (templateId === 'projectile_motion') {
      const U = parameters.U ?? 25;
      const theta = parameters.theta ?? 45;
      const g = parameters.g ?? 9.8;
      const thetaRad = (theta * Math.PI) / 180;
      const flightTime = (2 * U * Math.sin(thetaRad)) / g;
      const range = (U * U * Math.sin(2 * thetaRad)) / g;
      const maxH = (U * U * Math.sin(thetaRad) * Math.sin(thetaRad)) / (2 * g);
      const worldSpan = 16;
      const physScale = Math.min(worldSpan / Math.max(range, 12), 11 / Math.max(maxH, 6), 0.55);

      // Launching pad (composite)
      const padGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.18, 24);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 18);
      wheelGeo.rotateX(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.3 });
      const barrelGeo = new THREE.CylinderGeometry(0.24, 0.34, 2.2, 20);
      barrelGeo.rotateZ(-Math.PI / 2);
      barrelGeo.translate(0.85, 0, 0);
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85 });
      const muzzleRingGeo = new THREE.TorusGeometry(0.25, 0.045, 10, 20);
      muzzleRingGeo.rotateY(Math.PI / 2);
      muzzleRingGeo.translate(1.94, 0, 0);
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 });
      geos.push(padGeo, wheelGeo, barrelGeo, muzzleRingGeo);
      mats.push(padMat, wheelMat, barrelMat, brassMat);

      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, 0.09, 0);
      pad.receiveShadow = true;
      apparatusGroup.add(pad);

      const cannonGroup = new THREE.Group();
      cannonGroup.position.set(0, 0.55, 0);
      const wL = new THREE.Mesh(wheelGeo, wheelMat);
      wL.position.z = 0.42;
      const wR = new THREE.Mesh(wheelGeo, wheelMat);
      wR.position.z = -0.42;
      const barrelPivot = new THREE.Group();
      barrelPivot.rotation.z = thetaRad;
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.castShadow = true;
      const muzzleRing = new THREE.Mesh(muzzleRingGeo, brassMat);
      barrelPivot.add(barrel, muzzleRing);
      cannonGroup.add(wL, wR, barrelPivot);
      apparatusGroup.add(cannonGroup);

      // Trajectory Curve (3D Tube)
      const curvePts: THREE.Vector3[] = [];
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * flightTime;
        const px = U * Math.cos(thetaRad) * t * physScale;
        const py = Math.max(0.15, (U * Math.sin(thetaRad) * t - 0.5 * g * t * t) * physScale + 0.55);
        curvePts.push(new THREE.Vector3(px, py, 0));
      }
      const trajCurve = new THREE.CatmullRomCurve3(curvePts);
      const trajGeo = new THREE.TubeGeometry(trajCurve, 64, 0.045, 8, false);
      const trajMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
        roughness: 0.3,
      });
      geos.push(trajGeo);
      mats.push(trajMat);
      apparatusGroup.add(new THREE.Mesh(trajGeo, trajMat));

      // Landing target ring
      const targetX = range * physScale;
      const ringGeo = new THREE.RingGeometry(0.55, 0.85, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide });
      geos.push(ringGeo);
      mats.push(ringMat);
      const targetRing = new THREE.Mesh(ringGeo, ringMat);
      targetRing.position.set(targetX, 0.03, 0);
      apparatusGroup.add(targetRing);

      // Flying Projectile Sphere
      const ballGeo = new THREE.SphereGeometry(0.32, 24, 24);
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.35,
        metalness: 0.55,
        roughness: 0.25,
      });
      geos.push(ballGeo);
      mats.push(ballMat);
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.castShadow = true;
      apparatusGroup.add(ball);

      // Impact shockwave ring
      const impactGeo = new THREE.RingGeometry(0.2, 0.45, 28);
      impactGeo.rotateX(-Math.PI / 2);
      const impactMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      geos.push(impactGeo);
      mats.push(impactMat);
      const impactRing = new THREE.Mesh(impactGeo, impactMat);
      impactRing.position.set(targetX, 0.04, 0);
      apparatusGroup.add(impactRing);

      updateSceneFn = (simT) => {
        const cycle = flightTime + 1.0;
        const tLocal = simT % cycle;
        const activeT = Math.min(tLocal, flightTime);
        const px = U * Math.cos(thetaRad) * activeT * physScale;
        const py = Math.max(0.32, (U * Math.sin(thetaRad) * activeT - 0.5 * g * activeT * activeT) * physScale + 0.55);
        ball.position.set(px, py, 0);

        if (tLocal >= flightTime) {
          const post = tLocal - flightTime;
          impactMat.opacity = Math.max(0, 1 - post * 1.4);
          const s = 1 + post * 4.5;
          impactRing.scale.set(s, s, s);
        } else {
          impactMat.opacity = 0;
          impactRing.scale.set(1, 1, 1);
        }
        const realX = U * Math.cos(thetaRad) * activeT;
        const realY = Math.max(0, U * Math.sin(thetaRad) * activeT - 0.5 * g * activeT * activeT);
        return `t = ${activeT.toFixed(2)}s · x = ${realX.toFixed(1)}m · h = ${realY.toFixed(1)}m · Tầm xa = ${range.toFixed(1)}m`;
      };
    } else if (templateId === 'free_fall') {
      const h = parameters.h ?? 45;
      const g = parameters.g ?? 9.8;
      const totalT = Math.sqrt((2 * h) / g);
      const towerH = 9.5;
      const physScale = towerH / Math.max(h, 5);

      // Drop Tower & Base
      const baseGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.25, 28);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.35 });
      const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, towerH + 1.2, 16);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.28 });
      const armGeo = new THREE.BoxGeometry(2.2, 0.18, 0.25);
      const armMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.4 });
      const sphereGeo = new THREE.SphereGeometry(0.42, 26, 26);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.45, roughness: 0.22 });
      const shockGeo = new THREE.RingGeometry(0.25, 0.5, 32);
      shockGeo.rotateX(-Math.PI / 2);
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      geos.push(baseGeo, poleGeo, armGeo, sphereGeo, shockGeo);
      mats.push(baseMat, poleMat, armMat, sphereMat, shockMat);

      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.125;
      base.receiveShadow = true;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(-1.6, (towerH + 1.2) / 2, 0);
      pole.castShadow = true;
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(-0.6, towerH + 0.5, 0);
      const ball = new THREE.Mesh(sphereGeo, sphereMat);
      ball.castShadow = true;
      const shock = new THREE.Mesh(shockGeo, shockMat);
      shock.position.set(0.2, 0.28, 0);

      // Metric tick marks along tower
      const tickGeo = new THREE.BoxGeometry(0.35, 0.06, 0.18);
      geos.push(tickGeo);
      for (let i = 1; i <= 5; i++) {
        const tick = new THREE.Mesh(tickGeo, armMat);
        tick.position.set(-1.35, 0.42 + (towerH * i) / 5, 0);
        apparatusGroup.add(tick);
      }

      apparatusGroup.add(base, pole, arm, ball, shock);

      updateSceneFn = (simT) => {
        const cycle = totalT + 1.1;
        const tLocal = simT % cycle;
        const activeT = Math.min(tLocal, totalT);
        const dropDist = 0.5 * g * activeT * activeT;
        const curH = Math.max(0, h - dropDist);
        const curV = g * activeT;
        ball.position.set(0.2, 0.67 + curH * physScale, 0);

        if (tLocal >= totalT) {
          const post = tLocal - totalT;
          shockMat.opacity = Math.max(0, 1 - post * 1.4);
          const s = 1 + post * 5.0;
          shock.scale.set(s, s, s);
        } else {
          shockMat.opacity = 0;
          shock.scale.set(1, 1, 1);
        }
        return `t = ${activeT.toFixed(2)}s · Độ cao h = ${curH.toFixed(1)}m · Vận tốc v = ${curV.toFixed(1)} m/s`;
      };
    } else if (templateId === 'shm') {
      const A = parameters.A ?? 4;
      const m = parameters.m ?? 2;
      const k = parameters.k ?? 50;
      const omega = Math.sqrt(k / m);
      const physScale = Math.min(4.2 / Math.max(A, 1), 1.0);

      const benchGeo = new THREE.BoxGeometry(12, 0.35, 3.6);
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.25 });
      const wallGeo = new THREE.BoxGeometry(0.45, 2.8, 3.6);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.45 });
      const blockGeo = new THREE.BoxGeometry(1.4, 1.25, 1.4);
      const blockMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.25, metalness: 0.65 });
      const eqGeo = new THREE.BoxGeometry(0.06, 0.04, 3.2);
      const eqMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      geos.push(benchGeo, wallGeo, blockGeo, eqGeo);
      mats.push(benchMat, wallMat, blockMat, eqMat);

      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(0.5, 0.175, 0);
      bench.receiveShadow = true;
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(-5.2, 1.55, 0);
      wall.castShadow = true;
      const block = new THREE.Mesh(blockGeo, blockMat);
      block.castShadow = true;
      const eqMarker = new THREE.Mesh(eqGeo, eqMat);
      eqMarker.position.set(1.5, 0.37, 0);

      // Helical spring mesh scaled along X between wall (-4.97) and block left face
      const helixPts: THREE.Vector3[] = [];
      const coils = 12;
      const segs = 120;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const ang = u * coils * Math.PI * 2;
        const r = i < 6 || i > segs - 6 ? 0.08 : 0.36;
        helixPts.push(new THREE.Vector3(u, Math.cos(ang) * r, Math.sin(ang) * r));
      }
      const springGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 120, 0.055, 8, false);
      const springMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
      geos.push(springGeo);
      mats.push(springMat);
      const springMesh = new THREE.Mesh(springGeo, springMat);
      springMesh.position.set(-4.95, 1.0, 0);
      springMesh.castShadow = true;

      apparatusGroup.add(bench, wall, eqMarker, springMesh, block);

      updateSceneFn = (simT) => {
        const xVal = A * Math.cos(omega * simT);
        const vVal = -A * omega * Math.sin(omega * simT);
        const blockCenterX = 1.5 + xVal * physScale;
        block.position.set(blockCenterX, 0.98, 0);
        const span = Math.max(0.8, blockCenterX - 0.7 - -4.95);
        springMesh.scale.set(span, 1, 1);
        return `x = ${xVal.toFixed(2)}m · v = ${vVal.toFixed(2)} m/s · ω = ${omega.toFixed(2)} rad/s`;
      };
    } else if (templateId === 'atom') {
      const protons = Math.max(1, Math.min(18, Math.round(parameters.protons ?? 6)));
      const neutrons = Math.max(0, Math.round(parameters.neutrons ?? 6));
      const sym = ELEMENT_SYMBOLS[protons] ?? 'E';

      const nucleusGroup = new THREE.Group();
      const pGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.25,
      });
      const nMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.38,
        metalness: 0.45,
      });
      geos.push(pGeo);
      mats.push(pMat, nMat);

      const totalNuc = protons + neutrons;
      for (let i = 0; i < totalNuc; i++) {
        const isProton = i % 2 === 0 ? i / 2 < protons : totalNuc - i <= protons;
        const mesh = new THREE.Mesh(pGeo, isProton ? pMat : nMat);
        const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(1, totalNuc));
        const th = Math.PI * (1 + Math.sqrt(5)) * i;
        const rad = totalNuc === 1 ? 0 : 0.28 + 0.14 * Math.cbrt(i);
        mesh.position.set(
          rad * Math.sin(phi) * Math.cos(th),
          rad * Math.cos(phi),
          rad * Math.sin(phi) * Math.sin(th)
        );
        nucleusGroup.add(mesh);
      }
      apparatusGroup.add(nucleusGroup);

      const shells = [
        { radius: 2.2, count: Math.min(protons, 2), speed: 1.8, tiltX: 0.35, tiltZ: 0.2 },
        { radius: 3.6, count: Math.min(Math.max(0, protons - 2), 8), speed: 1.15, tiltX: -0.55, tiltZ: 0.45 },
        { radius: 5.0, count: Math.max(0, protons - 10), speed: 0.78, tiltX: 0.7, tiltZ: -0.35 },
      ].filter((s) => s.count > 0);

      const eGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const eMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.9,
        roughness: 0.15,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
      });
      geos.push(eGeo);
      mats.push(eMat, ringMat);

      const shellRefs: { pivot: THREE.Group; electrons: THREE.Mesh[]; radius: number; speed: number }[] = [];
      shells.forEach((sh) => {
        const pivot = new THREE.Group();
        pivot.rotation.set(sh.tiltX, 0, sh.tiltZ);
        const ringGeo = new THREE.TorusGeometry(sh.radius, 0.025, 10, 72);
        ringGeo.rotateX(Math.PI / 2);
        geos.push(ringGeo);
        pivot.add(new THREE.Mesh(ringGeo, ringMat));

        const electrons: THREE.Mesh[] = [];
        for (let i = 0; i < sh.count; i++) {
          const eMesh = new THREE.Mesh(eGeo, eMat);
          pivot.add(eMesh);
          electrons.push(eMesh);
        }
        apparatusGroup.add(pivot);
        shellRefs.push({ pivot, electrons, radius: sh.radius, speed: sh.speed });
      });

      updateSceneFn = (simT) => {
        nucleusGroup.rotation.y = simT * 0.4;
        nucleusGroup.rotation.x = simT * 0.25;
        shellRefs.forEach((sh) => {
          sh.electrons.forEach((em, idx) => {
            const ang = simT * sh.speed + (idx * Math.PI * 2) / sh.electrons.length;
            em.position.set(sh.radius * Math.cos(ang), 0, sh.radius * Math.sin(ang));
          });
        });
        return `Nguyên tố ${sym} (Z = ${protons}, N = ${neutrons}, A = ${totalNuc})`;
      };
    } else if (templateId === 'optics') {
      const f = parameters.f ?? 15;
      const u = parameters.u ?? 30;
      const ho = parameters.h_o ?? 6;
      const v = Math.abs(u - f) < 0.05 ? 999 : (f * u) / (u - f);
      const scaleX = 0.14;
      const scaleY = 0.28;

      const railGeo = new THREE.BoxGeometry(16, 0.25, 1.4);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.45 });
      const lensGeo = new THREE.SphereGeometry(2.1, 28, 28);
      lensGeo.scale(0.18, 1.0, 0.6);
      const lensMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.55,
        roughness: 0.08,
        metalness: 0.05,
        clearcoat: 1.0,
      });
      const objGeo = new THREE.CylinderGeometry(0.12, 0.12, ho * scaleY, 14);
      const objMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.4 });
      const imgMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 });
      const rayMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });
      geos.push(railGeo, lensGeo, objGeo);
      mats.push(railMat, lensMat, objMat, imgMat, rayMat);

      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.y = 0.125;
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(0, 2.2, 0);
      const objX = -Math.min(7.2, u * scaleX);
      const objMesh = new THREE.Mesh(objGeo, objMat);
      objMesh.position.set(objX, 2.2 + (ho * scaleY) / 2, 0);
      apparatusGroup.add(rail, lens, objMesh);

      const objTip = new THREE.Vector3(objX, 2.2 + ho * scaleY, 0);
      if (Math.abs(v) < 80) {
        const clampedV = THREE.MathUtils.clamp(v * scaleX, -7.2, 7.2);
        const hi = (-v / u) * ho;
        const imgH = Math.max(0.25, Math.abs(hi * scaleY));
        const imgGeo = new THREE.CylinderGeometry(0.1, 0.1, imgH, 14);
        geos.push(imgGeo);
        const imgMesh = new THREE.Mesh(imgGeo, imgMat);
        imgMesh.position.set(clampedV, 2.2 + (hi >= 0 ? imgH / 2 : -imgH / 2), 0);
        apparatusGroup.add(imgMesh);

        const imgTip = new THREE.Vector3(clampedV, 2.2 + hi * scaleY, 0);
        const ray1 = new THREE.BufferGeometry().setFromPoints([
          objTip,
          new THREE.Vector3(0, objTip.y, 0),
          imgTip,
        ]);
        const ray2 = new THREE.BufferGeometry().setFromPoints([objTip, new THREE.Vector3(0, 2.2, 0), imgTip]);
        geos.push(ray1, ray2);
        apparatusGroup.add(new THREE.Line(ray1, rayMat), new THREE.Line(ray2, rayMat));
      }

      updateSceneFn = () =>
        `f = ${f}cm · d = ${u}cm · d' = ${Math.abs(v) > 500 ? '∞' : `${v.toFixed(1)}cm`}`;
    } else if (templateId === 'kinematics') {
      const u = parameters.u ?? 10;
      const a = parameters.a ?? 3;
      const tMax = parameters.t_max ?? 10;
      const maxS = Math.max(10, Math.abs(u * tMax + 0.5 * a * tMax * tMax), 40);
      const physScale = 14 / maxS;

      const roadGeo = new THREE.BoxGeometry(18, 0.2, 3.2);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
      const bodyGeo = new THREE.BoxGeometry(1.6, 0.65, 1.0);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5, roughness: 0.3 });
      const cabGeo = new THREE.BoxGeometry(0.85, 0.45, 0.9);
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.2, roughness: 0.2 });
      const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16);
      wheelGeo.rotateX(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      geos.push(roadGeo, bodyGeo, cabGeo, wheelGeo);
      mats.push(roadMat, bodyMat, cabMat, wheelMat);

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(6, 0.1, 0);
      road.receiveShadow = true;
      apparatusGroup.add(road);

      const car = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      body.castShadow = true;
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(-0.1, 1.08, 0);
      car.add(body, cab);
      [
        [-0.5, 0.24, 0.52],
        [0.5, 0.24, 0.52],
        [-0.5, 0.24, -0.52],
        [0.5, 0.24, -0.52],
      ].forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(wx, wy, wz);
        car.add(w);
      });
      apparatusGroup.add(car);

      updateSceneFn = (simT) => {
        const t = simT % tMax;
        const s = u * t + 0.5 * a * t * t;
        const v = u + a * t;
        car.position.set(-1 + THREE.MathUtils.clamp(s * physScale, -3, 15), 0.1, 0);
        return `t = ${t.toFixed(2)}s · Quãng đường s = ${s.toFixed(1)}m · Vận tốc v = ${v.toFixed(1)} m/s`;
      };
    } else {
      // equation_plotter or generic 3D parabola
      const a = parameters.a ?? 1;
      const b = parameters.b ?? 0;
      const c = parameters.c ?? -4;
      const pts: THREE.Vector3[] = [];
      for (let x = -5; x <= 5; x += 0.2) {
        const y = THREE.MathUtils.clamp((a * x * x + b * x + c) * 0.25 + 2.5, 0.1, 9.5);
        pts.push(new THREE.Vector3(x * 1.4, y, 0));
      }
      const curveGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.08, 10, false);
      const curveMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.25,
      });
      const axisGeo = new THREE.BoxGeometry(15, 0.05, 0.05);
      const axisMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
      geos.push(curveGeo, axisGeo);
      mats.push(curveMat, axisMat);
      const xAxisMesh = new THREE.Mesh(axisGeo, axisMat);
      xAxisMesh.position.y = 2.5;
      const yAxisMesh = new THREE.Mesh(axisGeo, axisMat);
      yAxisMesh.rotation.z = Math.PI / 2;
      yAxisMesh.position.y = 4.5;
      apparatusGroup.add(xAxisMesh, yAxisMesh, new THREE.Mesh(curveGeo, curveMat));

      updateSceneFn = () => `y = ${a.toFixed(1)}x² + ${b.toFixed(1)}x + ${c.toFixed(1)}`;
    }

    // VR Gyroscope Tracker + Pointer Touch Look Offset
    const gyroTracker = new VRGyroTracker();
    gyroTracker.start(() => setHasGyroSignal(true));

    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current.gyroEnabled && gyroTracker.hasSensorData()) {
        isDraggingLook = true;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingLook) return;
      const dx = e.clientX - lastDragX;
      const dy = e.clientY - lastDragY;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      manualYawOffset -= dx * 0.0045;
      manualPitchOffset = THREE.MathUtils.clamp(manualPitchOffset - dy * 0.0045, -1.1, 1.1);
    };
    const onPointerUp = () => {
      isDraggingLook = false;
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

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

    let disposed = false;
    let frameId = 0;
    let lastNow = performance.now();
    let telemetryTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.002, (now - lastNow) / 1000));
      lastNow = now;

      const cur = stateRef.current;
      if (cur.isPlaying) {
        cur.simTime += dt;
      }

      const telemetry = updateSceneFn(cur.simTime, dt);

      // Handle Recenter request
      if (cur.recenterFlag) {
        cur.recenterFlag = false;
        const pose = getPresetPose(cur.templateId);
        camera.position.copy(pose.pos);
        orbit.target.copy(pose.target);
        camera.lookAt(pose.target);
        baseLookQuat.copy(camera.quaternion);
        baseEyePos.copy(pose.pos);
        manualYawOffset = 0;
        manualPitchOffset = 0;
        gyroTracker.recenter();
        orbit.update();
      }

      // Handle Zoom button nudges
      if (cur.zoomDelta !== 0) {
        const factor = cur.zoomDelta;
        cur.zoomDelta = 0;
        _v1.copy(camera.position).sub(orbit.target);
        const nextLen = THREE.MathUtils.clamp(_v1.length() * factor, 4, 42);
        _v1.normalize().multiplyScalar(nextLen);
        camera.position.copy(orbit.target).add(_v1);
        baseEyePos.copy(camera.position);
        orbit.update();
      }

      const gyroActive = cur.gyroEnabled && gyroTracker.updateRelativeQuaternion(dt, _qGyro);
      if (gyroActive) {
        orbit.enabled = false;
        _qYaw.setFromAxisAngle(_yAxis, manualYawOffset);
        _qPitch.setFromAxisAngle(_xAxis, manualPitchOffset);
        camera.position.copy(baseEyePos);
        camera.quaternion
          .copy(baseLookQuat)
          .multiply(_qYaw)
          .multiply(_qPitch)
          .multiply(_qGyro);
      } else {
        orbit.enabled = true;
        orbit.update();
        baseEyePos.copy(camera.position);
      }

      // Throttle React HUD telemetry state updates (~10Hz) so render loop stays 60fps smooth
      telemetryTimer += dt;
      if (telemetryTimer >= 0.1) {
        telemetryTimer = 0;
        setLiveTelemetry(telemetry);
        if (gyroTracker.hasSensorData()) {
          const ang = gyroTracker.getAngles();
          setGyroAngles({
            alpha: Math.round(ang.alpha),
            beta: Math.round(ang.beta),
            gamma: Math.round(ang.gamma),
          });
        }
      }

      // Mono vs Stereo VR Split-Screen Rendering
      if (cur.stereoVR) {
        renderer.getSize(_renderSize);
        const w = _renderSize.x;
        const h = _renderSize.y;
        camera.updateMatrixWorld();
        stereoCamera.update(camera);
        renderer.setScissorTest(true);

        renderer.setScissor(0, 0, w / 2, h);
        renderer.setViewport(0, 0, w / 2, h);
        renderer.render(scene, stereoCamera.cameraL);

        renderer.setScissor(w / 2, 0, w / 2, h);
        renderer.setViewport(w / 2, 0, w / 2, h);
        renderer.render(scene, stereoCamera.cameraR);

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
      } else {
        renderer.setScissorTest(false);
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      gyroTracker.stop();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      orbit.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
      envTarget.dispose();
      roomEnv.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, templateId, parameters]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRootRef}
      className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 select-none overflow-hidden"
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Center Stereo VR Divider Line */}
      {stereoVR && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/30 z-10" />
      )}

      {/* Top Compact Floating HUD */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-white/15 shadow-xl max-w-[92vw]">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 whitespace-nowrap shrink-0">
            <Glasses className="w-4 h-4" />
            <span>VR View 3D</span>
          </div>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate max-w-[240px] sm:max-w-[360px]">
              {title}
            </div>
            {liveTelemetry && (
              <div className="text-[11px] font-mono tabular-nums text-slate-300 truncate">
                {liveTelemetry}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-white/15 shadow-xl">
          <button
            type="button"
            onClick={handleToggleGyro}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              gyroEnabled
                ? hasGyroSignal
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Bật/Tắt xoay góc nhìn bằng con quay hồi chuyển thiết bị di động"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>
              {gyroPerm === 'denied'
                ? 'Quyền cảm biến bị chặn'
                : gyroEnabled
                ? hasGyroSignal
                  ? 'Con quay: Đang xoay'
                  : needsGyroPermissionPrompt() && gyroPerm !== 'granted'
                  ? 'Cấp quyền Con quay'
                  : 'Con quay: Sẵn sàng'
                : 'Con quay: Tắt'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRecenter}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="Đặt lại tâm nhìn thẳng về phía thí nghiệm"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Đặt lại tâm nhìn</span>
          </button>

          <button
            type="button"
            onClick={() => setStereoVR((s) => !s)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              stereoVR
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Chia đôi màn hình cho kính thực tế ảo VR Box / Cardboard"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{stereoVR ? '2 Mắt VR' : '1 Màn hình'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="Thoát chế độ VR View toàn màn hình (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Thoát VR</span>
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Center Occlusion) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 max-w-[94vw]">
        <button
          type="button"
          onClick={() => setControlsCollapsed((c) => !c)}
          className="px-3 py-1 rounded-lg bg-slate-950/90 border border-white/15 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
        >
          {controlsCollapsed ? 'Hiện điều khiển VR' : 'Ẩn điều khiển VR'}
        </button>

        {!controlsCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-white/15 shadow-2xl text-xs">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Tạm dừng' : 'Tiếp tục'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetSim}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Phát lại</span>
            </button>

            <div className="flex items-center gap-1 border-l border-white/10 pl-2">
              <button
                type="button"
                onClick={() => {
                  stateRef.current.zoomDelta = 1.18;
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  stateRef.current.zoomDelta = 0.84;
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-2 text-[11px] font-mono tabular-nums text-slate-300">
              <span>{topic}</span>
              <span aria-hidden="true">·</span>
              {hasGyroSignal ? (
                <span>
                  α:{gyroAngles.alpha}° β:{gyroAngles.beta}° γ:{gyroAngles.gamma}°
                </span>
              ) : (
                <span className="font-sans text-slate-400">
                  Xoay điện thoại để ngắm góc nhìn VR hoặc kéo chuột 360°
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/95 text-slate-100 text-sm font-medium">
          Không gian 3D VR đang khởi tạo lại...
        </div>
      )}
    </div>
  );
};
