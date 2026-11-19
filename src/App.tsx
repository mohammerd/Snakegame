import { useSnakeGame } from './hooks/useSnakeGame';
import { useTouchControls } from './hooks/useTouchControls';
import type { Difficulty } from './hooks/useSnakeGame';

export default function App() {
  const {
    snake,
    food,
    direction,
    gameState,
    score,
    difficulty,
    highScore,
    gridSize,
    ateFood,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  } = useSnakeGame();

  const touchRef = useTouchControls(
    changeDirection,
    () => {
      if (gameState === 'idle' || gameState === 'gameover') {
        startGame();
      } else {
        togglePause();
      }
    },
    gameState === 'playing'
  );

  const difficulties: { value: Difficulty; label: string; emoji: string }[] = [
    { value: 'easy', label: 'Easy', emoji: '🐢' },
    { value: 'medium', label: 'Medium', emoji: '🐇' },
    { value: 'hard', label: 'Hard', emoji: '⚡' },
  ];

  const getDirectionArrow = () => {
    switch (direction) {
      case 'UP': return '↑';
      case 'DOWN': return '↓';
      case 'LEFT': return '←';
      case 'RIGHT': return '→';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
          🐍 Snake Game
        </h1>
        
        {/* Score Board */}
        <div className="flex justify-between items-center bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-700/50">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Score</div>
            <div className={`text-2xl font-bold text-white transition-transform ${ateFood ? 'scale-125' : 'scale-100'}`}>
              {score}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">High Score</div>
            <div className="text-2xl font-bold text-yellow-400">
              {highScore}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Direction</div>
            <div className="text-2xl font-bold text-green-400">
              {getDirectionArrow()}
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="flex gap-2 mb-4">
        {difficulties.map((d) => (
          <button
            key={d.value}
            onClick={() => changeDifficulty(d.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              difficulty === d.value
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60'
            }`}
          >
            {d.emoji} {d.label}
          </button>
        ))}
      </div>

      {/* Game Board */}
      <div
        ref={touchRef}
        className="relative bg-gray-800/80 backdrop-blur-sm rounded-xl border-2 border-gray-600/50 shadow-2xl shadow-green-900/20 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            width: 'min(80vw, 400px)',
            height: 'min(80vw, 400px)',
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const x = index % gridSize;
            const y = Math.floor(index / gridSize);
            
            const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
            const isSnakeBody = snake.slice(1).some((s) => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;
            const isCheckerDark = (x + y) % 2 === 0;

            return (
              <div
                key={index}
                className={`relative ${
                  isCheckerDark ? 'bg-gray-800/40' : 'bg-gray-750/20'
                }`}
              >
                {isSnakeHead && (
                  <div className="absolute inset-0.5 rounded-md bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/40 animate-head-pulse" />
                )}
                {isSnakeBody && (
                  <div className="absolute inset-0.5 rounded-sm bg-gradient-to-br from-green-500 to-green-700 opacity-90 transition-all duration-75" />
                )}
                {isFood && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50 animate-food-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay for idle/paused/gameover states */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl animate-fade-in">
            {gameState === 'idle' && (
              <>
                <div className="text-5xl mb-4 animate-bounce">🐍</div>
                <h2 className="text-2xl font-bold text-white mb-2">Ready to Play?</h2>
                <p className="text-gray-300 text-sm mb-4">Use arrow keys or swipe to control</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-200"
                >
                  Start Game
                </button>
                <p className="text-gray-400 text-xs mt-3">or press Space</p>
              </>
            )}
            {gameState === 'paused' && (
              <>
                <div className="text-5xl mb-4">⏸️</div>
                <h2 className="text-2xl font-bold text-white mb-2">Paused</h2>
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-200"
                >
                  Resume
                </button>
                <p className="text-gray-400 text-xs mt-3">or press Space / Esc</p>
              </>
            )}
            {gameState === 'gameover' && (
              <>
                <div className="text-5xl mb-4">💀</div>
                <h2 className="text-2xl font-bold text-white mb-1">Game Over!</h2>
                <p className="text-3xl font-bold text-yellow-400 mb-1">{score} pts</p>
                {score >= highScore && score > 0 && (
                  <p className="text-green-400 text-sm mb-2 animate-pulse">🏆 New High Score!</p>
                )}
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-200 mt-2"
                >
                  Play Again
                </button>
                <p className="text-gray-400 text-xs mt-3">or press Space</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={gameState === 'playing' || gameState === 'paused' ? togglePause : startGame}
          className="px-4 py-2 bg-gray-700/60 hover:bg-gray-600/60 text-gray-200 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-600/50"
        >
          {gameState === 'playing' ? '⏸ Pause' : gameState === 'paused' ? '▶ Resume' : '🎮 Start'}
        </button>
        <button
          onClick={startGame}
          className="px-4 py-2 bg-gray-700/60 hover:bg-gray-600/60 text-gray-200 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-600/50"
        >
          🔄 Restart
        </button>
      </div>

      {/* Mobile D-Pad */}
      <div className="mt-4 md:hidden">
        <div className="grid grid-cols-3 gap-1 w-36 mx-auto">
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); changeDirection('UP'); }}
            className="bg-gray-700/80 hover:bg-gray-600/80 active:bg-green-600 text-white rounded-lg p-3 text-xl font-bold transition-colors"
          >
            ↑
          </button>
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); changeDirection('LEFT'); }}
            className="bg-gray-700/80 hover:bg-gray-600/80 active:bg-green-600 text-white rounded-lg p-3 text-xl font-bold transition-colors"
          >
            ←
          </button>
          <div className="bg-gray-800/40 rounded-lg flex items-center justify-center text-gray-500 text-xs">
            {getDirectionArrow()}
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); changeDirection('RIGHT'); }}
            className="bg-gray-700/80 hover:bg-gray-600/80 active:bg-green-600 text-white rounded-lg p-3 text-xl font-bold transition-colors"
          >
            →
          </button>
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); changeDirection('DOWN'); }}
            className="bg-gray-700/80 hover:bg-gray-600/80 active:bg-green-600 text-white rounded-lg p-3 text-xl font-bold transition-colors"
          >
            ↓
          </button>
          <div />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-gray-500 text-xs max-w-md">
        <p className="hidden md:block">
          <span className="text-gray-400">Controls:</span> Arrow keys / WASD to move • Space to pause • Esc to pause
        </p>
        <p className="md:hidden">
          <span className="text-gray-400">Controls:</span> Swipe or use D-pad to move • Tap to pause
        </p>
      </div>
    </div>
  );
}
