import type { Particle, Vec2 } from './types';
import { THEME_COLORS } from './constants';

/**
 * Particle System - Creates and updates visual effects
 */
export class ParticleSystem {
  particles: Particle[] = [];

  /** Emit particles when food is eaten */
  emitEat(pos: Vec2, cellSize: number, theme: string, combo: number) {
    const colors = THEME_COLORS[theme as keyof typeof THEME_COLORS];
    const count = Math.min(8 + combo * 3, 40);
    const px = pos.x * cellSize + cellSize / 2;
    const py = pos.y * cellSize + cellSize / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: combo > 3 ? colors.goldenFood : colors.particle,
        type: 'spark',
      });
    }

    // Ring effect
    this.particles.push({
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 0.4,
      size: cellSize * 0.3,
      color: colors.accent,
      type: 'ring',
    });
  }

  /** Emit star particles for golden food */
  emitGolden(pos: Vec2, cellSize: number, theme: string) {
    const colors = THEME_COLORS[theme as keyof typeof THEME_COLORS];
    const px = pos.x * cellSize + cellSize / 2;
    const py = pos.y * cellSize + cellSize / 2;

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.3,
        size: 3 + Math.random() * 4,
        color: colors.goldenFood,
        type: 'star',
      });
    }
  }

  /** Emit death explosion */
  emitDeath(pos: Vec2, cellSize: number, theme: string) {
    const colors = THEME_COLORS[theme as keyof typeof THEME_COLORS];
    const px = pos.x * cellSize + cellSize / 2;
    const py = pos.y * cellSize + cellSize / 2;

    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 2 + Math.random() * 5,
        color: i % 2 === 0 ? '#ef4444' : colors.snakeHead,
        type: 'spark',
      });
    }
  }

  /** Trail particles behind snake head */
  emitTrail(pos: Vec2, cellSize: number, theme: string) {
    const colors = THEME_COLORS[theme as keyof typeof THEME_COLORS];
    const px = pos.x * cellSize + cellSize / 2;
    const py = pos.y * cellSize + cellSize / 2;

    this.particles.push({
      x: px + (Math.random() - 0.5) * cellSize * 0.4,
      y: py + (Math.random() - 0.5) * cellSize * 0.4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 1,
      maxLife: 0.3 + Math.random() * 0.2,
      size: 1.5 + Math.random() * 2,
      color: colors.snakeHead,
      type: 'trail',
    });
  }

  /** Update all particles */
  update(dt: number) {
    const frameScale = Math.max(0, Math.min(dt * 60, 3));
    const damping = Math.pow(0.95, frameScale);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
      p.vx *= damping;
      p.vy *= damping;

      if (p.type === 'ring') {
        p.size += dt * 200;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Render all particles to canvas */
  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life);
      ctx.globalAlpha = alpha;

      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * Math.PI * 2);
        this.drawStar(ctx, 0, 0, p.size * alpha);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  clear() {
    this.particles = [];
  }
}
