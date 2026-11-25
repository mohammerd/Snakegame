import type { GameState, GameSettings, Vec2 } from './types';
import { CONFIG, THEME_COLORS } from './constants';
import { ParticleSystem } from './particles';

/**
 * Canvas Renderer - High-performance game rendering
 * Uses requestAnimationFrame for smooth 60fps rendering
 * Implements interpolation for fluid snake movement
 */
export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private settings: GameSettings;
  private animFrame = 0;
  private lastTrailEmit = 0;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particles = new ParticleSystem();
    this.settings = settings;
  }

  updateSettings(settings: GameSettings) {
    this.settings = settings;
  }

  getParticleSystem() {
    return this.particles;
  }

  getCellSize(): number {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.clientWidth || this.canvas.width / dpr;
    return logicalWidth / CONFIG.gridSize;
  }

  /** Main render method called every frame */
  render(state: GameState, interpolation: number, dt: number) {
    const { gridSize } = CONFIG;
    // Use CSS dimensions (logical pixels) not canvas pixel dimensions
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.clientWidth || this.canvas.width / dpr;
    const logicalHeight = this.canvas.clientHeight || this.canvas.height / dpr;
    const cellSize = logicalWidth / gridSize;
    const colors = THEME_COLORS[this.settings.theme];

    // Apply screen shake
    this.ctx.save();
    if (state.shake.elapsed < state.shake.duration) {
      const progress = state.shake.elapsed / state.shake.duration;
      const intensity = state.shake.intensity * (1 - progress);
      const sx = (Math.random() - 0.5) * intensity * 2;
      const sy = (Math.random() - 0.5) * intensity * 2;
      this.ctx.translate(sx, sy);
    }

    // Clear (use logical dimensions since context is DPR-scaled)
    this.ctx.fillStyle = colors.boardBg;
    this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Draw grid
    if (this.settings.showGrid) {
      this.drawGrid(cellSize, colors.gridLine, logicalWidth, logicalHeight);
    }

    // Draw food
    this.drawFoods(state.foods, cellSize, colors);

    // Draw snake with interpolation
    this.drawSnake(state, interpolation, cellSize, colors);

    // Draw particles
    if (this.settings.particlesEnabled) {
      this.particles.update(dt);
      this.particles.render(this.ctx);

      // Emit trail particles
      this.animFrame++;
      if (state.phase === 'playing' && this.animFrame - this.lastTrailEmit > 3) {
        this.particles.emitTrail(state.snake[0], cellSize, this.settings.theme);
        this.lastTrailEmit = this.animFrame;
      }
    }

    // Death flash
    if (state.phase === 'gameover' && state.deathAnimation > 0) {
      const flash = Math.sin(state.deathAnimation * Math.PI * 4) * 0.15;
      this.ctx.fillStyle = `rgba(239, 68, 68, ${Math.max(0, flash)})`;
      this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    }

    this.ctx.restore();
  }

  private drawGrid(cellSize: number, color: string, width: number, height: number) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 0.5;

    for (let index = 0; index <= CONFIG.gridSize; index += 1) {
      const position = index * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(position, 0);
      this.ctx.lineTo(position, height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, position);
      this.ctx.lineTo(width, position);
      this.ctx.stroke();
    }
  }

  private drawFoods(foods: GameState['foods'], cellSize: number, colors: typeof THEME_COLORS.dark) {
    const now = Date.now();

    for (const food of foods) {
      const cx = food.pos.x * cellSize + cellSize / 2;
      const cy = food.pos.y * cellSize + cellSize / 2;
      const time = now / 1000;

      // Pulsing animation
      const pulse = 1 + Math.sin(time * 4) * 0.1;
      const radius = (cellSize * 0.35) * pulse;

      // Glow
      const glowColor = food.type === 'golden' ? colors.goldenFood
        : food.type === 'bonus' ? colors.bonusFood
        : colors.food;

      this.ctx.save();
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 12 + Math.sin(time * 3) * 4;

      // Food body
      const gradient = this.ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, radius);
      if (food.type === 'golden') {
        gradient.addColorStop(0, '#fef08a');
        gradient.addColorStop(0.5, colors.goldenFood);
        gradient.addColorStop(1, '#b45309');
      } else if (food.type === 'bonus') {
        gradient.addColorStop(0, '#fde68a');
        gradient.addColorStop(0.5, colors.bonusFood);
        gradient.addColorStop(1, '#c2410c');
      } else {
        gradient.addColorStop(0, '#fca5a5');
        gradient.addColorStop(0.5, colors.food);
        gradient.addColorStop(1, '#991b1b');
      }

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Expiring food indicator
      if (food.lifetime > 0) {
        const remaining = 1 - (now - food.spawnTime) / food.lifetime;
        if (remaining < 0.3) {
          this.ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.5;
        }
        // Small arc showing remaining time
        this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, remaining));
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
      }

      this.ctx.restore();
    }
  }

  private drawSnake(state: GameState, interpolation: number, cellSize: number, colors: typeof THEME_COLORS.dark) {
    const { snake, prevSnake, direction } = state;
    const len = snake.length;

    // Draw from tail to head for proper layering
    for (let i = len - 1; i >= 0; i--) {
      const curr = snake[i];
      const prev = prevSnake[i] || curr;

      // Interpolate position for smooth movement
      const lerpFactor = i === 0 ? interpolation : interpolation * 0.8;
      const x = (prev.x + (curr.x - prev.x) * lerpFactor) * cellSize;
      const y = (prev.y + (curr.y - prev.y) * lerpFactor) * cellSize;

      const progress = i / Math.max(1, len - 1);
      const padding = cellSize * 0.08;
      const size = cellSize - padding * 2;

      // Color gradient from head to tail
      const color = this.lerpColor(colors.snakeHead, colors.snakeTail, progress);

      // Segment size decreases toward tail
      const segmentScale = 1 - progress * 0.2;
      const segSize = size * segmentScale;
      const segX = x + (cellSize - segSize) / 2;
      const segY = y + (cellSize - segSize) / 2;

      // Draw segment
      this.ctx.save();
      if (i === 0) {
        // Head with glow
        this.ctx.shadowColor = colors.snakeHead;
        this.ctx.shadowBlur = 8;
      }

      const radius = i === 0 ? segSize * 0.35 : segSize * 0.25;
      this.ctx.fillStyle = color;
      this.roundRect(segX, segY, segSize, segSize, radius);
      this.ctx.fill();

      // Head details - eyes
      if (i === 0) {
        this.drawEyes(x, y, cellSize, direction, colors);
      }

      this.ctx.restore();
    }
  }

  private drawEyes(x: number, y: number, cellSize: number, direction: string, colors: typeof THEME_COLORS.dark) {
    const eyeSize = cellSize * 0.12;
    const eyeOffset = cellSize * 0.2;
    let ex1: number, ey1: number, ex2: number, ey2: number;

    switch (direction) {
      case 'UP':
        ex1 = x + cellSize / 2 - eyeOffset; ey1 = y + cellSize * 0.3;
        ex2 = x + cellSize / 2 + eyeOffset; ey2 = y + cellSize * 0.3;
        break;
      case 'DOWN':
        ex1 = x + cellSize / 2 - eyeOffset; ey1 = y + cellSize * 0.7;
        ex2 = x + cellSize / 2 + eyeOffset; ey2 = y + cellSize * 0.7;
        break;
      case 'LEFT':
        ex1 = x + cellSize * 0.3; ey1 = y + cellSize / 2 - eyeOffset;
        ex2 = x + cellSize * 0.3; ey2 = y + cellSize / 2 + eyeOffset;
        break;
      case 'RIGHT':
        ex1 = x + cellSize * 0.7; ey1 = y + cellSize / 2 - eyeOffset;
        ex2 = x + cellSize * 0.7; ey2 = y + cellSize / 2 + eyeOffset;
        break;
      default:
        return;
    }

    // Eye whites
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(ex1, ey1, eyeSize * 1.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(ex2, ey2, eyeSize * 1.4, 0, Math.PI * 2);
    this.ctx.fill();

    // Pupils
    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(ex1, ey1, eyeSize * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(ex2, ey2, eyeSize * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const blue = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${blue})`;
  }
}
