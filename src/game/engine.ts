import type { GameState, Direction, Vec2, Food, FoodType, Difficulty } from './types';
import { CONFIG, INITIAL_SNAKE, DIRECTION_VECTORS, OPPOSITE } from './constants';

/**
 * Pure Game Engine - All game logic without rendering concerns
 * Follows functional programming principles for predictability
 */

export function createInitialState(difficulty: Difficulty): GameState {
  const snake = INITIAL_SNAKE.map(s => ({ ...s }));
  return {
    phase: 'menu',
    snake,
    prevSnake: snake.map(s => ({ ...s })),
    direction: 'RIGHT',
    queuedDirection: null,
    foods: [createFood(snake)],
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

export function createFood(snake: Vec2[], type?: FoodType): Food {
  const { gridSize } = CONFIG;
  let pos: Vec2;
  let attempts = 0;
  
  do {
    pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    attempts++;
  } while (snake.some(s => s.x === pos.x && s.y === pos.y) && attempts < 100);

  // Determine food type
  const foodType = type || rollFoodType();
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

export function queueDirection(state: GameState, dir: Direction): GameState {
  if (OPPOSITE[dir] === state.direction) return state;
  if (dir === state.direction) return state;
  return { ...state, queuedDirection: dir };
}

export function tick(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  // Apply queued direction
  let direction = state.direction;
  if (state.queuedDirection && OPPOSITE[state.queuedDirection] !== state.direction) {
    direction = state.queuedDirection;
  }

  // Calculate new head position
  const head = state.snake[0];
  const delta = DIRECTION_VECTORS[direction];
  const newHead: Vec2 = {
    x: head.x + delta.x,
    y: head.y + delta.y,
  };

  // Wall collision
  if (
    newHead.x < 0 ||
    newHead.x >= CONFIG.gridSize ||
    newHead.y < 0 ||
    newHead.y >= CONFIG.gridSize
  ) {
    return {
      ...state,
      phase: 'gameover',
      direction,
      queuedDirection: null,
      deathAnimation: 1,
      shake: { intensity: 8, duration: 0.4, elapsed: 0 },
    };
  }

  // Self collision (check against all but the tail since it will move)
  const willEat = state.foods.some(f => f.pos.x === newHead.x && f.pos.y === newHead.y);
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some(s => s.x === newHead.x && s.y === newHead.y)) {
    return {
      ...state,
      phase: 'gameover',
      direction,
      queuedDirection: null,
      deathAnimation: 1,
      shake: { intensity: 8, duration: 0.4, elapsed: 0 },
    };
  }

  // Move snake
  const newSnake = [newHead, ...state.snake];
  let newFoods = [...state.foods];
  let newScore = state.score;
  let newCombo = state.combo;
  let newComboTimer = state.comboTimer;
  let newMaxCombo = state.maxCombo;
  let newFoodEaten = state.foodEaten;
  let ateFood: Food | null = null;

  // Check food collision
  const foodIndex = newFoods.findIndex(f => f.pos.x === newHead.x && f.pos.y === newHead.y);
  if (foodIndex !== -1) {
    ateFood = newFoods[foodIndex];
    newFoodEaten++;
    
    // Combo system
    newComboTimer = CONFIG.comboWindow;
    newCombo++;
    if (newCombo > newMaxCombo) newMaxCombo = newCombo;
    
    // Calculate score with combo multiplier
    const comboMult = 1 + (newCombo - 1) * (CONFIG.comboMultiplier - 1);
    newScore += Math.round(ateFood.points * comboMult);

    // Replace eaten food
    newFoods[foodIndex] = createFood(newSnake);

    // Don't remove tail (snake grows)
  } else {
    newSnake.pop(); // Remove tail
  }

  // Update combo timer
  if (newComboTimer > 0) {
    newComboTimer -= state.tickInterval;
    if (newComboTimer <= 0) {
      newCombo = 0;
      newComboTimer = 0;
    }
  }

  // Expire timed foods
  const now = Date.now();
  newFoods = newFoods.map(f => {
    if (f.lifetime > 0 && now - f.spawnTime > f.lifetime) {
      return createFood(newSnake);
    }
    return f;
  });

  return {
    ...state,
    prevSnake: state.snake.map(s => ({ ...s })),
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
  } as GameState & { ateFood: Food | null };
}

export function startGame(state: GameState, difficulty: Difficulty): GameState {
  const snake = INITIAL_SNAKE.map(s => ({ ...s }));
  return {
    ...createInitialState(difficulty),
    phase: 'playing',
    snake,
    prevSnake: snake.map(s => ({ ...s })),
    foods: [createFood(snake)],
  };
}

export function togglePause(state: GameState): GameState {
  if (state.phase === 'playing') return { ...state, phase: 'paused' };
  if (state.phase === 'paused') return { ...state, phase: 'playing' };
  return state;
}
