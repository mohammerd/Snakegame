import type { GameConfig, GameSettings, PlayerStats, Direction, Vec2 } from './types';

export const CONFIG: GameConfig = {
  gridSize: 20,
  cellSize: 20,
  difficulties: {
    easy: { speed: 140, label: 'Easy', icon: '🌱', description: 'Relaxed pace for beginners' },
    medium: { speed: 95, label: 'Medium', icon: '🔥', description: 'Balanced challenge' },
    hard: { speed: 60, label: 'Hard', icon: '⚡', description: 'Fast-paced action' },
    insane: { speed: 40, label: 'Insane', icon: '💀', description: 'For true masters' },
  },
  foodWeights: { normal: 70, bonus: 22, golden: 8 },
  comboWindow: 3000,
  comboMultiplier: 1.5,
};

export const INITIAL_SNAKE: Vec2[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

export const DIRECTION_VECTORS: Record<Direction, Vec2> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'medium',
  soundEnabled: true,
  particlesEnabled: true,
  showGrid: true,
  theme: 'dark',
};

export const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  totalScore: 0,
  totalFoodEaten: 0,
  bestScore: { easy: 0, medium: 0, hard: 0, insane: 0 },
  bestCombo: 0,
  longestSnake: 3,
  totalTimePlayed: 0,
};

export const THEME_COLORS = {
  dark: {
    bg: '#0f172a',
    boardBg: '#1e293b',
    gridLine: 'rgba(148, 163, 184, 0.06)',
    snakeHead: '#4ade80',
    snakeBody: '#22c55e',
    snakeTail: '#16a34a',
    food: '#ef4444',
    bonusFood: '#f59e0b',
    goldenFood: '#fbbf24',
    particle: '#4ade80',
    text: '#f8fafc',
    accent: '#4ade80',
  },
  midnight: {
    bg: '#020617',
    boardBg: '#0f172a',
    gridLine: 'rgba(99, 102, 241, 0.08)',
    snakeHead: '#818cf8',
    snakeBody: '#6366f1',
    snakeTail: '#4f46e5',
    food: '#f43f5e',
    bonusFood: '#fb923c',
    goldenFood: '#fbbf24',
    particle: '#818cf8',
    text: '#e2e8f0',
    accent: '#818cf8',
  },
  forest: {
    bg: '#052e16',
    boardBg: '#14532d',
    gridLine: 'rgba(134, 239, 172, 0.06)',
    snakeHead: '#86efac',
    snakeBody: '#4ade80',
    snakeTail: '#22c55e',
    food: '#dc2626',
    bonusFood: '#f97316',
    goldenFood: '#eab308',
    particle: '#86efac',
    text: '#dcfce7',
    accent: '#4ade80',
  },
};

export const STORAGE_KEYS = {
  stats: 'snake_stats_v2',
  settings: 'snake_settings_v2',
};
