import * as THREE from 'three';
import {
  BreadboardHole,
  BreadboardObj,
  CircuitComp,
  GRID,
  LED_COLOR_MAP,
  LedColorKey,
  OscilloscopeTraceData,
  PinIndex,
  SVG_H,
  SVG_W,
  SolvedCompState,
  formatCapacitance,
  formatInductance,
  formatResistance,
  getBreadboardHoles,
  getCompPins,
  getLdrResistance,
  getResistorColorBands,
  snap,
} from './circuitSandboxCore';

export const SVG_3D_SCALE = 0.05; // 20px GRID = 1.0 Three.js unit
export const BOARD_TOP_Y = 0.36; // Height of top surface of a Breadboard in 3D units

export function svgToWorld3D(x: number, y: number): { wx: number; wz: number } {
  return {
    wx: (x - SVG_W / 2) * SVG_3D_SCALE,
    wz: (y - SVG_H / 2) * SVG_3D_SCALE,
  };
}

export function world3DToSvg(wx: number, wz: number): { x: number; y: number } {
  return {
    x: Math.max(20, Math.min(SVG_W - 20, snap(wx / SVG_3D_SCALE + SVG_W / 2))),
    y: Math.max(20, Math.min(SVG_H - 20, snap(wz / SVG_3D_SCALE + SVG_H / 2))),
  };
}

export function isCompOnBreadboard(comp: CircuitComp, breadboards: BreadboardObj[]): boolean {
  for (const bb of breadboards) {
    const minX = bb.x - 10;
    const maxX = bb.x + (bb.cols - 1) * GRID + 10;
    const minY = bb.y - 175;
    const maxY = bb.y + 175;
    if (comp.x >= minX && comp.x <= maxX && comp.y >= minY && comp.y <= maxY) {
      return true;
    }
  }
  return false;
}

export function getLocalPinOffsetUnified(type: CircuitComp['type'], pin: PinIndex): { lx: number; lz: number } {
  if (type === 'ground') return { lx: 0, lz: -1.0 };
  if (type === 'pot') {
    if (pin === 0) return { lx: -2.0, lz: 0 };
    if (pin === 1) return { lx: 2.0, lz: 0 };
    return { lx: 0, lz: -1.0 };
  }
  if (type === 'bjt') {
    if (pin === 0) return { lx: -2.0, lz: 0 };
    if (pin === 1) return { lx: 1.0, lz: -1.0 };
    return { lx: 1.0, lz: 1.0 };
  }
  if (type === 'opamp') {
    if (pin === 0) return { lx: -2.0, lz: -1.0 };
    if (pin === 1) return { lx: -2.0, lz: 1.0 };
    return { lx: 2.0, lz: 0 };
  }
  if (type === 'pushbutton') {
    if (pin === 0) return { lx: -1.0, lz: -1.0 };
    if (pin === 1) return { lx: -1.0, lz: 1.0 };
    if (pin === 2) return { lx: 1.0, lz: -1.0 };
    return { lx: 1.0, lz: 1.0 };
  }
  if (type === 'multimeter' || type === 'oscilloscope') {
    return pin === 0 ? { lx: -1.0, lz: 1.0 } : { lx: 1.0, lz: 1.0 };
  }
  if (type === 'mcu8051' || type === 'dec74138') {
    const isLeft = pin < 5;
    const row = pin % 5;
    return { lx: isLeft ? -2.0 : 2.0, lz: (row - 2) * 1.0 };
  }
  if (type === 'sevenseg') {
    const isLeft = pin < 3;
    const row = pin % 3;
    return { lx: isLeft ? -2.0 : 2.0, lz: (row - 1) * 1.0 };
  }
  return { lx: pin === 0 ? -2.0 : 2.0, lz: 0 };
}

function createRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hd = d / 2;
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}

function makeDynamicTextTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  accentHex: string,
  maxAnisotropy: number,
  extraMarks?: { left: string; leftBg: string; right: string; rightBg: string }
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 512, 54);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 54px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 128);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(subtitle, 256, 182);

  if (extraMarks) {
    ctx.fillStyle = extraMarks.leftBg;
    ctx.beginPath();
    ctx.roundRect(26, 196, 86, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px sans-serif';
    ctx.fillText(extraMarks.left, 69, 220);

    ctx.fillStyle = extraMarks.rightBg;
    ctx.beginPath();
    ctx.roundRect(400, 196, 86, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(extraMarks.right, 443, 220);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function makeLdrCellTexture(lightLevel: number, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const warm = Math.round(140 + lightLevel * 110);
  ctx.fillStyle = `rgb(${warm}, ${Math.round(warm * 0.65)}, 60)`;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  // Serpentine CdS tracks
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const y = 52 + i * 30;
    if (i % 2 === 0) {
      ctx.moveTo(46, y);
      ctx.lineTo(210, y);
    } else {
      ctx.lineTo(210, y);
      ctx.lineTo(46, y);
    }
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeLedSmokeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.42, 'rgba(226, 232, 240, 0.55)');
  grad.addColorStop(0.76, 'rgba(148, 163, 184, 0.18)');
  grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function makeLedSparkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(24, 24, 1, 24, 24, 22);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 180, 70, 0.92)');
  grad.addColorStop(0.75, 'rgba(239, 68, 68, 0.35)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 48, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function makeSchematicSymbolTexture(
  comp: CircuitComp,
  isLightCanvas: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bg = isLightCanvas ? '#ffffff' : '#0f172a';
  const strokeMain = isLightCanvas ? '#1e293b' : '#e2e8f0';
  const lead = isLightCanvas ? '#64748b' : '#94a3b8';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = isLightCanvas ? '#cbd5e1' : '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 244);

  const cx = 256;
  const cy = 128;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Horizontal default leads
  if (comp.type !== 'ground' && comp.type !== 'pushbutton' && comp.type !== 'opamp' && comp.type !== 'bjt') {
    ctx.strokeStyle = lead;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(20, cy);
    ctx.lineTo(150, cy);
    ctx.moveTo(362, cy);
    ctx.lineTo(492, cy);
    ctx.stroke();
  }

  if (comp.type === 'source') {
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(222, cy - 36);
    ctx.lineTo(222, cy + 36);
    ctx.stroke();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(290, cy - 68);
    ctx.lineTo(290, cy + 68);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.font = '800 36px sans-serif';
    ctx.fillText('−', 175, cy - 38);
    ctx.fillStyle = '#dc2626';
    ctx.fillText('+', 316, cy - 38);
  } else if (comp.type === 'ac_source') {
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy);
    ctx.quadraticCurveTo(cx - 20, cy - 36, cx, cy);
    ctx.quadraticCurveTo(cx + 20, cy + 36, cx + 40, cy);
    ctx.stroke();
  } else if (comp.type === 'resistor') {
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 11;
    ctx.beginPath();
    const pts = [
      [150, cy],
      [168, cy - 38],
      [204, cy + 38],
      [240, cy - 38],
      [276, cy + 38],
      [312, cy - 38],
      [348, cy + 38],
      [362, cy],
    ];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  } else if (comp.type === 'pot') {
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 10;
    ctx.beginPath();
    const pts = [
      [150, cy],
      [172, cy - 34],
      [208, cy + 34],
      [244, cy - 34],
      [280, cy + 34],
      [316, cy - 34],
      [348, cy + 34],
      [362, cy],
    ];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 20);
    ctx.lineTo(cx, cy - 42);
    ctx.stroke();
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 28);
    ctx.lineTo(cx - 18, cy - 58);
    ctx.lineTo(cx + 18, cy - 58);
    ctx.closePath();
    ctx.fill();
  } else if (comp.type === 'capacitor') {
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 64);
    ctx.lineTo(cx - 26, cy + 64);
    ctx.moveTo(cx + 26, cy - 64);
    ctx.lineTo(cx + 26, cy + 64);
    ctx.stroke();
  } else if (comp.type === 'inductor') {
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const sx = 150 + i * 53;
      ctx.arc(sx + 26.5, cy, 26.5, Math.PI, 0, false);
    }
    ctx.stroke();
  } else if (comp.type === 'diode' || comp.type === 'zener' || comp.type === 'led') {
    const col =
      comp.type === 'zener'
        ? '#0d9488'
        : comp.type === 'led'
        ? (LED_COLOR_MAP[(comp.color as LedColorKey) || 'red'] || LED_COLOR_MAP.red).stroke
        : '#d97706';
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx - 46, cy - 50);
    ctx.lineTo(cx + 46, cy);
    ctx.lineTo(cx - 46, cy + 50);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 46, cy - 52);
    ctx.lineTo(cx + 46, cy + 52);
    if (comp.type === 'zener') {
      ctx.moveTo(cx + 22, cy - 68);
      ctx.lineTo(cx + 46, cy - 52);
      ctx.moveTo(cx + 46, cy + 52);
      ctx.lineTo(cx + 70, cy + 68);
    }
    ctx.stroke();
    if (comp.type === 'led') {
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy - 64);
      ctx.lineTo(cx + 44, cy - 96);
      ctx.moveTo(cx + 48, cy - 52);
      ctx.lineTo(cx + 80, cy - 84);
      ctx.stroke();
    }
  } else if (comp.type === 'ldr') {
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 9;
    ctx.strokeRect(cx - 80, cy - 30, 160, 60);
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 86);
    ctx.lineTo(cx - 24, cy - 42);
    ctx.moveTo(cx + 10, cy - 86);
    ctx.lineTo(cx + 46, cy - 42);
    ctx.stroke();
  } else if (comp.type === 'motor') {
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = strokeMain;
    ctx.font = '800 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', cx, cy + 2);
  } else if (comp.type === 'buzzer') {
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx - 46, cy - 26);
    ctx.lineTo(cx - 10, cy - 26);
    ctx.lineTo(cx + 38, cy - 62);
    ctx.lineTo(cx + 38, cy + 62);
    ctx.lineTo(cx - 10, cy + 26);
    ctx.lineTo(cx - 46, cy + 26);
    ctx.closePath();
    ctx.stroke();
  } else if (comp.type === 'switch') {
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(170, cy, 14, 0, Math.PI * 2);
    ctx.arc(342, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = comp.value >= 0.5 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(170, cy);
    ctx.lineTo(comp.value >= 0.5 ? 342 : 318, comp.value >= 0.5 ? cy : cy - 62);
    ctx.stroke();
  } else if (comp.type === 'pushbutton') {
    ctx.strokeStyle = lead;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(80, 40);
    ctx.lineTo(170, 40);
    ctx.lineTo(170, 216);
    ctx.lineTo(80, 216);
    ctx.moveTo(432, 40);
    ctx.lineTo(342, 40);
    ctx.lineTo(342, 216);
    ctx.lineTo(432, 216);
    ctx.stroke();
    ctx.strokeStyle = comp.value >= 0.5 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(170, cy);
    ctx.lineTo(342, comp.value >= 0.5 ? cy : cy - 38);
    ctx.stroke();
  } else if (comp.type === 'bjt') {
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx + 12, cy, 74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 42);
    ctx.lineTo(cx - 30, cy + 42);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(30, cy);
    ctx.lineTo(cx - 30, cy);
    ctx.moveTo(cx - 30, cy - 18);
    ctx.lineTo(380, 42);
    ctx.moveTo(cx - 30, cy + 18);
    ctx.lineTo(380, 214);
    ctx.stroke();
  } else if (comp.type === 'opamp') {
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(120, 32);
    ctx.lineTo(392, cy);
    ctx.lineTo(120, 224);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = lead;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(20, 74);
    ctx.lineTo(120, 74);
    ctx.moveTo(20, 182);
    ctx.lineTo(120, 182);
    ctx.moveTo(392, cy);
    ctx.lineTo(492, cy);
    ctx.stroke();
    ctx.fillStyle = '#e11d48';
    ctx.font = '800 40px sans-serif';
    ctx.fillText('−', 142, 86);
    ctx.fillStyle = '#059669';
    ctx.fillText('+', 142, 194);
  } else if (comp.type === 'multimeter') {
    const isAmp = comp.meterMode === 'I';
    const col = isAmp ? '#10b981' : '#0284c7';
    ctx.strokeStyle = col;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = lead;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(148, 224);
    ctx.lineTo(148, 178);
    ctx.lineTo(cx - 46, cy + 38);
    ctx.moveTo(364, 224);
    ctx.lineTo(364, 178);
    ctx.lineTo(cx + 46, cy + 38);
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.font = '900 68px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isAmp ? 'A' : 'V', cx, cy - 6);

    ctx.fillStyle = '#334155';
    ctx.font = '800 32px sans-serif';
    ctx.fillText('−', 112, 212);
    ctx.fillStyle = '#dc2626';
    ctx.fillText('+', 400, 212);
  } else if (comp.type === 'oscilloscope') {
    // Schematic Oscilloscope block with stylized sine screen & CH1/GND terminals
    ctx.fillStyle = isLightCanvas ? '#082f49' : '#021526';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(118, 34, 276, 138, 16);
    ctx.fill();
    ctx.stroke();

    // Crosshair graticule
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(132, 103);
    ctx.lineTo(380, 103);
    ctx.moveTo(cx, 44);
    ctx.lineTo(cx, 162);
    ctx.stroke();

    // Glowing cyan sine wave
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const px = 142 + (i / 40) * 228;
      const py = 103 - Math.sin((i / 40) * Math.PI * 4) * 34;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Bottom GND & CH1 leads
    ctx.strokeStyle = lead;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(154, 172);
    ctx.lineTo(154, 224);
    ctx.moveTo(358, 172);
    ctx.lineTo(358, 224);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '800 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GND', 110, 214);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('CH1', 402, 214);
  } else if (comp.type === 'mcu8051' || comp.type === 'dec74138') {
    const isMcu = comp.type === 'mcu8051';
    ctx.strokeStyle = isMcu ? '#0284c7' : '#6366f1';
    ctx.lineWidth = 8;
    ctx.strokeRect(74, 24, 364, 208);
    ctx.fillStyle = isMcu ? '#0284c7' : '#6366f1';
    ctx.font = '800 38px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isMcu ? 'AT89C51' : '74LS138', cx, cy - 16);
    ctx.fillStyle = strokeMain;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(isMcu ? '8051 MCU' : '3 → 8 DEC', cx, cy + 28);
  } else if (comp.type === 'sevenseg') {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(128, 22, 256, 212);
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 92px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('8.', cx, cy + 4);
  } else if (comp.type === 'clockgen') {
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 9;
    ctx.strokeRect(148, 48, 216, 160);
    ctx.beginPath();
    ctx.moveTo(176, cy + 24);
    ctx.lineTo(204, cy + 24);
    ctx.lineTo(204, cy - 26);
    ctx.lineTo(256, cy - 26);
    ctx.lineTo(256, cy + 24);
    ctx.lineTo(308, cy + 24);
    ctx.lineTo(308, cy - 26);
    ctx.lineTo(336, cy - 26);
    ctx.stroke();
  } else if (comp.type === 'ground') {
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(cx, 24);
    ctx.lineTo(cx, 110);
    ctx.moveTo(cx - 90, 110);
    ctx.lineTo(cx + 90, 110);
    ctx.moveTo(cx - 58, 154);
    ctx.lineTo(cx + 58, 154);
    ctx.moveTo(cx - 28, 198);
    ctx.lineTo(cx + 28, 198);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function makeSelectionOutline(w: number, d: number, owned: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] }): THREE.Mesh {
  const shape = createRoundedRectShape(w, d, 0.14);
  const inner = createRoundedRectShape(Math.max(0.2, w - 0.12), Math.max(0.2, d - 0.12), 0.08);
  shape.holes.push(inner);
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.015;
  mesh.visible = false;
  owned.geos.push(geo);
  owned.mats.push(mat);
  return mesh;
}

function buildPinTerminal(
  compId: string,
  pin: PinIndex,
  lx: number,
  lz: number,
  pinY: number,
  accentHex: number,
  owned: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] }
) {
  const group = new THREE.Group();
  group.position.set(lx, pinY, lz);

  const lugGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.14, 16);
  const lugMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.85, roughness: 0.22 });
  const lug = new THREE.Mesh(lugGeo, lugMat);
  lug.position.y = -0.02;
  group.add(lug);

  const collarGeo = new THREE.TorusGeometry(0.12, 0.028, 8, 20);
  const collarMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.35, metalness: 0.15 });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.02;
  group.add(collar);

  const haloGeo = new THREE.RingGeometry(0.16, 0.25, 24);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.025;
  group.add(halo);

  const proxyGeo = new THREE.SphereGeometry(0.28, 10, 10);
  const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const proxy = new THREE.Mesh(proxyGeo, proxyMat);
  proxy.userData = { hitKind: 'pin', compId, pin };
  group.add(proxy);

  owned.geos.push(lugGeo, collarGeo, haloGeo, proxyGeo);
  owned.mats.push(lugMat, collarMat, haloMat, proxyMat);

  return { group, proxy, halo };
}

function addLeadToPin(
  root: THREE.Group,
  from: THREE.Vector3,
  toX: number,
  toZ: number,
  leadMat: THREE.Material,
  owned: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] },
  tagBody: (o: THREE.Object3D) => void
) {
  const mid = new THREE.Vector3(
    THREE.MathUtils.lerp(from.x, toX, 0.7),
    Math.max(0.15, from.y * 0.72),
    THREE.MathUtils.lerp(from.z, toZ, 0.7)
  );
  const curve = new THREE.CatmullRomCurve3([from, mid, new THREE.Vector3(toX, 0.02, toZ)]);
  const geo = new THREE.TubeGeometry(curve, 12, 0.032, 8, false);
  const mesh = new THREE.Mesh(geo, leadMat);
  mesh.castShadow = true;
  root.add(mesh);
  tagBody(mesh);
  owned.geos.push(geo);
}

// ---------------------------------------------------------------------------
// 3D Solderless Breadboard (25 Columns + +/- Rails + Instanced Sockets)
// ---------------------------------------------------------------------------

export interface Breadboard3DHandles {
  root: THREE.Group;
  holes: BreadboardHole[];
  holeSocketsMesh: THREE.InstancedMesh;
  holeRimMesh: THREE.InstancedMesh;
  selectionOutline: THREE.Mesh;
  hitBody: THREE.Mesh;
  updateHoleHighlights: (
    highlightedNetKey: string | null,
    hoveredHoleId: string | null,
    wireStartHoleId: string | null
  ) => void;
  dispose: () => void;
}

const _bbColor = new THREE.Color();

export function createBreadboard3DMesh(
  bb: BreadboardObj,
  options: { maxAnisotropy: number }
): Breadboard3DHandles {
  const root = new THREE.Group();
  const originWorld = svgToWorld3D(bb.x, bb.y);
  root.position.set(originWorld.wx, 0, originWorld.wz);

  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedTex: THREE.Texture[] = [];

  const totalW = (bb.cols - 1) * 1.0 + 1.8; // e.g., 24 + 1.8 = 25.8
  const centerLocalX = ((bb.cols - 1) * 1.0) / 2;
  const totalD = 18.2; // spans dy = -160..+160 (-8..+8) plus border

  // Main ABS plastic body (top surface = BOARD_TOP_Y = 0.36)
  const bodyGeo = new THREE.BoxGeometry(totalW, BOARD_TOP_Y, totalD);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.42,
    metalness: 0.04,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(centerLocalX, BOARD_TOP_Y / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { hitKind: 'breadboard', bbId: bb.id };
  root.add(body);
  ownedGeos.push(bodyGeo);
  ownedMats.push(bodyMat);

  // Subtle side skirt base
  const skirtGeo = new THREE.BoxGeometry(totalW + 0.16, 0.08, totalD + 0.16);
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.set(centerLocalX, 0.04, 0);
  skirt.userData = { hitKind: 'breadboard', bbId: bb.id };
  root.add(skirt);
  ownedGeos.push(skirtGeo);
  ownedMats.push(skirtMat);

  // Center DIP IC Ravine groove
  const ravineGeo = new THREE.BoxGeometry(totalW - 0.6, 0.06, 0.92);
  const ravineMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ee, roughness: 0.7 });
  const ravine = new THREE.Mesh(ravineGeo, ravineMat);
  ravine.position.set(centerLocalX, BOARD_TOP_Y - 0.02, 0);
  ravine.userData = { hitKind: 'breadboard', bbId: bb.id };
  root.add(ravine);
  ownedGeos.push(ravineGeo);
  ownedMats.push(ravineMat);

  // Colored power rail stripes (+ red, - blue)
  const stripeGeo = new THREE.BoxGeometry(totalW - 1.0, 0.01, 0.08);
  const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });

  const makeStripe = (zPos: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(stripeGeo, mat);
    m.position.set(centerLocalX, BOARD_TOP_Y + 0.004, zPos);
    root.add(m);
  };
  makeStripe(-8.55, blueMat);
  makeStripe(-6.45, redMat);
  makeStripe(6.45, redMat);
  makeStripe(8.55, blueMat);
  ownedGeos.push(stripeGeo);
  ownedMats.push(redMat, blueMat);

  // Column markings decal along top & bottom edges
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 128;
  const lctx = labelCanvas.getContext('2d')!;
  lctx.clearRect(0, 0, 1024, 128);
  lctx.fillStyle = '#475569';
  lctx.font = '700 28px "JetBrains Mono", monospace';
  lctx.textAlign = 'center';
  lctx.textBaseline = 'middle';
  for (let c = 0; c < bb.cols; c++) {
    if (c === 0 || (c + 1) % 5 === 0) {
      const px = ((c + 0.9) / (bb.cols + 0.8)) * 1024;
      lctx.fillText(String(c + 1), px, 64);
    }
  }
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = options.maxAnisotropy;
  ownedTex.push(labelTex);

  const labelPlaneGeo = new THREE.PlaneGeometry(totalW - 0.2, 0.7);
  const labelPlaneMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false });
  const topColNums = new THREE.Mesh(labelPlaneGeo, labelPlaneMat);
  topColNums.rotation.x = -Math.PI / 2;
  topColNums.position.set(centerLocalX, BOARD_TOP_Y + 0.008, -5.75);
  root.add(topColNums);
  ownedGeos.push(labelPlaneGeo);
  ownedMats.push(labelPlaneMat);

  // Instanced holes (all 350 sockets rendered in 2 GPU draw calls!)
  const holes = getBreadboardHoles(bb);
  const count = holes.length;

  const rimGeo = new THREE.BoxGeometry(0.46, 0.02, 0.46);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.05,
  });
  const holeRimMesh = new THREE.InstancedMesh(rimGeo, rimMat, count);
  holeRimMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const sockGeo = new THREE.BoxGeometry(0.28, 0.03, 0.28);
  const sockMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
  });
  const holeSocketsMesh = new THREE.InstancedMesh(sockGeo, sockMat, count);
  holeSocketsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const dummy = new THREE.Object3D();
  holes.forEach((h, i) => {
    const lx = (h.x - bb.x) * SVG_3D_SCALE;
    const lz = (h.y - bb.y) * SVG_3D_SCALE;
    dummy.position.set(lx, BOARD_TOP_Y + 0.002, lz);
    dummy.updateMatrix();
    holeRimMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lx, BOARD_TOP_Y + 0.01, lz);
    dummy.updateMatrix();
    holeSocketsMesh.setMatrixAt(i, dummy.matrix);

    holeRimMesh.setColorAt(i, _bbColor.setHex(0xe2e8f0));
    holeSocketsMesh.setColorAt(i, _bbColor.setHex(0x1e293b));
  });
  holeRimMesh.instanceMatrix.needsUpdate = true;
  holeSocketsMesh.instanceMatrix.needsUpdate = true;
  if (holeRimMesh.instanceColor) holeRimMesh.instanceColor.needsUpdate = true;
  if (holeSocketsMesh.instanceColor) holeSocketsMesh.instanceColor.needsUpdate = true;
  holeRimMesh.computeBoundingSphere();
  holeSocketsMesh.computeBoundingSphere();

  root.add(holeRimMesh, holeSocketsMesh);
  ownedGeos.push(rimGeo, sockGeo);
  ownedMats.push(rimMat, sockMat);

  // Selection outline
  const selectionOutline = makeSelectionOutline(totalW + 0.4, totalD + 0.4, { geos: ownedGeos, mats: ownedMats });
  selectionOutline.position.set(centerLocalX, 0.02, 0);
  root.add(selectionOutline);

  const updateHoleHighlights = (
    highlightedNetKey: string | null,
    hoveredHoleId: string | null,
    wireStartHoleId: string | null
  ) => {
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      const isWireStart = wireStartHoleId === h.holeId;
      const isHover = hoveredHoleId === h.holeId;
      const isConnected = highlightedNetKey !== null && h.netKey === highlightedNetKey;

      if (isWireStart) {
        holeRimMesh.setColorAt(i, _bbColor.setHex(0xf59e0b));
        holeSocketsMesh.setColorAt(i, _bbColor.setHex(0xfef08a));
      } else if (isHover) {
        holeRimMesh.setColorAt(i, _bbColor.setHex(0x22c55e));
        holeSocketsMesh.setColorAt(i, _bbColor.setHex(0x86efac));
      } else if (isConnected) {
        holeRimMesh.setColorAt(i, _bbColor.setHex(0x4ade80));
        holeSocketsMesh.setColorAt(i, _bbColor.setHex(0x166534));
      } else {
        holeRimMesh.setColorAt(i, _bbColor.setHex(0xe2e8f0));
        holeSocketsMesh.setColorAt(i, _bbColor.setHex(0x1e293b));
      }
    }
    if (holeRimMesh.instanceColor) holeRimMesh.instanceColor.needsUpdate = true;
    if (holeSocketsMesh.instanceColor) holeSocketsMesh.instanceColor.needsUpdate = true;
  };

  return {
    root,
    holes,
    holeSocketsMesh,
    holeRimMesh,
    selectionOutline,
    hitBody: body,
    updateHoleHighlights,
    dispose: () => {
      ownedGeos.forEach((g) => g.dispose());
      ownedMats.forEach((m) => m.dispose());
      ownedTex.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------
// All 17 Procedural 3D Circuit Components
// ---------------------------------------------------------------------------

export interface LedOverloadParticle {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  phase: number;
  speed: number;
  vx: number;
  vz: number;
  seed: number;
  baseScale: number;
  isSpark: boolean;
}

export interface UnifiedComp3DHandles {
  root: THREE.Group;
  bodyHits: THREE.Object3D[];
  pinProxies: { pin: PinIndex; mesh: THREE.Mesh; halo: THREE.Mesh }[];
  selectionRing: THREE.Mesh;
  baseY: number;
  // Runtime / interactive references
  switchLeverPivot?: THREE.Group;
  switchStatusMat?: THREE.MeshStandardMaterial;
  pushbuttonCap?: THREE.Mesh;
  potKnobPivot?: THREE.Group;
  motorRotorPivot?: THREE.Group;
  buzzerRingMesh?: THREE.Mesh;
  ledDomeMat?: THREE.MeshPhysicalMaterial;
  ledCoreMat?: THREE.MeshStandardMaterial;
  ledFlangeMat?: THREE.MeshStandardMaterial;
  ledLight?: THREE.PointLight;
  ledAlertHalo?: THREE.Mesh;
  ledOverloadGroup?: THREE.Group;
  ledOverloadParticles?: LedOverloadParticle[];
  ledSmokeOriginY?: number;
  ledOverloadStrength?: number;
  warningRing?: THREE.Mesh;
  resistorBandMeshes?: THREE.Mesh[];
  meterDialPivot?: THREE.Group;
  meterModeLedV?: THREE.MeshStandardMaterial;
  meterModeLedI?: THREE.MeshStandardMaterial;
  updateMultimeterLcd?: (readingText: string, mode: 'V' | 'I', targetLabel: string, hasTarget: boolean) => void;
  scopeKnobPivot?: THREE.Group;
  updateOscilloscopeScreen?: (
    trace: OscilloscopeTraceData | undefined,
    timeWindowSec: number,
    vDiv: number,
    isRunning: boolean
  ) => void;
  updateDynamicSpec?: (comp: CircuitComp, maxAnisotropy: number) => void;
  updateBurnState?: (burned: boolean) => void;
  mcuPortLedMats?: THREE.MeshStandardMaterial[];
  decOutLedMats?: THREE.MeshStandardMaterial[];
  sevenSegMats?: THREE.MeshStandardMaterial[];
  clockLedMat?: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createUnifiedComp3DMesh(
  comp: CircuitComp,
  isOverBreadboard: boolean,
  options: {
    isSoftwareGl: boolean;
    maxAnisotropy: number;
    symbolMode?: 'realistic' | 'schematic';
    isLightCanvas?: boolean;
  }
): UnifiedComp3DHandles {
  const { isSoftwareGl, maxAnisotropy, symbolMode = 'realistic', isLightCanvas = true } = options;
  const baseY = isOverBreadboard ? BOARD_TOP_Y : 0;

  const root = new THREE.Group();
  const origin = svgToWorld3D(comp.x, comp.y);
  root.position.set(origin.wx, baseY, origin.wz);
  root.rotation.y = comp.type === 'ground' ? 0 : -THREE.MathUtils.degToRad(comp.rotation);

  const owned = {
    geos: [] as THREE.BufferGeometry[],
    mats: [] as THREE.Material[],
    texs: [] as THREE.Texture[],
  };
  const bodyHits: THREE.Object3D[] = [];
  const pinProxies: { pin: PinIndex; mesh: THREE.Mesh; halo: THREE.Mesh }[] = [];

  const tagBody = (obj: THREE.Object3D) => {
    obj.userData = { hitKind: 'component', compId: comp.id };
    bodyHits.push(obj);
  };

  const pins = getCompPins(comp.type);
  const leadMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.88, roughness: 0.2 });
  owned.mats.push(leadMat);

  let selectionRing: THREE.Mesh;
  let switchLeverPivot: THREE.Group | undefined;
  let switchStatusMat: THREE.MeshStandardMaterial | undefined;
  let pushbuttonCap: THREE.Mesh | undefined;
  let potKnobPivot: THREE.Group | undefined;
  let motorRotorPivot: THREE.Group | undefined;
  let buzzerRingMesh: THREE.Mesh | undefined;
  let ledDomeMat: THREE.MeshPhysicalMaterial | undefined;
  let ledCoreMat: THREE.MeshStandardMaterial | undefined;
  let ledFlangeMat: THREE.MeshStandardMaterial | undefined;
  let ledLight: THREE.PointLight | undefined;
  let ledAlertHalo: THREE.Mesh | undefined;
  let ledOverloadGroup: THREE.Group | undefined;
  let ledOverloadParticles: LedOverloadParticle[] | undefined;
  let ledSmokeOriginY: number | undefined;
  let warningRing: THREE.Mesh | undefined;
  let resistorBandMeshes: THREE.Mesh[] | undefined;
  let mcuPortLedMats: THREE.MeshStandardMaterial[] | undefined;
  let decOutLedMats: THREE.MeshStandardMaterial[] | undefined;
  let sevenSegMats: THREE.MeshStandardMaterial[] | undefined;
  let clockLedMat: THREE.MeshStandardMaterial | undefined;

  const attachLedOverloadFx = (originY: number) => {
    ledSmokeOriginY = originY;

    const haloGeo = new THREE.RingGeometry(0.42, 0.56, 28);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    ledAlertHalo = new THREE.Mesh(haloGeo, haloMat);
    ledAlertHalo.rotation.x = -Math.PI / 2;
    ledAlertHalo.position.set(0, originY - 0.14, 0);
    ledAlertHalo.visible = false;
    root.add(ledAlertHalo);
    owned.geos.push(haloGeo);
    owned.mats.push(haloMat);

    const smokeTex = makeLedSmokeTexture(maxAnisotropy);
    const sparkTex = makeLedSparkTexture(maxAnisotropy);
    owned.texs.push(smokeTex, sparkTex);

    ledOverloadGroup = new THREE.Group();
    ledOverloadGroup.visible = false;
    root.add(ledOverloadGroup);

    const smokeColors = [0x475569, 0x334155, 0x64748b, 0x1e293b];
    const sparkColors = [0xff4500, 0xef4444, 0xfbbf24, 0xff6b35];
    const particles: LedOverloadParticle[] = [];

    // 12 rising charcoal/gray smoke wisps
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTex,
        color: smokeColors[i % smokeColors.length],
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(0, originY, 0);
      sprite.renderOrder = 4;
      ledOverloadGroup.add(sprite);
      owned.mats.push(mat);

      const angle = (i / 12) * Math.PI * 2 + i * 0.7;
      particles.push({
        sprite,
        mat,
        phase: i / 12,
        speed: 0.42 + (i % 4) * 0.08,
        vx: Math.cos(angle) * 0.28,
        vz: Math.sin(angle) * 0.28,
        seed: i * 1.73,
        baseScale: 0.55 + (i % 3) * 0.18,
        isSpark: false,
      });
    }

    // 4 hot glowing orange-red micro-sparks near the junction
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.SpriteMaterial({
        map: sparkTex,
        color: sparkColors[i % sparkColors.length],
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(0, originY, 0);
      sprite.renderOrder = 5;
      ledOverloadGroup.add(sprite);
      owned.mats.push(mat);

      const angle = (i / 4) * Math.PI * 2 + 0.5;
      particles.push({
        sprite,
        mat,
        phase: i / 4,
        speed: 0.95 + (i % 2) * 0.25,
        vx: Math.cos(angle) * 0.42,
        vz: Math.sin(angle) * 0.42,
        seed: 11 + i * 2.4,
        baseScale: 0.24,
        isSpark: true,
      });
    }

    ledOverloadParticles = particles;
  };
  let meterDialPivot: THREE.Group | undefined;
  let meterModeLedV: THREE.MeshStandardMaterial | undefined;
  let meterModeLedI: THREE.MeshStandardMaterial | undefined;
  let updateMultimeterLcd:
    | ((readingText: string, mode: 'V' | 'I', targetLabel: string, hasTarget: boolean) => void)
    | undefined;
  let scopeKnobPivot: THREE.Group | undefined;
  let updateOscilloscopeScreen:
    | ((trace: OscilloscopeTraceData | undefined, timeWindowSec: number, vDiv: number, isRunning: boolean) => void)
    | undefined;
  let updateDynamicSpec: ((c: CircuitComp, maxAni: number) => void) | undefined;
  const burnableMats: { mat: THREE.MeshStandardMaterial; origColor: number }[] = [];

  const registerBurnable = (mat: THREE.MeshStandardMaterial) => {
    burnableMats.push({ mat, origColor: mat.color.getHex() });
  };

  // Shared fault/short/overload warning halo
  const warnGeo = new THREE.RingGeometry(0.65, 0.85, 28);
  const warnMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  warningRing = new THREE.Mesh(warnGeo, warnMat);
  warningRing.rotation.x = -Math.PI / 2;
  warningRing.position.y = 0.03;
  warningRing.visible = false;
  root.add(warningRing);
  owned.geos.push(warnGeo);
  owned.mats.push(warnMat);

  if (symbolMode === 'schematic') {
    const tileW = comp.type === 'ground' ? 1.5 : comp.type === 'pushbutton' ? 2.2 : 3.2;
    const tileD =
      comp.type === 'mcu8051' || comp.type === 'dec74138'
        ? 4.4
        : comp.type === 'sevenseg'
        ? 2.6
        : comp.type === 'opamp' || comp.type === 'bjt' || comp.type === 'pushbutton'
        ? 2.1
        : 1.5;
    selectionRing = makeSelectionOutline(tileW + 0.85, tileD + 0.4, owned);
    root.add(selectionRing);

    const tileGeo = new THREE.BoxGeometry(tileW, 0.08, tileD);
    const tileMat = new THREE.MeshStandardMaterial({
      color: isLightCanvas ? 0xf8fafc : 0x1e293b,
      roughness: 0.45,
      metalness: 0.05,
    });
    registerBurnable(tileMat);
    const tile = new THREE.Mesh(tileGeo, tileMat);
    tile.position.y = 0.08;
    tile.castShadow = true;
    tile.receiveShadow = true;
    root.add(tile);
    tagBody(tile);

    let symTex = makeSchematicSymbolTexture(comp, isLightCanvas, maxAnisotropy);
    owned.texs.push(symTex);
    const faceGeo = new THREE.PlaneGeometry(tileW - 0.08, tileD - 0.08);
    const faceMat = new THREE.MeshBasicMaterial({ map: symTex });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.125;
    root.add(face);
    tagBody(face);

    updateDynamicSpec = (c, ani) => {
      const next = makeSchematicSymbolTexture(c, isLightCanvas, ani);
      faceMat.map = next;
      faceMat.needsUpdate = true;
      symTex.dispose();
      symTex = next;
    };

    if (comp.type === 'switch' || comp.type === 'pushbutton') {
      const togGeo = new THREE.BoxGeometry(1.1, 0.14, 0.7);
      const togMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const togHit = new THREE.Mesh(togGeo, togMat);
      togHit.position.y = 0.16;
      togHit.userData = { hitKind: 'toggle', compId: comp.id };
      root.add(togHit);
      owned.geos.push(togGeo);
      owned.mats.push(togMat);
    }

    if (comp.type === 'led') {
      const spec = LED_COLOR_MAP[(comp.color as LedColorKey) || 'red'] || LED_COLOR_MAP.red;
      const coreGeo = new THREE.SphereGeometry(0.18, 14, 14);
      ledCoreMat = new THREE.MeshStandardMaterial({
        color: spec.onFill,
        emissive: spec.onFill,
        emissiveIntensity: 0.1,
      });
      ledDomeMat = new THREE.MeshPhysicalMaterial({
        color: spec.onFill,
        emissive: spec.onFill,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.45,
      });
      const glow = new THREE.Mesh(coreGeo, ledCoreMat);
      glow.position.set(0, 0.22, 0);
      root.add(glow);
      ledLight = new THREE.PointLight(spec.onFill, 0, 5.0, 1.8);
      ledLight.position.set(0, 0.65, 0);
      root.add(ledLight);
      attachLedOverloadFx(0.32);
      owned.geos.push(coreGeo);
      owned.mats.push(ledCoreMat, ledDomeMat);
    }

    if (comp.type === 'buzzer') {
      const ringGeo = new THREE.RingGeometry(0.32, 0.42, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      buzzerRingMesh = new THREE.Mesh(ringGeo, ringMat);
      buzzerRingMesh.rotation.x = -Math.PI / 2;
      buzzerRingMesh.position.y = 0.2;
      buzzerRingMesh.visible = false;
      root.add(buzzerRingMesh);
      owned.geos.push(ringGeo);
      owned.mats.push(ringMat);
    }

    pins.forEach((pin) => {
      const { lx, lz } = getLocalPinOffsetUnified(comp.type, pin);
      addLeadToPin(root, new THREE.Vector3(lx * 0.55, 0.08, lz * 0.55), lx, lz, leadMat, owned, tagBody);
    });

    owned.geos.push(tileGeo, faceGeo);
    owned.mats.push(tileMat, faceMat);
  } else if (comp.type === 'source' || comp.type === 'ac_source') {
    const isAc = comp.type === 'ac_source';
    selectionRing = makeSelectionOutline(3.4, 2.2, owned);
    root.add(selectionRing);

    const bodyShape = createRoundedRectShape(2.4, 1.55, 0.15);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isAc ? 0x0f172a : 0x1e293b,
      roughness: 0.55,
      metalness: 0.25,
    });
    registerBurnable(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.06;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);
    tagBody(body);

    const crownGeo = new THREE.BoxGeometry(0.62, 0.76, 1.56);
    const crownMat = new THREE.MeshStandardMaterial({
      color: isAc ? 0x0284c7 : 0xd97706,
      roughness: 0.3,
      metalness: 0.65,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0.92, 0.44, 0);
    crown.castShadow = true;
    root.add(crown);
    tagBody(crown);

    const makeTex = (c: CircuitComp, ani: number) =>
      makeDynamicTextTexture(
        isAc ? `${c.value}Vp AC` : `${c.value}V DC`,
        isAc ? `${c.freq ?? 1.5} Hz · SINE` : 'NGUỒN PIN DC',
        '#0f172a',
        isAc ? '#0284c7' : '#d97706',
        ani,
        {
          left: isAc ? 'N' : '−',
          leftBg: '#334155',
          right: isAc ? '~' : '+',
          rightBg: '#dc2626',
        }
      );

    let tex = makeTex(comp, maxAnisotropy);
    owned.texs.push(tex);
    const decalGeo = new THREE.PlaneGeometry(2.1, 1.32);
    const decalMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(-0.08, 0.84, 0);
    root.add(decal);
    tagBody(decal);

    updateDynamicSpec = (c, ani) => {
      const next = makeTex(c, ani);
      decalMat.map = next;
      decalMat.needsUpdate = true;
      tex.dispose();
      tex = next;
    };

    addLeadToPin(root, new THREE.Vector3(-1.18, 0.35, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(1.18, 0.35, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(bodyGeo, crownGeo, decalGeo);
    owned.mats.push(bodyMat, crownMat, decalMat);
  } else if (comp.type === 'resistor') {
    selectionRing = makeSelectionOutline(4.3, 0.95, owned);
    root.add(selectionRing);

    const lathePts: THREE.Vector2[] = [
      new THREE.Vector2(0, -0.82),
      new THREE.Vector2(0.22, -0.82),
      new THREE.Vector2(0.32, -0.7),
      new THREE.Vector2(0.32, -0.45),
      new THREE.Vector2(0.24, -0.3),
      new THREE.Vector2(0.24, 0.3),
      new THREE.Vector2(0.32, 0.45),
      new THREE.Vector2(0.32, 0.7),
      new THREE.Vector2(0.22, 0.82),
      new THREE.Vector2(0, 0.82),
    ];
    const bodyGeo = new THREE.LatheGeometry(lathePts, 24);
    bodyGeo.rotateZ(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe6cda3, roughness: 0.42, metalness: 0.05 });
    registerBurnable(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.46, 0);
    body.castShadow = true;
    root.add(body);
    tagBody(body);

    const bands = getResistorColorBands(comp.value);
    const bandX = [-0.46, -0.18, 0.1, 0.46];
    const bandR = [0.295, 0.252, 0.252, 0.295];
    resistorBandMeshes = [];
    bandX.forEach((bx, idx) => {
      const bGeo = new THREE.CylinderGeometry(bandR[idx], bandR[idx], 0.11, 22);
      bGeo.rotateZ(Math.PI / 2);
      const bMat = new THREE.MeshStandardMaterial({ color: bands[idx] || '#a16207', roughness: 0.32 });
      const bm = new THREE.Mesh(bGeo, bMat);
      bm.position.set(bx, 0.46, 0);
      root.add(bm);
      tagBody(bm);
      resistorBandMeshes!.push(bm);
      owned.geos.push(bGeo);
      owned.mats.push(bMat);
    });

    addLeadToPin(root, new THREE.Vector3(-0.8, 0.46, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.8, 0.46, 0), 2.0, 0, leadMat, owned, tagBody);

    updateDynamicSpec = (c) => {
      const nextBands = getResistorColorBands(c.value);
      resistorBandMeshes?.forEach((m, i) => {
        (m.material as THREE.MeshStandardMaterial).color.set(nextBands[i] || '#a16207');
      });
    };

    owned.geos.push(bodyGeo);
    owned.mats.push(bodyMat);
  } else if (comp.type === 'led') {
    const colorKey = (comp.color as LedColorKey) || 'red';
    const spec = LED_COLOR_MAP[colorKey] || LED_COLOR_MAP.red;
    selectionRing = makeSelectionOutline(4.3, 1.15, owned);
    root.add(selectionRing);

    const flangeGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.12, 24);
    ledFlangeMat = new THREE.MeshStandardMaterial({
      color: spec.onFill,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    const flange = new THREE.Mesh(flangeGeo, ledFlangeMat);
    flange.position.set(0, 0.44, 0);
    flange.castShadow = true;
    root.add(flange);
    tagBody(flange);

    // Cathode flat-cut notch on +X (Pin 1) side
    const notchGeo = new THREE.BoxGeometry(0.08, 0.14, 0.44);
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const notch = new THREE.Mesh(notchGeo, notchMat);
    notch.position.set(0.41, 0.44, 0);
    root.add(notch);

    const domePts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(0.35, 0.46)];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * (Math.PI / 2);
      domePts.push(new THREE.Vector2(Math.cos(a) * 0.35, 0.46 + Math.sin(a) * 0.35));
    }
    const domeGeo = new THREE.LatheGeometry(domePts, 28);
    ledDomeMat = new THREE.MeshPhysicalMaterial({
      color: spec.onFill,
      emissive: spec.onFill,
      emissiveIntensity: 0.05,
      roughness: 0.14,
      metalness: 0.02,
      transmission: isSoftwareGl ? 0 : 0.45,
      transparent: true,
      opacity: isSoftwareGl ? 0.68 : 0.92,
      ior: 1.48,
      clearcoat: 1.0,
    });
    const dome = new THREE.Mesh(domeGeo, ledDomeMat);
    dome.position.set(0, 0.48, 0);
    dome.castShadow = true;
    dome.renderOrder = 2;
    root.add(dome);
    tagBody(dome);

    const coreGeo = new THREE.SphereGeometry(0.14, 16, 16);
    ledCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: spec.onFill,
      emissiveIntensity: 0.08,
    });
    const core = new THREE.Mesh(coreGeo, ledCoreMat);
    core.position.set(0, 0.82, 0);
    root.add(core);

    ledLight = new THREE.PointLight(spec.onFill, 0, 5.5, 1.8);
    ledLight.position.set(0, 0.95, 0);
    root.add(ledLight);

    attachLedOverloadFx(1.18);

    addLeadToPin(root, new THREE.Vector3(-0.2, 0.44, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.2, 0.44, 0), 2.0, 0, leadMat, owned, tagBody);

    updateDynamicSpec = (c) => {
      const nextSpec = LED_COLOR_MAP[(c.color as LedColorKey) || 'red'] || LED_COLOR_MAP.red;
      ledFlangeMat?.color.set(nextSpec.onFill);
      ledDomeMat?.color.set(nextSpec.onFill);
      ledDomeMat?.emissive.set(nextSpec.onFill);
      ledCoreMat?.emissive.set(nextSpec.onFill);
      ledLight?.color.set(nextSpec.onFill);
    };

    owned.geos.push(flangeGeo, notchGeo, domeGeo, coreGeo);
    owned.mats.push(ledFlangeMat, notchMat, ledDomeMat, ledCoreMat);
  } else if (comp.type === 'switch') {
    selectionRing = makeSelectionOutline(4.3, 1.35, owned);
    root.add(selectionRing);

    const baseGeo = new THREE.BoxGeometry(1.65, 0.44, 0.98);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.2 });
    registerBurnable(baseMat);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.22;
    base.castShadow = true;
    root.add(base);
    tagBody(base);

    const plateGeo = new THREE.BoxGeometry(1.25, 0.05, 0.72);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.82, roughness: 0.25 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.46;
    root.add(plate);
    tagBody(plate);

    const bushingGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.16, 6);
    const bushing = new THREE.Mesh(bushingGeo, plateMat);
    bushing.position.y = 0.54;
    root.add(bushing);
    tagBody(bushing);

    const statusGeo = new THREE.BoxGeometry(0.22, 0.04, 0.42);
    switchStatusMat = new THREE.MeshStandardMaterial({
      color: comp.value >= 0.5 ? 0x22c55e : 0xef4444,
      emissive: comp.value >= 0.5 ? 0x16a34a : 0x7f1d1d,
      emissiveIntensity: 0.6,
    });
    const statusBar = new THREE.Mesh(statusGeo, switchStatusMat);
    statusBar.position.set(0.45, 0.48, 0);
    root.add(statusBar);

    switchLeverPivot = new THREE.Group();
    switchLeverPivot.position.set(0, 0.58, 0);
    switchLeverPivot.rotation.z = comp.value >= 0.5 ? -0.46 : 0.46;

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 });
    const shaftGeo = new THREE.CylinderGeometry(0.065, 0.045, 0.55, 14);
    const shaft = new THREE.Mesh(shaftGeo, chromeMat);
    shaft.position.y = 0.27;
    shaft.userData = { hitKind: 'toggle', compId: comp.id };
    switchLeverPivot.add(shaft);

    const tipGeo = new THREE.SphereGeometry(0.12, 14, 14);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.56;
    tip.userData = { hitKind: 'toggle', compId: comp.id };
    switchLeverPivot.add(tip);

    const hitGeo = new THREE.SphereGeometry(0.35, 10, 10);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const leverHit = new THREE.Mesh(hitGeo, hitMat);
    leverHit.position.y = 0.42;
    leverHit.userData = { hitKind: 'toggle', compId: comp.id };
    switchLeverPivot.add(leverHit);
    root.add(switchLeverPivot);

    addLeadToPin(root, new THREE.Vector3(-0.8, 0.22, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.8, 0.22, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(baseGeo, plateGeo, bushingGeo, statusGeo, shaftGeo, tipGeo, hitGeo);
    owned.mats.push(baseMat, plateMat, switchStatusMat, chromeMat, tipMat, hitMat);
  } else if (comp.type === 'pushbutton') {
    selectionRing = makeSelectionOutline(2.5, 2.5, owned);
    root.add(selectionRing);

    // 6x6 Tinkercad tactile switch housing straddling center ravine
    const baseGeo = new THREE.BoxGeometry(1.45, 0.36, 1.45);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
    registerBurnable(baseMat);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.18;
    base.castShadow = true;
    root.add(base);
    tagBody(base);

    const plateGeo = new THREE.BoxGeometry(1.5, 0.06, 1.5);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.28 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.37;
    root.add(plate);
    tagBody(plate);

    const capGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.28, 24);
    const capMat = new THREE.MeshStandardMaterial({
      color: comp.value >= 0.5 ? 0x10b981 : 0x334155,
      roughness: 0.32,
    });
    pushbuttonCap = new THREE.Mesh(capGeo, capMat);
    pushbuttonCap.position.y = comp.value >= 0.5 ? 0.44 : 0.54;
    pushbuttonCap.castShadow = true;
    pushbuttonCap.userData = { hitKind: 'toggle', compId: comp.id };
    root.add(pushbuttonCap);

    // 4 pins at (-1, -1), (-1, +1), (+1, -1), (+1, +1)
    [
      [-1.0, -1.0],
      [-1.0, 1.0],
      [1.0, -1.0],
      [1.0, 1.0],
    ].forEach(([px, pz]) => {
      addLeadToPin(root, new THREE.Vector3(px * 0.65, 0.16, pz * 0.72), px, pz, leadMat, owned, tagBody);
    });

    owned.geos.push(baseGeo, plateGeo, capGeo);
    owned.mats.push(baseMat, plateMat, capMat);
  } else if (comp.type === 'pot') {
    selectionRing = makeSelectionOutline(4.3, 1.85, owned);
    root.add(selectionRing);

    const baseGeo = new THREE.BoxGeometry(1.55, 0.42, 1.25);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42 });
    registerBurnable(baseMat);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.21, 0.12);
    base.castShadow = true;
    root.add(base);
    tagBody(base);

    // Dial scale ring ticks around trimmer housing (from ~5% to ~95%)
    const tickGeo = new THREE.BoxGeometry(0.05, 0.03, 0.14);
    const tickMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 });
    for (let i = 0; i < 7; i++) {
      const frac = i / 6;
      const ang = (0.5 - frac) * Math.PI * 1.45;
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(-Math.sin(ang) * 0.56, 0.43, 0.12 - Math.cos(ang) * 0.56);
      tick.rotation.y = ang;
      root.add(tick);
      tagBody(tick);
    }

    const dialGeo = new THREE.CylinderGeometry(0.44, 0.48, 0.32, 24);
    const dialMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38 });
    potKnobPivot = new THREE.Group();
    potKnobPivot.position.set(0, 0.52, 0.12);
    const dial = new THREE.Mesh(dialGeo, dialMat);
    dial.castShadow = true;
    dial.userData = { hitKind: 'pot_knob', compId: comp.id };
    potKnobPivot.add(dial);

    const ptrGeo = new THREE.BoxGeometry(0.08, 0.08, 0.38);
    const ptrMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const ptr = new THREE.Mesh(ptrGeo, ptrMat);
    ptr.position.set(0, 0.17, -0.14);
    ptr.userData = { hitKind: 'pot_knob', compId: comp.id };
    potKnobPivot.add(ptr);

    const knobHitGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.46, 16);
    const knobHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const knobHit = new THREE.Mesh(knobHitGeo, knobHitMat);
    knobHit.position.y = 0.06;
    knobHit.userData = { hitKind: 'pot_knob', compId: comp.id };
    potKnobPivot.add(knobHit);
    root.add(potKnobPivot);

    addLeadToPin(root, new THREE.Vector3(-0.75, 0.18, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.75, 0.18, 0), 2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0, 0.18, -0.45), 0, -1.0, leadMat, owned, tagBody);

    owned.geos.push(baseGeo, tickGeo, dialGeo, ptrGeo, knobHitGeo);
    owned.mats.push(baseMat, tickMat, dialMat, ptrMat, knobHitMat);
  } else if (comp.type === 'capacitor') {
    selectionRing = makeSelectionOutline(4.3, 1.15, owned);
    root.add(selectionRing);

    const canGeo = new THREE.CylinderGeometry(0.44, 0.44, 1.05, 24);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.32, metalness: 0.22 });
    registerBurnable(canMat);
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.set(0, 0.68, 0);
    can.castShadow = true;
    root.add(can);
    tagBody(can);

    const topGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24);
    const topMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
    const topCap = new THREE.Mesh(topGeo, topMat);
    topCap.position.set(0, 1.22, 0);
    root.add(topCap);
    tagBody(topCap);

    // Cathode (-) vertical silver stripe on +X side
    const stripeGeo = new THREE.BoxGeometry(0.1, 0.96, 0.24);
    const stripe = new THREE.Mesh(stripeGeo, topMat);
    stripe.position.set(0.4, 0.68, 0);
    root.add(stripe);

    addLeadToPin(root, new THREE.Vector3(-0.22, 0.22, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.22, 0.22, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(canGeo, topGeo, stripeGeo);
    owned.mats.push(canMat, topMat);
  } else if (comp.type === 'inductor') {
    selectionRing = makeSelectionOutline(4.3, 1.1, owned);
    root.add(selectionRing);

    const coreGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 16);
    coreGeo.rotateZ(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.44;
    root.add(core);
    tagBody(core);

    const coilMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.22 });
    registerBurnable(coilMat);
    const ringGeo = new THREE.TorusGeometry(0.27, 0.08, 12, 22);
    ringGeo.rotateY(Math.PI / 2);
    for (let i = -3; i <= 3; i++) {
      const m = new THREE.Mesh(ringGeo, coilMat);
      m.position.set(i * 0.19, 0.44, 0);
      m.castShadow = true;
      root.add(m);
      tagBody(m);
    }

    addLeadToPin(root, new THREE.Vector3(-0.75, 0.44, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.75, 0.44, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(coreGeo, ringGeo);
    owned.mats.push(coreMat, coilMat);
  } else if (comp.type === 'diode' || comp.type === 'zener') {
    const isZener = comp.type === 'zener';
    selectionRing = makeSelectionOutline(4.3, 0.95, owned);
    root.add(selectionRing);

    const bodyGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.25, 20);
    bodyGeo.rotateZ(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isZener ? 0xea580c : 0x0f172a,
      roughness: isZener ? 0.25 : 0.55,
      metalness: 0.1,
    });
    registerBurnable(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.42;
    body.castShadow = true;
    root.add(body);
    tagBody(body);

    const bandGeo = new THREE.CylinderGeometry(0.272, 0.272, 0.18, 20);
    bandGeo.rotateZ(Math.PI / 2);
    const bandMat = new THREE.MeshStandardMaterial({
      color: isZener ? 0x0f172a : 0xe2e8f0,
      metalness: isZener ? 0.1 : 0.75,
      roughness: 0.3,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(0.42, 0.42, 0); // Cathode band on +X side
    root.add(band);
    tagBody(band);

    addLeadToPin(root, new THREE.Vector3(-0.62, 0.42, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.62, 0.42, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(bodyGeo, bandGeo);
    owned.mats.push(bodyMat, bandMat);
  } else if (comp.type === 'ldr') {
    selectionRing = makeSelectionOutline(4.3, 1.15, owned);
    root.add(selectionRing);

    const headGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.22, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd6bfa3, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.48;
    head.castShadow = true;
    root.add(head);
    tagBody(head);

    let cellTex = makeLdrCellTexture(comp.wiper ?? 0.5, maxAnisotropy);
    owned.texs.push(cellTex);
    const topGeo = new THREE.CircleGeometry(0.41, 24);
    const topMat = new THREE.MeshStandardMaterial({ map: cellTex, roughness: 0.3 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.595;
    root.add(top);
    tagBody(top);

    updateDynamicSpec = (c, ani) => {
      const next = makeLdrCellTexture(c.wiper ?? 0.5, ani);
      topMat.map = next;
      topMat.needsUpdate = true;
      cellTex.dispose();
      cellTex = next;
    };

    addLeadToPin(root, new THREE.Vector3(-0.34, 0.38, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.34, 0.38, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(headGeo, topGeo);
    owned.mats.push(headMat, topMat);
  } else if (comp.type === 'motor') {
    selectionRing = makeSelectionOutline(4.3, 1.45, owned);
    root.add(selectionRing);

    const canGeo = new THREE.CylinderGeometry(0.54, 0.54, 1.5, 24);
    canGeo.rotateZ(Math.PI / 2);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.24 });
    registerBurnable(canMat);
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.y = 0.56;
    can.castShadow = true;
    root.add(can);
    tagBody(can);

    const capGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.25, 24);
    capGeo.rotateZ(Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(-0.72, 0.56, 0);
    root.add(cap);
    tagBody(cap);

    // Spinning rotor shaft + 2-blade propeller
    motorRotorPivot = new THREE.Group();
    motorRotorPivot.position.set(0.95, 0.56, 0);
    const shaftGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12);
    shaftGeo.rotateZ(Math.PI / 2);
    const shaft = new THREE.Mesh(shaftGeo, canMat);
    motorRotorPivot.add(shaft);

    const bladeGeo = new THREE.BoxGeometry(0.06, 1.18, 0.18);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    blade1.position.x = 0.2;
    blade1.castShadow = true;
    motorRotorPivot.add(blade1);
    root.add(motorRotorPivot);

    addLeadToPin(root, new THREE.Vector3(-0.8, 0.42, 0.25), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(-0.8, 0.42, -0.25), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(canGeo, capGeo, shaftGeo, bladeGeo);
    owned.mats.push(canMat, capMat, bladeMat);
  } else if (comp.type === 'buzzer') {
    selectionRing = makeSelectionOutline(4.3, 1.45, owned);
    root.add(selectionRing);

    const canGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.58, 28);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    registerBurnable(canMat);
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.y = 0.32;
    can.castShadow = true;
    root.add(can);
    tagBody(can);

    const holeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 18);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.85, roughness: 0.2 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.y = 0.6;
    root.add(hole);

    const ringGeo = new THREE.RingGeometry(0.32, 0.42, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    buzzerRingMesh = new THREE.Mesh(ringGeo, ringMat);
    buzzerRingMesh.rotation.x = -Math.PI / 2;
    buzzerRingMesh.position.y = 0.72;
    buzzerRingMesh.visible = false;
    root.add(buzzerRingMesh);

    addLeadToPin(root, new THREE.Vector3(-0.55, 0.18, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.55, 0.18, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(canGeo, holeGeo, ringGeo);
    owned.mats.push(canMat, holeMat, ringMat);
  } else if (comp.type === 'bjt') {
    selectionRing = makeSelectionOutline(3.6, 2.5, owned);
    root.add(selectionRing);

    // TO-92 semi-cylinder package
    const bodyGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.68, 20, 1, false, 0, Math.PI);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    registerBurnable(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.62;
    body.rotation.y = Math.PI / 2;
    body.castShadow = true;
    root.add(body);
    tagBody(body);

    const flatGeo = new THREE.PlaneGeometry(0.9, 0.68);
    const flat = new THREE.Mesh(flatGeo, bodyMat);
    flat.position.set(0, 0.62, 0);
    flat.rotation.y = Math.PI / 2;
    root.add(flat);
    tagBody(flat);

    addLeadToPin(root, new THREE.Vector3(-0.2, 0.34, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.15, 0.34, -0.25), 1.0, -1.0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.15, 0.34, 0.25), 1.0, 1.0, leadMat, owned, tagBody);

    owned.geos.push(bodyGeo, flatGeo);
    owned.mats.push(bodyMat);
  } else if (comp.type === 'opamp') {
    selectionRing = makeSelectionOutline(4.3, 2.5, owned);
    root.add(selectionRing);

    const icGeo = new THREE.BoxGeometry(2.2, 0.42, 1.45);
    const icMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.48 });
    registerBurnable(icMat);
    const ic = new THREE.Mesh(icGeo, icMat);
    ic.position.y = 0.36;
    ic.castShadow = true;
    root.add(ic);
    tagBody(ic);

    let tex = makeDynamicTextTexture('LM741', 'OP-AMP IC', '#0f172a', '#4f46e5', maxAnisotropy);
    owned.texs.push(tex);
    const topGeo = new THREE.PlaneGeometry(1.9, 1.2);
    const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.58;
    root.add(top);
    tagBody(top);

    addLeadToPin(root, new THREE.Vector3(-1.05, 0.24, -0.55), -2.0, -1.0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(-1.05, 0.24, 0.55), -2.0, 1.0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(1.05, 0.24, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(icGeo, topGeo);
    owned.mats.push(icMat, topMat);
  } else if (comp.type === 'multimeter') {
    selectionRing = makeSelectionOutline(3.05, 3.85, owned);
    root.add(selectionRing);

    // 1. Iconic Tinkercad Yellow Elastomer Protective Holster
    const holsterShape = createRoundedRectShape(2.65, 3.45, 0.28);
    const holsterGeo = new THREE.ExtrudeGeometry(holsterShape, {
      depth: 0.56,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    holsterGeo.rotateX(-Math.PI / 2);
    const holsterMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.42,
      metalness: 0.08,
    });
    registerBurnable(holsterMat);
    const holster = new THREE.Mesh(holsterGeo, holsterMat);
    holster.position.set(0, 0.04, -0.08);
    holster.castShadow = true;
    holster.receiveShadow = true;
    root.add(holster);
    tagBody(holster);

    // 2. Dark Slate ABS Faceplate Inset
    const innerGeo = new THREE.BoxGeometry(2.26, 0.14, 3.02);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.48,
      metalness: 0.18,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(0, 0.58, -0.08);
    inner.receiveShadow = true;
    root.add(inner);
    tagBody(inner);

    // 3. Backlit LCD Display Panel (reusable single CanvasTexture, redrawn only on text change)
    const lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 512;
    lcdCanvas.height = 256;
    const lcdCtx = lcdCanvas.getContext('2d')!;
    const lcdTex = new THREE.CanvasTexture(lcdCanvas);
    lcdTex.colorSpace = THREE.SRGBColorSpace;
    lcdTex.anisotropy = maxAnisotropy;
    owned.texs.push(lcdTex);

    let lastLcdSig = '';
    const drawLcd = (readingText: string, mode: 'V' | 'I', targetLabel: string, hasTarget: boolean) => {
      const sig = `${readingText}|${mode}|${targetLabel}|${hasTarget ? 1 : 0}`;
      if (sig === lastLcdSig) return;
      lastLcdSig = sig;

      // Dark slate bezel + glowing LCD backlight
      lcdCtx.fillStyle = '#0f172a';
      lcdCtx.fillRect(0, 0, 512, 256);

      lcdCtx.fillStyle = mode === 'I' ? '#ecfdf5' : '#e2f1ff';
      lcdCtx.beginPath();
      lcdCtx.roundRect(14, 14, 484, 228, 16);
      lcdCtx.fill();

      // Header strip
      lcdCtx.fillStyle = mode === 'I' ? '#047857' : '#0369a1';
      lcdCtx.beginPath();
      lcdCtx.roundRect(24, 24, 464, 48, 10);
      lcdCtx.fill();

      lcdCtx.fillStyle = '#ffffff';
      lcdCtx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      lcdCtx.textAlign = 'left';
      lcdCtx.textBaseline = 'middle';
      lcdCtx.fillText(mode === 'I' ? 'AMMETER · DÒNG ĐIỆN (I)' : 'VOLTMETER · ĐIỆN ÁP (V)', 38, 49);

      lcdCtx.font = '700 20px "JetBrains Mono", monospace';
      lcdCtx.textAlign = 'right';
      lcdCtx.fillText('AUTO', 474, 49);

      // Digital numerical readout
      lcdCtx.fillStyle = '#0f172a';
      lcdCtx.font = '800 84px "JetBrains Mono", monospace';
      lcdCtx.textAlign = 'right';
      lcdCtx.textBaseline = 'middle';
      lcdCtx.fillText(readingText, 472, 136);

      // Sub-target caption
      lcdCtx.fillStyle = hasTarget ? '#334155' : '#64748b';
      lcdCtx.font = '700 22px "JetBrains Mono", monospace';
      lcdCtx.textAlign = 'left';
      const clipped = targetLabel.length > 34 ? `${targetLabel.slice(0, 33)}…` : targetLabel;
      lcdCtx.fillText(clipped, 34, 210);

      lcdTex.needsUpdate = true;
    };

    drawLcd('+0.00 V', comp.meterMode === 'I' ? 'I' : 'V', 'Kéo que đo vào mạch', false);
    updateMultimeterLcd = drawLcd;

    const bezelGeo = new THREE.BoxGeometry(1.98, 0.08, 1.06);
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 0.68, -0.92);
    root.add(bezel);
    tagBody(bezel);

    const screenGeo = new THREE.PlaneGeometry(1.86, 0.94);
    const screenMat = new THREE.MeshBasicMaterial({ map: lcdTex });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.725, -0.92);
    root.add(screen);
    tagBody(screen);

    // 4. Clickable 3D Rotary Mode Dial (Toggles V <-> I)
    const dialBaseGeo = new THREE.CylinderGeometry(0.46, 0.49, 0.14, 28);
    const dialBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.15 });
    const dialBase = new THREE.Mesh(dialBaseGeo, dialBaseMat);
    dialBase.position.set(0, 0.69, 0.16);
    dialBase.userData = { hitKind: 'toggle', compId: comp.id };
    root.add(dialBase);

    meterDialPivot = new THREE.Group();
    meterDialPivot.position.set(0, 0.79, 0.16);
    meterDialPivot.rotation.y = comp.meterMode === 'I' ? -0.58 : 0.58;

    const knobGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.16, 24);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.2 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.userData = { hitKind: 'toggle', compId: comp.id };
    meterDialPivot.add(knob);

    const ridgeGeo = new THREE.BoxGeometry(0.11, 0.19, 0.56);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.y = 0.03;
    ridge.userData = { hitKind: 'toggle', compId: comp.id };
    meterDialPivot.add(ridge);

    const dialHitGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 16);
    const dialHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const dialHit = new THREE.Mesh(dialHitGeo, dialHitMat);
    dialHit.userData = { hitKind: 'toggle', compId: comp.id };
    meterDialPivot.add(dialHit);
    root.add(meterDialPivot);

    // 5. Mode Indicator LEDs (V = Sky Blue left, I = Emerald right)
    const ledDotGeo = new THREE.SphereGeometry(0.085, 14, 14);
    meterModeLedV = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: comp.meterMode === 'I' ? 0.08 : 1.4,
    });
    meterModeLedI = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: comp.meterMode === 'I' ? 1.4 : 0.08,
    });
    const ledV = new THREE.Mesh(ledDotGeo, meterModeLedV);
    ledV.position.set(-0.62, 0.7, -0.15);
    const ledI = new THREE.Mesh(ledDotGeo, meterModeLedI);
    ledI.position.set(0.62, 0.7, -0.15);
    root.add(ledV, ledI);

    // 6. Front Banana Jack Sockets: COM (-1.0, 1.0) & V/I (+1.0, 1.0)
    const jackGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.14, 20);
    const jackBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const jackRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const jackCom = new THREE.Mesh(jackGeo, jackBlackMat);
    jackCom.position.set(-0.72, 0.66, 0.96);
    const jackPlus = new THREE.Mesh(jackGeo, jackRedMat);
    jackPlus.position.set(0.72, 0.66, 0.96);
    root.add(jackCom, jackPlus);
    tagBody(jackCom);
    tagBody(jackPlus);

    addLeadToPin(root, new THREE.Vector3(-0.72, 0.32, 1.15), -1.0, 1.0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.72, 0.32, 1.15), 1.0, 1.0, leadMat, owned, tagBody);

    owned.geos.push(holsterGeo, innerGeo, bezelGeo, screenGeo, dialBaseGeo, knobGeo, ridgeGeo, dialHitGeo, ledDotGeo, jackGeo);
    owned.mats.push(
      holsterMat,
      innerMat,
      bezelMat,
      screenMat,
      dialBaseMat,
      knobMat,
      ridgeMat,
      dialHitMat,
      meterModeLedV,
      meterModeLedI,
      jackBlackMat,
      jackRedMat
    );
  } else if (comp.type === 'oscilloscope') {
    selectionRing = makeSelectionOutline(3.75, 3.35, owned);
    root.add(selectionRing);

    // 1. Benchtop Oscilloscope ABS Chassis (Rounded Beveled Dark Slate Body)
    const bodyShape = createRoundedRectShape(3.26, 2.78, 0.2);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.78,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.46,
      metalness: 0.16,
    });
    registerBurnable(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.05, -0.04);
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);
    tagBody(body);

    // 2. Signature Cyan-Blue Protective Top Bumper Trim
    const trimGeo = new THREE.BoxGeometry(3.32, 0.16, 0.34);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.52,
      metalness: 0.08,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 0.84, -1.24);
    trim.castShadow = true;
    root.add(trim);
    tagBody(trim);

    // 3. Brushed Aluminum Instrument Faceplate Deck
    const deckGeo = new THREE.BoxGeometry(3.04, 0.08, 2.5);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.34,
      metalness: 0.44,
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, 0.88, -0.02);
    deck.receiveShadow = true;
    root.add(deck);
    tagBody(deck);

    // 4. Recessed Screen Bezel + Live CRT/IPS Waveform CanvasTexture (Zero per-frame allocation)
    const bezelGeo = new THREE.BoxGeometry(2.68, 0.06, 1.56);
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.38, metalness: 0.15 });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 0.92, -0.44);
    root.add(bezel);
    tagBody(bezel);

    const scopeCanvas = document.createElement('canvas');
    scopeCanvas.width = 512;
    scopeCanvas.height = 296;
    const sctx = scopeCanvas.getContext('2d')!;
    const scopeTex = new THREE.CanvasTexture(scopeCanvas);
    scopeTex.colorSpace = THREE.SRGBColorSpace;
    scopeTex.anisotropy = maxAnisotropy;
    owned.texs.push(scopeTex);

    let lastScopeSig = '';
    const drawScopeScreen = (
      trace: OscilloscopeTraceData | undefined,
      timeWindowSec: number,
      vDiv: number,
      runningFlag: boolean
    ) => {
      const samples = trace?.samples ?? [];
      const lastS = samples.length > 0 ? samples[samples.length - 1] : 0;
      const midS = samples.length > 2 ? samples[Math.floor(samples.length / 2)] : 0;
      const firstS = samples.length > 0 ? samples[0] : 0;
      const sig = `${samples.length}|${lastS.toFixed(2)}|${midS.toFixed(2)}|${firstS.toFixed(2)}|${(trace?.vpp ?? 0).toFixed(2)}|${timeWindowSec}|${vDiv}|${runningFlag ? 1 : 0}|${trace?.targetLabel ?? ''}`;
      if (sig === lastScopeSig) return;
      lastScopeSig = sig;

      // Phosphor background
      sctx.fillStyle = '#031019';
      sctx.fillRect(0, 0, 512, 296);

      // Header Status Bar
      sctx.fillStyle = '#082538';
      sctx.fillRect(0, 0, 512, 38);
      sctx.fillStyle = trace?.hasMeasurement ? '#22d3ee' : '#94a3b8';
      sctx.font = '800 18px "JetBrains Mono", monospace';
      sctx.textAlign = 'left';
      sctx.textBaseline = 'middle';
      sctx.fillText(`CH1 ${trace?.hasMeasurement ? 'ACTIVE' : 'IDLE'}`, 14, 19);

      sctx.fillStyle = runningFlag ? '#34d399' : '#fbbf24';
      sctx.font = '700 16px "JetBrains Mono", monospace';
      sctx.textAlign = 'center';
      sctx.fillText(runningFlag ? '● RUN' : '❚❚ HOLD', 238, 19);

      const vNow = trace?.vInst ?? 0;
      sctx.fillStyle = '#f8fafc';
      sctx.font = '800 22px "JetBrains Mono", monospace';
      sctx.textAlign = 'right';
      sctx.fillText(`${vNow >= 0 ? '+' : '−'}${Math.abs(vNow).toFixed(2)}V`, 498, 19);

      // Plot Frame & Graticule Grid (8x4 divisions)
      const gx = 16;
      const gy = 48;
      const gw = 480;
      const gh = 198;

      sctx.strokeStyle = 'rgba(34, 211, 238, 0.17)';
      sctx.lineWidth = 1.5;
      for (let i = 0; i <= 8; i++) {
        const px = gx + (i / 8) * gw;
        sctx.beginPath();
        sctx.moveTo(px, gy);
        sctx.lineTo(px, gy + gh);
        sctx.stroke();
      }
      for (let j = 0; j <= 4; j++) {
        const py = gy + (j / 4) * gh;
        sctx.beginPath();
        sctx.moveTo(gx, py);
        sctx.lineTo(gx + gw, py);
        sctx.stroke();
      }

      // Compute Y-axis scale cleanly for AC bipolar and DC unipolar signals
      const vmin = trace?.vmin ?? 0;
      const vmax = trace?.vmax ?? 0;
      let yMin = -5;
      let yMax = 5;
      let effVDiv = vDiv;

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
        effVDiv = (yMax - yMin) / 4;
      }

      const toPy = (val: number) => {
        const ratio = (val - yMin) / Math.max(0.01, yMax - yMin);
        return gy + gh - Math.max(0, Math.min(1, ratio)) * gh;
      };

      // 0V Reference Dashed Line
      const yZero = toPy(0);
      if (yZero >= gy && yZero <= gy + gh) {
        sctx.save();
        sctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        sctx.setLineDash([6, 5]);
        sctx.lineWidth = 1.5;
        sctx.beginPath();
        sctx.moveTo(gx, yZero);
        sctx.lineTo(gx + gw, yZero);
        sctx.stroke();
        sctx.restore();
      }

      // Live Waveform Trace with CRT Phosphor Bloom
      if (samples.length >= 2) {
        sctx.save();
        sctx.beginPath();
        sctx.rect(gx, gy, gw, gh);
        sctx.clip();

        sctx.lineJoin = 'round';
        sctx.lineCap = 'round';

        // Outer Cyan Glow
        sctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
        sctx.lineWidth = 9;
        sctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const px = gx + (i / (samples.length - 1)) * gw;
          const py = toPy(samples[i]);
          if (i === 0) sctx.moveTo(px, py);
          else sctx.lineTo(px, py);
        }
        sctx.stroke();

        // Sharp Inner Core
        sctx.strokeStyle = '#67e8f9';
        sctx.lineWidth = 3.5;
        sctx.stroke();
        sctx.restore();
      } else {
        sctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
        sctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
        sctx.textAlign = 'center';
        sctx.fillText('Kéo que CH1 (+) vào mạch AC / xung điện', 256, gy + gh / 2);
      }

      // Outer Graticule Border
      sctx.strokeStyle = '#0e7490';
      sctx.lineWidth = 2;
      sctx.strokeRect(gx, gy, gw, gh);

      // Footer Telemetry Bar (Vpp, V/div, Timebase, Target)
      sctx.fillStyle = '#061a29';
      sctx.fillRect(0, 254, 512, 42);

      sctx.fillStyle = '#fbbf24';
      sctx.font = '700 16px "JetBrains Mono", monospace';
      sctx.textAlign = 'left';
      sctx.fillText(`Vpp:${(trace?.vpp ?? 0).toFixed(1)}V`, 14, 276);

      sctx.fillStyle = '#38bdf8';
      sctx.fillText(`${effVDiv.toFixed(1)}V/ô`, 144, 276);

      sctx.fillStyle = '#34d399';
      sctx.fillText(`T:${timeWindowSec}s`, 246, 276);

      const lbl = trace?.targetLabel ?? 'CH1';
      const clipped = lbl.length > 16 ? `${lbl.slice(0, 15)}…` : lbl;
      sctx.fillStyle = '#cbd5e1';
      sctx.textAlign = 'right';
      sctx.fillText(clipped, 498, 276);

      scopeTex.needsUpdate = true;
    };

    drawScopeScreen(undefined, comp.scopeTimeWindow ?? 2.0, comp.scopeVDiv ?? 0, true);
    updateOscilloscopeScreen = drawScopeScreen;

    const screenGeo = new THREE.PlaneGeometry(2.52, 1.44);
    const screenMat = new THREE.MeshBasicMaterial({ map: scopeTex });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.955, -0.44);
    root.add(screen);
    tagBody(screen);

    // 5. Clickable 3D TIME/DIV Rotary Knob (cycles 0.5s -> 1s -> 2s -> 4s)
    const dialBaseGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.1, 24);
    const dialBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 });
    const tDialBase = new THREE.Mesh(dialBaseGeo, dialBaseMat);
    tDialBase.position.set(-0.78, 0.95, 0.56);
    tDialBase.userData = { hitKind: 'toggle', compId: comp.id };

    const vDialBase = new THREE.Mesh(dialBaseGeo, dialBaseMat);
    vDialBase.position.set(0.78, 0.95, 0.56);
    root.add(tDialBase, vDialBase);
    tagBody(vDialBase);

    scopeKnobPivot = new THREE.Group();
    scopeKnobPivot.position.set(-0.78, 1.04, 0.56);
    const kGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.16, 20);
    const kMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.35 });
    const tKnob = new THREE.Mesh(kGeo, kMat);
    tKnob.userData = { hitKind: 'toggle', compId: comp.id };
    const kRidgeGeo = new THREE.BoxGeometry(0.07, 0.18, 0.24);
    const kRidgeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    const kRidge = new THREE.Mesh(kRidgeGeo, kRidgeMat);
    kRidge.position.set(0, 0.02, -0.08);
    kRidge.userData = { hitKind: 'toggle', compId: comp.id };
    const tHitGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
    const tHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const tHit = new THREE.Mesh(tHitGeo, tHitMat);
    tHit.userData = { hitKind: 'toggle', compId: comp.id };
    scopeKnobPivot.add(tKnob, kRidge, tHit);
    root.add(scopeKnobPivot);

    // Secondary decorative V/DIV knob + status power LED
    const vKnob = new THREE.Mesh(kGeo, kMat);
    vKnob.position.set(0.78, 1.04, 0.56);
    const pwrLedGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const pwrLedMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.4,
    });
    const pwrLed = new THREE.Mesh(pwrLedGeo, pwrLedMat);
    pwrLed.position.set(0, 0.96, 0.56);
    root.add(vKnob, pwrLed);
    tagBody(vKnob);

    // 6. Front Metallic BNC Input Ports: GND (-) left & CH1 (+) right
    const bncOuterGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.16, 20);
    const bncMetalMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.88, roughness: 0.2 });
    const bncGnd = new THREE.Mesh(bncOuterGeo, bncMetalMat);
    bncGnd.position.set(-0.78, 0.94, 1.04);
    const bncCh1 = new THREE.Mesh(bncOuterGeo, bncMetalMat);
    bncCh1.position.set(0.78, 0.94, 1.04);

    const bncCapGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16);
    const bncBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 });
    const bncRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const bncGndIn = new THREE.Mesh(bncCapGeo, bncBlackMat);
    bncGndIn.position.set(-0.78, 0.96, 1.04);
    const bncCh1In = new THREE.Mesh(bncCapGeo, bncRedMat);
    bncCh1In.position.set(0.78, 0.96, 1.04);
    root.add(bncGnd, bncCh1, bncGndIn, bncCh1In);
    tagBody(bncGnd);
    tagBody(bncCh1);

    addLeadToPin(root, new THREE.Vector3(-0.78, 0.38, 1.2), -1.0, 1.0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(0.78, 0.38, 1.2), 1.0, 1.0, leadMat, owned, tagBody);

    owned.geos.push(bodyGeo, trimGeo, deckGeo, bezelGeo, screenGeo, dialBaseGeo, kGeo, kRidgeGeo, tHitGeo, pwrLedGeo, bncOuterGeo, bncCapGeo);
    owned.mats.push(bodyMat, trimMat, deckMat, bezelMat, screenMat, dialBaseMat, kMat, kRidgeMat, tHitMat, pwrLedMat, bncMetalMat, bncBlackMat, bncRedMat);
  } else if (comp.type === 'mcu8051' || comp.type === 'dec74138') {
    const isMcu = comp.type === 'mcu8051';
    selectionRing = makeSelectionOutline(4.3, 4.9, owned);
    root.add(selectionRing);

    const bodyGeo = new THREE.BoxGeometry(2.6, 0.46, 4.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isMcu ? 0x1e293b : 0x1e1b4b,
      roughness: 0.38,
      metalness: 0.14,
    });
    registerBurnable(bodyMat);
    const chip = new THREE.Mesh(bodyGeo, bodyMat);
    chip.position.y = 0.32;
    chip.castShadow = true;
    chip.receiveShadow = true;
    root.add(chip);
    tagBody(chip);

    // Top silkscreen face texture
    const topTex = makeDynamicTextTexture(
      isMcu ? 'AT89C51' : '74LS138',
      isMcu ? '8051 MCU · 40-PIN' : '3→8 DECODER · TTL',
      isMcu ? '#0f172a' : '#1e1b4b',
      isMcu ? '#0284c7' : '#4f46e5',
      maxAnisotropy
    );
    owned.texs.push(topTex);
    const faceGeo = new THREE.PlaneGeometry(2.35, 3.6);
    const faceMat = new THREE.MeshBasicMaterial({ map: topTex });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.x = -Math.PI / 2;
    face.position.set(0, 0.555, 0.18);
    root.add(face);
    tagBody(face);

    // Orientation notch
    const notchGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 14);
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const notch = new THREE.Mesh(notchGeo, notchMat);
    notch.position.set(0, 0.54, -2.05);
    root.add(notch);

    // 4 status LEDs embedded on top edge
    const statusLedGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12);
    const statusMats: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 4; i++) {
      const sm = new THREE.MeshStandardMaterial({
        color: isMcu ? 0x22c55e : 0x38bdf8,
        emissive: isMcu ? 0x16a34a : 0x0284c7,
        emissiveIntensity: 0.08,
        roughness: 0.25,
      });
      const lm = new THREE.Mesh(statusLedGeo, sm);
      lm.position.set(-0.66 + i * 0.44, 0.56, 1.82);
      root.add(lm);
      statusMats.push(sm);
      owned.mats.push(sm);
    }
    if (isMcu) mcuPortLedMats = statusMats;
    else decOutLedMats = statusMats;

    // 10 metallic DIP leads reaching exact pin coordinates
    const rowZs = [-2.0, -1.0, 0, 1.0, 2.0];
    rowZs.forEach((rz) => {
      addLeadToPin(root, new THREE.Vector3(-1.3, 0.24, rz), -2.0, rz, leadMat, owned, tagBody);
      addLeadToPin(root, new THREE.Vector3(1.3, 0.24, rz), 2.0, rz, leadMat, owned, tagBody);
    });

    owned.geos.push(bodyGeo, faceGeo, notchGeo, statusLedGeo);
    owned.mats.push(bodyMat, faceMat, notchMat);
  } else if (comp.type === 'sevenseg') {
    selectionRing = makeSelectionOutline(4.3, 3.0, owned);
    root.add(selectionRing);

    const caseGeo = new THREE.BoxGeometry(2.6, 0.56, 2.7);
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38, metalness: 0.1 });
    registerBurnable(caseMat);
    const housing = new THREE.Mesh(caseGeo, caseMat);
    housing.position.y = 0.34;
    housing.castShadow = true;
    housing.receiveShadow = true;
    root.add(housing);
    tagBody(housing);

    const screenGeo = new THREE.BoxGeometry(2.15, 0.04, 2.35);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.55 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.y = 0.62;
    root.add(screen);
    tagBody(screen);

    const hSegGeo = new THREE.BoxGeometry(0.86, 0.05, 0.17);
    const vSegGeo = new THREE.BoxGeometry(0.17, 0.05, 0.72);
    const dpGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14);

    // Order: a, b, c, d, e, f, g, dp
    const segSpecs: { geo: THREE.BufferGeometry; x: number; z: number }[] = [
      { geo: hSegGeo, x: -0.05, z: -0.84 }, // a
      { geo: vSegGeo, x: 0.44, z: -0.44 },  // b
      { geo: vSegGeo, x: 0.44, z: 0.44 },   // c
      { geo: hSegGeo, x: -0.05, z: 0.84 },  // d
      { geo: vSegGeo, x: -0.54, z: 0.44 },  // e
      { geo: vSegGeo, x: -0.54, z: -0.44 }, // f
      { geo: hSegGeo, x: -0.05, z: 0 },     // g
      { geo: dpGeo, x: 0.76, z: 0.84 },     // dp
    ];

    const mats: THREE.MeshStandardMaterial[] = [];
    segSpecs.forEach((sp) => {
      const m = new THREE.MeshStandardMaterial({
        color: 0x450a0a,
        emissive: 0xef4444,
        emissiveIntensity: 0.05,
        roughness: 0.25,
      });
      const mesh = new THREE.Mesh(sp.geo, m);
      mesh.position.set(sp.x, 0.64, sp.z);
      root.add(mesh);
      mats.push(m);
      owned.mats.push(m);
    });
    sevenSegMats = mats;

    [-1.0, 0, 1.0].forEach((rz) => {
      addLeadToPin(root, new THREE.Vector3(-1.3, 0.22, rz), -2.0, rz, leadMat, owned, tagBody);
      addLeadToPin(root, new THREE.Vector3(1.3, 0.22, rz), 2.0, rz, leadMat, owned, tagBody);
    });

    owned.geos.push(caseGeo, screenGeo, hSegGeo, vSegGeo, dpGeo);
    owned.mats.push(caseMat, screenMat);
  } else if (comp.type === 'clockgen') {
    selectionRing = makeSelectionOutline(3.4, 2.0, owned);
    root.add(selectionRing);

    const pcbGeo = new THREE.BoxGeometry(2.2, 0.16, 1.45);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.4, metalness: 0.1 });
    registerBurnable(pcbMat);
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.y = 0.16;
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    root.add(pcb);
    tagBody(pcb);

    // Metallic HC-49 crystal resonator can
    const canGeo = new THREE.BoxGeometry(1.18, 0.42, 0.46);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.set(0.15, 0.44, -0.2);
    can.castShadow = true;
    root.add(can);
    tagBody(can);

    const clkGeo = new THREE.SphereGeometry(0.14, 14, 14);
    clockLedMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.1,
      roughness: 0.2,
    });
    const clkLed = new THREE.Mesh(clkGeo, clockLedMat);
    clkLed.position.set(-0.62, 0.34, 0.32);
    root.add(clkLed);

    addLeadToPin(root, new THREE.Vector3(-1.1, 0.16, 0), -2.0, 0, leadMat, owned, tagBody);
    addLeadToPin(root, new THREE.Vector3(1.1, 0.16, 0), 2.0, 0, leadMat, owned, tagBody);

    owned.geos.push(pcbGeo, canGeo, clkGeo);
    owned.mats.push(pcbMat, canMat, clockLedMat);
  } else {
    // Ground (GND) lug post
    selectionRing = makeSelectionOutline(1.5, 1.8, owned);
    root.add(selectionRing);

    const barMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.5, roughness: 0.3 });
    const bar1Geo = new THREE.BoxGeometry(0.92, 0.14, 0.18);
    const bar2Geo = new THREE.BoxGeometry(0.6, 0.14, 0.18);
    const bar3Geo = new THREE.BoxGeometry(0.3, 0.14, 0.18);

    const b1 = new THREE.Mesh(bar1Geo, barMat);
    b1.position.set(0, 0.08, -0.1);
    const b2 = new THREE.Mesh(bar2Geo, barMat);
    b2.position.set(0, 0.08, 0.2);
    const b3 = new THREE.Mesh(bar3Geo, barMat);
    b3.position.set(0, 0.08, 0.5);
    root.add(b1, b2, b3);
    tagBody(b1);
    tagBody(b2);
    tagBody(b3);

    addLeadToPin(root, new THREE.Vector3(0, 0.12, -0.2), 0, -1.0, leadMat, owned, tagBody);

    owned.geos.push(bar1Geo, bar2Geo, bar3Geo);
    owned.mats.push(barMat);
  }

  // Add interactive 3D pin sockets for all component pins
  pins.forEach((pin) => {
    const { lx, lz } = getLocalPinOffsetUnified(comp.type, pin);
    const accent =
      comp.type === 'source'
        ? pin === 1
          ? 0xef4444
          : 0x1e293b
        : comp.type === 'led'
        ? pin === 0
          ? 0xef4444
          : 0x1e293b
        : comp.type === 'ground'
        ? 0x10b981
        : 0x64748b;
    const pp = buildPinTerminal(comp.id, pin, lx, lz, 0.04, accent, owned);
    root.add(pp.group);
    pinProxies.push({ pin, mesh: pp.proxy, halo: pp.halo });
  });

  const updateBurnState = (burned: boolean) => {
    burnableMats.forEach(({ mat, origColor }) => {
      mat.color.setHex(burned ? 0x292524 : origColor);
    });
  };

  return {
    root,
    bodyHits,
    pinProxies,
    selectionRing,
    baseY,
    switchLeverPivot,
    switchStatusMat,
    pushbuttonCap,
    potKnobPivot,
    motorRotorPivot,
    buzzerRingMesh,
    ledDomeMat,
    ledCoreMat,
    ledFlangeMat,
    ledLight,
    ledAlertHalo,
    ledOverloadGroup,
    ledOverloadParticles,
    ledSmokeOriginY,
    ledOverloadStrength: 0,
    warningRing,
    resistorBandMeshes,
    meterDialPivot,
    meterModeLedV,
    meterModeLedI,
    updateMultimeterLcd,
    scopeKnobPivot,
    updateOscilloscopeScreen,
    updateDynamicSpec,
    updateBurnState,
    mcuPortLedMats,
    decOutLedMats,
    sevenSegMats,
    clockLedMat,
    dispose: () => {
      owned.geos.forEach((g) => g.dispose());
      owned.mats.forEach((m) => m.dispose());
      owned.texs.forEach((t) => t.dispose());
    },
  };
}

export function updateUnifiedCompVisualRuntime(
  comp: CircuitComp,
  handle: UnifiedComp3DHandles,
  st: SolvedCompState | undefined,
  options: {
    isRunning: boolean;
    elapsed: number;
    dt: number;
    isBlindExam: boolean;
    shortWarning: boolean;
    ledOverloadWarning: boolean;
  }
) {
  const { isRunning, elapsed, dt, isBlindExam, shortWarning } = options;
  const fault = comp.fault ?? 'none';
  const showFault = !isBlindExam && fault !== 'none';

  if (handle.updateBurnState) {
    handle.updateBurnState(showFault && fault === 'burned');
  }

  // Switch toggle lever smooth damping
  if (comp.type === 'switch' && handle.switchLeverPivot && handle.switchStatusMat) {
    const closed = comp.value >= 0.5;
    handle.switchLeverPivot.rotation.z = THREE.MathUtils.damp(
      handle.switchLeverPivot.rotation.z,
      closed ? -0.46 : 0.46,
      14,
      dt
    );
    handle.switchStatusMat.color.setHex(closed ? 0x22c55e : 0xef4444);
    handle.switchStatusMat.emissive.setHex(closed ? 0x16a34a : 0x7f1d1d);
  }

  // Pushbutton plunger cap height
  if (comp.type === 'pushbutton' && handle.pushbuttonCap) {
    const pressed = comp.value >= 0.5;
    handle.pushbuttonCap.position.y = THREE.MathUtils.damp(
      handle.pushbuttonCap.position.y,
      pressed ? 0.43 : 0.54,
      18,
      dt
    );
    (handle.pushbuttonCap.material as THREE.MeshStandardMaterial).color.setHex(
      pressed ? 0x10b981 : 0x334155
    );
  }

  // Potentiometer dial rotation
  if (comp.type === 'pot' && handle.potKnobPivot) {
    const w = comp.wiper ?? 0.5;
    const targetRot = (0.5 - w) * Math.PI * 1.45;
    handle.potKnobPivot.rotation.y = THREE.MathUtils.damp(handle.potKnobPivot.rotation.y, targetRot, 14, dt);
  }

  // Multimeter 3D rotary selector dial & mode LED damping
  if (comp.type === 'multimeter' && handle.meterDialPivot) {
    const isAmp = comp.meterMode === 'I';
    const targetRot = isAmp ? -0.58 : 0.58;
    handle.meterDialPivot.rotation.y = THREE.MathUtils.damp(handle.meterDialPivot.rotation.y, targetRot, 16, dt);
    if (handle.meterModeLedV && handle.meterModeLedI) {
      handle.meterModeLedV.emissiveIntensity = isAmp ? 0.08 : 1.5;
      handle.meterModeLedI.emissiveIntensity = isAmp ? 1.5 : 0.08;
    }
  }

  // Oscilloscope 3D TIME/DIV rotary dial damping
  if (comp.type === 'oscilloscope' && handle.scopeKnobPivot) {
    const win = comp.scopeTimeWindow ?? 2.0;
    const targetRot = win <= 0.6 ? 0.95 : win <= 1.2 ? 0.32 : win <= 2.5 ? -0.32 : -0.95;
    handle.scopeKnobPivot.rotation.y = THREE.MathUtils.damp(handle.scopeKnobPivot.rotation.y, targetRot, 16, dt);
  }

  // Motor rotor spinning speed proportional to currentMa
  if (comp.type === 'motor' && handle.motorRotorPivot) {
    const iMa = isRunning && st ? st.currentMa : 0;
    if (Math.abs(iMa) > 1) {
      const spinSpeed = THREE.MathUtils.clamp(iMa * 0.14, -24, 24);
      handle.motorRotorPivot.rotation.x += spinSpeed * dt;
    }
  }

  // Piezo buzzer acoustic wave ring
  if (comp.type === 'buzzer' && handle.buzzerRingMesh) {
    const active = isRunning && st && Math.abs(st.vDrop) > 1.2 && !(showFault && fault === 'burned');
    if (active) {
      handle.buzzerRingMesh.visible = true;
      const wave = (elapsed * 3.2) % 1;
      handle.buzzerRingMesh.scale.setScalar(0.8 + wave * 1.5);
      (handle.buzzerRingMesh.material as THREE.MeshBasicMaterial).opacity = (1 - wave) * 0.85;
    } else {
      handle.buzzerRingMesh.visible = false;
    }
  }

  // LED glow & overcurrent 3D alarm (continuous red flashing + rising smoke/sparks + shockwave halo)
  if (comp.type === 'led' && handle.ledDomeMat && handle.ledCoreMat && handle.ledLight) {
    const spec = LED_COLOR_MAP[(comp.color as LedColorKey) || 'red'] || LED_COLOR_MAP.red;
    const isBurned = showFault && fault === 'burned';
    const iMa = isRunning && st ? Math.max(0, st.currentMa) : 0;
    const over = !isBurned && iMa > 30;
    const bright = isBurned ? 0 : Math.min(1.4, iMa / 20);

    if (over) {
      // Crisp continuous red alarm blink (~3.2 Hz)
      const blinkWave = 0.5 + 0.5 * Math.sin(elapsed * 20);
      const pulseSharp = blinkWave > 0.36 ? 1.0 : 0.16;

      handle.ledDomeMat.color.setHex(pulseSharp > 0.5 ? 0xff1e1e : 0x7f1d1d);
      handle.ledDomeMat.emissive.setHex(0xff1111);
      handle.ledDomeMat.emissiveIntensity = 0.45 + pulseSharp * 2.4;

      handle.ledCoreMat.color.setHex(pulseSharp > 0.5 ? 0xffedd5 : 0xef4444);
      handle.ledCoreMat.emissive.setHex(0xff2200);
      handle.ledCoreMat.emissiveIntensity = 0.65 + pulseSharp * 2.6;

      if (handle.ledFlangeMat) {
        handle.ledFlangeMat.color.setHex(pulseSharp > 0.5 ? 0xef4444 : 0x991b1b);
        handle.ledFlangeMat.emissive.setHex(0xdc2626);
        handle.ledFlangeMat.emissiveIntensity = pulseSharp > 0.5 ? 0.9 : 0.15;
      }

      handle.ledLight.color.setHex(0xff2020);
      handle.ledLight.intensity = 0.8 + pulseSharp * 3.4;
    } else {
      handle.ledDomeMat.color.set(isBurned ? '#292524' : spec.onFill);
      handle.ledDomeMat.emissive.set(isBurned ? '#000000' : spec.onFill);
      handle.ledDomeMat.emissiveIntensity = bright > 0.02 ? 0.35 + bright * 1.5 : 0.05;

      handle.ledCoreMat.color.setHex(isBurned ? 0x44403c : 0xffffff);
      handle.ledCoreMat.emissive.set(isBurned ? '#000000' : spec.onFill);
      handle.ledCoreMat.emissiveIntensity = bright > 0.02 ? 0.5 + bright * 2.2 : 0.08;

      if (handle.ledFlangeMat) {
        handle.ledFlangeMat.color.set(isBurned ? '#292524' : spec.onFill);
        handle.ledFlangeMat.emissive.setHex(0x000000);
        handle.ledFlangeMat.emissiveIntensity = 0;
      }

      handle.ledLight.color.set(spec.onFill);
      handle.ledLight.intensity = bright > 0.02 ? bright * 2.2 : 0;
    }

    // Elevated shockwave warning ring around LED dome
    if (handle.ledAlertHalo) {
      if (over) {
        handle.ledAlertHalo.visible = true;
        const wave = (elapsed * 2.4) % 1;
        handle.ledAlertHalo.scale.setScalar(0.85 + wave * 0.95);
        (handle.ledAlertHalo.material as THREE.MeshBasicMaterial).opacity = (1 - wave) * 0.92;
      } else {
        handle.ledAlertHalo.visible = false;
      }
    }

    // Rising 3D smoke wisps & micro thermal sparks (zero per-frame allocation)
    if (handle.ledOverloadGroup && handle.ledOverloadParticles) {
      const targetStrength = over ? THREE.MathUtils.clamp((iMa - 30) / 70, 0.45, 1.0) : 0;
      const prevStrength = handle.ledOverloadStrength ?? 0;
      const nextStrength = THREE.MathUtils.damp(prevStrength, targetStrength, over ? 9 : 3.8, dt);
      handle.ledOverloadStrength = nextStrength;

      if (nextStrength > 0.015) {
        handle.ledOverloadGroup.visible = true;
        const originY = handle.ledSmokeOriginY ?? 1.18;
        const particles = handle.ledOverloadParticles;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.phase = (p.phase + dt * p.speed * (0.85 + nextStrength * 0.65)) % 1;
          if (p.isSpark) {
            const py = originY + 0.05 + p.phase * 1.45;
            const px = p.vx * p.phase + Math.sin(elapsed * 10 + p.seed) * 0.16;
            const pz = p.vz * p.phase + Math.cos(elapsed * 9 + p.seed) * 0.16;
            p.sprite.position.set(px, py, pz);
            const sc = p.baseScale * (1.0 - p.phase * 0.65);
            p.sprite.scale.set(sc, sc, 1);
            p.mat.opacity = Math.max(0, 1 - p.phase * 1.35) * nextStrength * 0.95;
          } else {
            const py = originY + 0.08 + p.phase * (2.15 + nextStrength * 0.65);
            const curl = Math.sin(elapsed * 2.2 + p.seed + p.phase * 3.6) * 0.16;
            const curlZ = Math.cos(elapsed * 2.0 + p.seed + p.phase * 3.1) * 0.16;
            p.sprite.position.set(p.vx * p.phase + curl, py, p.vz * p.phase + curlZ);
            const sc = p.baseScale * (0.45 + p.phase * 1.45);
            p.sprite.scale.set(sc, sc, 1);
            p.mat.opacity = Math.sin(p.phase * Math.PI) * (0.58 + nextStrength * 0.28) * nextStrength;
          }
        }
      } else {
        handle.ledOverloadGroup.visible = false;
      }
    }
  }

  // 8051 Port P1 status LEDs
  if (comp.type === 'mcu8051' && handle.mcuPortLedMats) {
    const p1Mask = isRunning ? (st?.digitalBits ?? 0) & 0x0f : 0;
    for (let i = 0; i < handle.mcuPortLedMats.length; i++) {
      const on = Boolean((p1Mask >> i) & 1);
      const m = handle.mcuPortLedMats[i];
      m.color.setHex(on ? 0x4ade80 : 0x1e293b);
      m.emissive.setHex(on ? 0x22c55e : 0x000000);
      m.emissiveIntensity = on ? 1.8 : 0;
    }
  }

  // 74LS138 active-LOW Y0..Y3 indicator LEDs
  if (comp.type === 'dec74138' && handle.decOutLedMats) {
    const activeIdx = isRunning ? (st?.digitalValue ?? -1) : -1;
    for (let i = 0; i < handle.decOutLedMats.length; i++) {
      const on = activeIdx === i;
      const m = handle.decOutLedMats[i];
      m.color.setHex(on ? 0x38bdf8 : 0x1e1b4b);
      m.emissive.setHex(on ? 0x0284c7 : 0x000000);
      m.emissiveIntensity = on ? 2.0 : 0;
    }
  }

  // 7-Segment 3D luminous segments a..g + dp
  if (comp.type === 'sevenseg' && handle.sevenSegMats) {
    const segMask = isRunning && st ? (st.digitalBits ?? 0) : 0;
    const dpOn = isRunning && Boolean(st?.digitalAux);
    for (let i = 0; i < 7; i++) {
      const on = Boolean((segMask >> i) & 1);
      const m = handle.sevenSegMats[i];
      if (!m) continue;
      m.color.setHex(on ? 0xff3b30 : 0x3f1d1d);
      m.emissive.setHex(on ? 0xef4444 : 0x000000);
      m.emissiveIntensity = on ? 2.2 : 0;
    }
    const dpMat = handle.sevenSegMats[7];
    if (dpMat) {
      dpMat.color.setHex(dpOn ? 0xff3b30 : 0x3f1d1d);
      dpMat.emissive.setHex(dpOn ? 0xef4444 : 0x000000);
      dpMat.emissiveIntensity = dpOn ? 2.2 : 0;
    }
  }

  // Clock XTAL pulse LED
  if (comp.type === 'clockgen' && handle.clockLedMat) {
    const hi = isRunning && (st?.digitalValue ?? 0) >= 1;
    handle.clockLedMat.color.setHex(hi ? 0x22d3ee : 0x0f172a);
    handle.clockLedMat.emissive.setHex(hi ? 0x06b6d4 : 0x000000);
    handle.clockLedMat.emissiveIntensity = hi ? 2.2 : 0;
  }

  // Warning ring for overcurrent LED, shorted battery, or visible faults
  if (handle.warningRing) {
    const ledOver = comp.type === 'led' && isRunning && (st?.currentMa ?? 0) > 30 && !(showFault && fault === 'burned');
    const srcShort = (comp.type === 'source' || comp.type === 'ac_source') && isRunning && shortWarning;
    const faultAlert = showFault && (fault === 'short' || fault === 'burned');
    if (ledOver || srcShort || faultAlert) {
      handle.warningRing.visible = true;
      const pulse = 0.95 + 0.18 * Math.sin(elapsed * (ledOver ? 18 : 12));
      handle.warningRing.scale.setScalar(pulse);
      const wMat = handle.warningRing.material as THREE.MeshBasicMaterial;
      wMat.opacity = ledOver ? (Math.sin(elapsed * 20) > 0 ? 0.95 : 0.35) : 0.85;
    } else {
      handle.warningRing.visible = false;
    }
  }
}

/** Build smooth CatmullRomCurve3 & TubeGeometry across endpoints + waypoints in 3D space */
export function buildUnifiedWireGeometry(
  pA: { x: number; y: number },
  yA: number,
  pB: { x: number; y: number },
  yB: number,
  waypoints?: { x: number; y: number }[],
  liftBias = 0
): { curve: THREE.CatmullRomCurve3; geometry: THREE.TubeGeometry } {
  const a3 = svgToWorld3D(pA.x, pA.y);
  const b3 = svgToWorld3D(pB.x, pB.y);
  const start = new THREE.Vector3(a3.wx, yA, a3.wz);
  const end = new THREE.Vector3(b3.wx, yB, b3.wz);

  const pts: THREE.Vector3[] = [start];
  if (waypoints && waypoints.length > 0) {
    const baseArc = Math.max(yA, yB) + 0.35 + liftBias;
    waypoints.forEach((wp) => {
      const w3 = svgToWorld3D(wp.x, wp.y);
      pts.push(new THREE.Vector3(w3.wx, baseArc, w3.wz));
    });
  } else {
    const dist = start.distanceTo(end);
    const arcH = Math.max(yA, yB) + Math.min(1.6, Math.max(0.32, dist * 0.16 + liftBias));
    const mid1 = new THREE.Vector3().lerpVectors(start, end, 0.25);
    mid1.y = arcH * 0.9;
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y = arcH;
    const mid2 = new THREE.Vector3().lerpVectors(start, end, 0.75);
    mid2.y = arcH * 0.9;
    pts.push(mid1, mid, mid2);
  }
  pts.push(end);

  const curve = new THREE.CatmullRomCurve3(pts);
  const geometry = new THREE.TubeGeometry(curve, Math.max(24, pts.length * 8), 0.048, 8, false);
  return { curve, geometry };
}

export function createUnifiedWorkplaneTexture(darkMode: boolean, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = darkMode ? '#0b1120' : '#eef2f6';
  ctx.fillRect(0, 0, 1024, 1024);

  const minor = 1024 / 16;
  ctx.strokeStyle = darkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.075)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 16; i++) {
    const p = i * minor;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(1024, p);
    ctx.stroke();
  }

  const major = 1024 / 4;
  ctx.strokeStyle = darkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 165, 233, 0.22)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= 4; i++) {
    const p = i * major;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(1024, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// 3D Electrical Discharge & Spark Particle System (Short-Circuit & Bad Wiring)
// ---------------------------------------------------------------------------

export interface ElectricSparkSystem3D {
  group: THREE.Group;
  spawnBurst: (wx: number, wy: number, wz: number, intensity?: 'minor' | 'major', floorY?: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

interface SparkSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  floorY: number;
  age: number;
  maxLife: number;
  isElectricCyan: boolean;
}

interface ArcSlot {
  active: boolean;
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  age: number;
  maxLife: number;
  line: THREE.Line;
  posAttr: THREE.BufferAttribute;
  mat: THREE.LineBasicMaterial;
}

function makeElectricSparkSpriteTex(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.22, 'rgba(224, 242, 254, 0.95)');
  grad.addColorStop(0.55, 'rgba(250, 204, 21, 0.45)');
  grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  // Subtle 4-point electric flare cross
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.lineTo(32, 58);
  ctx.moveTo(6, 32);
  ctx.lineTo(58, 32);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createElectricSparkSystem3D(maxAnisotropy: number): ElectricSparkSystem3D {
  const group = new THREE.Group();
  const MAX_SPARKS = 200;
  const MAX_ARCS = 8;
  const ARC_VERTS = 7;

  const posArr = new Float32Array(MAX_SPARKS * 3);
  const colArr = new Float32Array(MAX_SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(posArr, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colArr, 3);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  sparkGeo.setAttribute('position', posAttr);
  sparkGeo.setAttribute('color', colAttr);
  sparkGeo.setDrawRange(0, 0);

  const sparkTex = makeElectricSparkSpriteTex(maxAnisotropy);
  const sparkMat = new THREE.PointsMaterial({
    size: 0.34,
    map: sparkTex,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(sparkGeo, sparkMat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  group.add(points);

  const sparks: SparkSlot[] = Array.from({ length: MAX_SPARKS }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    floorY: 0.02,
    age: 0,
    maxLife: 0.35,
    isElectricCyan: false,
  }));

  const arcs: ArcSlot[] = [];
  const arcGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < MAX_ARCS; i++) {
    const arr = new Float32Array(ARC_VERTS * 3);
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(arr, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    const mat = new THREE.LineBasicMaterial({
      color: i % 2 === 0 ? 0x7dd3fc : 0xfef08a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    line.frustumCulled = false;
    line.renderOrder = 7;
    group.add(line);
    arcGeos.push(geo);
    arcs.push({
      active: false,
      ox: 0,
      oy: 0,
      oz: 0,
      dx: 0,
      dy: 0,
      dz: 0,
      age: 0,
      maxLife: 0.14,
      line,
      posAttr: attr,
      mat,
    });
  }

  const flashLight = new THREE.PointLight(0x7dd3fc, 0, 6.5, 1.8);
  group.add(flashLight);
  let flashIntensity = 0;
  let nextSparkIdx = 0;
  let nextArcIdx = 0;

  const spawnBurst = (
    wx: number,
    wy: number,
    wz: number,
    intensity: 'minor' | 'major' = 'minor',
    floorY = 0.02
  ) => {
    const count = intensity === 'major' ? 28 : 16;
    const speedScale = intensity === 'major' ? 1.35 : 0.95;

    for (let i = 0; i < count; i++) {
      const slot = sparks[nextSparkIdx];
      nextSparkIdx = (nextSparkIdx + 1) % MAX_SPARKS;

      const theta = Math.random() * Math.PI * 2;
      const spd = (1.6 + Math.random() * 3.8) * speedScale;
      slot.active = true;
      slot.x = wx + (Math.random() - 0.5) * 0.08;
      slot.y = wy + 0.04 + Math.random() * 0.08;
      slot.z = wz + (Math.random() - 0.5) * 0.08;
      slot.vx = Math.cos(theta) * spd;
      slot.vy = (2.1 + Math.random() * 3.9) * speedScale;
      slot.vz = Math.sin(theta) * spd;
      slot.floorY = Math.max(0.02, floorY);
      slot.age = 0;
      slot.maxLife = (intensity === 'major' ? 0.34 : 0.24) + Math.random() * 0.28;
      slot.isElectricCyan = i % 3 === 0;
    }

    const arcCount = intensity === 'major' ? 3 : 2;
    const arcLen = intensity === 'major' ? 0.85 : 0.52;
    for (let a = 0; a < arcCount; a++) {
      const arc = arcs[nextArcIdx];
      nextArcIdx = (nextArcIdx + 1) % MAX_ARCS;
      const theta = Math.random() * Math.PI * 2;
      const len = arcLen * (0.65 + Math.random() * 0.55);
      arc.active = true;
      arc.ox = wx;
      arc.oy = wy + 0.06;
      arc.oz = wz;
      arc.dx = Math.cos(theta) * len;
      arc.dy = 0.18 + Math.random() * len * 0.75;
      arc.dz = Math.sin(theta) * len;
      arc.age = 0;
      arc.maxLife = intensity === 'major' ? 0.16 : 0.11;
      arc.line.visible = true;
    }

    flashLight.position.set(wx, wy + 0.22, wz);
    flashLight.color.setHex(intensity === 'major' ? 0x93c5fd : 0xfef08a);
    flashIntensity = intensity === 'major' ? 5.2 : 3.0;
    flashLight.intensity = flashIntensity;
  };

  const update = (dt: number) => {
    // 1. Update Spark Particles in-place (zero allocations)
    let activeCount = 0;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const s = sparks[i];
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.maxLife) {
        s.active = false;
        continue;
      }

      // Ballistic arc with gravity & air drag + floor bounce
      s.vy -= 14.5 * dt;
      const drag = Math.max(0, 1 - 2.2 * dt);
      s.vx *= drag;
      s.vz *= drag;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;

      if (s.y < s.floorY) {
        s.y = s.floorY;
        s.vy = Math.abs(s.vy) * 0.42;
        s.vx *= 0.72;
        s.vz *= 0.72;
      }

      const t = s.age / s.maxLife;
      const fade = Math.max(0, 1 - t * t);

      const pIdx = activeCount * 3;
      posArr[pIdx] = s.x;
      posArr[pIdx + 1] = s.y;
      posArr[pIdx + 2] = s.z;

      // Color ramp: electric white-cyan -> bright gold/cyan -> glowing orange fade
      if (s.isElectricCyan) {
        colArr[pIdx] = (0.55 + 0.45 * (1 - t)) * fade;
        colArr[pIdx + 1] = (0.82 + 0.18 * (1 - t)) * fade;
        colArr[pIdx + 2] = 1.0 * fade;
      } else if (t < 0.3) {
        colArr[pIdx] = 1.0 * fade;
        colArr[pIdx + 1] = 0.96 * fade;
        colArr[pIdx + 2] = 0.72 * fade;
      } else {
        colArr[pIdx] = 1.0 * fade;
        colArr[pIdx + 1] = Math.max(0.22, 0.85 - (t - 0.3) * 0.9) * fade;
        colArr[pIdx + 2] = Math.max(0.05, 0.45 - (t - 0.3) * 0.6) * fade;
      }
      activeCount++;
    }

    sparkGeo.setDrawRange(0, activeCount);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 2. Update Micro Electric Arcs with subtle per-frame crackle jitter
    for (let i = 0; i < MAX_ARCS; i++) {
      const arc = arcs[i];
      if (!arc.active) continue;
      arc.age += dt;
      if (arc.age >= arc.maxLife) {
        arc.active = false;
        arc.line.visible = false;
        continue;
      }
      const fade = 1 - arc.age / arc.maxLife;
      arc.mat.opacity = fade * 0.95;
      const arr = arc.posAttr.array as Float32Array;
      for (let v = 0; v < ARC_VERTS; v++) {
        const u = v / (ARC_VERTS - 1);
        const jitterAmp = v === 0 || v === ARC_VERTS - 1 ? 0 : 0.14 * Math.sin(u * Math.PI);
        arr[v * 3] = arc.ox + arc.dx * u + (Math.random() - 0.5) * jitterAmp;
        arr[v * 3 + 1] = arc.oy + arc.dy * u + (Math.random() - 0.5) * jitterAmp;
        arr[v * 3 + 2] = arc.oz + arc.dz * u + (Math.random() - 0.5) * jitterAmp;
      }
      arc.posAttr.needsUpdate = true;
    }

    // 3. Decay Flash PointLight
    if (flashIntensity > 0.01) {
      flashIntensity = Math.max(0, flashIntensity - dt * 26);
      flashLight.intensity = flashIntensity;
    } else if (flashLight.intensity !== 0) {
      flashLight.intensity = 0;
    }
  };

  return {
    group,
    spawnBurst,
    update,
    dispose: () => {
      sparkGeo.dispose();
      sparkMat.dispose();
      sparkTex.dispose();
      arcGeos.forEach((g) => g.dispose());
      arcs.forEach((a) => a.mat.dispose());
    },
  };
}

