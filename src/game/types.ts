// ─── Core Types ──────────────────────────────────────────────────────────────

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'insane';
export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover' | 'won';
export type FoodType = 'normal' | 'bonus' | 'golden';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SnakeSegment extends Vec2 {
  /** Interpolation progress 0-1 for smooth rendering */
  lerp: number;
}

export interface Food {
  pos: Vec2;
  type: FoodType;
  /** Timestamp when spawned */
  spawnTime: number;
  /** Lifetime in ms (0 = infinite) */
  lifetime: number;
  /** Points value */
  points: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'ring' | 'trail' | 'star';
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

export interface GameState {
  phase: GamePhase;
  snake: Vec2[];
  prevSnake: Vec2[];
  direction: Direction;
  queuedDirection: Direction | null;
  foods: Food[];
  score: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  tickAccumulator: number;
  tickInterval: number;
  particles: Particle[];
  shake: ScreenShake;
  foodEaten: number;
  timePlayed: number;
  deathAnimation: number;
}

export interface TickResult extends GameState {
  ateFood: Food | null;
}

export interface GameConfig {
  gridSize: number;
  cellSize: number;
  difficulties: Record<Difficulty, {
    speed: number;
    label: string;
    icon: string;
    description: string;
  }>;
  foodWeights: Record<FoodType, number>;
  comboWindow: number;
  comboMultiplier: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  totalFoodEaten: number;
  bestScore: Record<Difficulty, number>;
  bestCombo: number;
  longestSnake: number;
  totalTimePlayed: number;
}

export interface GameSettings {
  difficulty: Difficulty;
  soundEnabled: boolean;
  particlesEnabled: boolean;
  showGrid: boolean;
  theme: 'dark' | 'midnight' | 'forest';
}
