# Snakegame

A responsive Snake game built with React, TypeScript, Vite and the Canvas 2D API.

## Gameplay

- Four speed settings: Easy, Medium, Hard and Insane.
- Three visual themes, animated food, combo scoring, golden food and particle effects.
- Keyboard, swipe and on-screen directional controls.
- Pause and resume, restart, sound controls and persistent personal statistics.
- Local high scores are tracked separately for each difficulty.
- Filling every cell on the board is a win; the game does not try to spawn food on a full board.
- Settings and statistics are stored locally in the browser. No account or remote service is required.

## Controls

| Action | Control |
| --- | --- |
| Move | Arrow keys or W / A / S / D |
| Pause / resume | Space or Escape |
| Restart | R |
| Mobile movement | Swipe the board or use the directional pad |
| Mobile pause | Tap the board |

The game pauses automatically when the browser tab is hidden.

## Development

Requires Node.js and npm.

```bash
npm ci
npm run dev
```

Run the production build and TypeScript check before publishing:

```bash
npm run build
npm run typecheck
```

## Data and privacy

Game preferences, personal-best scores and play statistics stay in the browser's local storage. Clearing site data in the browser will reset those records.
