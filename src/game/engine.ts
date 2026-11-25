import type { GameState, TickResult, Direction, Vec2, Food, FoodType, Difficulty } from './types';
import { CONFIG, INITIAL_SNAKE, DIRECTION_VECTORS, OPPOSITE } from './constants';

/**
 * Pure game rules. Food is always placed in a genuinely free cell, and a
 * completely filled board is treated as a win instead of an impossible spawn.
 */

function cellKey(pos: Vec2): string {
  return String(pos.x) + ',' + String(pos.y);
}

export function createFood(
  snake: Vec2[],
  type?: FoodType,
  reservedFoods: Food[] = [],
): Food | null {
  const occupied = new Set<string>();

  for (const segment of snake) occupied.add(cellKey(segment));
  for (const food of reservedFoods) occupied.add(cellKey(food.pos));

  const available: Vec2[] = [];
  for (let y = 0; y < CONFIG.gridSize; y += 1) {
    for (let x = 0; x < CONFIG.gridSize; x += 1) {
      const position = { x, y };
      if (!occupied.has(cellKey(position))) available.push(position);
    }
  }

  if (available.length === 0) return null;

  const pos = available[Math.floor(Math.random() * available.length)];
  const foodType = type ?? rollFoodType();
  const points = foodType === 'golden' ? 50 : foodType === 'bonus' ? 25 : 10;
  const lifetime = foodType === 'golden' ? 5000 : foodType === 'bonus' ? 8000 : 0;

  return {
    pos,
    type: foodType,
    spawnTime: Date.now(),
    lifetime,
    points,
  };
}

function rollFoodType(): FoodType {
  const roll = Math.random() * 100;
  const { normal, bonus, golden } = CONFIG.foodWeights;

  if (roll < golden) return 'golden';
  if (roll < golden + bonus) return 'bonus';
  return 'normal';
}

export function createInitialState(difficulty: Difficulty): GameState {
  const snake = INITIAL_SNAKE.map(segment => ({ ...segment }));
  const firstFood = createFood(snake);

  return {
    phase: 'menu',
    snake,
    prevSnake: snake.map(segment => ({ ...segment })),
    direction: 'RIGHT',
    queuedDirection: null,
    foods: firstFood ? [firstFood] : [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    tickAccumulator: 0,
    tickInterval: CONFIG.difficulties[difficulty].speed,
    particles: [],
    shake: { intensity: 0, duration: 0, elapsed: 0 },
    foodEaten: 0,
    timePlayed: 0,
    deathAnimation: 0,
  };
}

export function queueDirection(state: GameState, dir: Direction): GameState {
  if (state.phase !== 'playing') return state;

  const referenceDirection = state.queuedDirection ?? state.direction;
  if (dir === referenceDirection || OPPOSITE[dir] === referenceDirection) return state;
  if (OPPOSITE[dir] === state.direction) return state;

  return { ...state, queuedDirection: dir };
}

function finishState(state: GameState, direction: Direction): GameState {
  return {
    ...state,
    phase: 'gameover',
    direction,
    queuedDirection: null,
    deathAnimation: 1,
    shake: { intensity: 8, duration: 0.4, elapsed: 0 },
  };
}

export function tick(state: GameState): TickResult {
  if (state.phase !== 'playing') return { ...state, ateFood: null };

  const direction =
    state.queuedDirection && OPPOSITE[state.queuedDirection] !== state.direction
      ? state.queuedDirection
      : state.direction;

  const head = state.snake[0];
  const delta = DIRECTION_VECTORS[direction];
  const newHead = { x: head.x + delta.x, y: head.y + delta.y };

  if (
    newHead.x < 0 ||
    newHead.x >= CONFIG.gridSize ||
    newHead.y < 0 ||
    newHead.y >= CONFIG.gridSize
  ) {
    return { ...finishState(state, direction), ateFood: null };
  }

  const foodIndex = state.foods.findIndex(
    food => food.pos.x === newHead.x && food.pos.y === newHead.y,
  );
  const willEat = foodIndex !== -1;
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);

  if (bodyToCheck.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
    return { ...finishState(state, direction), ateFood: null };
  }

  const newSnake = [newHead, ...state.snake];
  let newFoods = [...state.foods];
  let newScore = state.score;
  let newCombo = state.combo;
  let newComboTimer = state.comboTimer;
  let newMaxCombo = state.maxCombo;
  let newFoodEaten = state.foodEaten;
  let ateFood: Food | null = null;
  let phase: GameState['phase'] = 'playing';

  if (willEat) {
    ateFood = newFoods[foodIndex];
    newFoodEaten += 1;
    newComboTimer = CONFIG.comboWindow;
    newCombo += 1;
    newMaxCombo = Math.max(newMaxCombo, newCombo);

    const comboMultiplier = 1 + (newCombo - 1) * (CONFIG.comboMultiplier - 1);
    newScore += Math.round(ateFood.points * comboMultiplier);

    const remainingFoods = newFoods.filter((_, index) => index !== foodIndex);
    const replacement = createFood(newSnake, undefined, remainingFoods);
    newFoods = replacement ? [...remainingFoods, replacement] : remainingFoods;

    if (!replacement) phase = 'won';
  } else {
    newSnake.pop();
  }

  if (newComboTimer > 0) {
    newComboTimer -= state.tickInterval;
    if (newComboTimer <= 0) {
      newCombo = 0;
      newComboTimer = 0;
    }
  }

  const now = Date.now();
  for (let index = 0; index < newFoods.length; index += 1) {
    const food = newFoods[index];
    if (food.lifetime <= 0 || now - food.spawnTime <= food.lifetime) continue;

    const otherFoods = newFoods.filter((_, otherIndex) => otherIndex !== index);
    const replacement = createFood(newSnake, undefined, otherFoods);
    if (replacement) {
      newFoods[index] = replacement;
    } else {
      newFoods.splice(index, 1);
      index -= 1;
    }
  }

  if (newFoods.length === 0) phase = 'won';

  return {
    ...state,
    phase,
    prevSnake: state.snake.map(segment => ({ ...segment })),
    snake: newSnake,
    direction,
    queuedDirection: null,
    foods: newFoods,
    score: newScore,
    combo: newCombo,
    comboTimer: newComboTimer,
    maxCombo: newMaxCombo,
    foodEaten: newFoodEaten,
    ateFood,
  };
}

export function startGame(_state: GameState, difficulty: Difficulty): GameState {
  const snake = INITIAL_SNAKE.map(segment => ({ ...segment }));
  const food = createFood(snake);

  return {
    ...createInitialState(difficulty),
    phase: food ? 'playing' : 'won',
    snake,
    prevSnake: snake.map(segment => ({ ...segment })),
    foods: food ? [food] : [],
  };
}

export function togglePause(state: GameState): GameState {
  if (state.phase === 'playing') return { ...state, phase: 'paused' };
  if (state.phase === 'paused') return { ...state, phase: 'playing' };
  return state;
}
