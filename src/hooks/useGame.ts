import { useState, useRef, useEffect, useCallback } from 'react';
import type { GameState, Direction, GameSettings, PlayerStats } from '../game/types';
import { DEFAULT_SETTINGS, DEFAULT_STATS, STORAGE_KEYS, CONFIG } from '../game/constants';
import { createInitialState, startGame, togglePause, queueDirection, tick } from '../game/engine';
import { GameRenderer } from '../game/renderer';
import { audio } from '../game/audio';

function readSettings(): GameSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readStats(): PlayerStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.stats);
    if (!stored) return DEFAULT_STATS;
    const parsed = JSON.parse(stored) as Partial<PlayerStats>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_STATS;

    return {
      ...DEFAULT_STATS,
      ...parsed,
      bestScore: {
        ...DEFAULT_STATS.bestScore,
        ...(parsed.bestScore && typeof parsed.bestScore === 'object' ? parsed.bestScore : {}),
      },
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function useGame() {
  const [settings, setSettings] = useState<GameSettings>(readSettings);
  const [stats, setStats] = useState<PlayerStats>(readStats);
  const [initialGameState] = useState(() => createInitialState(settings.difficulty));
  const stateRef = useRef<GameState>(initialGameState);
  const rendererRef = useRef<GameRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const settingsRef = useRef(settings);

  const [displayState, setDisplayState] = useState({
    phase: initialGameState.phase,
    score: initialGameState.score,
    combo: initialGameState.combo,
    foodEaten: initialGameState.foodEaten,
    snakeLength: initialGameState.snake.length,
  });
  const displayStateRef = useRef(displayState);

  const publishDisplayState = useCallback((state: GameState) => {
    const next = {
      phase: state.phase,
      score: state.score,
      combo: state.combo,
      foodEaten: state.foodEaten,
      snakeLength: state.snake.length,
    };
    const current = displayStateRef.current;

    if (
      current.phase !== next.phase ||
      current.score !== next.score ||
      current.combo !== next.combo ||
      current.foodEaten !== next.foodEaten ||
      current.snakeLength !== next.snakeLength
    ) {
      displayStateRef.current = next;
      setDisplayState(next);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
    audio.setEnabled(settings.soundEnabled);
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    } catch {
      // The game remains playable when storage is unavailable.
    }
  }, [stats]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    const current = stateRef.current;

    if (current.phase === 'playing') {
      let nextState: GameState = {
        ...current,
        tickAccumulator: current.tickAccumulator + dt * 1000,
        timePlayed: current.timePlayed + dt,
      };

      while (nextState.phase === 'playing' && nextState.tickAccumulator >= nextState.tickInterval) {
        nextState = {
          ...nextState,
          tickAccumulator: nextState.tickAccumulator - nextState.tickInterval,
        };

        const wasPlaying = nextState.phase === 'playing';
        const tickResult = tick(nextState);

        if (tickResult.ateFood) {
          const particleSystem = rendererRef.current?.getParticleSystem();
          if (settingsRef.current.particlesEnabled && particleSystem) {
            if (tickResult.ateFood.type === 'golden') {
              particleSystem.emitGolden(
                tickResult.ateFood.pos,
                CONFIG.cellSize,
                settingsRef.current.theme,
              );
            } else {
              particleSystem.emitEat(
                tickResult.ateFood.pos,
                CONFIG.cellSize,
                settingsRef.current.theme,
                tickResult.combo,
              );
            }
          }

          if (tickResult.ateFood.type === 'golden') audio.playGolden();
          else audio.playEat(tickResult.combo);

          if (tickResult.combo > 0 && tickResult.combo % 5 === 0) audio.playCombo();
        }

        if (wasPlaying && tickResult.phase !== 'playing') {
          const particleSystem = rendererRef.current?.getParticleSystem();

          if (tickResult.phase === 'won') {
            audio.playWin();
          } else {
            audio.playGameOver();
            if (settingsRef.current.particlesEnabled && particleSystem) {
              particleSystem.emitDeath(
                tickResult.snake[0],
                CONFIG.cellSize,
                settingsRef.current.theme,
              );
            }
          }

          setStats(previous => ({
            gamesPlayed: previous.gamesPlayed + 1,
            gamesWon: previous.gamesWon + (tickResult.phase === 'won' ? 1 : 0),
            totalScore: previous.totalScore + tickResult.score,
            totalFoodEaten: previous.totalFoodEaten + tickResult.foodEaten,
            bestScore: {
              ...previous.bestScore,
              [settingsRef.current.difficulty]: Math.max(
                previous.bestScore[settingsRef.current.difficulty],
                tickResult.score,
              ),
            },
            bestCombo: Math.max(previous.bestCombo, tickResult.maxCombo),
            longestSnake: Math.max(previous.longestSnake, tickResult.snake.length),
            totalTimePlayed: previous.totalTimePlayed + tickResult.timePlayed,
          }));
        }

        nextState = tickResult;
      }

      if (nextState.shake.elapsed < nextState.shake.duration) {
        nextState = {
          ...nextState,
          shake: { ...nextState.shake, elapsed: nextState.shake.elapsed + dt },
        };
      }

      if (nextState.deathAnimation > 0) {
        nextState = {
          ...nextState,
          deathAnimation: Math.max(0, nextState.deathAnimation - dt * 2),
        };
      }

      stateRef.current = nextState;
    }

    const renderState = stateRef.current;
    const interpolation =
      renderState.phase === 'playing'
        ? renderState.tickAccumulator / renderState.tickInterval
        : 1;

    rendererRef.current?.render(renderState, interpolation, dt);
    publishDisplayState(renderState);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [publishDisplayState]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  const initRenderer = useCallback((canvas: HTMLCanvasElement) => {
    rendererRef.current = new GameRenderer(canvas, settingsRef.current);
  }, []);

  useEffect(() => {
    rendererRef.current?.updateSettings(settings);
  }, [settings]);

  const start = useCallback(() => {
    const nextState = startGame(stateRef.current, settingsRef.current.difficulty);
    stateRef.current = nextState;
    publishDisplayState(nextState);
    rendererRef.current?.getParticleSystem().clear();
    audio.playClick();
  }, [publishDisplayState]);

  const pause = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== 'playing' && current.phase !== 'paused') return;

    const nextState = togglePause(current);
    stateRef.current = nextState;
    publishDisplayState(nextState);
    audio.playPause();
  }, [publishDisplayState]);

  const changeDirection = useCallback((direction: Direction) => {
    stateRef.current = queueDirection(stateRef.current, direction);
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    const previousSettings = settingsRef.current;
    const nextSettings = { ...previousSettings, ...partial };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    if (
      partial.difficulty &&
      partial.difficulty !== previousSettings.difficulty &&
      stateRef.current.phase === 'playing'
    ) {
      const nextInterval = CONFIG.difficulties[partial.difficulty].speed;
      stateRef.current = {
        ...stateRef.current,
        tickInterval: nextInterval,
        tickAccumulator: Math.min(stateRef.current.tickAccumulator, nextInterval),
      };
    }
  }, []);

  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target?.isContentEditable ||
        (target ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) : false);

      if (isTextEntry || document.querySelector('[role="dialog"]')) return;

      const key = event.key.toLowerCase();
      const gameKeys = [
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'w', 'a', 's', 'd', ' ', 'escape',
      ];

      if (gameKeys.includes(key)) event.preventDefault();

      const phase = stateRef.current.phase;

      switch (key) {
        case 'arrowup':
        case 'w':
          changeDirection('UP');
          break;
        case 'arrowdown':
        case 's':
          changeDirection('DOWN');
          break;
        case 'arrowleft':
        case 'a':
          changeDirection('LEFT');
          break;
        case 'arrowright':
        case 'd':
          changeDirection('RIGHT');
          break;
        case ' ':
          if (phase === 'menu' || phase === 'gameover' || phase === 'won') start();
          else pause();
          break;
        case 'escape':
          pause();
          break;
        case 'r':
          start();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, start, pause]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden || stateRef.current.phase !== 'playing') return;

      const nextState = togglePause(stateRef.current);
      stateRef.current = nextState;
      publishDisplayState(nextState);
      audio.playPause();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [publishDisplayState]);

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
