import { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from './hooks/useGame';
import { CONFIG } from './game/constants';
import type { Direction, Difficulty, GameSettings } from './game/types';

export default function App() {
  const {
    gameState,
    settings,
    stats,
    highScore,
    lastRunRecord,
    initRenderer,
    start,
    pause,
    changeDirection,
    updateSettings,
  } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(400);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      const maxSize = Math.min(window.innerWidth - 32, window.innerHeight - 300, 500);
      setCanvasSize(Math.max(220, maxSize));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasSize * dpr;
      canvas.height = canvasSize * dpr;
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      initRenderer(canvas);
    }
  }, [canvasSize, initRenderer]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 25) {
      // Tap
      if (gameState.phase === 'menu' || gameState.phase === 'gameover' || gameState.phase === 'won') start();
      else pause();
    } else if (absDx > absDy) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [gameState.phase, start, pause, changeDirection]);

  const difficulties: { value: Difficulty; label: string; icon: string }[] = [
    { value: 'easy', label: 'Easy', icon: '🌱' },
    { value: 'medium', label: 'Medium', icon: '🔥' },
    { value: 'hard', label: 'Hard', icon: '⚡' },
    { value: 'insane', label: 'Insane', icon: '💀' },
  ];

  const themes: { value: GameSettings['theme']; label: string; colors: string }[] = [
    { value: 'dark', label: 'Slate', colors: 'from-slate-700 to-slate-900' },
    { value: 'midnight', label: 'Indigo', colors: 'from-indigo-700 to-indigo-900' },
    { value: 'forest', label: 'Forest', colors: 'from-green-700 to-green-900' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-3 select-none overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative w-full max-w-lg mb-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
              SNAKE
            </span>
            <span className="text-gray-500 font-light ml-1 text-lg">game</span>
          </h1>
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            title="Statistics"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* Score HUD */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Score</div>
            <div className={`text-xl font-bold text-white tabular-nums transition-all duration-150 ${
              gameState.combo > 3 ? 'text-yellow-400 scale-105' : ''
            }`}>
              {gameState.score.toLocaleString()}
            </div>
          </div>
          <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Best</div>
            <div className="text-xl font-bold text-yellow-400/80 tabular-nums">
              {highScore.toLocaleString()}
            </div>
          </div>
          {gameState.combo > 1 && (
            <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-orange-400/30 animate-pulse">
              <div className="text-[10px] text-orange-300 uppercase tracking-wider font-medium">Combo</div>
              <div className="text-xl font-bold text-orange-400 tabular-nums">
                ×{gameState.combo}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Difficulty & Theme Selector */}
      <div className="relative flex flex-wrap gap-2 mb-3 justify-center">
        {difficulties.map((d) => (
          <button
            key={d.value}
            onClick={() => updateSettings({ difficulty: d.value })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
              settings.difficulty === d.value
                ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-lg shadow-green-500/10'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-300'
            }`}
          >
            {d.icon} {d.label}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1" />
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => updateSettings({ theme: t.value })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 bg-gradient-to-r ${t.colors} ${
              settings.theme === t.value
                ? 'ring-2 ring-white/30 text-white'
                : 'opacity-50 hover:opacity-80 text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Game Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
        style={{ width: canvasSize, height: canvasSize, touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: canvasSize, height: canvasSize }}
        />

        {/* Overlays */}
        {gameState.phase === 'menu' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
            <div className="text-6xl mb-4 animate-bounce-slow">🐍</div>
            <h2 className="text-3xl font-black text-white mb-1">Snake</h2>
            <p className="text-gray-400 text-sm mb-6">Classic reimagined</p>
            <button
              onClick={start}
              className="group px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Play
              </span>
            </button>
            <p className="text-gray-500 text-xs mt-4">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 font-mono text-[10px]">Space</kbd> to start
            </p>
          </div>
        )}

        {gameState.phase === 'paused' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
            <div className="text-5xl mb-3">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Paused</h2>
            <button
              onClick={pause}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Resume
            </button>
            <p className="text-gray-500 text-xs mt-3">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 font-mono text-[10px]">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 font-mono text-[10px]">Esc</kbd>
            </p>
          </div>
        )}

        {(gameState.phase === 'gameover' || gameState.phase === 'won') && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
            <div className="text-5xl mb-2">{gameState.phase === 'won' ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold text-white mb-1">{gameState.phase === 'won' ? 'Board Cleared!' : 'Game Over'}</h2>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-1">
              {gameState.score.toLocaleString()}
            </div>
            <div className="flex gap-4 text-xs text-gray-400 mb-4">
              <span>🍎 {gameState.foodEaten} food</span>
              <span>📏 {gameState.snakeLength} length</span>
            </div>
            {gameState.phase === 'won' && (
              <div className="text-green-400 text-sm mb-2 font-semibold">🏆 You filled the board. You win.</div>
            )}
            {lastRunRecord && (
              <div className="text-green-400 text-sm mb-3 animate-pulse font-semibold">
                New high score.
              </div>
            )}
            <button
              onClick={start}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Play Again
            </button>
            <p className="text-gray-500 text-xs mt-3">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 font-mono text-[10px]">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300 font-mono text-[10px]">R</kbd>
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="relative mt-3 flex gap-2">
        <button
          onClick={gameState.phase === 'playing' || gameState.phase === 'paused' ? pause : start}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-all border border-white/10 hover:border-white/20 active:scale-95"
        >
          {gameState.phase === 'playing' ? '⏸ Pause' : gameState.phase === 'paused' ? '▶ Resume' : '🎮 Play'}
        </button>
        <button
          onClick={start}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-all border border-white/10 hover:border-white/20 active:scale-95"
        >
          🔄 Restart
        </button>
        <button
          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          className={`px-3 py-2 rounded-lg text-sm transition-all border active:scale-95 ${
            settings.soundEnabled
              ? 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
          title={settings.soundEnabled ? 'Mute' : 'Unmute'}
        >
          {settings.soundEnabled ? '🔊' : '🔇'}
        </button>
        <button
          onClick={() => updateSettings({ particlesEnabled: !settings.particlesEnabled })}
          className={`px-3 py-2 rounded-lg text-sm transition-all border active:scale-95 ${
            settings.particlesEnabled
              ? 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              : 'bg-white/5 text-gray-500 border-white/10'
          }`}
          title="Toggle particles"
        >
          ✨
        </button>
      </div>

      {/* Mobile D-Pad */}
      <div className="mt-4 md:hidden">
        <div className="grid grid-cols-3 gap-1.5 w-40 mx-auto">
          <div />
          <DPadButton dir="UP" onPress={changeDirection}>↑</DPadButton>
          <div />
          <DPadButton dir="LEFT" onPress={changeDirection}>←</DPadButton>
          <div className="bg-white/5 rounded-lg flex items-center justify-center text-gray-600 text-xs border border-white/5">
            ●
          </div>
          <DPadButton dir="RIGHT" onPress={changeDirection}>→</DPadButton>
          <div />
          <DPadButton dir="DOWN" onPress={changeDirection}>↓</DPadButton>
          <div />
        </div>
      </div>

      {/* Footer controls hint */}
      <div className="mt-3 text-center text-gray-600 text-[10px]">
        <p className="hidden md:block">
          Arrow keys / WASD to move • Space to pause • Esc to pause • R to restart
        </p>
        <p className="md:hidden">Swipe or use D-pad • Tap to pause</p>
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div role="dialog" aria-modal="true" aria-labelledby="stats-title" className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowStats(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 id="stats-title" className="text-lg font-bold text-white">📊 Statistics</h3>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <StatRow label="Games Played" value={stats.gamesPlayed.toString()} />
              <StatRow label="Games Won" value={stats.gamesWon.toString()} />
              <StatRow label="Total Score" value={stats.totalScore.toLocaleString()} />
              <StatRow label="Food Eaten" value={stats.totalFoodEaten.toString()} />
              <StatRow label="Best Combo" value={`×${stats.bestCombo}`} />
              <StatRow label="Longest Snake" value={stats.longestSnake.toString()} />
              <StatRow label="Time Played" value={formatTime(stats.totalTimePlayed)} />
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">High Scores</div>
                {difficulties.map(d => (
                  <div key={d.value} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-400">{d.icon} {d.label}</span>
                    <span className="text-yellow-400 font-mono">{stats.bestScore[d.value].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// D-Pad button component
function DPadButton({ dir, onPress, children }: { dir: Direction; onPress: (d: Direction) => void; children: React.ReactNode }) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onPress(dir); }}
      onMouseDown={() => onPress(dir)}
      className="bg-white/8 hover:bg-white/15 active:bg-green-500/30 text-white rounded-lg p-3.5 text-lg font-bold transition-all duration-100 border border-white/10 active:scale-90 active:border-green-500/30"
    >
      {children}
    </button>
  );
}

// Stats row component
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-mono font-semibold text-sm">{value}</span>
    </div>
  );
}

// Format time helper
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
