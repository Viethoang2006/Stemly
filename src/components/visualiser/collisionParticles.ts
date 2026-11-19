export type ParticleKind = 'spark' | 'debris' | 'dust';

export interface CollisionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  kind: ParticleKind;
  gravity: number;
  drag: number;
  restitution: number;
  rotation: number;
  vRot: number;
}

export interface ImpactShockwave {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadiusX: number;
  maxRadiusY: number;
  color: string;
}

export interface EmitImpactOptions {
  x: number;
  y: number;
  impactSpeed: number;
  /** Horizontal travel direction bias: -1 (left) to +1 (right), 0 for vertical drop */
  horizontalBias?: number;
  sparkColor?: string;
  debrisColor?: string;
  secondaryDebrisColor?: string;
  dustColor?: string;
  ringColor?: string;
  intensity?: number;
}

const MAX_PARTICLES = 96;

export class CollisionParticleSystem {
  private particles: CollisionParticle[] = [];
  private shockwaves: ImpactShockwave[] = [];

  clear(): void {
    this.particles.length = 0;
    this.shockwaves.length = 0;
  }

  hasActive(): boolean {
    return this.particles.length > 0 || this.shockwaves.length > 0;
  }

  emitImpact(opts: EmitImpactOptions): void {
    const {
      x,
      y,
      impactSpeed,
      horizontalBias = 0,
      sparkColor = '#fbbf24',
      debrisColor = '#22c55e',
      secondaryDebrisColor = '#78350f',
      dustColor = 'rgba(226, 232, 240, 0.55)',
      ringColor = '#f59e0b',
      intensity = 1,
    } = opts;

    const energy = Math.max(0.5, Math.min(1.85, impactSpeed / 24)) * intensity;
    const bias = Math.max(-0.85, Math.min(0.85, horizontalBias));

    // Expanding ground impact shockwave
    this.shockwaves.push({
      x,
      y,
      life: 0,
      maxLife: 0.42 + 0.1 * energy,
      maxRadiusX: 34 * energy + 10,
      maxRadiusY: 8.5 * energy + 3,
      color: ringColor,
    });

    const sparkCount = Math.round(9 + 6 * energy);
    const debrisCount = Math.round(7 + 5 * energy);
    const dustCount = Math.round(5 + 4 * energy);

    // 1. High-energy sparks
    for (let i = 0; i < sparkCount; i++) {
      // Fan upward (-PI to 0), shifted slightly along horizontalBias
      const spread = (Math.random() - 0.5) * Math.PI * 0.78;
      const baseAngle = -Math.PI / 2 + bias * 0.48 + spread;
      const speed = (95 + Math.random() * 145) * energy;
      this.pushParticle({
        x: x + (Math.random() - 0.5) * 6,
        y: y - 2,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        size: 1.4 + Math.random() * 1.4,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.24,
        color: sparkColor,
        kind: 'spark',
        gravity: 440,
        drag: 2.1,
        restitution: 0.35,
        rotation: 0,
        vRot: 0,
      });
    }

    // 2. Solid debris fragments (earth / turf / object chips)
    for (let i = 0; i < debrisCount; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.85;
      const baseAngle = -Math.PI / 2 + bias * 0.55 + spread;
      const speed = (65 + Math.random() * 110) * energy;
      this.pushParticle({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 1,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        size: 1.8 + Math.random() * 1.8,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.32,
        color: i % 3 === 0 ? secondaryDebrisColor : debrisColor,
        kind: 'debris',
        gravity: 560,
        drag: 1.2,
        restitution: 0.32,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 14,
      });
    }

    // 3. Low-lying dust puffs
    for (let i = 0; i < dustCount; i++) {
      const dir = Math.random() < 0.5 - bias * 0.3 ? -1 : 1;
      const hSpeed = dir * (28 + Math.random() * 72) * energy;
      this.pushParticle({
        x: x + (Math.random() - 0.5) * 12,
        y: y - 2 - Math.random() * 4,
        vx: hSpeed + bias * 25 * energy,
        vy: -(12 + Math.random() * 26) * energy,
        size: 4 + Math.random() * 4.5,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.28,
        color: dustColor,
        kind: 'dust',
        gravity: -18, // slight thermal lift
        drag: 3.4,
        restitution: 0,
        rotation: 0,
        vRot: 0,
      });
    }
  }

  private pushParticle(p: CollisionParticle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  update(dtSec: number, groundY: number): void {
    if (dtSec <= 0) return;
    const dt = Math.min(dtSec, 0.05);

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const damping = Math.exp(-p.drag * dt);
      p.vx *= damping;
      p.vy = (p.vy + p.gravity * dt) * (p.kind === 'dust' ? damping : 1);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      if (p.kind !== 'dust' && p.y + p.size >= groundY && p.vy > 0) {
        p.y = groundY - p.size;
        p.vy = -p.vy * p.restitution;
        p.vx *= 0.72;
        p.vRot *= 0.65;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Ground shockwave rings
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const t = Math.min(1, sw.life / sw.maxLife);
      const ease = 1 - (1 - t) * (1 - t);
      const alpha = (1 - t) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, 2.8 * (1 - t));
      ctx.beginPath();
      ctx.ellipse(
        sw.x,
        sw.y,
        4 + sw.maxRadiusX * ease,
        1.5 + sw.maxRadiusY * ease,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Pass 1: Dust puffs (soft background layer)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.kind !== 'dust') continue;
      const t = p.life / p.maxLife;
      const alpha = (1 - t) * (1 - t);
      const radius = p.size * (0.85 + t * 1.35);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pass 2: Debris fragments
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.kind !== 'debris') continue;
      const t = p.life / p.maxLife;
      const alpha = Math.min(1, (1 - t) * 1.3);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * 0.7, p.size * 2, p.size * 1.4);
      ctx.restore();
    }

    // Pass 3: Luminous sparks
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.kind !== 'spark') continue;
      const t = p.life / p.maxLife;
      const alpha = 1 - t;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.024, p.y - p.vy * 0.024);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
