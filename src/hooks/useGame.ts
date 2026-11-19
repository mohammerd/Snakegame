import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameState, Direction, Difficulty, GameSettings, PlayerStats } from '../game/types';
import { DEFAULT_SETTINGS, DEFAULT_STATS, STORAGE_KEYS, CONFIG } from '../game/constants';
import { createInitialState, startGame, togglePause, queueDirection, tick } from '../game/engine';
import { GameRenderer } from '../game/renderer';
import { audio } from '../game/audio';

/**
 * Main Game Hook - Orchestrates game logic, rendering, input, and persistence
 * Uses requestAnimationFrame for smooth 60fps game loop
 */
export function useGame() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.settings);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.stats);
      return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : DEFAULT_STATS;
    } catch { return DEFAULT_STATS; }
  });

  const [gameState, setGameState] = useState<GameState>(() => createInitialState(settings.difficulty));
  const [displayState, setDisplayState] = useState<{
    phase: GameState['phase'];
    score: number;
    combo: number;
    foodEaten: number;
    snakeLength: number;
  }>({
    phase: 'menu',
    score: 0,
    combo: 0,
    foodEaten: 0,
    snakeLength: 3,
  });

  const stateRef = useRef(gameState);
  const rendererRef = useRef<GameRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const settingsRef = useRef(settings);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); } catch {}
    audio.setEnabled(settings.soundEnabled);
  }, [settings]);

  // Persist stats
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats)); } catch {}
  }, [stats]);

  // Game loop using requestAnimationFrame
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); // Cap delta time
    lastTimeRef.current = timestamp;

    const state = stateRef.current;

    if (state.phase === 'playing') {
      // Accumulate time for fixed-step game logic
      let newState = { ...state, tickAccumulator: state.tickAccumulator + dt * 1000, timePlayed: state.timePlayed + dt };

      // Run game ticks at fixed intervals
      while (newState.tickAccumulator >= newState.tickInterval) {
        newState.tickAccumulator -= newState.tickInterval;
        const tickResult = tick(newState) as GameState & { ateFood?: any };
        
        // Handle food eaten events
        if (tickResult.ateFood) {
          const renderer = rendererRef.current;
          if (renderer && settingsRef.current.particlesEnabled) {
            const ps = renderer.getParticleSystem();
            if (tickResult.ateFood.type === 'golden') {
              ps.emitGolden(tickResult.ateFood.pos, CONFIG.cellSize, settingsRef.current.theme);
              audio.playGolden();
            } else {
              ps.emitEat(tickResult.ateFood.pos, CONFIG.cellSize, settingsRef.current.theme, tickResult.combo);
              audio.playEat(tickResult.combo);
            }
          } else {
            audio.playEat(tickResult.combo);
          }

          if (tickResult.combo > 0 && tickResult.combo % 5 === 0) {
            audio.playCombo();
          }
        }

        // Handle game over
        if (tickResult.phase === 'gameover') {
          audio.playGameOver();
          const renderer = rendererRef.current;
          if (renderer && settingsRef.current.particlesEnabled) {
            renderer.getParticleSystem().emitDeath(tickResult.snake[0], CONFIG.cellSize, settingsRef.current.theme);
          }
          
          // Update stats
          setStats((prev: PlayerStats) => ({
            gamesPlayed: prev.gamesPlayed + 1,
            totalScore: prev.totalScore + tickResult.score,
            totalFoodEaten: prev.totalFoodEaten + tickResult.foodEaten,
            bestScore: {
              ...prev.bestScore,
              [settingsRef.current.difficulty]: Math.max(prev.bestScore[settingsRef.current.difficulty], tickResult.score),
            },
            bestCombo: Math.max(prev.bestCombo, tickResult.maxCombo),
            longestSnake: Math.max(prev.longestSnake, tickResult.snake.length),
            totalTimePlayed: prev.totalTimePlayed + tickResult.timePlayed,
          }));
        }

        newState = tickResult;
      }

      // Update screen shake
      if (newState.shake.elapsed < newState.shake.duration) {
        newState = { ...newState, shake: { ...newState.shake, elapsed: newState.shake.elapsed + dt } };
      }

      // Update death animation
      if (newState.deathAnimation > 0) {
        newState = { ...newState, deathAnimation: Math.max(0, newState.deathAnimation - dt * 2) };
      }

      stateRef.current = newState;
      setGameState(newState);
    }

    // Render
    if (rendererRef.current) {
      const interpolation = state.phase === 'playing'
        ? state.tickAccumulator / state.tickInterval
        : 1;
      rendererRef.current.render(stateRef.current, interpolation, dt);
    }

    // Update display state (throttled)
    setDisplayState({
      phase: stateRef.current.phase,
      score: stateRef.current.score,
      combo: stateRef.current.combo,
      foodEaten: stateRef.current.foodEaten,
      snakeLength: stateRef.current.snake.length,
    });

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Start/stop game loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // Initialize renderer
  const initRenderer = useCallback((canvas: HTMLCanvasElement) => {
    rendererRef.current = new GameRenderer(canvas, settingsRef.current);
  }, []);

  // Update renderer settings
  useEffect(() => {
    rendererRef.current?.updateSettings(settings);
  }, [settings]);

  // Actions
  const start = useCallback(() => {
    const newState = startGame(stateRef.current, settingsRef.current.difficulty);
    stateRef.current = newState;
    setGameState(newState);
    audio.playClick();
    rendererRef.current?.getParticleSystem().clear();
  }, []);

  const pause = useCallback(() => {
    const newState = togglePause(stateRef.current);
    stateRef.current = newState;
    setGameState(newState);
    audio.playPause();
  }, []);

  const changeDirection = useCallback((dir: Direction) => {
    const newState = queueDirection(stateRef.current, dir);
    stateRef.current = newState;
    setGameState(newState);
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev: GameSettings) => ({ ...prev, ...partial }));
  }, []);

  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Prevent default for game keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'escape'].includes(key)) {
        e.preventDefault();
      }

      const state = stateRef.current;

      switch (key) {
        case 'arrowup': case 'w':
          changeDirection('UP'); break;
        case 'arrowdown': case 's':
          changeDirection('DOWN'); break;
        case 'arrowleft': case 'a':
          changeDirection('LEFT'); break;
        case 'arrowright': case 'd':
          changeDirection('RIGHT'); break;
        case ' ':
          if (state.phase === 'menu' || state.phase === 'gameover') start();
          else pause();
          break;
        case 'escape':
          if (state.phase === 'playing' || state.phase === 'paused') pause();
          break;
        case 'r':
          if (state.phase === 'gameover') start();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, start, pause]);

  return {
    gameState: displayState,
    settings,
    stats,
    highScore: stats.bestScore[settings.difficulty],
    initRenderer,
    start,
    pause,
    changeDirection,
    updateSettings,
    resetStats,
  };
}
