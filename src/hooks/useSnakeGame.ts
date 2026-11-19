import { useState, useEffect, useCallback, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Position = { x: number; y: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

function getRandomFood(snake: Position[]): Position {
  let food: Position;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
  return food;
}

function getHighScore(difficulty: Difficulty): number {
  try {
    const stored = localStorage.getItem(`snake-highscore-${difficulty}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setHighScore(difficulty: Difficulty, score: number): void {
  try {
    localStorage.setItem(`snake-highscore-${difficulty}`, score.toString());
  } catch {
    // silently fail
  }
}

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>(() => getRandomFood(INITIAL_SNAKE));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScoreState] = useState(() => getHighScore('medium'));
  const [ateFood, setAteFood] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('idle');
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef(0);
  const difficultyRef = useRef<Difficulty>('medium');
  const lastDirectionRef = useRef<Direction>('RIGHT');

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const changeDirection = useCallback((newDirection: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (opposites[newDirection] !== lastDirectionRef.current) {
      directionRef.current = newDirection;
      setDirection(newDirection);
    }
  }, []);

  const moveSnake = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    const currentSnake = snakeRef.current;
    const currentDirection = directionRef.current;
    const currentFood = foodRef.current;

    const head = { ...currentSnake[0] };

    switch (currentDirection) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState('gameover');
      const currentScore = scoreRef.current;
      const currentDiff = difficultyRef.current;
      const currentHigh = getHighScore(currentDiff);
      if (currentScore > currentHigh) {
        setHighScore(currentDiff, currentScore);
        setHighScoreState(currentScore);
      }
      return;
    }

    // Check self collision
    if (currentSnake.some((s) => s.x === head.x && s.y === head.y)) {
      setGameState('gameover');
      const currentScore = scoreRef.current;
      const currentDiff = difficultyRef.current;
      const currentHigh = getHighScore(currentDiff);
      if (currentScore > currentHigh) {
        setHighScore(currentDiff, currentScore);
        setHighScoreState(currentScore);
      }
      return;
    }

    lastDirectionRef.current = currentDirection;

    const newSnake = [head, ...currentSnake];
    let newFood = currentFood;
    let newScore = scoreRef.current;

    // Check food collision
    if (head.x === currentFood.x && head.y === currentFood.y) {
      newScore += 10;
      setScore(newScore);
      newFood = getRandomFood(newSnake);
      setFood(newFood);
      setAteFood(true);
      setTimeout(() => setAteFood(false), 300);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
    snakeRef.current = newSnake;
    foodRef.current = newFood;
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(moveSnake, SPEEDS[difficulty]);
    return () => clearInterval(interval);
  }, [gameState, difficulty, moveSnake]);

  const startGame = useCallback(() => {
    const initialSnake = [...INITIAL_SNAKE];
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setFood(getRandomFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    lastDirectionRef.current = 'RIGHT';
    setScore(0);
    scoreRef.current = 0;
    setGameState('playing');
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    difficultyRef.current = newDifficulty;
    setHighScoreState(getHighScore(newDifficulty));
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
            startGame();
          } else {
            togglePause();
          }
          break;
        case 'Escape':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, startGame, togglePause]);

  return {
    snake,
    food,
    direction,
    gameState,
    score,
    difficulty,
    highScore,
    gridSize: GRID_SIZE,
    ateFood,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  };
}
